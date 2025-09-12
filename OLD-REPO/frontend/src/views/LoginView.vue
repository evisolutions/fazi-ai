<template>
  <v-container fluid class="fill-height">
	<v-row align="center" justify="center" class="fill-height">
	  <v-col cols="12" sm="8" md="6" lg="4" xl="3">
		<v-card elevation="8" rounded="lg" class="pa-6">
		  <v-card-title class="text-center mb-6">
			<h2 class="text-h4 font-weight-bold text-primary">FAZI DEMO :)</h2>
		  </v-card-title>

		  <v-card-text>
			<v-form ref="form" v-model="valid" @submit.prevent="handleLogin">
			  <!-- Display API error if exists -->
			  <v-alert
				v-if="authStore.error"
				type="error"
				class="mb-4"
				closable
				@click:close="authStore.clearError()"
			  >
				{{ authStore.error }}
			  </v-alert>

			  <v-text-field
				v-model="username"
				:rules="usernameRules"
				label="Username"
				prepend-inner-icon="mdi-account"
				variant="outlined"
				class="mb-3"
				required
			  />

			  <v-text-field
				v-model="password"
				:rules="passwordRules"
				:type="showPassword ? 'text' : 'password'"
				label="Password"
				prepend-inner-icon="mdi-lock"
				:append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
				@click:append-inner="showPassword = !showPassword"
				variant="outlined"
				class="mb-4"
				required
			  />

			  <v-btn
				type="submit"
				color="primary"
				size="large"
				block
				:loading="authStore.isLoading"
				:disabled="!valid"
				class="mb-4"
			  >
				Sign In
			  </v-btn>
			</v-form>
		  </v-card-text>
		</v-card>
	  </v-col>
	</v-row>
  </v-container>
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
  (v: string) => (v && v.length >= 3) || 'Username must be at least 3 characters'
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => (v && v.length >= 6) || 'Password must be at least 6 characters'
]

// Methods
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
.fill-height {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.v-card {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95) !important;
}

.text-primary {
  color: #1976d2 !important;
}
</style>
