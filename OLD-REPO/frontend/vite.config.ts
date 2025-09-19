import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
// import vueDevTools from 'vite-plugin-vue-devtools'

const VITE_APP_API_BASE_URL = process.env.VITE_APP_API_BASE_URL

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vue(),
      vueJsx(),
      // vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['fazi.evi.rs', 'localhost', '127.0.0.1'],
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': VITE_APP_API_BASE_URL,
    },
  }
})
