import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useTestStore = defineStore('test', () => {
  const backend_url = ref("http://localhost:3000")

  return { backend_url }
})
