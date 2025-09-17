import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useTestStore } from '@/stores/test'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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
      return { success: false, error: 'No calculate data available. Please run analysis first.' }
    }

    isLoading.value = true
    error.value = null

    // Add user message to chat
    addMessage('user', message)

    try {
      const response = await axios.post(
        `${test.backend_url}/api/chat`,
        {
          message,
          calculateData: calculateData.value,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      )

      if (response.data && response.data.response) {
        // Add AI response to chat
        addMessage('assistant', response.data.response.content)
        return { success: true }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err: any) {
      console.error('Chat error:', err)

      let errorMessage = 'Failed to send message'

      if (err.response?.status === 400) {
        errorMessage = 'Invalid request. Please check your message.'
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication required. Please login again.'
      } else if (err.response?.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (err.response?.status === 503) {
        errorMessage = 'AI service unavailable. Please try again later.'
      } else if (err.code === 'ECONNREFUSED' || !err.response) {
        errorMessage = 'Unable to connect to server. Please check your connection.'
      }

      error.value = errorMessage
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
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
    // Actions
    setCalculateData,
    addMessage,
    sendMessage,
    clearChat,
    clearError,
    clearCalculateData,
  }
})
