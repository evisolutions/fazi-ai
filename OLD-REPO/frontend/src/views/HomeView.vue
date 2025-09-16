<script setup lang="ts">
import { shallowRef, ref, watch, nextTick, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useGambaStore } from '@/stores/gamba'
import { useTestStore } from '@/stores/test'
import { Chart } from 'chart.js/auto'

const tab = ref(1)
const gamba = useGambaStore()
const auth = useAuthStore()
const test = useTestStore()
const loading_data = ref(false)

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
]

// Icon mapping for MDI icons
const iconMap: Record<string, string> = {
  SettingsIcon: 'mdi-cog',
  ChartIcon: 'mdi-chart-line',
  TrophyIcon: 'mdi-trophy',
  TrendingIcon: 'mdi-trending-up',
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

function excelSerialToMonthYear(serial: number, use1904System = false) {
  // Excel's base date
  const excel1900Epoch = new Date(Date.UTC(1899, 11, 30)) // Dec 30, 1899
  const excel1904Epoch = new Date(Date.UTC(1904, 0, 1)) // Jan 1, 1904

  // Choose system (default is 1900 system)
  const baseDate = use1904System ? excel1904Epoch : excel1900Epoch

  // Add days to base date
  const date = new Date(baseDate.getTime() + serial * 86400000)

  // Format: "Month YYYY"
  const options = { year: 'numeric', month: 'long' } as any
  return date.toLocaleDateString('en-US', options)
}

const formatDataForChart = (group: any) => {
  let group_copy = JSON.parse(JSON.stringify(group))
  let dates_start = group_copy.data.map((item: any) => item[15]).sort((a: any, b: any) => a - b)

  let labels_map = dates_start.map((item: any) => excelSerialToMonthYear(item))
  let labels_set = [...new Set(labels_map)]

  let data = labels_set.map((item: any) => ({
    label: item,
    count: labels_map.filter((xd: any) => xd === item).length,
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
    rank: index + 1,
    partner_name: getPartnerName(partner.partner_id),
  }))
}

const getTrzisteRecommendationsWithRank = (recommendations: any) => {
  const trzista = getTrzisteRecommendations(recommendations)
  return trzista.map((trziste: any, index: number) => ({
    ...trziste,
    rank: index + 1,
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

// Load default files when component mounts
onMounted(() => {
  loadDefaultFiles()
})
</script>

<template>
  <div class="home-container">
    <!-- Modern Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <div class="logo-section">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <h1 class="app-title gradient-text">FAZI AI Analytics</h1>
          </div>
        </div>
        <div class="header-right">
          <div class="user-info">
            <div class="user-avatar">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <span class="user-name">Admin</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Modern Navigation Tabs -->
    <nav class="nav-tabs">
      <div class="nav-container">
        <button
          v-for="tabItem in tabs"
          :key="tabItem.value"
          @click="tab = tabItem.value"
          class="nav-tab"
          :class="{ active: tab === tabItem.value }"
        >
          <div class="tab-icon">
            <i :class="iconMap[tabItem.icon]" class="mdi"></i>
          </div>
          <span class="tab-label">{{ tabItem.label }}</span>
          <div class="tab-indicator"></div>
        </button>
      </div>
    </nav>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Parameters Tab -->
      <div v-if="tab === 1" class="tab-panel animate-fade-in">
        <div class="panel-container">
          <!-- File Upload Section -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M14 2V8H20"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M16 13H8"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M16 17H8"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M10 9H8"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h2 class="section-title">Data Files</h2>
              <p class="section-description">Upload your training and game data files</p>
            </div>

            <div class="file-upload-grid">
              <div class="file-upload-card">
                <div class="upload-area" :class="{ 'has-file': file_one }">
                  <div class="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <polyline
                        points="7,10 12,15 17,10"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <line
                        x1="12"
                        y1="15"
                        x2="12"
                        y2="3"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
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
                <div class="upload-area" :class="{ 'has-file': file_two }">
                  <div class="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <polyline
                        points="7,10 12,15 17,10"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <line
                        x1="12"
                        y1="15"
                        x2="12"
                        y2="3"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
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
          </div>

          <!-- ROI/NP Table Section -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 3V21H21"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M9 9L12 6L16 10L20 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h2 class="section-title">ROI/NP Combinations</h2>
              <p class="section-description">Select ROI and NP combinations for analysis</p>
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
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.3639 3.63604C20.0518 5.32387 21 7.61305 21 10Z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="10"
                    r="3"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h2 class="section-title">Market & Partner Selection</h2>
              <p class="section-description">Choose markets and partners for analysis</p>
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
                  class="vuetify-autocomplete"
                />
              </div>
            </div>
          </div>

          <!-- Game Filters -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle
                    cx="8.5"
                    cy="8.5"
                    r="1.5"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <polyline
                    points="21,15 16,10 5,21"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h2 class="section-title">Game Filters</h2>
              <p class="section-description">
                Filter games by volatility, features, and categories
              </p>
            </div>

            <div class="filters-grid">
              <div class="filter-group">
                <label class="filter-label">Game Volatility</label>
                <select v-model="selected_volatility" class="modern-select">
                  <option value="">All Volatilities</option>
                  <option
                    v-for="vol in gamba.volatility_data"
                    :key="vol.volatility_id"
                    :value="vol.volatility_id"
                  >
                    {{ vol.label }}
                  </option>
                </select>
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
                  class="vuetify-autocomplete"
                />
              </div>
            </div>
          </div>

          <!-- Numeric Filters -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 1V23"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h2 class="section-title">Numeric Filters</h2>
              <p class="section-description">
                Set ranges for hit frequency, exposure, and bet amounts
              </p>
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
                  />
                  <span class="range-separator">to</span>
                  <input
                    type="number"
                    v-model="hit_frequency_to"
                    placeholder="To"
                    class="range-input"
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
                  />
                  <span class="range-separator">to</span>
                  <input
                    type="number"
                    v-model="max_exposure_to"
                    placeholder="To"
                    class="range-input"
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
                  />
                  <span class="range-separator">to</span>
                  <input
                    type="number"
                    v-model="min_max_bet_to"
                    placeholder="To"
                    class="range-input"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Date Range Filters -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <line
                    x1="16"
                    y1="2"
                    x2="16"
                    y2="6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <line
                    x1="8"
                    y1="2"
                    x2="8"
                    y2="6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <line
                    x1="3"
                    y1="10"
                    x2="21"
                    y2="10"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h2 class="section-title">Date Range</h2>
              <p class="section-description">Set the date range for game release analysis</p>
            </div>

            <div class="filters-grid">
              <div class="filter-group">
                <label class="filter-label">Start Date</label>
                <input type="date" v-model="start_date" class="modern-select" />
              </div>

              <div class="filter-group">
                <label class="filter-label">End Date</label>
                <input type="date" v-model="end_date" class="modern-select" />
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
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Tab -->
    <div v-if="tab === 2" class="tab-panel animate-fade-in">
      <div class="panel-container">
        <div class="section-card">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3 3V21H21"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M9 9L12 6L16 10L20 6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <h2 class="section-title">Analysis Results</h2>
            <p class="section-description">View your calculation results and charts</p>
          </div>

          <div v-if="loading_data" class="loading-overlay">
            <div class="loading-content">
              <div class="loading-spinner-large"></div>
              <div class="loading-text">Processing your data...</div>
            </div>
          </div>

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
    </div>

    <!-- Best Performing Tab -->
    <div v-if="tab === 3" class="tab-panel animate-fade-in">
      <div class="panel-container">
        <div class="section-card">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6 9H4C3.44772 9 3 9.44772 3 10V11C3 13.7614 5.23858 16 8 16H16C18.7614 16 21 13.7614 21 11V10C21 9.44772 20.5523 9 20 9H18"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M6 9V7C6 4.79086 7.79086 3 10 3H14C16.2091 3 18 4.79086 18 7V9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M6 9H18V13C18 15.2091 16.2091 17 14 17H10C7.79086 17 6 15.2091 6 13V9Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M8 21H16"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 17V21"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <h2 class="section-title">Best Performing Analysis</h2>
            <p class="section-description">Top performing partners and markets</p>
          </div>

          <div v-if="result_data && result_data.best_performing_analysis" class="analysis-results">
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
                      <div class="table-cell">Avg GGR</div>
                      <div class="table-cell">Avg ROI</div>
                      <div class="table-cell">Score</div>
                    </div>
                    <div
                      v-for="partner in getPartnerRecommendationsWithRank(group.recommendations)"
                      :key="partner.partner_id"
                      class="table-row"
                    >
                      <div class="table-cell rank">{{ partner.rank }}</div>
                      <div class="table-cell">{{ partner.partner_name }}</div>
                      <div class="table-cell">{{ formatNumber(partner.avg_ggr) }}</div>
                      <div class="table-cell">{{ formatNumber(partner.avg_roi) }}</div>
                      <div class="table-cell score">{{ formatNumber(partner.combined_score) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Predictions Tab -->
    <div v-if="tab === 4" class="tab-panel animate-fade-in">
      <div class="panel-container">
        <div class="section-card">
          <div class="section-header">
            <div class="section-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22 7L13.5 15.5L8.5 10.5L2 17"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M16 7H22V13"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <h2 class="section-title">Predictions & Recommendations</h2>
            <p class="section-description">AI-powered insights and forecasts</p>
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
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M22 7L13.5 15.5L8.5 10.5L2 17"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M16 7H22V13"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <h4 class="card-title">Promotion Recommendation</h4>
                  </div>
                  <div v-if="group['Promotion Recommendation']" class="card-content">
                    <div class="metric-value">
                      {{ formatNumber(group['Promotion Recommendation'].recommended_amount) }}
                    </div>
                    <div class="metric-label">Recommended Amount</div>
                    <div class="confidence-badge">
                      {{ formatNumber(group['Promotion Recommendation'].confidence) }}% confidence
                    </div>
                  </div>
                </div>

                <!-- GGR Prediction Card -->
                <div class="prediction-card">
                  <div class="card-header">
                    <div class="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M3 3V21H21"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M9 9L12 6L16 10L20 6"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <h4 class="card-title">GGR Prediction</h4>
                  </div>
                  <div v-if="group['GGR Prediction']" class="card-content">
                    <div class="metric-value">
                      {{ formatNumber(group['GGR Prediction'].predicted_ggr) }}
                    </div>
                    <div class="metric-label">Predicted GGR</div>
                    <div class="confidence-badge">
                      {{ formatNumber(group['GGR Prediction'].confidence) }}% confidence
                    </div>
                  </div>
                </div>

                <!-- NP Prediction Card -->
                <div class="prediction-card">
                  <div class="card-header">
                    <div class="card-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 1V23"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <h4 class="card-title">NP Amount Prediction</h4>
                  </div>
                  <div v-if="group['NP Prediction']" class="card-content">
                    <div class="metric-value">
                      {{ formatNumber(group['NP Prediction'].predicted_np_amount) }}
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
  background: var(--dark-bg-primary);
}

.app-header {
  background: var(--dark-surface);
  border-bottom: 1px solid var(--dark-border);
  padding: var(--space-lg) 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(20px);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
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

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--dark-surface-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--dark-border);
}

.user-avatar {
  width: 32px;
  height: 32px;
  color: var(--primary-400);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-name {
  color: var(--dark-text-primary);
  font-weight: 600;
  font-size: 0.9rem;
}

/* Modern Navigation Tabs */
.nav-tabs {
  background: var(--dark-surface);
  border-bottom: 1px solid var(--dark-border);
  padding: 0;
  position: sticky;
  top: 80px;
  z-index: 99;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
  display: flex;
  gap: var(--space-xs);
}

.nav-tab {
  background: none;
  border: none;
  padding: var(--space-md) var(--space-lg);
  color: var(--dark-text-secondary);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  font-weight: 500;
  font-size: 0.9rem;
}

.nav-tab:hover {
  color: var(--dark-text-primary);
  background: var(--dark-surface-elevated);
}

.nav-tab.active {
  color: var(--primary-400);
  background: var(--dark-bg-primary);
  border-bottom: 2px solid var(--primary-500);
}

.tab-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-label {
  white-space: nowrap;
}

.tab-indicator {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: var(--primary-500);
  transition: width var(--transition-normal);
}

.nav-tab.active .tab-indicator {
  width: 100%;
}

/* Content Area */
.v-tabs-window {
  background: var(--dark-bg-primary);
  min-height: calc(100vh - 160px);
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

  .nav-container {
    padding: 0 var(--space-md);
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .nav-container::-webkit-scrollbar {
    display: none;
  }

  .nav-tab {
    flex-shrink: 0;
    padding: var(--space-sm) var(--space-md);
  }

  .tab-label {
    display: none;
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

  .app-title {
    font-size: 1rem;
  }

  .user-info {
    padding: var(--space-xs) var(--space-sm);
  }

  .user-name {
    display: none;
  }
}

/* Tab Content Styles */
.tab-content {
  min-height: calc(100vh - 160px);
  background: var(--dark-bg-primary);
}

.tab-panel {
  padding: var(--space-xl);
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
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
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
  background: linear-gradient(90deg, var(--primary-500), var(--secondary-500));
}

.section-card:hover {
  border-color: var(--primary-500);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.section-icon {
  width: 48px;
  height: 48px;
  color: var(--primary-400);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 165, 233, 0.1);
  border-radius: var(--radius-lg);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--dark-text-primary);
  margin: 0;
}

.section-description {
  color: var(--dark-text-secondary);
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
  background: var(--dark-surface-elevated);
  border: 2px dashed var(--dark-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  transition: all var(--transition-normal);
  position: relative;
}

.file-upload-card:hover {
  border-color: var(--primary-500);
  background: rgba(14, 165, 233, 0.05);
}

.upload-area {
  text-align: center;
  position: relative;
}

.upload-area.has-file {
  border-color: var(--success-500);
  background: rgba(34, 197, 94, 0.05);
}

.upload-icon {
  width: 64px;
  height: 64px;
  color: var(--primary-400);
  margin: 0 auto var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 165, 233, 0.1);
  border-radius: var(--radius-lg);
}

.upload-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--dark-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.upload-description {
  color: var(--dark-text-secondary);
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
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, var(--primary-400), var(--primary-500));
}

.file-info {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: var(--dark-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--dark-border);
}

.file-name {
  color: var(--dark-text-primary);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: var(--space-xs);
  word-break: break-all;
}

.file-size {
  color: var(--dark-text-tertiary);
  font-size: 0.8rem;
}

/* Modern Form Styles */
.modern-form-group {
  margin-bottom: var(--space-xl);
}

.form-label {
  display: block;
  color: var(--dark-text-primary);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  font-size: 0.9rem;
}

.modern-select {
  width: 100%;
  background: var(--dark-surface-elevated);
  border: 2px solid var(--dark-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  color: var(--dark-text-primary);
  font-size: 1rem;
  transition: all var(--transition-normal);
  outline: none;
}

.modern-select:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  background: var(--dark-surface);
}

.modern-select option {
  background: var(--dark-surface);
  color: var(--dark-text-primary);
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
  transform: translateY(-2px);
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
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  text-align: center;
  box-shadow: var(--shadow-2xl);
}

.loading-spinner-large {
  width: 48px;
  height: 48px;
  border: 4px solid var(--dark-border);
  border-top: 4px solid var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-lg);
}

.loading-text {
  color: var(--dark-text-primary);
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

  .section-title {
    font-size: 1.2rem;
  }

  .upload-icon {
    width: 48px;
    height: 48px;
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
  margin: var(--space-xl) 0;
}

.results-container {
  margin-top: var(--space-xl);
}

.result-group {
  background: var(--dark-surface-elevated);
  border: 1px solid var(--dark-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.group-header {
  margin-bottom: var(--space-lg);
  text-align: center;
}

.group-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--dark-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.group-subtitle {
  color: var(--dark-text-secondary);
  margin: 0;
  font-size: 0.9rem;
}

.chart-container {
  background: var(--dark-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--dark-border);
}

.analysis-results {
  margin-top: var(--space-xl);
}

.analysis-group {
  background: var(--dark-surface-elevated);
  border: 1px solid var(--dark-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.recommendations {
  margin-top: var(--space-lg);
}

.recommendations-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--dark-text-primary);
  margin: 0 0 var(--space-lg) 0;
}

.table-section {
  margin-bottom: var(--space-xl);
}

.table-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.modern-table {
  background: var(--dark-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--dark-border);
}

.table-header {
  display: grid;
  grid-template-columns: 80px 1fr 120px 120px 120px;
  background: var(--dark-surface-elevated);
  border-bottom: 1px solid var(--dark-border);
}

.table-row {
  display: grid;
  grid-template-columns: 80px 1fr 120px 120px 120px;
  border-bottom: 1px solid var(--dark-border);
  transition: background-color var(--transition-fast);
}

.table-row:hover {
  background: var(--dark-surface-elevated);
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  padding: var(--space-md);
  color: var(--dark-text-primary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
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
  background: var(--dark-surface-elevated);
  border: 1px solid var(--dark-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.predictions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-lg);
  margin-top: var(--space-lg);
}

.prediction-card {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
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
  transform: translateY(-2px);
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
  color: var(--primary-400);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 165, 233, 0.1);
  border-radius: var(--radius-md);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark-text-primary);
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
  color: var(--dark-text-secondary);
  font-size: 0.9rem;
  margin-bottom: var(--space-md);
}

.confidence-badge {
  display: inline-block;
  background: rgba(14, 165, 233, 0.1);
  color: var(--primary-400);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 600;
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
}

@media (max-width: 480px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: var(--space-xs);
  }

  .table-cell {
    padding: var(--space-xs);
    border-bottom: 1px solid var(--dark-border);
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
  color: var(--dark-text-primary);
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
  background: var(--dark-surface-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--dark-border);
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
}

.checkbox-container:hover {
  background: rgba(14, 165, 233, 0.05);
}

.checkbox-input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--dark-border);
  border-radius: var(--radius-sm);
  position: relative;
  transition: all var(--transition-fast);
  background: var(--dark-surface);
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
  color: var(--dark-text-primary);
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
  background: var(--dark-surface-elevated);
  border: 2px solid var(--dark-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  color: var(--dark-text-primary);
  font-size: 1rem;
  transition: all var(--transition-normal);
  outline: none;
}

.range-input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
  background: var(--dark-surface);
}

.range-separator {
  color: var(--dark-text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
}

/* ROI/NP Table Styles */
.roi-np-table-container {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--dark-border);
}

.table-wrapper {
  min-width: 100%;
}

.roi-np-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--dark-surface);
}

.roi-np-table th {
  background: var(--dark-surface-elevated);
  color: var(--dark-text-primary);
  font-weight: 600;
  padding: var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--dark-border);
  font-size: 0.9rem;
}

.roi-np-table td {
  padding: var(--space-md);
  color: var(--dark-text-primary);
  border-bottom: 1px solid var(--dark-border);
  font-size: 0.9rem;
}

.roi-np-table tr:hover {
  background: var(--dark-surface-elevated);
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

/* Vuetify Autocomplete Styles */
.vuetify-autocomplete {
  width: 100%;
}

.vuetify-autocomplete :deep(.v-field) {
  background: var(--dark-surface-elevated) !important;
  border: 2px solid var(--dark-border) !important;
  border-radius: var(--radius-lg) !important;
  color: var(--dark-text-primary) !important;
}

.vuetify-autocomplete :deep(.v-field:hover) {
  border-color: var(--primary-500) !important;
  background: var(--dark-surface) !important;
}

.vuetify-autocomplete :deep(.v-field--focused) {
  border-color: var(--primary-500) !important;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1) !important;
}

.vuetify-autocomplete :deep(.v-field__input) {
  color: var(--dark-text-primary) !important;
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
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: var(--radius-lg) !important;
}

.vuetify-autocomplete :deep(.v-list-item) {
  color: var(--dark-text-primary) !important;
  background: var(--dark-surface) !important;
}

.vuetify-autocomplete :deep(.v-list-item:hover) {
  background: var(--dark-surface-elevated) !important;
}

.vuetify-autocomplete :deep(.v-list-item--active) {
  background: var(--primary-500) !important;
  color: white !important;
}

.vuetify-autocomplete :deep(.v-overlay__content) {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-menu__content) {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-field__input) {
  color: var(--dark-text-primary) !important;
}

.vuetify-autocomplete :deep(.v-field__input::placeholder) {
  color: var(--dark-text-secondary) !important;
}

/* Additional VAutocomplete dropdown styling */
.vuetify-autocomplete :deep(.v-autocomplete__content) {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list) {
  background: var(--dark-surface) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list-item) {
  background: var(--dark-surface) !important;
  color: var(--dark-text-primary) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list-item:hover) {
  background: var(--dark-surface-elevated) !important;
}

.vuetify-autocomplete :deep(.v-autocomplete__content .v-list-item--active) {
  background: var(--primary-500) !important;
  color: white !important;
}

/* Global VAutocomplete styling */
:deep(.v-autocomplete__content) {
  background: var(--dark-surface) !important;
  border: 1px solid var(--dark-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
}

:deep(.v-autocomplete__content .v-list) {
  background: var(--dark-surface) !important;
}

:deep(.v-autocomplete__content .v-list-item) {
  background: var(--dark-surface) !important;
  color: var(--dark-text-primary) !important;
}

:deep(.v-autocomplete__content .v-list-item:hover) {
  background: var(--dark-surface-elevated) !important;
}

:deep(.v-autocomplete__content .v-list-item--active) {
  background: var(--primary-500) !important;
  color: white !important;
}

/* Responsive Design */
</style>
