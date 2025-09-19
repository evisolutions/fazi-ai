import { ref } from 'vue'
import { defineStore } from 'pinia'

const VITE_APP_API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL

export const useTestStore = defineStore('test', () => {
  const backend_url = ref(VITE_APP_API_BASE_URL)

  return { backend_url }
})
