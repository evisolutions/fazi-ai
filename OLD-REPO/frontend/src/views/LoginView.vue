<template>
  <div class="login-container">
    <!-- Animated Background Elements -->
    <div class="bg-animation">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      <div class="floating-shape shape-4"></div>
    </div>

    <div class="login-content">
      <div class="login-card animate-scale-in">
        <!-- Header Section -->
        <div class="login-header">
          <div class="logo-container">
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
            <h1 class="logo-text gradient-text">FAZI AI</h1>
          </div>
          <p class="login-subtitle">Advanced Analytics Platform</p>
        </div>

        <!-- Form Section -->
        <div class="login-form">
          <v-form ref="form" v-model="valid" @submit.prevent="handleLogin">
            <!-- Error Alert -->
            <div v-if="authStore.error" class="error-alert animate-slide-up">
              <div class="error-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" />
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" />
                </svg>
              </div>
              <div class="error-content">
                <p class="error-title">Authentication Failed</p>
                <p class="error-message">{{ authStore.error }}</p>
              </div>
              <button @click="authStore.clearError()" class="error-close">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" />
                </svg>
              </button>
            </div>

            <!-- Username Field -->
            <div class="input-group">
              <label class="input-label">Username</label>
              <div class="input-wrapper">
                <div class="input-icon">
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
                <input
                  v-model="username"
                  type="text"
                  class="modern-input"
                  placeholder="Enter your username"
                  required
                  @input="validateForm"
                />
              </div>
              <div v-if="username && username.length < 3" class="input-error">
                Username must be at least 3 characters
              </div>
            </div>

            <!-- Password Field -->
            <div class="input-group">
              <label class="input-label">Password</label>
              <div class="input-wrapper">
                <div class="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                      stroke="currentColor"
                      stroke-width="2"
                    />
                    <circle cx="12" cy="16" r="1" stroke="currentColor" stroke-width="2" />
                    <path
                      d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="modern-input"
                  placeholder="Enter your password"
                  required
                  @input="validateForm"
                />
                <button type="button" @click="showPassword = !showPassword" class="password-toggle">
                  <svg
                    v-if="!showPassword"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A18.45 18.45 0 0 1 5.06 5.06L17.94 17.94Z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A18.5 18.5 0 0 1 19.58 16.42L9.9 4.24Z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <line
                      x1="1"
                      y1="1"
                      x2="23"
                      y2="23"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div v-if="password && password.length < 6" class="input-error">
                Password must be at least 6 characters
              </div>
            </div>

            <!-- Login Button -->
            <button
              type="submit"
              class="login-button"
              :disabled="!valid || authStore.isLoading"
              :class="{ loading: authStore.isLoading }"
            >
              <div v-if="authStore.isLoading" class="loading-spinner"></div>
              <span v-else>Sign In</span>
            </button>
          </v-form>
        </div>

        <!-- Footer -->
        <div class="login-footer">
          <p class="footer-text">Welcome to the future of data analytics</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Form state
const form = ref()
const valid = ref(false)
const showPassword = ref(false)

// Form data
const username = ref('')
const password = ref('')

// Validation rules
const usernameRules = [
  (v: string) => !!v || 'Username is required',
  (v: string) => (v && v.length >= 3) || 'Username must be at least 3 characters',
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => (v && v.length >= 6) || 'Password must be at least 6 characters',
]

// Methods
const validateForm = () => {
  valid.value = username.value.length >= 3 && password.value.length >= 6
}

const handleLogin = async () => {
  if (!valid.value) return

  const result = await authStore.login(username.value, password.value)

  if (result.success) {
    // Redirect to home page on successful login
    router.push('/')
  }
  // Error handling is done in the store and displayed via v-alert
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--dark-bg-primary);
}

/* Animated Background */
.bg-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
  opacity: 0.1;
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 80px;
  height: 80px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 120px;
  height: 120px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.shape-3 {
  width: 60px;
  height: 60px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

.shape-4 {
  width: 100px;
  height: 100px;
  top: 10%;
  right: 30%;
  animation-delay: 1s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* Login Content */
.login-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: var(--space-lg);
}

.login-card {
  background: var(--dark-surface);
  border: 1px solid var(--dark-border);
  border-radius: var(--radius-2xl);
  padding: var(--space-3xl);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-2xl);
  position: relative;
  overflow: hidden;
}

.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-500), var(--secondary-500), var(--primary-500));
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Header */
.login-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.logo-icon {
  width: 48px;
  height: 48px;
  color: var(--primary-400);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.logo-text {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.login-subtitle {
  color: var(--dark-text-secondary);
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
}

/* Form */
.login-form {
  margin-bottom: var(--space-2xl);
}

.input-group {
  margin-bottom: var(--space-xl);
}

.input-label {
  display: block;
  color: var(--dark-text-primary);
  font-weight: 600;
  margin-bottom: var(--space-sm);
  font-size: 0.9rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: var(--space-md);
  width: 20px;
  height: 20px;
  color: var(--dark-text-tertiary);
  z-index: 2;
  pointer-events: none;
}

.modern-input {
  width: 100%;
  background: var(--dark-surface-elevated);
  border: 2px solid var(--dark-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-md) var(--space-md) 3rem;
  color: var(--dark-text-primary);
  font-size: 1rem;
  transition: all var(--transition-normal);
  outline: none;
}

.modern-input:focus {
  border-color: var(--theme-accent-primary);
  box-shadow: 0 0 0 3px var(--theme-shadow-color);
  background: var(--dark-surface);
}

.modern-input::placeholder {
  color: var(--dark-text-tertiary);
}

.password-toggle {
  position: absolute;
  right: var(--space-md);
  background: none;
  border: none;
  color: var(--dark-text-tertiary);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.password-toggle:hover {
  color: var(--theme-accent-primary);
  background: var(--theme-shadow-color);
}

.input-error {
  color: var(--error-400);
  font-size: 0.8rem;
  margin-top: var(--space-xs);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* Error Alert */
.error-alert {
  background: var(--error-500);
  border: 1px solid var(--error-400);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  position: relative;
}

.error-icon {
  width: 20px;
  height: 20px;
  color: white;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-content {
  flex: 1;
}

.error-title {
  color: white;
  font-weight: 600;
  margin: 0 0 var(--space-xs) 0;
  font-size: 0.9rem;
}

.error-message {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
}

.error-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Login Button */
.login-button {
  width: 100%;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-xl);
  color: white;
  font-size: 1rem;
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
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left var(--transition-slow);
}

.login-button:hover:not(:disabled)::before {
  left: 100%;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--primary-400), var(--primary-500));
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-button.loading {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Footer */
.login-footer {
  text-align: center;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--dark-border);
}

.footer-text {
  color: var(--dark-text-tertiary);
  font-size: 0.9rem;
  margin: 0;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 480px) {
  .login-content {
    padding: var(--space-md);
  }

  .login-card {
    padding: var(--space-xl);
  }

  .logo-text {
    font-size: 2rem;
  }

  .logo-container {
    flex-direction: column;
    gap: var(--space-sm);
  }
}

/* Animation Classes */
.animate-scale-in {
  animation: scaleIn 0.6s ease-out;
}

.animate-slide-up {
  animation: slideUp 0.4s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
