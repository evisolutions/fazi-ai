import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useTestStore } from '@/stores/test'

export const useAuthStore = defineStore('auth', () => {
  const test = useTestStore()
  // State
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  const login = async (username: string, password: string) => {
    isLoading.value = true
    error.value = null

    try {
      console.log('test.backend_url', test.backend_url)
      const response = await axios.post(`${test.backend_url}/api/auth/login`, {
        username,
        password,
      })

      console.log('response', response)

      if (response.data && response.data.token) {
        token.value = response.data.token
        localStorage.setItem('token', response.data.token)
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`

        return { success: true }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err: any) {
      console.error('Login error:', err)

      if (err.response?.status === 401) {
        error.value = 'Invalid username or password'
      } else if (err.response?.status >= 500) {
        error.value = 'Server error. Please try again later.'
      } else if (err.code === 'ECONNREFUSED' || !err.response) {
        error.value = 'Unable to connect to server. Please check your connection.'
      } else {
        error.value = 'Login failed. Please try again.'
      }

      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const checkToken = async () => {
    const response = await axios.post(`${test.backend_url}/api/auth/check-token`, undefined, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })
  }

  const logout = () => {
    token.value = null
    error.value = null

    // Remove authorization header
    delete axios.defaults.headers.common['Authorization']
    localStorage.removeItem('token')
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    token,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    // Actions
    login,
    logout,
    clearError,
    checkToken,
  }
})
