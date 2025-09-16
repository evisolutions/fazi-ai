<script setup lang="ts">
import { shallowRef, ref, watch, nextTick } from 'vue'
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

const file_one = ref<File | null>(null)
const file_two = ref<File | null>(null)

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
</script>

<template>
  <main>
    <v-tabs bg-color="indigo-darken-2" :fixed-tabs="true" v-model="tab">
      <v-tab :value="1" text="Parameters"></v-tab>
      <v-tab :value="2" text="Result"></v-tab>
      <v-tab :value="3" text="Best Performing"></v-tab>
      <v-tab :value="4" text="Predictions & Recommendations"></v-tab>
    </v-tabs>

    <v-tabs-window v-model="tab">
      <v-tabs-window-item :value="1">
        <v-container fluid>
          <div class="container">
            <div class="item d-flex">
              <div class="add-file w-50 mr-4">
                <v-file-input
                  v-model="file_one"
                  label="training_data.xlsx"
                  accept=".xlsx,.xls"
                  prepend-icon="mdi-plus"
                ></v-file-input>
              </div>

              <div class="add-file w-50 ml-4">
                <v-file-input
                  v-model="file_two"
                  label="game_data.xlsx"
                  accept=".xlsx,.xls"
                  prepend-icon="mdi-plus"
                ></v-file-input>
              </div>
            </div>

            <div class="item">
              <v-autocomplete
                multiple
                clearable
                v-model="trziste_data"
                :items="gamba.available_trziste_data"
                item-title="label"
                item-value="trziste_id"
                label="Trziste"
              ></v-autocomplete>
            </div>

            <div class="item">
              <v-autocomplete
                multiple
                clearable
                v-model="partner_data"
                :items="gamba.available_partner_data"
                item-title="label"
                item-value="partner_id"
                label="Partner"
              ></v-autocomplete>
            </div>

            <v-table class="mb-8" theme="dark">
              <thead>
                <tr>
                  <th>ROI</th>
                  <th>NP</th>
                  <th>Selected</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in gamba.roi_np_table_data" :key="index">
                  <td>{{ row.roi }}</td>
                  <td>{{ row.np }}</td>
                  <td>
                    <v-checkbox v-model="row.selected" hide-details></v-checkbox>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-expansion-panels class="mb-8" variant="accordion" theme="dark">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <span>GAME FILTERS</span>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <v-autocomplete
                    class="pl-8"
                    clearable
                    v-model="selected_volatility"
                    :items="gamba.volatility_data"
                    item-title="label"
                    item-value="volatility_id"
                    label="Volatility"
                  ></v-autocomplete>

                  <v-autocomplete
                    class="pl-8"
                    clearable
                    multiple
                    v-model="selected_features"
                    :items="gamba.feature_data"
                    item-title="label"
                    item-value="feature_id"
                    label="Features"
                  ></v-autocomplete>

                  <v-autocomplete
                    class="pl-8"
                    clearable
                    multiple
                    v-model="selected_game_categories"
                    :items="gamba.game_category_data"
                    item-title="label"
                    item-value="game_category_id"
                    label="Game Categories"
                  ></v-autocomplete>

                  <div class="d-flex align-center">
                    <span class="w-25 text-center">Hit Frequency</span>
                    <v-number-input
                      clearable
                      class="ml-4"
                      controlVariant="split"
                      v-model="hit_frequency_from"
                      :precision="2"
                      hide-details="auto"
                      label="From"
                    ></v-number-input>
                    <v-number-input
                      clearable
                      class="ml-4"
                      controlVariant="split"
                      v-model="hit_frequency_to"
                      :min="hit_frequency_from || 0"
                      :precision="2"
                      hide-details="auto"
                      label="To"
                    ></v-number-input>
                  </div>

                  <div class="mt-5 d-flex align-center">
                    <span class="w-25 text-center">Max Exposure</span>
                    <v-number-input
                      clearable
                      class="ml-4"
                      controlVariant="split"
                      v-model="max_exposure_from"
                      :step="1000"
                      :precision="0"
                      hide-details="auto"
                      label="From"
                    ></v-number-input>
                    <v-number-input
                      clearable
                      class="ml-4"
                      controlVariant="split"
                      v-model="max_exposure_to"
                      :step="1000"
                      :min="max_exposure_from || 0"
                      :precision="0"
                      hide-details="auto"
                      label="To"
                    ></v-number-input>
                  </div>

                  <div class="mt-5 d-flex align-center">
                    <span class="w-25 text-center">Min/Max Bet</span>
                    <v-number-input
                      clearable
                      class="ml-4"
                      controlVariant="split"
                      v-model="min_max_bet_from"
                      :step="0.05"
                      :precision="2"
                      hide-details="auto"
                      label="From"
                    ></v-number-input>
                    <v-number-input
                      clearable
                      class="ml-4"
                      controlVariant="split"
                      v-model="min_max_bet_to"
                      :step="10"
                      :min="min_max_bet_from || 10"
                      :precision="0"
                      hide-details="auto"
                      label="To"
                    ></v-number-input>
                  </div>

                  <!-- <div class="mt-5 d-flex align-center">
                    <span class="w-25 text-center">Game Release Date</span>
                    <v-date-input 
                      class="ml-4" 
                      clearable 
                      v-model="start_date"
                      variant="outlined"
                      density="compact"
                      :hide-details="true"
                      prepend-icon="" prepend-inner-icon="$calendar" 
                      persistent-placeholder
                      display-format="dd-mm-yyyy"
                      label="Start Date"></v-date-input>
                    <v-date-input 
                      class="ml-4" 
                      clearable 
                      v-model="end_date"
                      density="compact"
                      variant="outlined"
                      :hide-details="true"
                      prepend-icon="" prepend-inner-icon="$calendar" 
                      persistent-placeholder
                      :min="start_date || null"
                      display-format="dd-mm-yyyy"
                      label="End Date"></v-date-input>
                  </div> -->
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-container>
      </v-tabs-window-item>

      <v-tabs-window-item :value="2">
        <v-container fluid>
          <div class="container d-flex justify-sm-center ga-5 mt-10">
            <v-btn @click="simulateCalculate">Calculate</v-btn>
            <!-- <v-btn @click="simulateComplete">Complete</v-btn> -->
          </div>
        </v-container>

        <v-container
          class="container d-flex justify-sm-center ga-5 mt-10"
          fluid
          v-if="loading_data"
        >
          <v-progress-circular color="primary" indeterminate></v-progress-circular>
        </v-container>
        <v-container fluid v-if="result_data">
          <div
            class="container mb-15"
            v-for="group in result_data.grouped_training_data"
            :key="group.id"
          >
            <div class="d-flex align-center ga-2">
              <span>ROIS:</span>
              [
              <span v-for="(roi_id, index) in group.roi_ids"
                >{{ gamba.getROILabelFromID(roi_id)
                }}{{ index !== group.roi_ids.length - 1 ? ', ' : '' }}</span
              >
              ]
            </div>
            <div class="d-flex align-center">
              <span>NP:</span>
              <span>{{ gamba.getNPLabelFromID(group.np_id) }}</span>
            </div>
            <div style="width: 1000px"><canvas :id="`test-${group.id}`"></canvas></div>
          </div>
        </v-container>
      </v-tabs-window-item>

      <v-tabs-window-item :value="3">
        <v-container fluid>
          <div class="container d-flex justify-sm-center ga-5 mt-10">
            <v-btn @click="simulateCalculate">Calculate</v-btn>
          </div>
        </v-container>

        <v-container
          class="container d-flex justify-sm-center ga-5 mt-10"
          fluid
          v-if="loading_data"
        >
          <v-progress-circular color="primary" indeterminate></v-progress-circular>
        </v-container>

        <v-container fluid v-if="result_data && result_data.best_performing_analysis">
          <div
            class="container mb-15"
            v-for="group in result_data.best_performing_analysis"
            :key="group.group_id"
          >
            <div class="d-flex align-center ga-2 mb-4">
              <span class="text-h6">ROIS:</span>
              <span class="text-h6">
                [
                <span v-for="(roi_id, index) in group.roi_ids"
                  >{{ gamba.getROILabelFromID(roi_id)
                  }}{{ index !== group.roi_ids.length - 1 ? ', ' : '' }}</span
                >
                ]
              </span>
            </div>
            <div class="d-flex align-center mb-4">
              <span class="text-h6">NP:</span>
              <span class="text-h6">{{ gamba.getNPLabelFromID(group.np_id) }}</span>
            </div>

            <!-- Best Performing Analysis Table -->
            <div v-if="!group.recommendations.analysis_skipped">
              <h3 class="mb-4">{{ group.recommendations.message }}</h3>

              <!-- Partners Table -->
              <div
                v-if="
                  group.recommendations.type === 'partners' || group.recommendations.type === 'both'
                "
              >
                <h4 class="mb-3">
                  Best Performing Partners
                  <span class="text-caption ml-2">
                    (Top 5 of
                    {{
                      group.recommendations.total_analyzed ||
                      getTotalAnalyzed(group.recommendations, 'partners')
                    }}
                    analyzed)
                  </span>
                </h4>
                <v-data-table
                  class="mb-8"
                  theme="dark"
                  :headers="partnerHeaders"
                  :items="getPartnerRecommendationsWithRank(group.recommendations)"
                  :items-per-page="-1"
                  :sort-by="[{ key: 'combined_score', order: 'desc' }]"
                  :sort-desc="[true]"
                >
                  <template v-slot:item.rank="{ item }: { item: any }">
                    <span class="font-weight-bold">{{ item.rank }}</span>
                  </template>
                  <template v-slot:item.avg_ggr="{ item }: { item: any }">
                    {{ formatNumber(item.avg_ggr) }}
                  </template>
                  <template v-slot:item.avg_roi="{ item }: { item: any }">
                    {{ formatNumber(item.avg_roi) }}
                  </template>
                  <template v-slot:item.avg_np_amount="{ item }: { item: any }">
                    {{ formatNumber(item.avg_np_amount) }}
                  </template>
                  <template v-slot:item.combined_score="{ item }: { item: any }">
                    <span class="font-weight-bold">{{ formatNumber(item.combined_score) }}</span>
                  </template>
                </v-data-table>
              </div>

              <!-- Trzista Table -->
              <div
                v-if="
                  group.recommendations.type === 'trzista' || group.recommendations.type === 'both'
                "
              >
                <h4 class="mb-3">
                  Best Performing Trzista
                  <span class="text-caption ml-2">
                    (Top 5 of
                    {{
                      group.recommendations.total_analyzed ||
                      getTotalAnalyzed(group.recommendations, 'trzista')
                    }}
                    analyzed)
                  </span>
                </h4>
                <v-data-table
                  class="mb-8"
                  theme="dark"
                  :headers="trzisteHeaders"
                  :items="getTrzisteRecommendationsWithRank(group.recommendations)"
                  :items-per-page="-1"
                  :sort-by="[{ key: 'combined_score', order: 'desc' }]"
                  :sort-desc="[true]"
                >
                  <template v-slot:item.rank="{ item }: { item: any }">
                    <span class="font-weight-bold">{{ item.rank }}</span>
                  </template>
                  <template v-slot:item.avg_ggr="{ item }: { item: any }">
                    {{ formatNumber(item.avg_ggr) }}
                  </template>
                  <template v-slot:item.avg_roi="{ item }: { item: any }">
                    {{ formatNumber(item.avg_roi) }}
                  </template>
                  <template v-slot:item.avg_np_amount="{ item }: { item: any }">
                    {{ formatNumber(item.avg_np_amount) }}
                  </template>
                  <template v-slot:item.combined_score="{ item }: { item: any }">
                    <span class="font-weight-bold">{{ formatNumber(item.combined_score) }}</span>
                  </template>
                </v-data-table>
              </div>
            </div>

            <!-- Analysis Skipped Message -->
            <div v-else class="text-center pa-8">
              <v-alert type="info" variant="tonal">
                {{ group.recommendations.message }}
              </v-alert>
            </div>
          </div>
        </v-container>

        <!-- No Data Message -->
        <v-container fluid v-else-if="result_data && !result_data.best_performing_analysis">
          <div class="container text-center pa-8">
            <v-alert type="warning" variant="tonal">
              No best performing analysis data available. Please run the calculation first.
            </v-alert>
          </div>
        </v-container>
      </v-tabs-window-item>

      <v-tabs-window-item :value="4">
        <v-container fluid>
          <div class="container d-flex justify-sm-center ga-5 mt-10">
            <v-btn @click="simulateCalculate">Calculate</v-btn>
          </div>
        </v-container>

        <v-container
          class="container d-flex justify-sm-center ga-5 mt-10"
          fluid
          v-if="loading_data"
        >
          <v-progress-circular color="primary" indeterminate></v-progress-circular>
        </v-container>

        <v-container fluid v-if="result_data && result_data.calculated_data_by_group">
          <div
            class="container mb-15"
            v-for="group in result_data.calculated_data_by_group"
            :key="`predictions-${group.np_id}-${group.roi_ids.join('-')}`"
          >
            <div class="d-flex align-center ga-2 mb-4">
              <span class="text-h6">ROIS:</span>
              <span class="text-h6">
                [
                <span v-for="(roi_id, index) in group.roi_ids"
                  >{{ gamba.getROILabelFromID(roi_id)
                  }}{{ index !== group.roi_ids.length - 1 ? ', ' : '' }}</span
                >
                ]
              </span>
            </div>
            <div class="d-flex align-center mb-6">
              <span class="text-h6">NP:</span>
              <span class="text-h6">{{ gamba.getNPLabelFromID(group.np_id) }}</span>
            </div>

            <!-- Predictions and Recommendations Cards -->
            <v-row>
              <!-- Promotion Recommendation Card -->
              <v-col cols="12" md="4">
                <v-card class="mb-4 prediction-card" theme="dark">
                  <v-card-title class="text-h6 card-title">
                    <v-icon class="mr-2">mdi-trending-up</v-icon>
                    <span>Promotion Recommendation</span>
                  </v-card-title>
                  <v-card-text>
                    <div v-if="group['Promotion Recommendation']">
                      <div class="mb-3">
                        <span class="text-h5 font-weight-bold text-success">
                          {{ formatNumber(group['Promotion Recommendation'].recommended_amount) }}
                        </span>
                        <span class="text-caption ml-2">recommended amount</span>
                      </div>
                      <div class="mb-2">
                        <v-chip
                          :color="getRiskColor(group['Promotion Recommendation'].risk_level)"
                          size="small"
                          class="mr-2"
                        >
                          {{ group['Promotion Recommendation'].risk_level }} risk
                        </v-chip>
                        <v-chip color="info" size="small">
                          {{ formatNumber(group['Promotion Recommendation'].confidence) }}%
                          confidence
                        </v-chip>
                      </div>
                      <p class="text-caption mb-2">
                        {{ group['Promotion Recommendation'].reasoning }}
                      </p>
                      <p class="text-caption">
                        Coefficient of Variation:
                        {{ group['Promotion Recommendation'].coefficient_of_variation }}
                      </p>
                    </div>
                    <div v-else class="text-center">
                      <v-alert type="info" variant="tonal" density="compact">
                        No recommendation available
                      </v-alert>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- GGR Prediction Card -->
              <v-col cols="12" md="4">
                <v-card class="mb-4 prediction-card" theme="dark">
                  <v-card-title class="text-h6 card-title">
                    <v-icon class="mr-2">mdi-chart-line</v-icon>
                    <span>GGR Prediction</span>
                  </v-card-title>
                  <v-card-text>
                    <div v-if="group['GGR Prediction']">
                      <div class="mb-3">
                        <span class="text-h5 font-weight-bold text-primary">
                          {{ formatNumber(group['GGR Prediction'].predicted_ggr) }}
                        </span>
                        <span class="text-caption ml-2">predicted GGR</span>
                      </div>
                      <div class="mb-2">
                        <v-chip color="info" size="small">
                          {{ formatNumber(group['GGR Prediction'].confidence) }}% confidence
                        </v-chip>
                      </div>
                      <div class="mb-2">
                        <span class="text-caption">95% Confidence Interval:</span>
                        <div class="text-caption">
                          {{ formatNumber(group['GGR Prediction'].confidence_interval.lower) }} -
                          {{ formatNumber(group['GGR Prediction'].confidence_interval.upper) }}
                        </div>
                      </div>
                      <p class="text-caption mb-2">
                        {{ group['GGR Prediction'].reasoning }}
                      </p>
                      <p class="text-caption">
                        Relative Std Dev: {{ group['GGR Prediction'].relative_std_dev }}
                      </p>
                    </div>
                    <div v-else class="text-center">
                      <v-alert type="info" variant="tonal" density="compact">
                        No prediction available
                      </v-alert>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- NP Prediction Card -->
              <v-col cols="12" md="4">
                <v-card class="mb-4 prediction-card" theme="dark">
                  <v-card-title class="text-h6 card-title">
                    <v-icon class="mr-2">mdi-cash</v-icon>
                    <span>NP Amount Prediction</span>
                  </v-card-title>
                  <v-card-text>
                    <div v-if="group['NP Prediction']">
                      <div class="mb-3">
                        <span class="text-h5 font-weight-bold text-warning">
                          {{ formatNumber(group['NP Prediction'].predicted_np_amount) }}
                        </span>
                        <span class="text-caption ml-2">predicted NP amount</span>
                      </div>
                      <div class="mb-2">
                        <v-chip color="info" size="small">
                          {{ formatNumber(group['NP Prediction'].confidence) }}% confidence
                        </v-chip>
                      </div>
                      <div class="mb-2">
                        <span class="text-caption">90% Confidence Interval:</span>
                        <div class="text-caption">
                          {{ formatNumber(group['NP Prediction'].confidence_interval.lower) }} -
                          {{ formatNumber(group['NP Prediction'].confidence_interval.upper) }}
                        </div>
                      </div>
                      <p class="text-caption mb-2">
                        {{ group['NP Prediction'].reasoning }}
                      </p>
                      <p class="text-caption">
                        Coefficient of Variation:
                        {{ group['NP Prediction'].coefficient_of_variation }}
                      </p>
                    </div>
                    <div v-else class="text-center">
                      <v-alert type="info" variant="tonal" density="compact">
                        No prediction available
                      </v-alert>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-container>

        <!-- No Data Message -->
        <v-container fluid v-else-if="result_data && !result_data.calculated_data_by_group">
          <div class="container text-center pa-8">
            <v-alert type="warning" variant="tonal">
              No prediction data available. Please run the calculation first.
            </v-alert>
          </div>
        </v-container>
      </v-tabs-window-item>
    </v-tabs-window>
  </main>
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
</style>
