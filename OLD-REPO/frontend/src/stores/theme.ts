import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useTheme } from 'vuetify'

export const useThemeStore = defineStore('theme', () => {
  const vuetifyTheme = useTheme()

  // Initialize theme from localStorage immediately
  const getInitialTheme = () => {
    const saved = localStorage.getItem('fazi-default-theme')
    if (saved) {
      return saved === 'dark'
    } else {
      // Default to dark theme if no preference is saved
      localStorage.setItem('fazi-default-theme', 'dark')
      return true
    }
  }

  // Theme state - initialize from localStorage
  const isDark = ref(getInitialTheme())

  // Theme toggle function
  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  // Set specific theme
  const setTheme = (dark: boolean) => {
    isDark.value = dark
  }

  // Watch for theme changes and apply to both Vuetify and custom CSS
  watch(
    isDark,
    (newValue) => {
      // Apply theme to Vuetify
      vuetifyTheme.global.name.value = newValue ? 'dark' : 'light'

      // Apply custom CSS classes for our custom styling
      const root = document.documentElement
      if (newValue) {
        // Apply dark theme
        root.classList.remove('light-theme')
        root.classList.add('dark-theme')
      } else {
        // Apply light theme
        root.classList.remove('dark-theme')
        root.classList.add('light-theme')
      }

      // Store preference in localStorage
      localStorage.setItem('fazi-default-theme', newValue ? 'dark' : 'light')
    },
    { immediate: true },
  )

  return {
    isDark,
    toggleTheme,
    setTheme,
  }
})
