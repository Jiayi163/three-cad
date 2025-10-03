import { defineStore } from 'pinia'
import { ref, computed, watch, markRaw } from 'vue'
import { CADApplication } from '../packages/cad-core/application/CADApplication.js'
import * as THREE from 'three'

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

  // Command execution computed properties - now using our own state
  const isCommandExecuting = computed(() => {
    return isExecutingCommand.value || cadApplication.value?.isExecutingCommand || false
  })

  const hasError = computed(() => {
    return error.value !== null
  })

  const selectedNodes = computed(() => {
    const document = activeDocument.value
    if (!document) return []
    return document.selectedNodes?.items || []
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

  async function exportDocument(document = null, filename = null, options = {}) {
    const { ProjectExporter } = await import('../packages/cad-core/io/index.js')

    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    const targetDocument = document || activeDocument.value
    if (!targetDocument) {
      throw new Error('No document to export')
    }

    try {
      const exportedFilename = await ProjectExporter.exportAndDownload(
        targetDocument,
        filename,
        options
      )
      console.log(`Document exported: ${exportedFilename}`)
      return exportedFilename
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function importDocument(file) {
    const { ProjectImporter } = await import('../packages/cad-core/io/index.js')

    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const document = await ProjectImporter.importFromFile(file, cadApplication.value)
      syncDocumentState()
      console.log(`Document imported: ${document.name}`)
      return document
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function validateImportFile(file) {
    const { ProjectImporter } = await import('../packages/cad-core/io/index.js')

    try {
      return await ProjectImporter.validateFile(file)
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

  function deleteNode(nodeId) {
    const document = activeDocument.value
    if (!document) {
      throw new Error('No active document')
    }

    try {
      const node = document.findNodeById(nodeId)

      if (!node) {
        throw new Error(`Node with id ${nodeId} not found`)
      }

      const result = document.removeNode(node)
      syncSelectionState()

      return result
    } catch (err) {
      console.error('Error deleting node:', err)
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
      console.log('Application store undo called')
      const result = cadApplication.value.undo()
      console.log('CADApplication undo result:', result)
      syncHistoryState()
      syncSelectionState()
      console.log('Undo completed, canUndo:', canUndo.value, 'canRedo:', canRedo.value)
      return result
    } catch (err) {
      console.error('Undo error:', err)
      error.value = err.message
      throw err
    }
  }

  function redo() {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      console.log('Application store redo called')
      const result = cadApplication.value.redo()
      console.log('CADApplication redo result:', result)
      syncHistoryState()
      syncSelectionState()
      console.log('Redo completed, canUndo:', canUndo.value, 'canRedo:', canRedo.value)
      return result
    } catch (err) {
      console.error('Redo error:', err)
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

  // ==================== Command Execution ====================

  // Current active tool and command state
  const activeTool = ref(null)
  const isExecutingCommand = ref(false)
  const currentCommand = ref(null)

  // New command execution using the CommandManager
  async function executeCommand(commandId, parameters = {}) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      isExecutingCommand.value = true
      error.value = null

      console.log(`Executing command: ${commandId}`, parameters)

      // Use the new command system
      const result = await cadApplication.value.executeCommand(commandId, parameters)

      console.log(`Command ${commandId} completed successfully:`, result)
      return result

    } catch (err) {
      console.error(`Command ${commandId} failed:`, err)
      error.value = err.message
      throw err
    } finally {
      isExecutingCommand.value = false
    }
  }

  // Legacy command execution for backward compatibility
  async function executeCommandLegacy(commandName, ...args) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      isExecutingCommand.value = true
      error.value = null

      console.log(`Executing legacy command: ${commandName}`, args)

      // For now, we'll handle basic shape creation commands
      // This is kept for backward compatibility
      const document = activeDocument.value
      if (!document) {
        throw new Error('No active document available')
      }

      let result = null

      switch (commandName) {
        case 'CreateBox':
          // Use the new interactive BoxCommand instead of legacy handler
          result = await executeCommand('create-box', {
            useDimensionInput: true
          })
          break
        case 'CreateSphere':
          // Use the new interactive SphereCommand instead of legacy handler
          result = await executeCommand('create-sphere', {
            useDimensionInput: true
          })
          break
        case 'CreateCylinder':
          // Use the new interactive CylinderCommand instead of legacy handler
          result = await executeCommand('create-cylinder', {
            useDimensionInput: true
          })
          break
        case 'CreatePlane':
          // Use the new interactive PlaneCommand instead of legacy handler
          result = await executeCommand('create-plane', {
            useDimensionInput: true
          })
          break

        // Modify commands
        case 'moveObjects':
          // Use the new professional MoveCommand with interactive input
          result = await executeCommand('move-objects', {
            isInteractive: true,
            useCurrentPosition: true
          })
          break
        case 'rotateObjects':
          // Use the new professional RotateCommand (interactive with dialog)
          result = await executeCommand('rotate-objects', {
            isInteractive: true,
            rotationAxis: 'x', // Changed to X-axis for more visible rotation
            useObjectCenter: true
          })
          break
        case 'scaleObjects':
          // Use the new professional ScaleCommand with non-uniform scaling
          result = await executeCommand('scale-objects', {
            isInteractive: true,
            uniformScale: false, // Always use non-uniform scaling for XYZ stretching
            useObjectCenter: true
          })
          break


        // Selection commands
        case 'selectMode':
          result = await handleSelectModeCommand(document, args)
          break
        case 'selectAll':
          result = await handleSelectAllCommand(document, args)
          break
        case 'deselectAll':
          result = await handleDeselectAllCommand(document, args)
          break
        case 'invertSelection':
          result = await handleInvertSelectionCommand(document, args)
          break

        default:
          console.warn(`Command not implemented: ${commandName}`)
          // For unimplemented commands, just emit tool change
          emitToolChange(commandName)
          break
      }

      if (result) {
        // Sync state after command execution
        syncDocumentState()
        syncSelectionState()
      }

      return result

    } catch (err) {
      error.value = err.message
      console.error(`Error executing command ${commandName}:`, err)
      throw err
    } finally {
      isExecutingCommand.value = false
    }
  }

  // Command handlers - temporary implementations for Phase 4
  async function handleCreateBoxCommand(document) {
    // Create a box node with default parameters
    const nodeData = {
      id: `box-${Date.now()}`,
      name: `Box ${document.nodes.length + 1}`,
      type: 'box',
      visible: true,
      properties: {
        width: 10,
        height: 10,
        depth: 10,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'default'
      }
    }

    const node = document.addNode(nodeData)
    document.selectNode(node, false) // Select the new node
    console.log('Created box node:', node)
    return node
  }

  async function handleCreateSphereCommand(document) {
    const nodeData = {
      id: `sphere-${Date.now()}`,
      name: `Sphere ${document.nodes.length + 1}`,
      type: 'sphere',
      visible: true,
      properties: {
        radius: 5,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'default'
      }
    }

    const node = document.addNode(nodeData)
    document.selectNode(node, false)
    console.log('Created sphere node:', node)
    return node
  }

  async function handleCreateCylinderCommand(document) {
    const nodeData = {
      id: `cylinder-${Date.now()}`,
      name: `Cylinder ${document.nodes.length + 1}`,
      type: 'cylinder',
      visible: true,
      properties: {
        radius: 5,
        height: 10,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'default'
      }
    }

    const node = document.addNode(nodeData)
    document.selectNode(node, false)
    console.log('Created cylinder node:', node)
    return node
  }


  async function handleCreatePlaneCommand(document) {
    const nodeData = {
      id: `plane-${Date.now()}`,
      name: `Plane ${document.nodes.length + 1}`,
      type: 'plane',
      visible: true,
      properties: {
        width: 10,
        height: 10,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'default'
      }
    }

    const node = document.addNode(nodeData)
    document.selectNode(node, false)
    console.log('Created plane node:', node)
    return node
  }




  // ==================== Modify Commands ====================

  async function handleMoveObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for move operation')
      return null
    }

    console.log('Move tool activated for', selectedNodes.length, 'objects')

    // Simple move implementation - move objects by a small offset
    selectedNodes.forEach((node, index) => {
      if (node.visualObject && node.visualObject.position) {
        const currentPos = node.visualObject.position
        const offset = { x: 2, y: 0, z: 0 } // Move 2 units to the right

        node.visualObject.position = {
          x: currentPos.x + offset.x,
          y: currentPos.y + offset.y,
          z: currentPos.z + offset.z
        }

        console.log(`Moved ${node.name} to:`, node.visualObject.position)
      }
    })

    emitToolChange('moveObjects')
    return { action: 'move', objects: selectedNodes.length, moved: true }
  }

  async function handleRotateObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for rotate operation')
      return null
    }

    console.log('Rotate tool activated for', selectedNodes.length, 'objects')

    // Enhanced rotate implementation - rotate objects by 90 degrees around Y axis for more visible effect
    selectedNodes.forEach((node, index) => {
      if (node.visualObject) {
        // Set rotation property if it doesn't exist
        if (!node.visualObject.rotation) {
          node.visualObject.rotation = { x: 0, y: 0, z: 0 }
        }

        const currentRotation = node.visualObject.rotation
        const rotationAmount = Math.PI / 2 // 90 degrees in radians for more visible rotation

        node.visualObject.rotation = {
          x: currentRotation.x,
          y: currentRotation.y + rotationAmount,
          z: currentRotation.z
        }

        console.log(`Rotated ${node.name} by 90° around Y-axis to:`, node.visualObject.rotation)
      }
    })

    emitToolChange('rotateObjects')
    return { action: 'rotate', objects: selectedNodes.length, rotated: true }
  }

  async function handleScaleObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for scale operation')
      return null
    }

    console.log('Scale tool activated for', selectedNodes.length, 'objects')

    // Simple scale implementation - scale objects by 1.5x
    selectedNodes.forEach((node, index) => {
      if (node.visualObject) {
        // Set scale property if it doesn't exist
        if (!node.visualObject.scale) {
          node.visualObject.scale = { x: 1, y: 1, z: 1 }
        }

        const currentScale = node.visualObject.scale
        const scaleFactor = 1.5

        node.visualObject.scale = {
          x: currentScale.x * scaleFactor,
          y: currentScale.y * scaleFactor,
          z: currentScale.z * scaleFactor
        }

        console.log(`Scaled ${node.name} to:`, node.visualObject.scale)
      }
    })

    emitToolChange('scaleObjects')
    return { action: 'scale', objects: selectedNodes.length, scaled: true }
  }





  // ==================== Selection Commands ====================

  async function handleSelectModeCommand() {
    console.log('Select mode activated')
    emitToolChange('selectMode')
    return { action: 'selectMode' }
  }

  async function handleSelectAllCommand(document) {
    console.log('Selecting all objects')

    // Select all visible nodes
    let selectedCount = 0
    document.nodes.forEach(node => {
      if (node.visible !== false) {
        document.selectNode(node, true)
        selectedCount++
      }
    })

    console.log('Selected', selectedCount, 'objects')
    return { action: 'selectAll', count: selectedCount }
  }

  async function handleDeselectAllCommand(document) {
    console.log('Deselecting all objects')
    const previousCount = document.selectedNodes.length
    document.clearSelection()
    console.log('Deselected', previousCount, 'objects')
    return { action: 'deselectAll', count: previousCount }
  }

  async function handleInvertSelectionCommand(document) {
    console.log('Inverting selection')

    const currentlySelected = new Set(document.selectedNodes.items.map(node => node.id))
    let newSelectionCount = 0

    // Clear current selection
    document.clearSelection()

    // Select all non-selected visible nodes
    document.nodes.forEach(node => {
      if (node.visible !== false && !currentlySelected.has(node.id)) {
        document.selectNode(node, true)
        newSelectionCount++
      }
    })

    console.log('Inverted selection:', newSelectionCount, 'objects now selected')
    return { action: 'invertSelection', count: newSelectionCount }
  }

  // ==================== Event Handling ====================

  // Tool change event handlers
  const toolChangeListeners = ref([])
  const selectionChangeListeners = ref([])
  const viewModeChangeListeners = ref([])

  function onToolChange(callback) {
    if (typeof callback === 'function') {
      toolChangeListeners.value.push(callback)
    }
  }

  function offToolChange(callback) {
    const index = toolChangeListeners.value.indexOf(callback)
    if (index > -1) {
      toolChangeListeners.value.splice(index, 1)
    }
  }

  function emitToolChange(toolId) {
    toolChangeListeners.value.forEach(callback => {
      try {
        callback(toolId)
      } catch (error) {
        console.error('Error in tool change listener:', error)
      }
    })
  }

  function onSelectionChange(callback) {
    if (typeof callback === 'function') {
      selectionChangeListeners.value.push(callback)
    }
  }

  function offSelectionChange(callback) {
    const index = selectionChangeListeners.value.indexOf(callback)
    if (index > -1) {
      selectionChangeListeners.value.splice(index, 1)
    }
  }

  function emitSelectionChange() {
    selectionChangeListeners.value.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in selection change listener:', error)
      }
    })
  }

  function setViewMode(mode) {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      // Set view mode on the active view
      const view = activeView.value
      if (view && view.setViewMode) {
        view.setViewMode(mode)
      }

      // Emit view mode change
      viewModeChangeListeners.value.forEach(callback => {
        try {
          callback(mode)
        } catch (error) {
          console.error('Error in view mode change listener:', error)
        }
      })
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  function fitToView() {
    if (!cadApplication.value) {
      throw new Error('Application not initialized')
    }

    try {
      const view = activeView.value
      if (view && view.fitToView) {
        view.fitToView()
      }
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

    const previousCount = selectedCount.value
    selectedNodeIds.value = document.selectedNodes.items.map(node => node.id)
    selectedCount.value = document.selectedNodes.length

    // Emit selection change event if count changed
    if (selectedCount.value !== previousCount) {
      emitSelectionChange()
    }
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
    selectedNodes,

    // Application info
    applicationInfo,
    isExecutingCommand,
    isCommandExecuting,
    hasError,

    // Command state
    activeTool,
    currentCommand,

    // ==================== Actions ====================

    // Application lifecycle
    initialize,
    dispose,

    // Command execution
    executeCommand,
    executeCommandLegacy,

    // Document management
    createNewDocument,
    openDocument,
    saveDocument,
    exportDocument,
    importDocument,
    validateImportFile,
    closeDocument,
    setActiveDocument,

    // Node management
    addNode,
    removeNode,
    deleteNode,
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

    // Event handling
    onToolChange,
    offToolChange,
    emitToolChange,
    onSelectionChange,
    offSelectionChange,
    emitSelectionChange,
    setViewMode,
    fitToView,

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
