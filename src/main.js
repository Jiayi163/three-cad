import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Import phase verification in development
if (import.meta.env.DEV) {
  import('./utils/phase-verification.js')
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
