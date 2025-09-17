import './assets/main.css'
import '@mdi/font/css/materialdesignicons.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as comps from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VDateInput } from 'vuetify/labs/VDateInput'

const vuetify = createVuetify({
  directives,
  components: {
    ...comps,
    VDateInput,
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: '#0ea5e9',
          secondary: '#64748b',
          accent: '#f59e0b',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
          success: '#10b981',
          surface: '#1e293b',
          'surface-variant': '#334155',
          'on-surface': '#f1f5f9',
          'on-surface-variant': '#cbd5e1',
          background: '#0f172a',
          'on-background': '#f1f5f9',
        },
        variables: {
          'highlight-text': '#ffffff',
          'highlight-bg': '#404040',
        },
      },
      light: {
        dark: false,
        colors: {
          primary: '#0ea5e9',
          secondary: '#64748b',
          accent: '#f59e0b',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
          success: '#10b981',
          surface: '#ffffff',
          'surface-variant': '#f8f9fa',
          'on-surface': '#1f2937',
          'on-surface-variant': '#6b7280',
          background: '#ffffff',
          'on-background': '#1f2937',
        },
        variables: {
          'highlight-text': '#1f2937',
          'highlight-bg': '#e5e7eb',
        },
      },
    },
  },
  defaults: {
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
      hideNoData: true,
      hideSelected: true,
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      hideNoData: true,
      hideSelected: true,
    },
    VDateInput: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
