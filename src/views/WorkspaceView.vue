<template>
  <MainLayout
    @menu-action="handleMenuAction"
    @tool-change="handleToolChange"
    @panel-toggle="handlePanelToggle"
    @viewport-action="handleViewportAction"
    @show-dev-debug="showDevDebugPanel = $event"
  >
    <template #viewport>
      <ThreeScene
        :showDebugInfo="showDebugInfo"
        :activeTool="activeTool"
        @object-created="handleObjectCreated"
        @selection-changed="handleSelectionChanged"
      />

      <!-- Development Debug Panel (Hidden by default) -->
      <div
        v-if="isDevelopment && showDevDebugPanel"
        class="dev-debug-overlay"
      >
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
          <button @click="printDebugInfo" class="action-btn">
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

    // Development mode detection and debug control
    const isDevelopment = computed(() => import.meta.env.DEV)
    const showDebugInfo = ref(true) // Always show debug panel, but with hover effect
    const showDevDebugPanel = ref(false) // Control development debug panel visibility

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

    const printDebugInfo = () => {
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
          // Call the delete function from application store
          try {
            const selectedNodes = appStore.selectedNodes
            if (selectedNodes.length === 0) {
              console.log('No objects selected for deletion')
              return
            }

            // Confirm deletion
            const objectCount = selectedNodes.length
            const objectText = objectCount === 1 ? 'object' : 'objects'
            if (!confirm(`Are you sure you want to delete ${objectCount} ${objectText}?`)) {
              console.log('User cancelled deletion')
              return
            }

            // Delete each selected node
            selectedNodes.forEach((node, index) => {
              console.log(`Deleting node ${index + 1}/${objectCount}:`, node.name, node.id)
              const result = appStore.deleteNode(node.id)
              console.log(`Delete result for ${node.name}:`, result)
            })

            console.log(`Successfully deleted ${objectCount} ${objectText} via menu`)
          } catch (error) {
            console.error('Error deleting objects via menu:', error)
          }
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
        case 'toggle-debug':
          showDebugInfo.value = !showDebugInfo.value
          console.log('Debug info toggled:', showDebugInfo.value)
          break
        default:
          console.log('Unhandled menu action:', action)
          break
      }
    }

    const handleToolChange = async (tool) => {
      console.log('Tool changed to:', tool)
      activeTool.value = tool

      // Start interactive command for geometry creation tools
      try {
        switch (tool) {
          case 'box':
            console.log('Starting interactive box creation...')
            // Start the interactive BoxCommand with dimension input
            const boxResult = await appStore.executeCommand('create-box', {
              useDimensionInput: true
            })
            console.log('Interactive box creation completed:', boxResult)
            break

          case 'sphere':
            console.log('Starting interactive sphere creation...')
            // Start the interactive SphereCommand with dimension input
            const sphereResult = await appStore.executeCommand('create-sphere', {
              useDimensionInput: true
            })
            console.log('Interactive sphere creation completed:', sphereResult)
            break

          case 'cylinder':
            console.log('Starting interactive cylinder creation...')
            // Start the interactive CylinderCommand with dimension input
            const cylinderResult = await appStore.executeCommand('create-cylinder', {
              useDimensionInput: true
            })
            console.log('Interactive cylinder creation completed:', cylinderResult)
            break

          case 'plane':
            console.log('Starting interactive plane creation...')
            // Start the interactive PlaneCommand with dimension input
            const planeResult = await appStore.executeCommand('create-plane', {
              useDimensionInput: true
            })
            console.log('Interactive plane creation completed:', planeResult)
            break

          case 'select':
            console.log('Select tool activated - Interactive mode')
            console.log('Tool selected: Select - Interactive mode active')
            break

          case 'move':
            console.log('Starting interactive move operation...')
            try {
              // Start the interactive MoveCommand
              const moveResult = await appStore.executeCommand('move-objects', {
                isInteractive: true,
                useCurrentPosition: true
              })
              console.log('Interactive move operation completed:', moveResult)
            } catch (error) {
              if (error.message.includes('No objects selected')) {
                console.log('Move tool selected: Please select objects first (use S key to activate selection, then click objects)')
                alert('Move Tool: Please select one or more objects first.\n\n1. Press S to activate selection mode\n2. Click on objects to select them\n3. Then press M to move the selected objects')
              } else {
                console.error('Move command failed:', error)
              }
            }
            break

          case 'rotate':
            console.log('Starting interactive rotate operation...')
            try {
              // Start the interactive RotateCommand
              const rotateResult = await appStore.executeCommand('rotate-objects', {
                isInteractive: true,
                rotationAxis: 'y',
                useObjectCenter: true
              })
              console.log('Interactive rotate operation completed:', rotateResult)
            } catch (error) {
              if (error.message.includes('No objects selected')) {
                console.log('Rotate tool selected: Please select objects first (use S key to activate selection, then click objects)')
                alert('Rotate Tool: Please select one or more objects first.\n\n1. Press S to activate selection mode\n2. Click on objects to select them\n3. Then press R to rotate the selected objects')
              } else {
                console.error('Rotate command failed:', error)
              }
            }
            break

          case 'scale':
            console.log('Starting interactive non-uniform scale operation...')
            try {
              // Always use non-uniform scaling (XYZ stretching)
              const scaleResult = await appStore.executeCommand('scale-objects', {
                isInteractive: true,
                uniformScale: false, // Always use non-uniform scaling for XYZ stretching
                useObjectCenter: true
              })
              console.log('Interactive scale operation completed:', scaleResult)
            } catch (error) {
              if (error.message.includes('No objects selected')) {
                console.log('Scale tool selected: Please select objects first (use S key to activate selection, then click objects)')
                alert('Scale Tool: Please select one or more objects first.\n\n1. Press S to activate selection mode\n2. Click on objects to select them\n3. Then press E to scale the selected objects\n\nScale along X, Y, Z axes independently')
              } else {
                console.error('Scale command failed:', error)
              }
            }
            break

          default:
            console.log(`Unknown tool: ${tool}`)
            break
        }
      } catch (error) {
        console.error(`Failed to start interactive command for tool ${tool}:`, error)
        console.log(`Tool selected: ${tool} - Command execution failed`)
      }
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
      showDebugInfo,
      showDevDebugPanel,
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
      printDebugInfo,

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
/* Development debug overlay (hover-triggered) */
.dev-debug-overlay {
  position: absolute;
  bottom: 2rem;
  left: 1rem;
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
  animation: slideUp 0.3s ease-out;
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
