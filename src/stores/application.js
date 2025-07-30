import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { CADApplication } from '../packages/cad-core/application/CADApplication.js'

export const useApplicationStore = defineStore('application', () => {
  // ==================== Core Application Instance ====================
  
  // CADApplication instance - the heart of the application
  const cadApplication = ref(null)
  
  // ==================== Application State ====================
  
  // Basic application state
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  
  // Document state
  const activeDocumentId = ref(null)
  const documentCount = ref(0)
  const documents = ref([])
  
  // View state
  const activeViewId = ref(null)
  const viewCount = ref(0)
  const views = ref([])
  
  // History state
  const canUndo = ref(false)
  const canRedo = ref(false)
  
  // Selection state
  const selectedNodeIds = ref([])
  const selectedCount = ref(0)

  // ==================== Computed Properties ====================
  
  const activeDocument = computed(() => {
    if (!cadApplication.value || !activeDocumentId.value) return null
    return cadApplication.value.findDocumentById(activeDocumentId.value)
  })
  
  const activeView = computed(() => {
    if (!cadApplication.value || !activeViewId.value) return null
    return cadApplication.value.views.find(view => view.id === activeViewId.value)
  })
  
  const hasActiveDocument = computed(() => {
    return activeDocument.value !== null
  })
  
  const hasUnsavedChanges = computed(() => {
    return activeDocument.value?.hasUnsavedChanges || false
  })
  
  const applicationInfo = computed(() => {
    return cadApplication.value ? cadApplication.value.getInfo() : null
  })

  // ==================== Actions ====================
  
  async function initialize() {
    if (isInitialized.value) {
      console.warn('Application store is already initialized')
      return
    }

    try {
      isLoading.value = true
      error.value = null

      // Create CADApplication instance
      cadApplication.value = new CADApplication()
      
      // Set up application listeners
      setupApplicationListeners()
      
      // Initialize the application
      await cadApplication.value.initialize()
      
      // Sync initial state
      syncApplicationState()
      
      isInitialized.value = true
      console.log('CAD Application store initialized successfully')
      console.log('Store state after initialization:', {
        isInitialized: isInitialized.value,
        isLoading: isLoading.value,
        documentCount: documentCount.value,
        activeDocumentId: activeDocumentId.value
      })
      
    } catch (err) {
      error.value = err.message
      console.error('Failed to initialize CAD Application store:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ==================== Document Management ====================
  
  async function createNewDocument(name = 'Untitled') {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const document = await cadApplication.value.createNewDocument(name)
      syncDocumentState()
      return document
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  async function openDocument(data) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const document = await cadApplication.value.openDocument(data)
      syncDocumentState()
      return document
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  async function saveDocument(document = null) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const data = await cadApplication.value.saveDocument(document)
      syncDocumentState()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function closeDocument(document = null) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const result = cadApplication.value.closeDocument(document)
      syncDocumentState()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function setActiveDocument(document) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    cadApplication.value.setActiveDocument(document)
    syncDocumentState()
  }

  // ==================== Node Management ====================
  
  function addNode(nodeData, parent = null) {
    const document = activeDocument.value
    if (!document) {
      throw new Error('No active document')
    }

    try {
      const node = document.addNode(nodeData, parent)
      syncSelectionState()
      return node
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function removeNode(node) {
    const document = activeDocument.value
    if (!document) {
      throw new Error('No active document')
    }

    try {
      const result = document.removeNode(node)
      syncSelectionState()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function selectNode(node, addToSelection = false) {
    const document = activeDocument.value
    if (!document) {
      throw new Error('No active document')
    }

    try {
      const result = document.selectNode(node, addToSelection)
      syncSelectionState()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function deselectNode(node) {
    const document = activeDocument.value
    if (!document) {
      throw new Error('No active document')
    }

    try {
      const result = document.deselectNode(node)
      syncSelectionState()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function clearSelection() {
    const document = activeDocument.value
    if (!document) {
      throw new Error('No active document')
    }

    try {
      document.clearSelection()
      syncSelectionState()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // ==================== History Management ====================
  
  function undo() {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const result = cadApplication.value.undo()
      syncHistoryState()
      syncSelectionState()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function redo() {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const result = cadApplication.value.redo()
      syncHistoryState()
      syncSelectionState()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function clearHistory() {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      cadApplication.value.clearHistory()
      syncHistoryState()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // ==================== View Management ====================
  
  function createView(document = null, name = 'View') {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const view = cadApplication.value.createView(document, name)
      syncViewState()
      return view
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  function setActiveView(view) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    cadApplication.value.setActiveView(view)
    syncViewState()
  }
  
  function closeView(view = null) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const result = cadApplication.value.closeView(view)
      syncViewState()
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // ==================== Settings Management ====================
  
  function getSetting(key, defaultValue = null) {
    if (!cadApplication.value) {
      return defaultValue
    }
    return cadApplication.value.getSetting(key, defaultValue)
  }
  
  function setSetting(key, value) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      cadApplication.value.setSetting(key, value)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // ==================== State Synchronization ====================
  
  function syncApplicationState() {
    if (!cadApplication.value) return

    const info = cadApplication.value.getInfo()
    
    // Update document state
    activeDocumentId.value = info.activeDocument ? cadApplication.value.activeDocument.id : null
    documentCount.value = info.documentCount
    documents.value = cadApplication.value.documents.items.map(doc => ({
      id: doc.id,
      name: doc.name,
      isModified: doc.isModified,
      nodeCount: doc.nodes.length
    }))
    
    // Update view state
    activeViewId.value = info.activeView ? cadApplication.value.activeView.id : null
    viewCount.value = info.viewCount
    views.value = cadApplication.value.views.items.map(view => ({
      id: view.id,
      name: view.name,
      isActive: view.isActive,
      documentId: view.document ? view.document.id : null
    }))
    
    // Update history state
    canUndo.value = info.canUndo
    canRedo.value = info.canRedo
  }
  
  function syncDocumentState() {
    if (!cadApplication.value) return

    // Update document list
    documents.value = cadApplication.value.documents.items.map(doc => ({
      id: doc.id,
      name: doc.name,
      isModified: doc.isModified,
      nodeCount: doc.nodes.length
    }))
    
    documentCount.value = cadApplication.value.documents.length
    activeDocumentId.value = cadApplication.value.activeDocument ? cadApplication.value.activeDocument.id : null
    
    // Update history state
    syncHistoryState()
  }
  
  function syncViewState() {
    if (!cadApplication.value) return

    views.value = cadApplication.value.views.items.map(view => ({
      id: view.id,
      name: view.name,
      isActive: view.isActive,
      documentId: view.document ? view.document.id : null
    }))
    
    viewCount.value = cadApplication.value.views.length
    activeViewId.value = cadApplication.value.activeView ? cadApplication.value.activeView.id : null
  }
  
  function syncHistoryState() {
    if (!cadApplication.value) return

    const info = cadApplication.value.getInfo()
    canUndo.value = info.canUndo
    canRedo.value = info.canRedo
  }
  
  function syncSelectionState() {
    const document = activeDocument.value
    if (!document) {
      selectedNodeIds.value = []
      selectedCount.value = 0
      return
    }

    selectedNodeIds.value = document.selectedNodes.items.map(node => node.id)
    selectedCount.value = document.selectedNodes.length
  }

  // ==================== Event Listeners ====================
  
  function setupApplicationListeners() {
    if (!cadApplication.value) return

    // Listen to application property changes
    cadApplication.value.onPropertyChanged('activeDocument', () => {
      syncDocumentState()
      syncSelectionState()
    })
    
    cadApplication.value.onPropertyChanged('activeView', () => {
      syncViewState()
    })
    
    cadApplication.value.onPropertyChanged('canUndo', () => {
      syncHistoryState()
    })
    
    cadApplication.value.onPropertyChanged('canRedo', () => {
      syncHistoryState()
    })
    
    // Listen to document collection changes
    cadApplication.value.documents.onCollectionChanged(() => {
      syncDocumentState()
    })
    
    // Listen to view collection changes
    cadApplication.value.views.onCollectionChanged(() => {
      syncViewState()
    })
  }

  // ==================== Cleanup ====================
  
  function dispose() {
    if (cadApplication.value) {
      cadApplication.value.dispose()
      cadApplication.value = null
    }
    
    // Reset all state
    isInitialized.value = false
    isLoading.value = false
    error.value = null
    activeDocumentId.value = null
    documentCount.value = 0
    documents.value = []
    activeViewId.value = null
    viewCount.value = 0
    views.value = []
    canUndo.value = false
    canRedo.value = false
    selectedNodeIds.value = []
    selectedCount.value = 0
    
    console.log('Application store disposed')
  }

  // ==================== Development Helpers ====================
  
  function getDebugInfo() {
    return {
      store: {
        isInitialized: isInitialized.value,
        isLoading: isLoading.value,
        error: error.value,
        documentCount: documentCount.value,
        viewCount: viewCount.value,
        selectedCount: selectedCount.value
      },
      application: cadApplication.value ? cadApplication.value.getInfo() : null,
      activeDocument: activeDocument.value ? activeDocument.value.getInfo() : null
    }
  }

  // ==================== Return Store Interface ====================
  
  return {
    // ==================== State ====================
    cadApplication,
    isInitialized,
    isLoading,
    error,
    
    // Document state
    activeDocumentId,
    documentCount,
    documents,
    activeDocument,
    hasActiveDocument,
    hasUnsavedChanges,
    
    // View state
    activeViewId,
    viewCount,
    views,
    activeView,
    
    // History state
    canUndo,
    canRedo,
    
    // Selection state
    selectedNodeIds,
    selectedCount,
    
    // Application info
    applicationInfo,
    
    // ==================== Actions ====================
    
    // Application lifecycle
    initialize,
    dispose,
    
    // Document management
    createNewDocument,
    openDocument,
    saveDocument,
    closeDocument,
    setActiveDocument,
    
    // Node management
    addNode,
    removeNode,
    selectNode,
    deselectNode,
    clearSelection,
    
    // History management
    undo,
    redo,
    clearHistory,
    
    // View management
    createView,
    setActiveView,
    closeView,
    
    // Settings management
    getSetting,
    setSetting,
    
    // Synchronization
    syncApplicationState,
    syncDocumentState,
    syncViewState,
    syncHistoryState,
    syncSelectionState,
    
    // Debug helpers
    getDebugInfo
  }
}) 