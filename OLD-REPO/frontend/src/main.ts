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
          'highlight-text': '#0ea5e9',
          'highlight-bg': 'transparent',
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
