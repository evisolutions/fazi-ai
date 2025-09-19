<script setup lang="ts">
import { shallowRef, ref, watch, nextTick, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useGambaStore } from '@/stores/gamba'
import { useTestStore } from '@/stores/test'
import { useThemeStore } from '@/stores/theme'
import { useChatStore } from '@/stores/chat'
import { useRouter } from 'vue-router'
import { Chart } from 'chart.js/auto'
import { marked } from 'marked'

const tab = ref(1)
const gamba = useGambaStore()
const auth = useAuthStore()
const test = useTestStore()
const theme = useThemeStore()
const chatStore = useChatStore()
const router = useRouter()
const loading_data = ref(false)

// Sorting state for tables
const sortColumn = ref('')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Tab configuration with icons
const tabs = [
  {
    value: 1,
    label: 'Parameters',
    icon: 'SettingsIcon',
  },
  {
    value: 2,
    label: 'Results',
    icon: 'ChartIcon',
  },
  {
    value: 3,
    label: 'Best Performing',
    icon: 'TrophyIcon',
  },
  {
    value: 4,
    label: 'Predictions',
    icon: 'TrendingIcon',
  },
  {
    value: 5,
    label: 'Chat',
    icon: 'ChatIcon',
  },
]

// Icon mapping for MDI icons
const iconMap: Record<string, string> = {
  SettingsIcon: 'mdi-cog',
  ChartIcon: 'mdi-chart-line',
  TrophyIcon: 'mdi-trophy-outline',
  TrendingIcon: 'mdi-trending-up',
  ChatIcon: 'mdi-robot-outline',
}

const file_one = ref<File | null>(null)
const file_two = ref<File | null>(null)
const fileOneInput = ref<HTMLInputElement | null>(null)
const fileTwoInput = ref<HTMLInputElement | null>(null)

const trziste_data = ref<number[] | null>(null)
const partner_data = ref<number[] | null>(null)
const selected_volatility = ref<number | null>(null)
const selected_features = ref<number[]>([])
const hit_frequency_from = ref<number | null>(null)
const hit_frequency_to = ref<number | null>(null)
const selected_game_categories = ref<number[]>([])
const max_exposure_from = ref<number | null>(null)
const max_exposure_to = ref<number | null>(null)
const min_max_bet_from = ref<number | null>(null)
const min_max_bet_to = ref<number | null>(null)
const start_date = shallowRef<Date | null>(null)
const end_date = shallowRef<Date | null>(null)

const result_data = ref<any | null>(null)

// Chat refs
const messagesContainer = ref<HTMLElement>()
const messageInput = ref<HTMLTextAreaElement>()
const currentMessage = ref('')

// Validation functions for numeric inputs
const validateNonNegative = (value: number | null): number | null => {
  if (value === null || value === undefined) return null
  return Math.max(0, value)
}

const validateHitFrequency = (value: number | null): number | null => {
  return validateNonNegative(value)
}

const validateMaxExposure = (value: number | null): number | null => {
  return validateNonNegative(value)
}

const validateMinMaxBet = (value: number | null): number | null => {
  return validateNonNegative(value)
}

// Watchers for automatic validation
watch(hit_frequency_from, (newValue) => {
  if (newValue !== null && newValue < 0) {
    hit_frequency_from.value = 0
  }
})

watch(hit_frequency_to, (newValue) => {
  if (newValue !== null && newValue < 0) {
    hit_frequency_to.value = 0
  }
})

watch(max_exposure_from, (newValue) => {
  if (newValue !== null && newValue < 0) {
    max_exposure_from.value = 0
  }
})

watch(max_exposure_to, (newValue) => {
  if (newValue !== null && newValue < 0) {
    max_exposure_to.value = 0
  }
})

watch(min_max_bet_from, (newValue) => {
  if (newValue !== null && newValue < 0) {
    min_max_bet_from.value = 0
  }
})

watch(min_max_bet_to, (newValue) => {
  if (newValue !== null && newValue < 0) {
    min_max_bet_to.value = 0
  }
})

const simulateCalculate = async () => {
  if (!auth.token) {
    const loginResult = await auth.login('admin', 'password123')
    if (!loginResult.success) {
      console.error('Failed to authenticate')
      return
    }
  }

  // Prepare form data for file uploads
  const formData = new FormData()

  // Add parameters as form fields
  const roiNpList = gamba.roi_np_table_data
    .filter((row: any) => row.selected)
    .map((row: any) => ({ roi_id: row.roi_id, np_id: row.np_id }))

  formData.append('roi_np_list', JSON.stringify(roiNpList))
  formData.append('trziste_ids', JSON.stringify(trziste_data.value))
  formData.append('partner_ids', JSON.stringify(partner_data.value))

  formData.append('game_volatility_id', selected_volatility.value?.toString() || '')
  formData.append('game_feature_ids', JSON.stringify(selected_features.value))
  formData.append('game_category_ids', JSON.stringify(selected_game_categories.value))
  formData.append('hit_frequency_from', hit_frequency_from.value?.toString() || '')
  formData.append('hit_frequency_to', hit_frequency_to.value?.toString() || '')
  formData.append('max_exposure_from', max_exposure_from.value?.toString() || '')
  formData.append('max_exposure_to', max_exposure_to.value?.toString() || '')
  formData.append('min_max_bet_from', min_max_bet_from.value?.toString() || '')
  formData.append('min_max_bet_to', min_max_bet_to.value?.toString() || '')
  formData.append('game_release_start_date', start_date.value?.toISOString() || '')
  formData.append('game_release_end_date', end_date.value?.toISOString() || '')

  // Add files if selected
  if (file_one.value) {
    // Validate file type
    const fileName = file_one.value.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      console.error('Invalid file type. Please select an Excel file (.xlsx or .xls)')
      alert('training_data must be a valid Excel file (.xlsx or .xls)')
      return
    }
    formData.append('training_data', file_one.value)
    console.log('training_data file attached:', file_one.value.name)
  }

  if (file_two.value) {
    const fileName = file_two.value.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      console.error('Invalid file type. Please select an Excel file (.xlsx or .xls)')
      alert('game_data must be a valid Excel file (.xlsx or .xls)')
      return
    }
    formData.append('game_data', file_two.value)
    console.log('game_data file attached:', file_two.value.name)
  }

  try {
    loading_data.value = true
    // Switch to Results tab to show loading state
    tab.value = 2
    const response = await axios.post(`${test.backend_url}/api/calculate`, formData, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'multipart/form-data',
      },
    })
    console.log('response', response.data)
    result_data.value = response.data.data

    // Store data in chat store for AI assistance
    chatStore.setCalculateData(response.data.data)

    // Save response to localStorage as mock data
    const saveResult = chatStore.saveMockData(
      response.data.data,
      `Calculate response from ${new Date().toLocaleString('sr-RS')}`,
    )
    if (saveResult.success) {
      console.log('✅ Response saved as mock data to localStorage')
    } else {
      console.warn('⚠️ Failed to save mock data:', saveResult.error)
    }

    loading_data.value = false
    nextTick(() => {
      setupDataRender()
    })
  } catch (error: any) {
    console.error('error', error)
    alert(error.response?.data?.error || 'An error occurred')
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid, try to login again
      auth.logout()
      console.log('Token expired, please try again')
    }
  }
}

const useMockData = async () => {
  try {
    const result = chatStore.loadMockData()
    if (result.success && result.data) {
      result_data.value = result.data
      // Switch to Results tab to show loaded data
      tab.value = 2
      nextTick(() => {
        setupDataRender()
      })
      console.log('✅ Mock data loaded successfully')
    } else {
      alert(result.error || 'Failed to load mock data')
    }
  } catch (error) {
    console.error('Error loading mock data:', error)
    alert('Error loading mock data')
  }
}

// Function to switch to chat tab with analysis data
const goToChat = () => {
  if (result_data.value) {
    // Ensure chat store has the latest data
    chatStore.setCalculateData(result_data.value)
    // Switch to Chat tab (tab 5)
    tab.value = 5
  }
}

// Chat functions
// Auto-scroll to bottom when new messages arrive
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: 'smooth',
      })
    }
  })
}

// Force scroll to bottom (for streaming updates)
const forceScrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Watch for new messages and scroll
watch(
  () => chatStore.messages.length,
  () => {
    scrollToBottom()
  },
)

// Watch for content changes in the last message (for streaming)
watch(
  () => chatStore.lastMessage?.content,
  () => {
    if (chatStore.lastMessage?.isStreaming) {
      forceScrollToBottom()
    }
  },
  { deep: true },
)

// Watch for streaming completion
watch(
  () => chatStore.lastMessage?.isStreaming,
  (isStreaming, wasStreaming) => {
    // When streaming stops, do a final smooth scroll
    if (wasStreaming && !isStreaming) {
      nextTick(() => {
        scrollToBottom()
      })
    }
  },
)

// Format message content with markdown
const formatMessage = (content: string): string => {
  try {
    return marked.parse(content) as string
  } catch (error) {
    console.error('Error formatting message:', error)
    return content
  }
}

// Format timestamp
const formatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString('sr-RS', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Handle Enter key press
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// Send message
const sendMessage = async () => {
  if (!currentMessage.value.trim()) return

  const message = currentMessage.value.trim()
  currentMessage.value = ''

  const result = await chatStore.sendMessage(message)

  if (!result.success && result.error) {
    // Error is already handled in the store and displayed in the UI
    console.error('Failed to send message:', result.error)
  }
}

// Load chat mock data
const loadChatMockData = async () => {
  try {
    const result = chatStore.loadChatMockData()
    if (result.success) {
      console.log('✅ Chat mock data loaded successfully')
      // Scroll to bottom to show loaded messages
      nextTick(() => {
        scrollToBottom()
      })
    } else {
      alert(result.error || 'Failed to load chat mock data')
    }
  } catch (error) {
    console.error('Error loading chat mock data:', error)
    alert('Error loading chat mock data')
  }
}

// Auto-resize textarea
const autoResize = () => {
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
    messageInput.value.style.height = messageInput.value.scrollHeight + 'px'
  }
}

// Watch for changes in currentMessage to auto-resize
watch(currentMessage, () => {
  nextTick(() => {
    autoResize()
  })
})

function excelSerialToMonthYear(serial: number, use1904System = false) {
  // Validate input
  if (serial === null || serial === undefined || isNaN(serial) || !isFinite(serial)) {
    console.warn('Invalid serial number provided:', serial)
    return 'Invalid Date'
  }

  // Excel's base date
  const excel1900Epoch = new Date(Date.UTC(1899, 11, 30)) // Dec 30, 1899
  const excel1904Epoch = new Date(Date.UTC(1904, 0, 1)) // Jan 1, 1904

  // Choose system (default is 1900 system)
  const baseDate = use1904System ? excel1904Epoch : excel1900Epoch

  // Add days to base date
  const date = new Date(baseDate.getTime() + serial * 86400000)

  // Check if the resulting date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date created from serial:', serial)
    return 'Invalid Date'
  }

  // Additional validation: check if date is within reasonable range
  const currentYear = new Date().getFullYear()
  const dateYear = date.getFullYear()
  if (dateYear < 1900 || dateYear > currentYear + 10) {
    console.warn('Date out of reasonable range:', date, 'from serial:', serial)
    return 'Invalid Date'
  }

  // Format: "Month YYYY"
  const options = { year: 'numeric', month: 'long' } as any
  return date.toLocaleDateString('en-US', options)
}

// New function to handle JavaScript Date objects (from backend)
function dateToMonthYear(dateInput: any) {
  // Handle different input types
  let date: Date

  if (dateInput instanceof Date) {
    date = dateInput
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput)
  } else if (typeof dateInput === 'number') {
    // If it's a number, try to treat it as Excel serial first
    return excelSerialToMonthYear(dateInput)
  } else {
    console.warn('Invalid date input type:', typeof dateInput, dateInput)
    return 'Invalid Date'
  }

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date object:', dateInput)
    return 'Invalid Date'
  }

  // Additional validation: check if date is within reasonable range
  const currentYear = new Date().getFullYear()
  const dateYear = date.getFullYear()
  if (dateYear < 1900 || dateYear > currentYear + 10) {
    console.warn('Date out of reasonable range:', date, 'from input:', dateInput)
    return 'Invalid Date'
  }

  // Format: "Month YYYY"
  const options = { year: 'numeric', month: 'long' } as any
  return date.toLocaleDateString('en-US', options)
}

// Utility function to analyze date data and provide insights
function analyzeDateData(group: any) {
  const dates_start = group.data.map((item: any) => item[15])

  // Check if we have Date objects or serial numbers
  const hasDateObjects = dates_start.some(
    (item: any) => item instanceof Date || typeof item === 'string',
  )

  const analysis: any = {
    totalDates: dates_start.length,
    validDates: 0,
    invalidDates: 0,
    dataType: hasDateObjects ? 'Date objects/strings' : 'Serial numbers',
    sampleValues: dates_start.slice(0, 5),
    uniqueValues: [
      ...new Set(
        dates_start.map((item: any) => (item instanceof Date ? item.toISOString() : String(item))),
      ),
    ].length,
  }

  // Add min/max only for serial numbers
  if (!hasDateObjects) {
    const numericValues = dates_start.filter(
      (item: any) => typeof item === 'number' && !isNaN(item),
    )
    if (numericValues.length > 0) {
      analysis.minSerial = Math.min(...numericValues)
      analysis.maxSerial = Math.max(...numericValues)
    } else {
      analysis.minSerial = NaN
      analysis.maxSerial = NaN
    }
  }

  dates_start.forEach((dateInput: any) => {
    const converted = dateToMonthYear(dateInput)
    if (converted === 'Invalid Date') {
      analysis.invalidDates++
    } else {
      analysis.validDates++
    }
  })

  console.log('Date Analysis for Group', group.id, ':', analysis)
  return analysis
}

const formatDataForChart = (group: any) => {
  let group_copy = JSON.parse(JSON.stringify(group))

  // Analyze date data first
  analyzeDateData(group_copy)

  let dates_start = group_copy.data.map((item: any) => item[15])

  // Debug: Log the raw date values
  console.log('Raw date values for group', group.id, ':', dates_start.slice(0, 10)) // Show first 10 values

  // Use the new dateToMonthYear function that handles both Date objects and serial numbers
  let labels_map = dates_start.map((item: any) => dateToMonthYear(item))

  // Debug: Log the converted labels
  console.log('Converted labels for group', group.id, ':', labels_map.slice(0, 10)) // Show first 10 labels

  // Filter out invalid dates and group them separately
  let valid_labels = labels_map.filter((label: any) => label !== 'Invalid Date')
  let invalid_count = labels_map.filter((label: any) => label === 'Invalid Date').length

  // Debug: Log invalid date count
  if (invalid_count > 0) {
    console.warn(
      `Group ${group.id} has ${invalid_count} invalid dates out of ${labels_map.length} total dates`,
    )
  }

  let labels_set = [...new Set(valid_labels)]

  // Add "Invalid Date" category if there are any invalid dates
  if (invalid_count > 0) {
    labels_set.push('Invalid Date')
  }

  let data = labels_set.map((item: any) => ({
    label: item,
    count:
      item === 'Invalid Date' ? invalid_count : labels_map.filter((xd: any) => xd === item).length,
  }))

  return { data, labels_set, canvas_id: `test-${group.id}` }
}

const setupDataRender = () => {
  let formatted_data = result_data.value.grouped_training_data.map((group: any) =>
    formatDataForChart(group),
  )
  formatted_data.forEach((group: any) => {
    let data = group.data
    let canvas_id = group.canvas_id
    let ctx = document.getElementById(canvas_id) as HTMLCanvasElement

    const config = {
      type: 'bar',
      data: {
        labels: data.map((item: any) => item.label),
        datasets: [
          {
            data: data.map((item: any) => item.count),
            label: '# of Promotions Per Month',
          },
        ],
      },
    }

    // destroy previous chart
    let chart = Chart.getChart(ctx)
    if (chart) {
      chart.destroy()
    }
    // @ts-ignore
    new Chart(ctx, config)
  })
}

const simulateComplete = async () => {
  if (!auth.token) {
    const loginResult = await auth.login('admin', 'password123')
    if (!loginResult.success) {
      console.error('Failed to authenticate')
      return
    }
  }

  try {
    const response = await axios.post(
      `${test.backend_url}/api/test`,
      {
        message: 'Give me a funny joke',
      },
      {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      },
    )
    console.log('response', response)
  } catch (error: any) {
    console.error('error', error)
    alert(error.response?.data?.error || 'An error occurred')
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid, try to login again
      auth.logout()
      console.log('Token expired, please try again')
    }
  }
}

// Helper functions for best performing analysis
const formatNumber = (num: number) => {
  if (num === null || num === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Sorting function
const sortTable = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

// Get sorted partners
const getSortedPartners = (partners: any[]) => {
  if (!sortColumn.value) {
    // If no sorting, just add row numbers
    return partners.map((partner: any, index: number) => ({
      ...partner,
      rank: index + 1,
    }))
  }

  const sortedPartners = [...partners].sort((a, b) => {
    let aValue = 0
    let bValue = 0

    switch (sortColumn.value) {
      case 'avg_ggr':
        aValue = a.avg_ggr || 0
        bValue = b.avg_ggr || 0
        break
      case 'avg_roi':
        aValue = a.avg_roi || 0
        bValue = b.avg_roi || 0
        break
      case 'combined_score':
        aValue = a.combined_score || 0
        bValue = b.combined_score || 0
        break
      default:
        return 0
    }

    if (sortDirection.value === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  // Add row numbers after sorting
  return sortedPartners.map((partner: any, index: number) => ({
    ...partner,
    rank: index + 1,
  }))
}

const getPartnerRecommendations = (recommendations: any) => {
  let partners = []
  if (recommendations.type === 'partners') {
    partners = recommendations.recommendations || []
  } else if (recommendations.type === 'both') {
    partners = recommendations.recommendations?.partners || []
  }

  // Sort by combined_score descending to ensure proper ranking
  return partners.sort((a: any, b: any) => b.combined_score - a.combined_score)
}

const getTrzisteRecommendations = (recommendations: any) => {
  let trzista = []
  if (recommendations.type === 'trzista') {
    trzista = recommendations.recommendations || []
  } else if (recommendations.type === 'both') {
    trzista = recommendations.recommendations?.trzista || []
  }

  // Sort by combined_score descending to ensure proper ranking
  return trzista.sort((a: any, b: any) => b.combined_score - a.combined_score)
}

const getTotalAnalyzed = (recommendations: any, type: string) => {
  if (recommendations.type === 'both' && recommendations.total_analyzed) {
    return recommendations.total_analyzed[type] || 0
  }
  return recommendations.total_analyzed || 0
}

const getPartnerName = (partnerId: number) => {
  // Try to get partner name from gamba store
  const partner = gamba.available_partner_data.find((p: any) => p.partner_id === partnerId)
  return partner ? partner.label : `Partner ${partnerId}`
}

const getTrzisteName = (trzisteId: number) => {
  // Try to get trziste name from gamba store
  const trziste = gamba.available_trziste_data.find((t: any) => t.trziste_id === trzisteId)
  return trziste ? trziste.label : `Trziste ${trzisteId}`
}

// Data table headers
const partnerHeaders = [
  { title: 'Rank', key: 'rank', sortable: true },
  { title: 'Partner ID', key: 'partner_id', sortable: false },
  { title: 'Partner Name', key: 'partner_name', sortable: false },
  { title: 'Avg GGR', key: 'avg_ggr', sortable: true },
  { title: 'Avg ROI', key: 'avg_roi', sortable: true },
  { title: 'Avg NP Amount', key: 'avg_np_amount', sortable: true },
  { title: 'Combined Score', key: 'combined_score', sortable: true },
  { title: 'Promotions', key: 'promotion_count', sortable: false },
]

const trzisteHeaders = [
  { title: 'Rank', key: 'rank', sortable: true },
  { title: 'Trziste ID', key: 'trziste_id', sortable: false },
  { title: 'Trziste Name', key: 'trziste_name', sortable: false },
  { title: 'Avg GGR', key: 'avg_ggr', sortable: true },
  { title: 'Avg ROI', key: 'avg_roi', sortable: true },
  { title: 'Avg NP Amount', key: 'avg_np_amount', sortable: true },
  { title: 'Combined Score', key: 'combined_score', sortable: true },
  { title: 'Promotions', key: 'promotion_count', sortable: false },
]

// Functions to add rank to recommendations
const getPartnerRecommendationsWithRank = (recommendations: any) => {
  const partners = getPartnerRecommendations(recommendations)
  return partners.map((partner: any, index: number) => ({
    ...partner,
    originalRank: index + 1, // Original rank based on combined_score
    partner_name: getPartnerName(partner.partner_id),
  }))
}

const getTrzisteRecommendationsWithRank = (recommendations: any) => {
  const trzista = getTrzisteRecommendations(recommendations)
  return trzista.map((trziste: any, index: number) => ({
    ...trziste,
    originalRank: index + 1, // Original rank based on combined_score
    trziste_name: getTrzisteName(trziste.trziste_id),
  }))
}

// Helper function to get risk color
const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'low':
      return 'success'
    case 'medium':
      return 'warning'
    case 'high':
      return 'error'
    default:
      return 'grey'
  }
}

// File handling functions
const handleFileOneChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file_one.value = target.files[0]
  }
}

const handleFileTwoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    file_two.value = target.files[0]
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleFileOneClick = () => {
  fileOneInput.value?.click()
}

const handleFileTwoClick = () => {
  fileTwoInput.value?.click()
}

// Function to load default files
const loadDefaultFiles = async () => {
  try {
    // Load training_data.xlsx
    const trainingDataResponse = await fetch('/data/training_data.xlsx')
    if (trainingDataResponse.ok) {
      const trainingDataBlob = await trainingDataResponse.blob()
      const trainingDataFile = new File([trainingDataBlob], 'training_data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      file_one.value = trainingDataFile
    }

    // Load all_games.xlsx
    const allGamesResponse = await fetch('/data/all_games.xlsx')
    if (allGamesResponse.ok) {
      const allGamesBlob = await allGamesResponse.blob()
      const allGamesFile = new File([allGamesBlob], 'all_games.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      file_two.value = allGamesFile
    }
  } catch (error) {
    console.log('Default files not found or could not be loaded:', error)
  }
}

// Load default files when component mounts - REMOVED
// onMounted(() => {
//   loadDefaultFiles()
// })
</script>

<template>
  <div class="home-container">
    <!-- Modern Header -->
    <!-- Sticky Header Container -->
    <div class="sticky-header-container">
      <!-- Header -->
      <header class="app-header">
        <div class="header-content">
          <div class="header-left">
            <div class="logo-section">
              <div class="logo-icon">
                <img
                  v-if="theme.isDark"
                  src="@/assets/logo-dark.svg"
                  alt="FAZI AI Analytics Logo"
                  class="logo-image"
                />
                <img
                  v-else
                  src="@/assets/logo-light.svg"
                  alt="FAZI AI Analytics Logo"
                  class="logo-image"
                />
              </div>
            </div>
          </div>

          <div class="header-right">
            <button
              @click="theme.toggleTheme()"
              class="theme-toggle-button"
              :title="theme.isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
            >
              <v-icon
                :icon="theme.isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
                class="theme-toggle-icon"
              />
            </button>
          </div>
        </div>
      </header>

      <!-- Tab Navigation Container -->
      <div class="tab-navigation-container">
        <v-tabs
          v-model="tab"
          class="custom-tabs"
          color="primary"
          align-tabs="center"
          density="comfortable"
        >
          <v-tab
            v-for="tabItem in tabs"
            :key="tabItem.value"
            :value="tabItem.value"
            class="custom-tab"
          >
            <v-icon :icon="iconMap[tabItem.icon]" class="tab-icon" />
            <span class="tab-label">{{ tabItem.label }}</span>
          </v-tab>
        </v-tabs>
      </div>
    </div>

    <!-- Tab Content -->
    <v-tabs-window v-model="tab" class="tab-content">
      <!-- Parameters Tab -->
      <v-tabs-window-item :value="1" class="tab-panel animate-fade-in">
        <div class="panel-container">
          <!-- File Upload Section -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-file-document-outline" />
              </div>
              <div>
                <h2 class="section-title">Data Files</h2>
                <p class="section-description">Upload your training and game data files</p>
              </div>
            </div>

            <div class="file-upload-grid">
              <div class="file-upload-card">
                <div class="upload-area pt-6" :class="{ 'has-file': file_one }">
                  <div class="upload-icon">
                    <v-icon icon="mdi-tray-arrow-up" />
                  </div>
                  <h3 class="upload-title">Training Data</h3>
                  <p class="upload-description">Upload your training data Excel file</p>
                  <input
                    type="file"
                    ref="fileOneInput"
                    @change="handleFileOneChange"
                    accept=".xlsx,.xls"
                    class="file-input"
                  />
                  <button class="upload-button" @click="handleFileOneClick">
                    {{ file_one ? 'Change File' : 'Choose File' }}
                  </button>
                  <div v-if="file_one" class="file-info">
                    <div class="file-name">{{ file_one.name }}</div>
                    <div class="file-size">{{ formatFileSize(file_one.size) }}</div>
                  </div>
                </div>
              </div>

              <div class="file-upload-card">
                <div class="upload-area pt-6" :class="{ 'has-file': file_two }">
                  <div class="upload-icon">
                    <v-icon icon="mdi-tray-arrow-up" />
                  </div>
                  <h3 class="upload-title">Game Data</h3>
                  <p class="upload-description">Upload your game data Excel file</p>
                  <input
                    type="file"
                    ref="fileTwoInput"
                    @change="handleFileTwoChange"
                    accept=".xlsx,.xls"
                    class="file-input"
                  />
                  <button class="upload-button" @click="handleFileTwoClick">
                    {{ file_two ? 'Change File' : 'Choose File' }}
                  </button>
                  <div v-if="file_two" class="file-info">
                    <div class="file-name">{{ file_two.name }}</div>
                    <div class="file-size">{{ formatFileSize(file_two.size) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Default Files Button -->
            <div class="default-files-section">
              <button class="default-files-button" @click="loadDefaultFiles">
                <v-icon icon="mdi-file-document-multiple" class="button-icon" />
                Use Default Files
              </button>
              <p class="default-files-description">
                Load default training_data.xlsx and all_games.xlsx files
              </p>
            </div>
          </div>

          <!-- ROI/NP Table Section -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-chart-line" />
              </div>
              <div>
                <h2 class="section-title">ROI/NP Combinations</h2>
                <p class="section-description">Select ROI and NP combinations for analysis</p>
              </div>
            </div>

            <div class="roi-np-table-container">
              <div class="table-wrapper">
                <table class="roi-np-table">
                  <thead>
                    <tr>
                      <th>ROI Range</th>
                      <th>NP Range</th>
                      <th>Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in gamba.roi_np_table_data" :key="`${row.roi_id}-${row.np_id}`">
                      <td>{{ row.roi }}</td>
                      <td>{{ row.np }}</td>
                      <td>
                        <label class="checkbox-container">
                          <input type="checkbox" v-model="row.selected" class="checkbox-input" />
                          <span class="checkmark"></span>
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Market & Partner Selection -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-map-marker-outline" />
              </div>
              <div>
                <h2 class="section-title">Market & Partner Selection</h2>
                <p class="section-description">Choose markets and partners for analysis</p>
              </div>
            </div>

            <div class="filters-grid">
              <div class="filter-group">
                <label class="filter-label">Markets (Trziste)</label>
                <v-autocomplete
                  v-model="trziste_data"
                  :items="gamba.available_trziste_data"
                  item-title="label"
                  item-value="trziste_id"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  placeholder="Select markets..."
                  clearable
                  selected-class="no-highlight"
                  class="vuetify-autocomplete"
                />
              </div>

              <div class="filter-group">
                <label class="filter-label">Partners</label>
                <v-autocomplete
                  v-model="partner_data"
                  :items="gamba.available_partner_data"
                  item-title="label"
                  item-value="partner_id"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  placeholder="Select partners..."
                  clearable
                  selected-class="no-highlight"
                  class="vuetify-autocomplete"
                />
              </div>
            </div>
          </div>

          <!-- Game Filters -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-filter-outline" />
              </div>
              <div>
                <h2 class="section-title">Game Filters</h2>
                <p class="section-description">
                  Filter games by volatility, features, and categories
                </p>
              </div>
            </div>

            <div class="filters-grid">
              <div class="filter-group">
                <label class="filter-label">Game Volatility</label>
                <v-select
                  v-model="selected_volatility"
                  :items="gamba.volatility_data"
                  item-title="label"
                  item-value="volatility_id"
                  variant="outlined"
                  density="comfortable"
                  placeholder="All Volatilities"
                  clearable
                  selected-class="no-highlight"
                  class="vuetify-autocomplete"
                />
              </div>

              <div class="filter-group">
                <label class="filter-label">Game Features</label>
                <v-autocomplete
                  v-model="selected_features"
                  :items="gamba.feature_data"
                  item-title="label"
                  item-value="feature_id"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  placeholder="Select features..."
                  clearable
                  selected-class="no-highlight"
                  class="vuetify-autocomplete"
                />
              </div>

              <div class="filter-group">
                <label class="filter-label">Game Categories</label>
                <v-autocomplete
                  v-model="selected_game_categories"
                  :items="gamba.game_category_data"
                  item-title="label"
                  item-value="game_category_id"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  placeholder="Select categories..."
                  clearable
                  selected-class="no-highlight"
                  class="vuetify-autocomplete"
                />
              </div>
            </div>
          </div>

          <!-- Numeric Filters -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-sort-numeric-variant" />
              </div>
              <div>
                <h2 class="section-title">Numeric Filters</h2>
                <p class="section-description">
                  Set ranges for hit frequency, exposure, and bet amounts
                </p>
              </div>
            </div>

            <div class="numeric-filters-grid">
              <div class="filter-group">
                <label class="filter-label">Hit Frequency Range</label>
                <div class="range-inputs">
                  <input
                    type="number"
                    v-model="hit_frequency_from"
                    placeholder="From"
                    class="range-input"
                    min="0"
                    step="0.01"
                  />
                  <span class="range-separator">-</span>
                  <input
                    type="number"
                    v-model="hit_frequency_to"
                    placeholder="To"
                    class="range-input"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div class="filter-group">
                <label class="filter-label">Max Exposure Range</label>
                <div class="range-inputs">
                  <input
                    type="number"
                    v-model="max_exposure_from"
                    placeholder="From"
                    class="range-input"
                    min="0"
                    step="0.01"
                  />
                  <span class="range-separator">-</span>
                  <input
                    type="number"
                    v-model="max_exposure_to"
                    placeholder="To"
                    class="range-input"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div class="filter-group">
                <label class="filter-label">Min/Max Bet Range</label>
                <div class="range-inputs">
                  <input
                    type="number"
                    v-model="min_max_bet_from"
                    placeholder="From"
                    class="range-input"
                    min="0"
                    step="0.01"
                  />
                  <span class="range-separator">-</span>
                  <input
                    type="number"
                    v-model="min_max_bet_to"
                    placeholder="To"
                    class="range-input"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Date Range Filters -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-calendar-outline" />
              </div>
              <div>
                <h2 class="section-title">Date Range</h2>
                <p class="section-description">Set the date range for game release analysis</p>
              </div>
            </div>

            <div class="filters-grid">
              <div class="filter-group">
                <label class="filter-label">Start Date</label>
                <v-date-input
                  v-model="start_date"
                  variant="outlined"
                  density="comfortable"
                  placeholder="Select start date"
                  clearable
                  class="vuetify-autocomplete"
                />
              </div>

              <div class="filter-group">
                <label class="filter-label">End Date</label>
                <v-date-input
                  v-model="end_date"
                  variant="outlined"
                  density="comfortable"
                  placeholder="Select end date"
                  clearable
                  class="vuetify-autocomplete"
                />
              </div>
            </div>
          </div>

          <!-- Calculate Button Section -->
          <div class="section-card">
            <div class="action-section">
              <button class="action-button" @click="simulateCalculate" :disabled="loading_data">
                <div v-if="loading_data" class="loading-spinner"></div>
                <span v-else>Calculate</span>
              </button>

              <button
                v-if="chatStore.hasMockData"
                class="action-button secondary"
                @click="useMockData"
                :disabled="loading_data"
              >
                📊 Use Mock Data
              </button>
            </div>
          </div>
        </div>
      </v-tabs-window-item>

      <!-- Results Tab -->
      <v-tabs-window-item :value="2" class="tab-panel animate-fade-in">
        <div class="panel-container">
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-chart-line" />
              </div>
              <div>
                <h2 class="section-title">Analysis Results</h2>
                <p class="section-description">View your calculation results and charts</p>
              </div>
            </div>

            <v-overlay v-model="loading_data" class="align-center justify-center" persistent>
              <div class="loading-content">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="48"
                  width="4"
                  class="loading-spinner-large"
                />
                <div class="loading-text">Processing your data...</div>
              </div>
            </v-overlay>

            <div v-if="result_data" class="results-container">
              <div
                v-for="group in result_data.grouped_training_data"
                :key="group.id"
                class="result-group"
              >
                <div class="group-header">
                  <h3 class="group-title">
                    ROI:
                    {{ group.roi_ids.map((id: number) => gamba.getROILabelFromID(id)).join(', ') }}
                  </h3>
                  <p class="group-subtitle">NP: {{ gamba.getNPLabelFromID(group.np_id) }}</p>
                </div>
                <div class="chart-container">
                  <canvas :id="`test-${group.id}`"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-tabs-window-item>

      <!-- Best Performing Tab -->
      <v-tabs-window-item :value="3" class="tab-panel animate-fade-in">
        <div class="panel-container">
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-trophy-outline" />
              </div>
              <div>
                <h2 class="section-title">Best Performing Analysis</h2>
                <p class="section-description">Top performing partners and markets</p>
              </div>
            </div>

            <div
              v-if="result_data && result_data.best_performing_analysis"
              class="analysis-results"
            >
              <div
                v-for="group in result_data.best_performing_analysis"
                :key="group.group_id"
                class="analysis-group"
              >
                <div class="group-header">
                  <h3 class="group-title">
                    ROI:
                    {{ group.roi_ids.map((id: number) => gamba.getROILabelFromID(id)).join(', ') }}
                  </h3>
                  <p class="group-subtitle">NP: {{ gamba.getNPLabelFromID(group.np_id) }}</p>
                </div>

                <div v-if="!group.recommendations.analysis_skipped" class="recommendations">
                  <h4 class="recommendations-title">{{ group.recommendations.message }}</h4>

                  <!-- Partners Table -->
                  <div
                    v-if="
                      group.recommendations.type === 'partners' ||
                      group.recommendations.type === 'both'
                    "
                    class="table-section"
                  >
                    <h5 class="table-title">Best Performing Partners</h5>
                    <div class="modern-table">
                      <div class="table-header">
                        <div class="table-cell">Rank</div>
                        <div class="table-cell">Partner</div>
                        <div class="table-cell sortable" @click="sortTable('avg_ggr')">
                          Avg GGR
                          <span v-if="sortColumn === 'avg_ggr'" class="sort-indicator">
                            {{ sortDirection === 'asc' ? '↑' : '↓' }}
                          </span>
                        </div>
                        <div class="table-cell sortable" @click="sortTable('avg_roi')">
                          Avg ROI
                          <span v-if="sortColumn === 'avg_roi'" class="sort-indicator">
                            {{ sortDirection === 'asc' ? '↑' : '↓' }}
                          </span>
                        </div>
                        <div class="table-cell sortable" @click="sortTable('combined_score')">
                          Score
                          <span v-if="sortColumn === 'combined_score'" class="sort-indicator">
                            {{ sortDirection === 'asc' ? '↑' : '↓' }}
                          </span>
                        </div>
                      </div>
                      <div
                        v-for="partner in getSortedPartners(
                          getPartnerRecommendationsWithRank(group.recommendations),
                        )"
                        :key="partner.partner_id"
                        class="table-row"
                      >
                        <div class="table-cell rank">{{ partner.rank }}</div>
                        <div class="table-cell">{{ partner.partner_name }}</div>
                        <div class="table-cell">{{ formatNumber(partner.avg_ggr) }}</div>
                        <div class="table-cell">{{ formatNumber(partner.avg_roi) }}</div>
                        <div class="table-cell score">
                          {{ formatNumber(partner.combined_score) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-tabs-window-item>

      <!-- Predictions Tab -->
      <v-tabs-window-item :value="4" class="tab-panel animate-fade-in">
        <div class="panel-container">
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-trending-up" />
              </div>
              <div>
                <h2 class="section-title">Predictions & Recommendations</h2>
                <p class="section-description">AI-powered insights and forecasts</p>
              </div>
            </div>

            <div
              v-if="result_data && result_data.calculated_data_by_group"
              class="predictions-container"
            >
              <div
                v-for="group in result_data.calculated_data_by_group"
                :key="`predictions-${group.np_id}-${group.roi_ids.join('-')}`"
                class="prediction-group"
              >
                <div class="group-header">
                  <h3 class="group-title">
                    ROI:
                    {{ group.roi_ids.map((id: number) => gamba.getROILabelFromID(id)).join(', ') }}
                  </h3>
                  <p class="group-subtitle">NP: {{ gamba.getNPLabelFromID(group.np_id) }}</p>
                </div>

                <div class="predictions-grid">
                  <!-- Promotion Recommendation Card -->
                  <div class="prediction-card">
                    <div class="card-header">
                      <div class="card-icon">
                        <v-icon icon="mdi-trending-up" />
                      </div>
                      <h4 class="card-title">Promotion Recommendation</h4>
                    </div>
                    <div v-if="group['Promotion Recommendation']" class="card-content">
                      <div class="range-container">
                        <div class="range-most-likely">
                          {{ formatNumber(group['Promotion Recommendation'].range.most_likely) }}
                        </div>
                        <div class="range-line">
                          <div class="range-min">
                            {{ formatNumber(group['Promotion Recommendation'].range.min) }}
                          </div>
                          <div class="range-line-visual">
                            <div class="range-point range-point-min"></div>
                            <div class="range-line-segment"></div>
                            <div class="range-point range-point-most-likely"></div>
                            <div class="range-line-segment"></div>
                            <div class="range-point range-point-max"></div>
                          </div>
                          <div class="range-max">
                            {{ formatNumber(group['Promotion Recommendation'].range.max) }}
                          </div>
                        </div>
                        <div class="metric-label">Recommended Amount</div>
                        <div class="confidence-badge">
                          {{ formatNumber(group['Promotion Recommendation'].confidence) }}%
                          confidence
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- GGR Prediction Card -->
                  <div class="prediction-card">
                    <div class="card-header">
                      <div class="card-icon">
                        <v-icon icon="mdi-chart-line" />
                      </div>
                      <h4 class="card-title">GGR Prediction</h4>
                    </div>
                    <div v-if="group['GGR Prediction']" class="card-content">
                      <div class="range-container">
                        <div class="range-most-likely">
                          {{ formatNumber(group['GGR Prediction'].range.most_likely) }}
                        </div>
                        <div class="range-line">
                          <div class="range-min">
                            {{ formatNumber(group['GGR Prediction'].range.min) }}
                          </div>
                          <div class="range-line-visual">
                            <div class="range-point range-point-min"></div>
                            <div class="range-line-segment"></div>
                            <div class="range-point range-point-most-likely"></div>
                            <div class="range-line-segment"></div>
                            <div class="range-point range-point-max"></div>
                          </div>
                          <div class="range-max">
                            {{ formatNumber(group['GGR Prediction'].range.max) }}
                          </div>
                        </div>
                        <div class="metric-label">Predicted GGR</div>
                        <div class="confidence-badge">
                          {{ formatNumber(group['GGR Prediction'].confidence) }}% confidence
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- NP Prediction Card -->
                  <div class="prediction-card">
                    <div class="card-header">
                      <div class="card-icon">
                        <v-icon icon="mdi-swap-vertical" />
                      </div>
                      <h4 class="card-title">NP Amount Prediction</h4>
                    </div>
                    <div v-if="group['NP Prediction']" class="card-content">
                      <div class="range-container">
                        <div class="range-most-likely">
                          {{ formatNumber(group['NP Prediction'].range.most_likely) }}
                        </div>
                        <div class="range-line">
                          <div class="range-min">
                            {{ formatNumber(group['NP Prediction'].range.min) }}
                          </div>
                          <div class="range-line-visual">
                            <div class="range-point range-point-min"></div>
                            <div class="range-line-segment"></div>
                            <div class="range-point range-point-most-likely"></div>
                            <div class="range-line-segment"></div>
                            <div class="range-point range-point-max"></div>
                          </div>
                          <div class="range-max">
                            {{ formatNumber(group['NP Prediction'].range.max) }}
                          </div>
                        </div>
                        <div class="metric-label">Predicted NP Amount</div>
                        <div class="confidence-badge">
                          {{ formatNumber(group['NP Prediction'].confidence) }}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-tabs-window-item>

      <!-- Chat Tab -->
      <v-tabs-window-item :value="5" class="tab-panel tab-panel-chat animate-fade-in">
        <div class="panel-container">
          <!-- No Data Warning -->
          <div v-if="!chatStore.hasCalculateData" class="section-card mt-8">
            <div class="section-header">
              <div class="section-icon">
                <v-icon icon="mdi-robot-outline" />
              </div>
              <div>
                <h2 class="section-title">AI Chat Assistant</h2>
                <p class="section-description">No analysis data available for AI assistance</p>
              </div>
            </div>
          </div>

          <!-- Chat Interface -->
          <div v-else class="chat-interface">
            <!-- Messages Container -->
            <div ref="messagesContainer" class="messages-container">
              <!-- Messages -->
              <div
                v-for="message in chatStore.messages"
                :key="message.id"
                :class="['message', `message-${message.role}`]"
              >
                <v-avatar
                  :color="message.role === 'assistant' ? 'primary' : 'secondary'"
                  size="40"
                  class="message-avatar"
                >
                  <v-icon
                    :icon="message.role === 'assistant' ? 'mdi-robot-outline' : 'mdi-account'"
                    color="white"
                  />
                </v-avatar>
                <div class="message-content">
                  <div class="message-text" v-html="formatMessage(message.content)"></div>
                  <!-- Typing indicator for streaming messages -->
                  <div
                    v-if="message.isStreaming && message.role === 'assistant'"
                    class="typing-cursor"
                  >
                    <span class="cursor-blink">|</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Input Area -->
            <div class="input-area">
              <div v-if="chatStore.error" class="error-message">
                <v-icon icon="mdi-alert-circle" class="error-icon" />
                {{ chatStore.error }}
              </div>

              <div class="input-container">
                <v-textarea
                  ref="messageInput"
                  v-model="currentMessage"
                  placeholder="Ask a question about your analysis data..."
                  class="message-input"
                  @keydown="handleKeyDown"
                  rows="1"
                  auto-grow
                  variant="outlined"
                  hide-details
                  density="compact"
                  rounded="lg"
                  color="primary"
                  bg-color="transparent"
                  flat
                ></v-textarea>
                <v-btn
                  @click="loadChatMockData"
                  :disabled="!chatStore.hasChatMockData"
                  icon="mdi-database-import"
                  class="mock-data-button"
                  size="small"
                  color="secondary"
                  variant="outlined"
                  rounded="lg"
                  :title="
                    chatStore.hasChatMockData
                      ? `Load chat mock data (${chatStore.chatMockDataInfo?.messageCount || 0} messages)`
                      : 'No chat mock data available'
                  "
                />
                <v-btn
                  @click="sendMessage"
                  :disabled="!currentMessage.trim()"
                  icon="mdi-send"
                  class="send-button"
                  size="small"
                  color="primary"
                  variant="flat"
                  rounded="lg"
                />
              </div>
            </div>
          </div>
        </div>
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
}

.add-file {
  margin-bottom: 20px;
}

.v-table {
  margin-top: 30px;
}

.v-table th {
  font-weight: bold;
  text-align: left;
}

.v-table td {
  text-align: left;
  padding: 8px 16px;
}

.font-weight-bold {
  font-weight: bold;
}

.text-caption {
  font-size: 0.75rem;
  opacity: 0.7;
}

.mb-15 {
  margin-bottom: 60px;
}

.prediction-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.prediction-card .v-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  white-space: normal !important;
  line-height: 1.3 !important;
  min-height: auto !important;
}

.card-title span {
  display: inline-block;
  word-wrap: break-word;
}

/* Modern Header Styles */
.home-container {
  min-height: 100vh;
  background: var(--bg-primary);
}

/* Sticky Header Container */
.sticky-header-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--surface);
}

.app-header {
  background: var(--surface);
  padding: var(--space-lg);
  backdrop-filter: blur(20px);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.logo-icon {
  width: 40px;
  height: 40px;
  color: var(--primary-400);
  animation: pulse 2s ease-in-out infinite;
}

.logo-image {
  height: 40px;
  width: auto;
  object-fit: contain;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

/* Theme Toggle Button */
.theme-toggle-button {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  position: relative;
  overflow: hidden;
}

.theme-toggle-button:hover {
  background: var(--surface);
  border-color: var(--primary-500);
  box-shadow: var(--shadow-md);
}

.theme-toggle-button:active {
  transform: translateY(0);
}

.theme-toggle-icon {
  font-size: 20px;
  transition: all var(--transition-normal);
}

.theme-toggle-button:hover .theme-toggle-icon {
  color: var(--primary-400);
  transform: scale(1.1);
}

/* Tab Navigation Container */
.tab-navigation-container {
  background: var(--surface-elevated) !important;
  border-bottom: 1px solid var(--border) !important;
  width: 100% !important;
}

/* Vuetify Tabs Custom Styling */
.custom-tabs {
  background: transparent !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  min-height: 80px !important;
  max-width: 1400px !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.custom-tabs :deep(.v-tabs-bar) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 24px !important;
  height: 80px !important;
}

.custom-tabs :deep(.v-tab) {
  flex: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 12px !important;
  padding: 0 24px !important;
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  color: var(--text-secondary) !important;
  font-weight: 500 !important;
  font-size: 14px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  position: relative !important;
  overflow: visible !important;
  min-width: auto !important;
  text-transform: none !important;
  height: 80px !important;
}

.custom-tabs :deep(.v-tab:hover) {
  background: transparent !important;
  color: var(--text-primary) !important;
}

.custom-tabs :deep(.v-tab--selected) {
  background: transparent !important;
  color: var(--primary-400) !important;
  box-shadow: none !important;
}

.custom-tabs :deep(.v-tab--selected::after) {
  content: '' !important;
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 3px !important;
  background: var(--primary-500) !important;
  border-radius: 0 !important;
}

.custom-tabs :deep(.v-tab .tab-icon) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 18px !important;
  margin-right: 8px !important;
}

.custom-tabs :deep(.v-tab .tab-label) {
  font-weight: 500 !important;
  white-space: nowrap !important;
}

.custom-tabs :deep(.v-tabs-slider) {
  display: none !important;
}

/* Content Area */
.tab-content {
  background: var(--bg-primary);
  min-height: calc(100vh - 160px);
  padding-top: 170px; /* Space for fixed header + tabs */
}

.tab-content :deep(.v-tabs-window) {
  background: transparent !important;
}

.tab-content :deep(.v-tabs-window-item) {
  background: transparent !important;
}

.v-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-xl);
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-content {
    padding: 0 var(--space-md);
  }

  .app-title {
    font-size: 1.2rem;
  }

  .theme-toggle-button {
    width: 40px;
    height: 40px;
  }

  .theme-toggle-icon {
    font-size: 18px;
  }

  .tab-navigation-container {
    margin-bottom: 16px !important;
  }

  .custom-tabs {
    min-height: 60px !important;
  }

  .custom-tabs :deep(.v-tabs-bar) {
    padding: 0 var(--space-md) !important;
    overflow-x: auto !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    height: 60px !important;
  }

  .custom-tabs :deep(.v-tabs-bar)::-webkit-scrollbar {
    display: none !important;
  }

  .custom-tabs :deep(.v-tab) {
    flex-shrink: 0 !important;
    padding: 0 12px !important;
    height: 60px !important;
  }

  .custom-tabs :deep(.v-tab .tab-label) {
    display: none !important;
  }

  .v-container {
    padding: var(--space-md);
  }
}

@media (max-width: 480px) {
  .logo-section {
    gap: var(--space-sm);
  }

  .logo-icon {
    width: 32px;
    height: 32px;
  }

  .logo-image {
    height: 32px;
  }

  .app-title {
    font-size: 1rem;
  }

  .theme-toggle-button {
    width: 36px;
    height: 36px;
  }

  .theme-toggle-icon {
    font-size: 16px;
  }
}

/* Tab Content Styles */
.tab-content {
  min-height: calc(100vh - 160px);
  background: var(--dark-bg-primary);
  padding-top: 170px; /* Space for fixed header + tabs */
}

.tab-panel {
  padding: var(--space-xl);
}

.tab-panel-chat {
  padding: 0;
}

.tab-panel-chat .input-area {
  padding-bottom: 0;
}

.panel-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

/* Section Card Styles */
.section-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.section-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--theme-gradient-start), var(--theme-gradient-end));
}

.section-card:hover {
  border-color: var(--theme-accent-primary);
  box-shadow: var(--shadow-lg);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.section-icon {
  width: 56px;
  height: 56px;
  color: var(--theme-accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-shadow-color);
  border-radius: var(--radius-lg);
}

.section-icon .v-icon {
  font-size: 32px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.section-description {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.9rem;
}

/* File Upload Styles */
.file-upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.file-upload-card {
  background: var(--surface-elevated);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  transition: all var(--transition-normal);
  position: relative;
}

.file-upload-card:hover {
  border-color: var(--theme-accent-primary);
  background: var(--theme-shadow-color);
}

.upload-area {
  text-align: center;
  position: relative;
}

.upload-area.has-file {
  border-color: var(--theme-accent-primary);
  background: var(--theme-shadow-color);
}

.upload-icon {
  width: 64px;
  height: 64px;
  color: var(--theme-accent-primary);
  margin: 0 auto var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-shadow-color);
  border-radius: var(--radius-lg);
}

.upload-icon .v-icon {
  font-size: 40px;
}

.upload-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.upload-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 var(--space-lg) 0;
}

.file-input {
  display: none;
}

.upload-button {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-lg);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  font-size: 0.9rem;
}

.upload-button:hover {
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, var(--primary-400), var(--primary-500));
}

.file-info {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.file-name {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: var(--space-xs);
  word-break: break-all;
}

.file-size {
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

/* Default Files Section */
.default-files-section {
  margin-top: var(--space-lg);
  text-align: center;
  padding: var(--space-lg);
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.default-files-button {
  background: linear-gradient(135deg, var(--secondary-500), var(--secondary-600));
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-xl);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.default-files-button:hover {
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, var(--secondary-400), var(--secondary-500));
  transform: translateY(-1px);
}

.default-files-button .button-icon {
  font-size: 1.2rem;
}

.default-files-description {
  margin-top: var(--space-sm);
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0;
}

/* Modern Form Styles */
.modern-form-group {
  margin-bottom: var(--space-xl);
}

.form-label {
  display: block;
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  font-size: 0.9rem;
}

.modern-select {
  width: 100%;
  background: var(--surface-elevated);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all var(--transition-normal);
  outline: none;
}

.modern-select:focus {
  border-color: var(--theme-accent-primary);
  box-shadow: 0 0 0 3px var(--theme-shadow-color);
  background: var(--surface);
}

.modern-select option {
  background: var(--surface);
  color: var(--text-primary);
}

/* Action Button Styles */
.action-button {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-xl);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 48px;
  font-size: 1rem;
}

.action-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left var(--transition-slow);
}

.action-button:hover:not(:disabled)::before {
  left: 100%;
}

.action-button:hover:not(:disabled) {
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--primary-400), var(--primary-500));
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.action-button.loading {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
}

/* Loading States */

.loading-content {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  text-align: center;
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.loading-text {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 1.1rem;
}

/* Responsive Design for New Components */
@media (max-width: 768px) {
  .file-upload-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .section-icon {
    width: 40px;
    height: 40px;
  }

  .section-icon .v-icon {
    font-size: 28px;
  }

  .section-title {
    font-size: 1.2rem;
  }

  .upload-icon {
    width: 48px;
    height: 48px;
  }

  .upload-icon .v-icon {
    font-size: 36px;
  }

  .tab-panel {
    padding: var(--space-md);
  }
}

@media (max-width: 480px) {
  .section-card {
    padding: var(--space-lg);
  }

  .file-upload-card {
    padding: var(--space-lg);
  }

  .upload-button {
    width: 100%;
  }
}

/* Additional Component Styles */
.action-section {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  margin: var(--space-xl) 0;
  flex-wrap: wrap;
}

.action-button.secondary {
  background: var(--color-surface-variant);
  color: var(--color-on-surface-variant);
  border: 1px solid var(--color-outline);
}

.action-button.secondary:hover:not(:disabled) {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  border-color: var(--color-primary);
}

.results-container {
  margin-top: var(--space-xl);
}

.result-group {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: 40px;
}

.group-header {
  margin-bottom: var(--space-lg);
  text-align: center;
}

.group-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.group-subtitle {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.9rem;
}

.chart-container {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--border);
}

.analysis-results {
  margin-top: var(--space-xl);
}

.analysis-group {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: 40px;
}

.recommendations {
  margin-top: var(--space-lg);
}

.recommendations-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-lg) 0;
}

.table-section {
  margin-bottom: var(--space-xl);
}

.table-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-md) 0;
}

.modern-table {
  background: var(--surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
}

.table-header {
  display: grid;
  grid-template-columns: 80px 1fr 120px 120px 120px;
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border);
}

.table-row {
  display: grid;
  grid-template-columns: 80px 1fr 120px 120px 120px;
  border-bottom: 1px solid var(--border);
  transition: background-color var(--transition-fast);
}

.table-row:hover {
  background: var(--surface-elevated);
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  padding: var(--space-md);
  color: var(--text-primary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
}

.table-cell.sortable {
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
  position: relative;
}

.table-cell.sortable:hover {
  color: var(--primary-400);
}

.sort-indicator {
  margin-left: var(--space-xs);
  color: var(--primary-500);
  font-weight: bold;
}

.table-cell.rank {
  font-weight: 600;
  color: var(--primary-400);
}

.table-cell.score {
  font-weight: 600;
  color: var(--success-400);
}

.predictions-container {
  margin-top: var(--space-xl);
}

.prediction-group {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: 40px;
}

.predictions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-lg);
  margin-top: var(--space-lg);
}

.prediction-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.prediction-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary-500), var(--secondary-500));
}

.prediction-card:hover {
  border-color: var(--primary-500);
  box-shadow: var(--shadow-lg);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.card-icon {
  width: 32px;
  height: 32px;
  color: var(--theme-accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-shadow-color);
  border-radius: var(--radius-md);
}

.card-icon .v-icon {
  font-size: 20px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-content {
  text-align: center;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-400);
  margin-bottom: var(--space-sm);
}

.metric-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: var(--space-md);
}

.confidence-badge {
  display: inline-block;
  background: var(--theme-shadow-color);
  color: var(--theme-accent-primary);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 600;
}

/* Range Display Styles */
.range-container {
  text-align: center;
}

.range-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
  position: relative;
}

.range-min,
.range-max {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 60px;
}

.range-line-visual {
  display: flex;
  align-items: center;
  flex: 1;
  margin: 0 var(--space-md);
  position: relative;
  height: 20px;
}

.range-line-segment {
  flex: 1;
  height: 2px;
  background: var(--border);
  position: relative;
}

.range-point {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: relative;
  z-index: 2;
}

.range-point-min {
  background: var(--warning-400);
  border: 2px solid var(--warning-500);
}

.range-point-max {
  background: var(--warning-400);
  border: 2px solid var(--warning-500);
}

.range-point-most-likely {
  background: var(--primary-500);
  border: 2px solid var(--primary-600);
  width: 12px;
  height: 12px;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.range-most-likely {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-400);
  margin-bottom: var(--space-sm);
  position: relative;
}

.range-most-likely::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid var(--primary-400);
}

/* Responsive Design for New Components */
@media (max-width: 768px) {
  .predictions-grid {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: 60px 1fr 100px 100px 100px;
  }

  .table-cell {
    padding: var(--space-sm);
    font-size: 0.8rem;
  }

  .metric-value {
    font-size: 1.5rem;
  }

  .range-most-likely {
    font-size: 1.5rem;
  }

  .range-min,
  .range-max {
    font-size: 0.7rem;
    min-width: 50px;
  }

  .range-line-visual {
    margin: 0 var(--space-sm);
  }
}

@media (max-width: 480px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: var(--space-xs);
  }

  .table-cell {
    padding: var(--space-xs);
    border-bottom: 1px solid var(--border);
  }

  .table-cell:last-child {
    border-bottom: none;
  }

  .card-header {
    flex-direction: column;
    text-align: center;
    gap: var(--space-sm);
  }
}

/* Filter Components Styles */
.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-xl);
}

.numeric-filters-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.filter-label {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: var(--space-sm);
}

.multi-select-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-sm);
  max-height: 200px;
  overflow-y: auto;
  padding: var(--space-sm);
  background: var(--surface-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.checkbox-item {
  display: flex;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
  width: fit-content;
}

.checkbox-container:hover {
  background: var(--theme-shadow-color);
}

.checkbox-input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  position: relative;
  transition: all var(--transition-fast);
  background: var(--surface);
}

.checkbox-input:checked + .checkmark {
  background: var(--primary-500);
  border-color: var(--primary-500);
}

.checkbox-input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.range-input {
  flex: 1;
  background: var(--surface-elevated);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all var(--transition-normal);
  outline: none;
}

.range-input:focus {
  border-color: var(--theme-accent-primary);
  box-shadow: 0 0 0 3px var(--theme-shadow-color);
  background: var(--surface);
}

.range-separator {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
}

/* ROI/NP Table Styles */
.roi-np-table-container {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.table-wrapper {
  min-width: 100%;
}

.roi-np-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
}

.roi-np-table th {
  background: var(--surface-elevated);
  color: var(--text-primary);
  font-weight: 600;
  padding: var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.roi-np-table td {
  padding: var(--space-md);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.roi-np-table tr:hover {
  background: var(--surface-elevated);
}

.roi-np-table tr:last-child td {
  border-bottom: none;
}

/* Responsive Design for Filters */
@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .multi-select-container {
    grid-template-columns: 1fr;
    max-height: 150px;
  }

  .range-inputs {
    flex-direction: column;
    gap: var(--space-sm);
  }

  .range-separator {
    display: none;
  }

  .roi-np-table-container {
    font-size: 0.8rem;
  }

  .roi-np-table th,
  .roi-np-table td {
    padding: var(--space-sm);
  }
}

@media (max-width: 480px) {
  .checkbox-container {
    padding: var(--space-xs);
  }

  .checkbox-label {
    font-size: 0.8rem;
  }

  .range-input {
    padding: var(--space-sm);
    font-size: 0.9rem;
  }
}

/* Vuetify Autocomplete & Select Styles */
.vuetify-autocomplete {
  width: 100%;
}

.vuetify-autocomplete :deep(.v-field) {
  background: var(--surface-elevated) !important;
  border: 2px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
  color: var(--text-primary) !important;
}

.vuetify-autocomplete :deep(.v-field:hover) {
  border-color: var(--primary-500) !important;
  background: var(--surface) !important;
}

.vuetify-autocomplete :deep(.v-field--focused) {
  border-color: var(--theme-accent-primary) !important;
  box-shadow: 0 0 0 3px var(--theme-shadow-color) !important;
}

.vuetify-autocomplete :deep(.v-field__input) {
  color: var(--text-primary) !important;
  padding: var(--space-md) !important;
}

.vuetify-autocomplete :deep(.v-field__outline) {
  display: none !important;
}

.vuetify-autocomplete :deep(.v-chip) {
  background: var(--primary-500) !important;
  color: white !important;
  border-radius: var(--radius-md) !important;
}

.vuetify-autocomplete :deep(.v-chip__close) {
  color: white !important;
}

.vuetify-autocomplete :deep(.v-list) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
}

.vuetify-autocomplete :deep(.v-list-item) {
  color: var(--text-primary) !important;
  background: var(--surface) !important;
}

.vuetify-autocomplete :deep(.v-list-item:hover) {
  background: var(--surface-elevated) !important;
}

/* Force all list items to have same appearance - override everything */
.vuetify-autocomplete :deep(.v-list-item),
.vuetify-autocomplete :deep(.v-list-item--active),
.vuetify-autocomplete :deep(.v-list-item:hover),
.vuetify-autocomplete :deep(.v-list-item:focus),
.vuetify-autocomplete :deep(.v-list-item[aria-selected='true']),
.vuetify-autocomplete :deep(.v-list-item[data-selected='true']),
.vuetify-autocomplete :deep(.v-list-item[style*='background']),
.vuetify-autocomplete :deep(.v-list-item[style*='color']) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
  background-color: var(--surface) !important;
}

/* Override any inline styles */
.vuetify-autocomplete :deep(.v-list-item[style]) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
  background-color: var(--surface) !important;
}

/* Custom no-highlight class for selected items */
.no-highlight {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
  background-color: var(--surface) !important;
}

/* Override Vuetify's default selected styling */
:deep(.no-highlight) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
  background-color: var(--surface) !important;
}

/* Remove text highlight in search results - more specific selectors */
.vuetify-autocomplete :deep(.v-list-item mark),
.vuetify-autocomplete :deep(.v-list-item .v-highlight),
.vuetify-autocomplete :deep(.v-list-item [class*='highlight']),
.vuetify-autocomplete :deep(.v-list-item span[style*='background']),
.vuetify-autocomplete :deep(.v-list-item span[style*='color']) {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
  font-weight: 600 !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
}

/* Override any inline styles for highlight */
.vuetify-autocomplete :deep(.v-list-item mark[style]),
.vuetify-autocomplete :deep(.v-list-item span[style]) {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
}

/* Global text highlight removal with maximum specificity */
:deep(.v-list-item mark),
:deep(.v-list-item .v-highlight),
:deep(.v-list-item [class*='highlight']),
:deep(.v-list-item span[style*='background']),
:deep(.v-list-item span[style*='color']) {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
  font-weight: 600 !important;
}

/* Force override with maximum specificity */
.vuetify-autocomplete :deep(.v-list-item) mark,
.vuetify-autocomplete :deep(.v-list-item) span {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
}

/* Try to override with pseudo-elements */
.vuetify-autocomplete :deep(.v-list-item mark::before),
.vuetify-autocomplete :deep(.v-list-item mark::after) {
  display: none !important;
}

/* Nuclear option - override everything */
.vuetify-autocomplete :deep(.v-list-item *),
.vuetify-autocomplete :deep(.v-list-item *::before),
.vuetify-autocomplete :deep(.v-list-item *::after) {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
}

/* Specific override for any highlighted text */
.vuetify-autocomplete :deep(.v-list-item) *[style*='background'] {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
}

/* Use custom CSS variables for highlight styling */
:root {
  --v-highlight-text: var(--highlight-text);
  --v-highlight-bg: var(--highlight-bg);
}

/* Force override Vuetify's inline styles with maximum specificity */
.v-application .v-list-item mark,
.v-application .v-list-item .v-highlight,
.v-application .v-list-item [class*='highlight'],
.v-application .v-autocomplete__content .v-list-item mark,
.v-application .v-autocomplete__content .v-list-item .v-highlight,
.v-application .v-autocomplete__content .v-list-item [class*='highlight'],
.v-application .v-select__content .v-list-item mark,
.v-application .v-select__content .v-list-item .v-highlight,
.v-application .v-select__content .v-list-item [class*='highlight'] {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
  font-weight: 600 !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
}

/* Additional override for Vuetify's inline styles */
.v-application .v-list-item mark[style],
.v-application .v-list-item .v-highlight[style],
.v-application .v-list-item [class*='highlight'][style],
.v-application .v-autocomplete__content .v-list-item mark[style],
.v-application .v-autocomplete__content .v-list-item .v-highlight[style],
.v-application .v-autocomplete__content .v-list-item [class*='highlight'][style] {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
}

/* Maximum specificity override for any highlight element */
html .v-application .v-list-item mark,
html .v-application .v-list-item .v-highlight,
html .v-application .v-list-item [class*='highlight'],
html .v-application .v-autocomplete__content .v-list-item mark,
html .v-application .v-autocomplete__content .v-list-item .v-highlight,
html .v-application .v-autocomplete__content .v-list-item [class*='highlight'] {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
  font-weight: 600 !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
}

/* Target all possible Vuetify highlight selectors */
.v-list-item .v-highlight,
.v-list-item .v-highlight--text,
.v-list-item .v-highlight--background,
.v-autocomplete__content .v-list-item .v-highlight,
.v-autocomplete__content .v-list-item .v-highlight--text,
.v-autocomplete__content .v-list-item .v-highlight--background,
.v-select__content .v-list-item .v-highlight,
.v-select__content .v-list-item .v-highlight--text,
.v-select__content .v-list-item .v-highlight--background {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
  font-weight: 600 !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
}

/* Override Vuetify's default highlight styles using CSS variables */
.v-list-item mark,
.v-list-item .v-highlight,
.v-list-item [class*='highlight'] {
  background: var(--highlight-bg) !important;
  background-color: var(--highlight-bg) !important;
  color: var(--highlight-text) !important;
  font-weight: 600 !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
}

.vuetify-autocomplete :deep(.v-overlay__content) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-menu__content) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-select__content),
.vuetify-autocomplete :deep(.v-date-input__content),
.vuetify-autocomplete :deep(.v-date-picker__content) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-field__input) {
  color: var(--text-primary) !important;
}

.vuetify-autocomplete :deep(.v-field__input::placeholder) {
  color: var(--text-secondary) !important;
}

/* Additional VAutocomplete dropdown styling */
.vuetify-autocomplete :deep(.v-autocomplete__content) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list),
.vuetify-autocomplete :deep(.v-select__content .v-list),
.vuetify-autocomplete :deep(.v-date-input__content .v-list),
.vuetify-autocomplete :deep(.v-date-picker__content .v-list) {
  background: var(--surface) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list-item),
.vuetify-autocomplete :deep(.v-select__content .v-list-item),
.vuetify-autocomplete :deep(.v-date-input__content .v-list-item),
.vuetify-autocomplete :deep(.v-date-picker__content .v-list-item) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list-item:hover),
.vuetify-autocomplete :deep(.v-select__content .v-list-item:hover),
.vuetify-autocomplete :deep(.v-date-input__content .v-list-item:hover),
.vuetify-autocomplete :deep(.v-date-picker__content .v-list-item:hover) {
  background: var(--surface-elevated) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list-item--active),
.vuetify-autocomplete :deep(.v-select__content .v-list-item--active),
.vuetify-autocomplete :deep(.v-date-input__content .v-list-item--active),
.vuetify-autocomplete :deep(.v-date-picker__content .v-list-item--active) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
}

/* Global VAutocomplete, VSelect, VDateInput & VDatePicker styling */
:deep(.v-autocomplete__content),
:deep(.v-select__content),
:deep(.v-date-input__content),
:deep(.v-date-picker__content) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

:deep(.v-autocomplete__content .v-list),
:deep(.v-select__content .v-list),
:deep(.v-date-input__content .v-list),
:deep(.v-date-picker__content .v-list) {
  background: var(--surface) !important;
}

:deep(.v-autocomplete__content .v-list-item),
:deep(.v-select__content .v-list-item),
:deep(.v-date-input__content .v-list-item),
:deep(.v-date-picker__content .v-list-item) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
}

:deep(.v-autocomplete__content .v-list-item:hover),
:deep(.v-select__content .v-list-item:hover),
:deep(.v-date-input__content .v-list-item:hover),
:deep(.v-date-picker__content .v-list-item:hover) {
  background: var(--surface-elevated) !important;
}

:deep(.v-autocomplete__content .v-list-item--active),
:deep(.v-select__content .v-list-item--active),
:deep(.v-date-input__content .v-list-item--active),
:deep(.v-date-picker__content .v-list-item--active) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
}

/* Completely remove all highlight styles */
:deep(.v-list-item--active),
:deep(.v-list-item.v-list-item--active),
:deep(.v-menu__content .v-list-item--active),
:deep(.v-overlay__content .v-list-item--active),
:deep(.v-list-item[aria-selected='true']),
:deep(.v-list-item[data-selected='true']),
:deep(.v-list-item[aria-selected='true']),
:deep(.v-list-item[data-selected='true']) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
}

/* Remove any focus or selection styles */
:deep(.v-list-item:focus),
:deep(.v-list-item:focus-visible),
:deep(.v-list-item[tabindex='0']:focus) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
  outline: none !important;
}

/* VDatePicker Calendar Specific Styles */
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-header) {
  background: var(--surface-elevated) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border) !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-weekday) {
  color: var(--text-secondary) !important;
  background: var(--surface) !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day) {
  color: var(--text-primary) !important;
  background: var(--surface) !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day:hover) {
  background: var(--surface-elevated) !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day--selected) {
  background: var(--primary-500) !important;
  color: white !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day--today) {
  background: var(--primary-400) !important;
  color: white !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-btn) {
  color: var(--text-primary) !important;
}

.vuetify-autocomplete :deep(.v-date-picker__content .v-btn:hover) {
  background: var(--surface-elevated) !important;
}

/* VDateInput Calendar Specific Styles - High Specificity */
.vuetify-autocomplete :deep(.v-date-input__content),
.vuetify-autocomplete :deep(.v-date-picker__content),
.vuetify-autocomplete :deep(.v-menu__content),
.vuetify-autocomplete :deep(.v-overlay__content) {
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-calendar),
.vuetify-autocomplete :deep(.v-date-picker),
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar) {
  background: var(--surface) !important;
  color: var(--text-primary) !important;
}

.vuetify-autocomplete :deep(.v-calendar-header),
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-header) {
  background: var(--surface-elevated) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border) !important;
}

.vuetify-autocomplete :deep(.v-calendar-weekday),
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-weekday) {
  color: var(--text-secondary) !important;
  background: var(--surface) !important;
}

.vuetify-autocomplete :deep(.v-calendar-day),
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day) {
  color: var(--text-primary) !important;
  background: var(--surface) !important;
}

.vuetify-autocomplete :deep(.v-calendar-day:hover),
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day:hover) {
  background: var(--surface-elevated) !important;
}

.vuetify-autocomplete :deep(.v-calendar-day--selected),
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day--selected) {
  background: var(--primary-500) !important;
  color: white !important;
}

.vuetify-autocomplete :deep(.v-calendar-day--today),
.vuetify-autocomplete :deep(.v-date-picker__content .v-calendar-day--today) {
  background: var(--primary-400) !important;
  color: white !important;
}

.vuetify-autocomplete :deep(.v-calendar .v-btn),
.vuetify-autocomplete :deep(.v-date-picker__content .v-btn) {
  color: var(--text-primary) !important;
}

.vuetify-autocomplete :deep(.v-calendar .v-btn:hover),
.vuetify-autocomplete :deep(.v-date-picker__content .v-btn:hover) {
  background: var(--surface-elevated) !important;
}

/* Date Input Calendar Icon Styling */
.vuetify-autocomplete :deep(.v-field__append-inner .mdi-calendar),
.vuetify-autocomplete :deep(.v-field__prepend-inner .mdi-calendar),
.vuetify-autocomplete :deep(.v-input__icon .mdi-calendar),
.vuetify-autocomplete :deep(.v-icon.mdi-calendar),
.v-date-input :deep(.mdi-calendar),
.v-date-input :deep(.v-field__append-inner .mdi-calendar),
.v-date-input :deep(.v-field__prepend-inner .mdi-calendar),
.v-date-input :deep(.v-input__icon .mdi-calendar),
.v-date-input :deep(.v-icon.mdi-calendar) {
  color: var(--primary-400) !important;
}

/* Chat Tab Styles */

.chat-interface {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  min-height: 500px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 2rem;
  scroll-behavior: smooth;
}

.message {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: flex-start;
}

.message-user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  max-width: 70%;
}

.message-user .message-content {
  text-align: right;
  max-width: fit-content;
  margin-left: auto;
}

.message-text {
  padding: 1rem;
  border-radius: 1rem;
  line-height: 1.6;
  word-wrap: break-word;
}

.message-assistant .message-text {
  background: transparent;
}

.message-user .message-text {
  background: var(--primary-400);
  color: white;
}

/* Markdown styling for messages */
.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin: 0.5rem 0;
  font-weight: 600;
  color: var(--text-primary);
}

.message-text :deep(h1) {
  font-size: 1.5rem;
}
.message-text :deep(h2) {
  font-size: 1.3rem;
}
.message-text :deep(h3) {
  font-size: 1.1rem;
}

.message-text :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.message-text :deep(li) {
  margin: 0.25rem 0;
}

.message-text :deep(strong),
.message-text :deep(b) {
  font-weight: 600;
  color: var(--text-primary);
}

.message-text :deep(em),
.message-text :deep(i) {
  font-style: italic;
}

.message-text :deep(code) {
  background: var(--border);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.message-text :deep(pre) {
  background: var(--border);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.message-text :deep(pre code) {
  background: none;
  padding: 0;
}

.message-text :deep(blockquote) {
  border-left: 3px solid var(--primary-400);
  padding-left: 1rem;
  margin: 0.5rem 0;
  font-style: italic;
  color: var(--text-secondary);
}

.message-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}

.message-text :deep(th),
.message-text :deep(td) {
  border: 1px solid var(--border);
  padding: 0.5rem;
  text-align: left;
}

.message-text :deep(th) {
  background: var(--border);
  font-weight: 600;
}

.message-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1rem;
}

.typing-indicator span {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-0.5rem);
    opacity: 1;
  }
}

/* Typing cursor animation */
.typing-cursor {
  display: inline-block;
  margin-left: 2px;
}

.cursor-blink {
  animation: cursor-blink 1s infinite;
  font-weight: bold;
  color: var(--primary-400);
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.input-area {
  padding: 1rem 2rem 2rem;
  border-top: 1px solid var(--border);
  background: var(--background);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--error-light);
  color: var(--error);
  border-radius: 0.5rem;
  border: 1px solid var(--error);
}

.error-icon {
  font-size: 1.25rem;
}

.input-container {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1rem;
  transition: all 0.3s ease;
}

.input-container:focus-within {
  border-color: var(--primary-400);
  transform: translateY(-1px);
}

.input-container:hover {
  border-color: var(--primary-300);
}

.message-input {
  flex: 1;
  border: none !important;
  outline: none !important;
  background: transparent !important;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  min-height: 1.5rem;
  max-height: 8rem;
  font-family: inherit;
}

.message-input :deep(.v-field__input) {
  min-height: 1.5rem !important;
  padding: 0 !important;
}

.message-input :deep(.v-field__outline) {
  display: none !important;
}

.message-input :deep(.v-field__field) {
  padding: 0 !important;
}

.message-input::placeholder {
  color: var(--text-secondary);
}

.send-button {
  flex-shrink: 0;
}

.mock-data-button {
  flex-shrink: 0;
}

/* Responsive Design */
</style>
