<template>
  <div class="persistence-indicator">
    <button
      class="persistence-button"
      :class="{ 'has-data': hasPersistedData, 'saving': isSaving }"
      @click="toggleMenu"
      :title="tooltipText"
    >
      <span class="icon">💾</span>
      <span v-if="lastSaved" class="timestamp">{{ formattedTime }}</span>
    </button>

    <!-- Dropdown menu -->
    <div v-if="showMenu" class="persistence-menu">
      <div class="menu-header">
        <h4>Scene Persistence</h4>
        <button class="close-btn" @click="closeMenu">×</button>
      </div>

      <div class="menu-content">
        <div v-if="hasPersistedData" class="status-section">
          <div class="status-item">
            <span class="label">Last Saved:</span>
            <span class="value">{{ lastSavedFull }}</span>
          </div>
          <div class="status-item">
            <span class="label">Storage Used:</span>
            <span class="value">{{ storageSize }}</span>
          </div>
        </div>

        <div v-else class="no-data">
          <p>No saved scene data</p>
          <p class="hint">Your scene will auto-save when you make changes</p>
        </div>

        <div class="actions">
          <button
            class="action-btn primary"
            @click="manualSave"
            :disabled="isSaving"
          >
            <span class="btn-icon">💾</span>
            {{ isSaving ? 'Saving...' : 'Save Now' }}
          </button>

          <button
            class="action-btn"
            @click="showRestoreDialog = true"
            :disabled="!hasPersistedData"
          >
            <span class="btn-icon">🔄</span>
            Restore
          </button>

          <button
            class="action-btn danger"
            @click="showClearDialog = true"
            :disabled="!hasPersistedData"
          >
            <span class="btn-icon">🗑️</span>
            Clear
          </button>

          <button
            class="action-btn"
            @click="exportState"
            :disabled="!hasPersistedData"
          >
            <span class="btn-icon">📤</span>
            Export
          </button>
        </div>

        <div class="info-section">
          <p class="info-text">
            <strong>Auto-Save:</strong> Your scene automatically saves when you:
          </p>
          <ul class="info-list">
            <li>Apply materials or textures</li>
            <li>Change texture repeat settings</li>
            <li>Modify scene background</li>
            <li>Create or edit geometry</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Restore Confirmation Dialog -->
    <div v-if="showRestoreDialog" class="dialog-overlay" @click="showRestoreDialog = false">
      <div class="dialog" @click.stop>
        <h3>Restore Scene?</h3>
        <p>This will replace the current scene with the saved version from:</p>
        <p class="dialog-detail">{{ lastSavedFull }}</p>
        <p class="dialog-warning">⚠️ Unsaved changes will be lost!</p>
        <div class="dialog-actions">
          <button class="dialog-btn secondary" @click="showRestoreDialog = false">Cancel</button>
          <button class="dialog-btn primary" @click="restoreScene">Restore</button>
        </div>
      </div>
    </div>

    <!-- Clear Confirmation Dialog -->
    <div v-if="showClearDialog" class="dialog-overlay" @click="showClearDialog = false">
      <div class="dialog" @click.stop>
        <h3>Clear Saved Data?</h3>
        <p>This will permanently delete all saved scene data.</p>
        <p class="dialog-warning">⚠️ This action cannot be undone!</p>
        <div class="dialog-actions">
          <button class="dialog-btn secondary" @click="showClearDialog = false">Cancel</button>
          <button class="dialog-btn danger" @click="clearData">Clear All</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApplicationStore } from '@/stores/application'
import { hasPersistedState, getLastSavedTime, clearPersistedState, exportStateToFile } from '@/packages/cad-core/io/ScenePersistence.js'
import { getDBStats } from '@/packages/cad-core/io/PersistenceDB.js'

export default {
  name: 'PersistenceIndicator',
  emits: ['menu-toggle'],
  setup(props, { emit }) {
    const appStore = useApplicationStore()

    const showMenu = ref(false)
    const hasPersistedData = ref(false)
    const lastSaved = ref(null)
    const isSaving = ref(false)
    const storageSize = ref('0 MB')
    const showRestoreDialog = ref(false)
    const showClearDialog = ref(false)

    let checkInterval = null

    const tooltipText = computed(() => {
      if (isSaving.value) return 'Saving scene...'
      if (hasPersistedData.value) return `Scene saved ${formattedTime.value}`
      return 'Scene auto-save'
    })

    const formattedTime = computed(() => {
      if (!lastSaved.value) return ''
      const date = new Date(lastSaved.value)
      const now = new Date()
      const diff = Math.floor((now - date) / 1000) // seconds

      if (diff < 60) return 'just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return date.toLocaleDateString()
    })

    const lastSavedFull = computed(() => {
      if (!lastSaved.value) return 'Never'
      return new Date(lastSaved.value).toLocaleString()
    })

    const toggleMenu = () => {
      showMenu.value = !showMenu.value
      if (showMenu.value) {
        checkStatus()
      }
      // Emit menu state for parent components (e.g., MainLayout)
      emit('menu-toggle', showMenu.value)
    }

    const closeMenu = () => {
      showMenu.value = false
      emit('menu-toggle', false)
    }

    const checkStatus = async () => {
      hasPersistedData.value = await hasPersistedState()
      lastSaved.value = await getLastSavedTime()

      const stats = await getDBStats()
      storageSize.value = `${stats.estimatedSizeMB} MB`
    }

    const manualSave = async () => {
      isSaving.value = true
      try {
        const threeView = appStore.activeDocument?.views?.get?.('default')
        if (threeView && typeof threeView.saveSceneState === 'function') {
          await threeView.saveSceneState()
          await checkStatus()
          console.log('✅ Manual save complete')
        }
      } catch (error) {
        console.error('❌ Manual save failed:', error)
        alert('Failed to save: ' + error.message)
      } finally {
        isSaving.value = false
      }
    }

    const restoreScene = async () => {
      showRestoreDialog.value = false

      try {
        const threeView = appStore.activeDocument?.views?.get?.('default')
        if (threeView && typeof threeView.restoreSceneState === 'function') {
          const success = await threeView.restoreSceneState()
          if (success) {
            console.log('✅ Scene restored')
            alert('Scene restored successfully!')
          } else {
            alert('Failed to restore scene')
          }
        }
      } catch (error) {
        console.error('❌ Restore failed:', error)
        alert('Failed to restore: ' + error.message)
      }

      showMenu.value = false
      emit('menu-toggle', false)
    }

    const clearData = async () => {
      showClearDialog.value = false

      try {
        await clearPersistedState()
        await checkStatus()
        console.log('✅ Saved data cleared')
        alert('Saved data cleared successfully')
      } catch (error) {
        console.error('❌ Clear failed:', error)
        alert('Failed to clear data: ' + error.message)
      }

      showMenu.value = false
      emit('menu-toggle', false)
    }

    const exportState = async () => {
      try {
        await exportStateToFile()
        console.log('✅ State exported')
      } catch (error) {
        console.error('❌ Export failed:', error)
        alert('Failed to export: ' + error.message)
      }
    }

    onMounted(async () => {
      await checkStatus()
      // Check status every 30 seconds
      checkInterval = setInterval(checkStatus, 30000)
    })

    onUnmounted(() => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    })

    return {
      showMenu,
      hasPersistedData,
      lastSaved,
      isSaving,
      storageSize,
      showRestoreDialog,
      showClearDialog,
      tooltipText,
      formattedTime,
      lastSavedFull,
      toggleMenu,
      closeMenu,
      manualSave,
      restoreScene,
      clearData,
      exportState
    }
  }
}
</script>

<style scoped>
.persistence-indicator {
  position: relative;
  display: inline-block;
}

.persistence-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #bdc3c7;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.persistence-button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.persistence-button.has-data {
  border-color: rgba(46, 204, 113, 0.4);
  color: #2ecc71;
}

.persistence-button.saving {
  border-color: rgba(52, 152, 219, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.icon {
  font-size: 16px;
  line-height: 1;
}

.timestamp {
  font-size: 11px;
  opacity: 0.8;
}

/* Menu */
.persistence-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #2c2c2c;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  min-width: 320px;
  max-width: 400px;
  z-index: 50; /* Above legend (40) - matches elevation scale */
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #3e3e42;
}

.menu-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ecf0f1;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #bdc3c7;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(231, 76, 60, 0.2);
  border-color: #e74c3c;
  color: #e74c3c;
}

.menu-content {
  padding: 16px;
}

.status-section {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-item .label {
  color: #7f8c8d;
}

.status-item .value {
  color: #ecf0f1;
  font-weight: 500;
}

.no-data {
  text-align: center;
  padding: 24px;
  color: #7f8c8d;
}

.no-data p {
  margin: 0 0 8px 0;
  font-size: 13px;
}

.no-data .hint {
  font-size: 11px;
  opacity: 0.7;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #ecf0f1;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.primary {
  grid-column: 1 / -1;
  background: #3498db;
  border-color: #3498db;
}

.action-btn.primary:hover:not(:disabled) {
  background: #2980b9;
}

.action-btn.danger {
  border-color: rgba(231, 76, 60, 0.4);
}

.action-btn.danger:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.2);
  border-color: #e74c3c;
}

.btn-icon {
  font-size: 14px;
}

.info-section {
  padding-top: 16px;
  border-top: 1px solid #3e3e42;
}

.info-text {
  margin: 0 0 8px 0;
  font-size: 11px;
  color: #bdc3c7;
}

.info-list {
  margin: 0;
  padding-left: 20px;
  font-size: 11px;
  color: #7f8c8d;
}

.info-list li {
  margin-bottom: 4px;
}

/* Dialogs */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  animation: fadeIn 0.2s ease-out;
}

.dialog {
  background: #2c2c2c;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  animation: scaleIn 0.2s ease-out;
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

.dialog h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #ecf0f1;
}

.dialog p {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #bdc3c7;
  line-height: 1.5;
}

.dialog-detail {
  font-weight: 600;
  color: #3498db;
}

.dialog-warning {
  color: #e74c3c;
  font-weight: 500;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.dialog-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dialog-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ecf0f1;
}

.dialog-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.dialog-btn.primary {
  background: #3498db;
  color: white;
}

.dialog-btn.primary:hover {
  background: #2980b9;
}

.dialog-btn.danger {
  background: #e74c3c;
  color: white;
}

.dialog-btn.danger:hover {
  background: #c0392b;
}
</style>

