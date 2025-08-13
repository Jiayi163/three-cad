<template>
  <MainLayout
    @menu-action="handleMenuAction"
    @tool-change="handleToolChange"
    @panel-toggle="handlePanelToggle"
    @viewport-action="handleViewportAction"
  >
    <template #viewport>
      <ThreeScene 
        :showDebugInfo="isDevelopment" 
        :activeTool="activeTool"
        @object-created="handleObjectCreated"
        @selection-changed="handleSelectionChanged"
      />
      
      <!-- Viewport overlay for development -->
      <div v-if="isDevelopment" class="viewport-overlay">
        <div class="debug-info">
          <p><strong>Development Debug Info:</strong></p>
          <p>Documents: {{ documentCount }}</p>
          <p>Views: {{ viewCount }}</p>
          <p>Selected: {{ selectedCount }}</p>
          <p>Active Tool: {{ activeTool }}</p>
          <p v-if="error" class="error">Error: {{ error }}</p>
        </div>
        
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
      </div>
    </template>
  </MainLayout>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useApplicationStore } from '../stores/application.js'
import MainLayout from '../components/layout/MainLayout.vue'
import ThreeScene from '../components/ThreeScene.vue'

export default {
  name: 'WorkspaceView',
  components: {
    MainLayout,
    ThreeScene
  },
  setup() {
    const appStore = useApplicationStore()
    
    // Development mode detection
    const isDevelopment = computed(() => import.meta.env.DEV)
    
    // Local state
    const activeTool = ref('select')
    
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

    // New event handlers for MainLayout
    const handleMenuAction = (action) => {
      console.log('Menu action:', action)
      
      switch (action) {
        case 'new':
          createNewDocument()
          break
        case 'save':
          if (hasActiveDocument.value) {
            console.log('Saving document:', activeDocument.value.name)
            // TODO: Implement actual save functionality
          }
          break
        case 'open':
          console.log('Open document dialog')
          // TODO: Implement file open dialog
          break
        case 'export':
          console.log('Export dialog')
          // TODO: Implement export functionality
          break
        case 'copy':
          console.log('Copy selected objects')
          // TODO: Implement copy functionality
          break
        case 'paste':
          console.log('Paste objects')
          // TODO: Implement paste functionality
          break
        case 'delete':
          console.log('Delete selected objects')
          // TODO: Implement delete functionality
          break
        case 'zoom-fit':
          console.log('Zoom to fit')
          // TODO: Implement zoom to fit
          break
        case 'view-front':
        case 'view-top':
        case 'view-iso':
          console.log('View preset:', action)
          // TODO: Implement view presets
          break
        default:
          console.log('Unhandled menu action:', action)
          break
      }
    }

    const handleToolChange = (tool) => {
      console.log('Tool changed to:', tool)
      activeTool.value = tool
    }

    const handlePanelToggle = (panel) => {
      console.log('Panel toggled:', panel)
      // TODO: Implement panel state management
    }

    const handleViewportAction = (action) => {
      console.log('Viewport action:', action)
      
      switch (action) {
        case 'toggle-wireframe':
          console.log('Toggle wireframe mode')
          // TODO: Implement wireframe toggle
          break
        case 'toggle-grid':
          console.log('Toggle grid display')
          // TODO: Implement grid toggle
          break
        case 'toggle-axes':
          console.log('Toggle axes display')
          // TODO: Implement axes toggle
          break
        default:
          console.log('Unhandled viewport action:', action)
          break
      }
    }

    const handleObjectCreated = (objectData) => {
      console.log('Object created:', objectData)
      // The object creation is handled by ThreeScene and the visual object system
    }

    const handleSelectionChanged = (selection) => {
      console.log('Selection changed:', selection)
      // The selection is managed by the document system
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
      activeTool,
      
      // Actions
      undo,
      redo,
      createNewDocument,
      addTestNode,
      clearSelection,
      showDebugInfo,
      
      // New event handlers
      handleMenuAction,
      handleToolChange,
      handlePanelToggle,
      handleViewportAction,
      handleObjectCreated,
      handleSelectionChanged
    }
  }
}
</script>

<style scoped>
/* Viewport overlay for development debug info */
.viewport-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.8rem;
  color: #ffffff;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  max-width: 280px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.debug-info {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.debug-info p {
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.3;
}

.debug-info .error {
  color: #ff6b6b;
  font-weight: 500;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid #007acc;
  background: rgba(0, 122, 204, 0.1);
  color: #007acc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  text-align: center;
}

.action-btn:hover:not(:disabled) {
  background: #007acc;
  color: white;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #666666;
  color: #666666;
}

/* Responsive design for development overlay */
@media (max-width: 768px) {
  .viewport-overlay {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.75rem;
    font-size: 0.7rem;
    max-width: 200px;
  }
  
  .action-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .viewport-overlay {
    position: relative;
    top: auto;
    right: auto;
    margin: 0.5rem;
    max-width: none;
    width: calc(100% - 1rem);
  }
  
  .quick-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .action-btn {
    flex: 1;
    min-width: calc(50% - 0.25rem);
  }
}
</style> 