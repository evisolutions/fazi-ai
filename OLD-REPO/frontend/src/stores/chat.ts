import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useTestStore } from '@/stores/test'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  isComplete?: boolean
}

export interface CalculateData {
  game_data_columns?: any[]
  training_data_columns?: any[]
  game_data_filtered?: any[]
  training_data_filtered?: any[]
  grouped_training_data?: any[]
  calculated_data_by_group?: any[]
  best_performing_analysis?: any[]
}

export interface MockDataInfo {
  timestamp: string
  dataSize: number
  description?: string
}

export interface ChatMockDataInfo {
  timestamp: string
  messageCount: number
  description?: string
}

export const useChatStore = defineStore('chat', () => {
  const test = useTestStore()

  // State
  const messages = ref<ChatMessage[]>([])
  const calculateData = ref<CalculateData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasCalculateData = computed(() => !!calculateData.value)
  const messageCount = computed(() => messages.value.length)
  const lastMessage = computed(() => messages.value[messages.value.length - 1])
  const hasMockData = computed(() => {
    const mockData = localStorage.getItem('fazi-ai-mock-data')
    return !!mockData
  })
  const mockDataInfo = computed((): MockDataInfo | null => {
    const mockData = localStorage.getItem('fazi-ai-mock-data')
    if (!mockData) return null

    try {
      const parsed = JSON.parse(mockData)
      return {
        timestamp: parsed.timestamp || 'Unknown',
        dataSize: JSON.stringify(parsed.data).length,
        description: parsed.description,
      }
    } catch {
      return null
    }
  })

  // Chat mock data getters
  const hasChatMockData = computed(() => {
    const chatMockData = localStorage.getItem('fazi-ai-chat-mock-data')
    return !!chatMockData
  })
  const chatMockDataInfo = computed((): ChatMockDataInfo | null => {
    const chatMockData = localStorage.getItem('fazi-ai-chat-mock-data')
    if (!chatMockData) return null

    try {
      const parsed = JSON.parse(chatMockData)
      return {
        timestamp: parsed.timestamp || 'Unknown',
        messageCount: parsed.messages?.length || 0,
        description: parsed.description,
      }
    } catch {
      return null
    }
  })

  // Actions
  const setCalculateData = (data: CalculateData) => {
    calculateData.value = data
    console.log('Calculate data set in chat store:', data)
  }

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role,
      content,
      timestamp: new Date(),
    }
    messages.value.push(message)
  }

  const sendMessage = async (message: string): Promise<{ success: boolean; error?: string }> => {
    if (!calculateData.value) {
      return {
        success: false,
        error: 'No calculate data available. Please run analysis first or load mock data.',
      }
    }

    error.value = null

    // Add user message to chat
    addMessage('user', message)

    // Create assistant message for streaming
    const assistantMessageId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      isComplete: false,
    }
    messages.value.push(assistantMessage)

    try {
      const response = await fetch(`${test.backend_url}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          message,
          calculateData: calculateData.value,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6))

              if (eventData.type === 'chunk') {
                // Update the assistant message content
                const messageIndex = messages.value.findIndex((m) => m.id === assistantMessageId)
                if (messageIndex !== -1) {
                  messages.value[messageIndex].content += eventData.content
                }
              } else if (eventData.type === 'complete') {
                // Mark message as complete
                const messageIndex = messages.value.findIndex((m) => m.id === assistantMessageId)
                if (messageIndex !== -1) {
                  messages.value[messageIndex].isStreaming = false
                  messages.value[messageIndex].isComplete = true
                }

                // Save chat mock data after a short delay to ensure AI response is complete
                setTimeout(() => {
                  saveChatMockData(`Chat conversation from ${new Date().toLocaleString('sr-RS')}`)
                }, 1000) // 1 second delay
              } else if (eventData.type === 'error') {
                throw new Error(eventData.error || 'Unknown error occurred')
              }
            } catch (parseError) {
              console.warn('Failed to parse event data:', parseError)
            }
          }
        }
      }

      return { success: true }
    } catch (err: any) {
      console.error('Chat error:', err)

      // Remove the incomplete assistant message
      const messageIndex = messages.value.findIndex((m) => m.id === assistantMessageId)
      if (messageIndex !== -1) {
        messages.value.splice(messageIndex, 1)
      }

      let errorMessage = 'Failed to send message'

      if (err.message.includes('401')) {
        errorMessage = 'Authentication required. Please login again.'
      } else if (err.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (err.message.includes('503')) {
        errorMessage = 'AI service unavailable. Please try again later.'
      } else if (err.message.includes('quota')) {
        errorMessage = 'OpenAI API quota exceeded. Please try again later.'
      } else if (err.message.includes('API key')) {
        errorMessage = 'Invalid OpenAI API configuration.'
      } else if (err.message.includes('Failed to fetch') || err.message.includes('ECONNREFUSED')) {
        errorMessage = 'Unable to connect to server. Please check your connection.'
      }

      error.value = errorMessage
      return { success: false, error: errorMessage }
    }
  }

  const clearChat = () => {
    messages.value = []
    error.value = null
  }

  const clearError = () => {
    error.value = null
  }

  const clearCalculateData = () => {
    calculateData.value = null
  }

  // Mock data functions
  const saveMockData = (data: CalculateData, description?: string) => {
    try {
      const mockData = {
        timestamp: new Date().toISOString(),
        data,
        description: description || 'Saved calculate response',
      }
      localStorage.setItem('fazi-ai-mock-data', JSON.stringify(mockData))
      console.log('Mock data saved to localStorage:', mockData)
      return { success: true }
    } catch (error) {
      console.error('Failed to save mock data:', error)
      return { success: false, error: 'Failed to save mock data to localStorage' }
    }
  }

  const loadMockData = (): { success: boolean; data?: CalculateData; error?: string } => {
    try {
      const mockData = localStorage.getItem('fazi-ai-mock-data')

      if (!mockData) {
        return { success: false, error: 'No mock data found in localStorage' }
      }

      const parsed = JSON.parse(mockData)

      if (!parsed.data) {
        return { success: false, error: 'Invalid mock data format' }
      }

      calculateData.value = parsed.data
      console.log('✅ Mock data loaded from localStorage:', parsed)
      return { success: true, data: parsed.data }
    } catch (error) {
      console.error('Failed to load mock data:', error)
      return { success: false, error: 'Failed to load mock data from localStorage' }
    }
  }

  const clearMockData = () => {
    try {
      localStorage.removeItem('fazi-ai-mock-data')
      console.log('Mock data cleared from localStorage')
      return { success: true }
    } catch (error) {
      console.error('Failed to clear mock data:', error)
      return { success: false, error: 'Failed to clear mock data from localStorage' }
    }
  }

  // Chat mock data functions
  const saveChatMockData = (description?: string) => {
    try {
      const chatMockData = {
        timestamp: new Date().toISOString(),
        messages: messages.value,
        calculateData: calculateData.value,
        description: description || 'Saved chat conversation',
      }
      localStorage.setItem('fazi-ai-chat-mock-data', JSON.stringify(chatMockData))
      console.log('Chat mock data saved to localStorage:', chatMockData)
      return { success: true }
    } catch (error) {
      console.error('Failed to save chat mock data:', error)
      return { success: false, error: 'Failed to save chat mock data to localStorage' }
    }
  }

  const loadChatMockData = (): { success: boolean; error?: string } => {
    try {
      const chatMockData = localStorage.getItem('fazi-ai-chat-mock-data')

      if (!chatMockData) {
        return { success: false, error: 'No chat mock data found in localStorage' }
      }

      const parsed = JSON.parse(chatMockData)

      if (!parsed.messages) {
        return { success: false, error: 'Invalid chat mock data format' }
      }

      // Restore messages and calculate data
      messages.value = parsed.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp), // Convert string back to Date
        isStreaming: false, // Ensure no messages are in streaming state
        isComplete: true, // Mark all messages as complete
      }))

      if (parsed.calculateData) {
        calculateData.value = parsed.calculateData
      }

      console.log('✅ Chat mock data loaded from localStorage:', parsed)
      return { success: true }
    } catch (error) {
      console.error('Failed to load chat mock data:', error)
      return { success: false, error: 'Failed to load chat mock data from localStorage' }
    }
  }

  const clearChatMockData = () => {
    try {
      localStorage.removeItem('fazi-ai-chat-mock-data')
      console.log('Chat mock data cleared from localStorage')
      return { success: true }
    } catch (error) {
      console.error('Failed to clear chat mock data:', error)
      return { success: false, error: 'Failed to clear chat mock data from localStorage' }
    }
  }

  return {
    // State
    messages,
    calculateData,
    isLoading,
    error,
    // Getters
    hasCalculateData,
    messageCount,
    lastMessage,
    hasMockData,
    mockDataInfo,
    hasChatMockData,
    chatMockDataInfo,
    // Actions
    setCalculateData,
    addMessage,
    sendMessage,
    clearChat,
    clearError,
    clearCalculateData,
    // Mock data functions
    saveMockData,
    loadMockData,
    clearMockData,
    // Chat mock data functions
    saveChatMockData,
    loadChatMockData,
    clearChatMockData,
  }
})
