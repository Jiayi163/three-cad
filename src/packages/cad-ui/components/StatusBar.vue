<template>
  <div class="status-bar">
    <!-- Left section - Status and messages -->
    <div class="status-left">
      <div class="status-indicator" :class="statusClass">
        <i :class="statusIcon"></i>
        <span>{{ statusText }}</span>
      </div>

      <!-- Development Mode Indicator -->
      <div
        v-if="isDevelopment"
        class="dev-mode-indicator"
        @mouseenter="$emit('show-dev-debug', true)"
        @mouseleave="$emit('show-dev-debug', false)"
        title="Development Mode - Hover to see debug info"
      >
        <span>🚧 Dev Mode</span>
      </div>

      <div v-if="currentMessage" class="status-message">
        <i class="icon-info"></i>
        <span>{{ currentMessage }}</span>
      </div>
    </div>

    <!-- Center section - Coordinates and selection info -->
    <div class="status-center">
      <div v-if="mousePosition" class="coordinate-display">
        <span class="coord-label">X:</span>
        <span class="coord-value">{{ formatCoordinate(mousePosition.x) }}</span>
        <span class="coord-label">Y:</span>
        <span class="coord-value">{{ formatCoordinate(mousePosition.y) }}</span>
        <span class="coord-label">Z:</span>
        <span class="coord-value">{{ formatCoordinate(mousePosition.z) }}</span>
      </div>

      <div v-if="selectedCount > 0" class="selection-info">
        <i class="icon-selection"></i>
        <span>{{ selectedCount }} object{{ selectedCount > 1 ? 's' : '' }} selected</span>
      </div>
    </div>

    <!-- Right section - Performance and tools -->
    <div class="status-right">
      <div v-if="showPerformance" class="performance-info">
        <span class="fps-display" :class="fpsClass">
          {{ fps }} FPS
        </span>
        <span class="memory-display">
          {{ memoryUsage }} MB
        </span>
      </div>

      <div class="tool-info" v-if="activeTool">
        <i class="icon-tool"></i>
        <span>{{ activeToolName }}</span>
      </div>

      <div class="view-info">
        <button
          class="view-btn"
          @click="toggleViewMode"
          :title="viewMode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective'"
        >
          <i :class="viewMode === 'perspective' ? 'icon-perspective' : 'icon-orthographic'"></i>
        </button>

        <button
          class="view-btn"
          @click="fitToView"
          title="Fit to View"
        >
          <i class="icon-fit"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useApplicationStore } from '@/stores/application'

export default {
  name: 'StatusBar',
  emits: ['show-dev-debug'],
  setup(props, { emit }) {
    const appStore = useApplicationStore()

    // Component state
    const mousePosition = ref(null)
    const currentMessage = ref('')
    const showPerformance = ref(false)
    const fps = ref(60)
    const memoryUsage = ref(0)
    const viewMode = ref('perspective')
    const activeTool = ref('select')

    // Performance monitoring
    const frameCount = ref(0)
    const lastTime = ref(0)
    const fpsHistory = ref([])

    // Environment variables
    const envMode = import.meta.env.MODE

    // Computed properties
    const isDevelopment = computed(() => import.meta.env.DEV)

    const statusClass = computed(() => {
      if (appStore.isExecutingCommand) return 'executing'
      if (appStore.hasError) return 'error'
      if (appStore.isLoading) return 'loading'
      return 'ready'
    })

    const statusIcon = computed(() => {
      if (appStore.isExecutingCommand) return 'icon-loading'
      if (appStore.hasError) return 'icon-error'
      if (appStore.isLoading) return 'icon-loading'
      return 'icon-ready'
    })

    const statusText = computed(() => {
      if (appStore.isExecutingCommand) return 'Executing command...'
      if (appStore.hasError) return 'Error occurred'
      if (appStore.isLoading) return 'Loading...'
      return 'Ready'
    })

    const selectedCount = computed(() => {
      return appStore.selectedNodes?.length || 0
    })

    const activeToolName = computed(() => {
      const toolMap = {
        'select': 'Select',
        'box': 'Box',
        'sphere': 'Sphere',
        'cylinder': 'Cylinder',
        'plane': 'Plane',
        'line': 'Line',
        'move': 'Move',
        'rotate': 'Rotate',
        'scale': 'Scale'
      }
      return toolMap[activeTool.value] || 'Unknown Tool'
    })

    const fpsClass = computed(() => {
      if (fps.value >= 55) return 'good'
      if (fps.value >= 30) return 'warning'
      return 'poor'
    })

    // Methods
    const formatCoordinate = (value) => {
      if (value === null || value === undefined) return '0.00'
      return value.toFixed(2)
    }

    const updateMousePosition = (x, y, z) => {
      mousePosition.value = { x, y, z }
    }

    const showMessage = (message, duration = 3000) => {
      currentMessage.value = message
      if (duration > 0) {
        setTimeout(() => {
          currentMessage.value = ''
        }, duration)
      }
    }

    const toggleViewMode = () => {
      viewMode.value = viewMode.value === 'perspective' ? 'orthographic' : 'perspective'
      appStore.setViewMode(viewMode.value)
      showMessage(`Switched to ${viewMode.value} view`)
    }

    const fitToView = () => {
      appStore.fitToView()
      showMessage('Fitted to view')
    }

    const updatePerformance = () => {
      const now = performance.now()
      frameCount.value++

      if (now - lastTime.value >= 1000) {
        fps.value = Math.round((frameCount.value * 1000) / (now - lastTime.value))
        frameCount.value = 0
        lastTime.value = now

        // Update FPS history for smoothing
        fpsHistory.value.push(fps.value)
        if (fpsHistory.value.length > 10) {
          fpsHistory.value.shift()
        }

        // Calculate average FPS
        const avgFps = fpsHistory.value.reduce((a, b) => a + b, 0) / fpsHistory.value.length
        fps.value = Math.round(avgFps)
      }

      // Update memory usage (approximate)
      if (performance.memory) {
        memoryUsage.value = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
      }
    }

    const startPerformanceMonitoring = () => {
      const animate = () => {
        updatePerformance()
        requestAnimationFrame(animate)
      }
      animate()
    }

    // Event handlers
    const handleMouseMove = (event) => {
      // This would be called from the 3D viewport
      // For now, we'll simulate coordinates
      const rect = event.target.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width * 20 - 10
      const y = 0
      const z = (event.clientY - rect.top) / rect.height * 20 - 10
      updateMousePosition(x, y, z)
    }

    const handleToolChange = (toolId) => {
      activeTool.value = toolId
      showMessage(`Switched to ${activeToolName.value} tool`)
    }

    const handleSelectionChange = () => {
      if (selectedCount.value > 0) {
        showMessage(`${selectedCount.value} object${selectedCount.value > 1 ? 's' : ''} selected`)
      }
    }

    // Lifecycle
    onMounted(() => {
      // Start performance monitoring
      startPerformanceMonitoring()

      // Listen for tool changes
      appStore.onToolChange(handleToolChange)

      // Listen for selection changes
      appStore.onSelectionChange(handleSelectionChange)

      // Show initial status
      showMessage('Application ready', 2000)
    })

    onUnmounted(() => {
      // Cleanup would go here
    })

    // Expose methods for parent components
    const exposeMethods = {
      updateMousePosition,
      showMessage,
      handleMouseMove
    }

    return {
      // State
      mousePosition,
      currentMessage,
      showPerformance,
      fps,
      memoryUsage,
      viewMode,
      activeTool,
      envMode,

      // Computed
      isDevelopment,
      statusClass,
      statusIcon,
      statusText,
      selectedCount,
      activeToolName,
      fpsClass,

      // Methods
      formatCoordinate,
      toggleViewMode,
      fitToView,

      // Exposed methods
      ...exposeMethods
    }
  }
}
</script>

<style scoped>
.status-bar {
  background: var(--status-bar-bg);
  border-top: 1px solid var(--border-color);
  padding: 4px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  min-height: 24px;
  user-select: none;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.status-center {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: center;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-indicator.ready {
  background: var(--success-bg);
  color: var(--success-text);
}

.status-indicator.loading {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.status-indicator.executing {
  background: var(--info-bg);
  color: var(--info-text);
}

.status-indicator.error {
  background: var(--error-bg);
  color: var(--error-text);
}

.dev-mode-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  background: #ff6b35;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid #ff6b35;
  margin-left: 8px;
}

.dev-mode-indicator:hover {
  background: #ff5722;
  color: white;
  transform: scale(1.05);
  border-color: #ff5722;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-primary);
  font-style: italic;
}

.coordinate-display {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: monospace;
  font-size: 11px;
}

.coord-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

.coord-value {
  color: var(--text-primary);
  min-width: 40px;
  text-align: right;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-primary);
  font-weight: 500;
}

.performance-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
  font-size: 11px;
}

.fps-display {
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.fps-display.good {
  background: var(--success-bg);
  color: var(--success-text);
}

.fps-display.warning {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.fps-display.poor {
  background: var(--error-bg);
  color: var(--error-text);
}

.memory-display {
  color: var(--text-secondary);
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-primary);
  font-weight: 500;
}

.view-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.view-btn {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 3px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
}

.view-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
  border-color: var(--accent-color);
}

/* Icon styles */
.icon-ready::before { content: '✅'; }
.icon-loading::before { content: '⏳'; }
.icon-error::before { content: '❌'; }
.icon-info::before { content: 'ℹ️'; }
.icon-selection::before { content: '👆'; }
.icon-tool::before { content: '🔧'; }
.icon-dev::before { content: '🚧'; }
.icon-perspective::before { content: '📐'; }
.icon-orthographic::before { content: '📏'; }
.icon-fit::before { content: '🔍'; }

/* Animation for loading indicator */
.status-indicator.loading i {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive design */
@media (max-width: 768px) {
  .status-bar {
    flex-direction: column;
    gap: 4px;
    padding: 8px;
  }

  .status-left,
  .status-center,
  .status-right {
    flex: none;
    justify-content: center;
  }

  .coordinate-display {
    font-size: 10px;
  }

  .performance-info {
    font-size: 10px;
  }
}
</style>
