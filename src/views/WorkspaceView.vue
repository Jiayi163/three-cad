<template>
  <div class="workspace">
    <!-- Header with application status -->
    <header class="workspace-header">
      <div class="header-left">
        <h1 class="app-title">CAD Application</h1>
        <div class="document-info" v-if="activeDocument">
          <span class="document-name">{{ activeDocument.name }}</span>
          <span class="document-status" v-if="hasUnsavedChanges">*</span>
          <span class="node-count">({{ activeDocument.nodeCount }} objects)</span>
        </div>
      </div>
      <div class="header-right">
        <div class="application-status">
          <span class="status-indicator" :class="{ 'initialized': isInitialized, 'loading': isLoading }">
            {{ isLoading ? 'Loading...' : isInitialized ? 'Ready' : 'Not Ready' }}
          </span>
        </div>
        <div class="history-controls">
          <button @click="undo" :disabled="!canUndo" class="history-btn">
            ↶ Undo
          </button>
          <button @click="redo" :disabled="!canRedo" class="history-btn">
            ↷ Redo
          </button>
        </div>
      </div>
    </header>

    <main class="workspace-main">
      <div class="viewport-container">
        <ThreeScene />
        <div class="viewport-overlay">
          <div class="controls-hint">
            <p><strong>Controls:</strong></p>
            <p>Left click + drag: Rotate view</p>
            <p>Right click + drag: Pan view</p>
            <p>Mouse wheel: Zoom in/out</p>
          </div>
          
          <!-- Application Debug Info (Development Only) -->
          <div v-if="isDevelopment" class="debug-info">
            <p><strong>Debug Info:</strong></p>
            <p>Documents: {{ documentCount }}</p>
            <p>Views: {{ viewCount }}</p>
            <p>Selected: {{ selectedCount }}</p>
            <p v-if="error" class="error">Error: {{ error }}</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer with quick actions (Development Only) -->
    <footer v-if="isDevelopment" class="workspace-footer">
      <div class="quick-actions">
        <button @click="createNewDocument" class="action-btn">
          + New Document
        </button>
        <button @click="addTestNode" :disabled="!hasActiveDocument" class="action-btn">
          + Add Test Node
        </button>
        <button @click="clearSelection" :disabled="selectedCount === 0" class="action-btn">
          Clear Selection
        </button>
        <button @click="showDebugInfo" class="action-btn">
          Debug Info
        </button>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useApplicationStore } from '../stores/application.js'
import ThreeScene from '../components/ThreeScene.vue'

export default {
  name: 'WorkspaceView',
  components: {
    ThreeScene
  },
  setup() {
    const appStore = useApplicationStore()
    
    // Development mode detection
    const isDevelopment = computed(() => import.meta.env.DEV)
    
    // Reactive state from store (using storeToRefs to maintain reactivity)
    const {
      isInitialized,
      isLoading,
      error,
      activeDocument,
      hasActiveDocument,
      hasUnsavedChanges,
      documentCount,
      viewCount,
      selectedCount,
      canUndo,
      canRedo
    } = storeToRefs(appStore)
    
    // Initialize application on mount
    onMounted(async () => {
      if (!isInitialized.value) {
        try {
          await appStore.initialize()
          console.log('CAD Application initialized in WorkspaceView')
          console.log('Vue reactive state after initialization:', {
            isInitialized: isInitialized.value,
            isLoading: isLoading.value,
            documentCount: documentCount.value,
            activeDocument: activeDocument.value?.name
          })
        } catch (err) {
          console.error('Failed to initialize CAD Application:', err)
        }
      }
    })
    
    // Cleanup on unmount
    onUnmounted(() => {
      // Store cleanup is handled by the store itself
    })
    
    // Action methods
    const undo = () => {
      try {
        appStore.undo()
      } catch (err) {
        console.error('Undo failed:', err)
      }
    }
    
    const redo = () => {
      try {
        appStore.redo()
      } catch (err) {
        console.error('Redo failed:', err)
      }
    }
    
    const createNewDocument = async () => {
      try {
        const name = `Document ${documentCount.value + 1}`
        const document = await appStore.createNewDocument(name)
        console.log('Created new document:', document.name)
      } catch (err) {
        console.error('Failed to create document:', err)
      }
    }
    
    const addTestNode = () => {
      try {
        const nodeData = {
          name: `Test Node ${Date.now()}`,
          type: 'test',
          properties: {
            description: 'A test node created from the UI',
            created: new Date().toISOString()
          }
        }
        const node = appStore.addNode(nodeData)
        console.log('Added test node:', node.name)
      } catch (err) {
        console.error('Failed to add test node:', err)
      }
    }
    
    const clearSelection = () => {
      try {
        appStore.clearSelection()
        console.log('Selection cleared')
      } catch (err) {
        console.error('Failed to clear selection:', err)
      }
    }
    
    const showDebugInfo = () => {
      const debugInfo = appStore.getDebugInfo()
      console.log('=== CAD Application Debug Info ===')
      console.log('Store:', debugInfo.store)
      console.log('Application:', debugInfo.application)
      console.log('Active Document:', debugInfo.activeDocument)
      console.log('=====================================')
    }
    
    return {
      // State
      isDevelopment,
      isInitialized,
      isLoading,
      error,
      activeDocument,
      hasActiveDocument,
      hasUnsavedChanges,
      documentCount,
      viewCount,
      selectedCount,
      canUndo,
      canRedo,
      
      // Actions
      undo,
      redo,
      createNewDocument,
      addTestNode,
      clearSelection,
      showDebugInfo
    }
  }
}
</script>

<style scoped>
.workspace {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #2c3e50;
  color: #ecf0f1;
}

/* Header Styles */
.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #34495e;
  border-bottom: 1px solid #4a5f7a;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #3498db;
}

.document-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.document-name {
  font-weight: 500;
}

.document-status {
  color: #e74c3c;
  font-weight: bold;
}

.node-count {
  color: #95a5a6;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  background: #e74c3c;
  color: white;
}

.status-indicator.loading {
  background: #f39c12;
}

.status-indicator.initialized {
  background: #27ae60;
}

.history-controls {
  display: flex;
  gap: 0.5rem;
}

.history-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #4a5f7a;
  background: #2c3e50;
  color: #ecf0f1;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.history-btn:hover:not(:disabled) {
  background: #34495e;
  border-color: #3498db;
}

.history-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Main Content */
.workspace-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.viewport-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.85rem;
  color: #ecf0f1;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  max-width: 280px;
}

.controls-hint p {
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.controls-hint p:last-child {
  margin-bottom: 0;
}

.debug-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.debug-info p {
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.debug-info .error {
  color: #e74c3c;
  font-weight: 500;
}

/* Footer Styles */
.workspace-footer {
  padding: 0.75rem 1rem;
  background: #34495e;
  border-top: 1px solid #4a5f7a;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #3498db;
  background: transparent;
  color: #3498db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: #3498db;
  color: white;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #95a5a6;
  color: #95a5a6;
}

/* Responsive design */
@media (max-width: 768px) {
  .workspace-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  
  .header-left,
  .header-right {
    justify-content: center;
  }
  
  .viewport-overlay {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.75rem;
    font-size: 0.8rem;
    max-width: 220px;
  }
  
  .quick-actions {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 1rem;
  }
  
  .viewport-overlay {
    position: relative;
    top: auto;
    right: auto;
    margin: 0.5rem;
    max-width: none;
  }
  
  .history-controls {
    flex-direction: column;
    width: 100%;
  }
  
  .history-btn {
    width: 100%;
  }
}
</style> 