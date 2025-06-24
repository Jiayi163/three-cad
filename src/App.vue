<script>
import { RouterView } from 'vue-router'
import packageInfo from '../package.json'

export default {
  name: 'App',
  components: {
    RouterView
  },
  computed: {
    version() {
      return `v${packageInfo.version}`
    },
    isDevelopment() {
      return import.meta.env.DEV
    }
  }
}
</script>

<template>
  <div id="app">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          <span class="icon">🔧</span>
            THREE CAD Application
        </h1>
        <div class="header-info">
          <span class="version">{{ version }}</span>
        </div>
      </div>
    </header>
    
    <main class="app-main">
      <RouterView />
    </main>
    
    <!-- Development-only footer -->
    <footer v-if="isDevelopment" class="app-footer">
      <div class="footer-content">
        <span class="footer-text">Development Mode - Three.js Scene Active</span>
        <div class="status-indicators">
          <div class="indicator active" title="WebGL Active"></div>
          <div class="indicator active" title="Three.js Scene Running"></div>
          <div class="indicator active" title="Animation Active"></div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1a1a1a;
  color: #ffffff;
  overflow: hidden;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

/* Header styles */
.app-header {
  background: linear-gradient(90deg, #2c3e50 0%, #34495e 100%);
  border-bottom: 2px solid #3498db;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ecf0f1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  font-size: 1.2rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.version {
  font-size: 0.8rem;
  color: #bdc3c7;
  font-weight: 500;
}

.status {
  font-size: 0.75rem;
  color: #3498db;
  background: rgba(52, 152, 219, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(52, 152, 219, 0.3);
}

/* Main content styles */
.app-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Adjust main area when footer is not present (production mode) */
.app-main:last-child {
  margin-bottom: 0;
}

/* Footer styles */
.app-footer {
  background: #2c3e50;
  border-top: 1px solid #34495e;
  padding: 0.5rem 1.5rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.footer-text {
  font-size: 0.8rem;
  color: #bdc3c7;
}

.status-indicators {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  transition: background-color 0.3s ease;
}

.indicator.active {
  background: #2ecc71;
  box-shadow: 0 0 6px rgba(46, 204, 113, 0.6);
}

/* Responsive design */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
  }
  
  .header-info {
    align-items: center;
  }
  
  .app-title {
    font-size: 1.3rem;
  }
  
  .footer-content {
    padding: 0 1rem;
  }
}

/* Animation for smooth transitions */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.app-header, .app-footer {
  animation: fadeIn 0.6s ease-out;
}
</style>
