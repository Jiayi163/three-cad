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
          result = await handleCreateBoxCommand(document, args)
          break
        case 'CreateSphere':
          result = await handleCreateSphereCommand(document, args)
          break
        case 'CreateCylinder':
          result = await handleCreateCylinderCommand(document, args)
          break
        case 'CreateCone':
          result = await handleCreateConeCommand(document, args)
          break
        case 'CreatePlane':
          result = await handleCreatePlaneCommand(document, args)
          break
        case 'CreateTorus':
          result = await handleCreateTorusCommand(document, args)
          break
        case 'CreateLine':
          result = await handleCreateLineCommand(document, args)
          break
        case 'CreateCircle':
          result = await handleCreateCircleCommand(document, args)
          break

        // Modify commands
        case 'moveObjects':
          result = await handleMoveObjectsCommand(document, args)
          break
        case 'rotateObjects':
          result = await handleRotateObjectsCommand(document, args)
          break
        case 'scaleObjects':
          result = await handleScaleObjectsCommand(document, args)
          break
        case 'copyObjects':
          result = await handleCopyObjectsCommand(document, args)
          break
        case 'mirrorObjects':
          result = await handleMirrorObjectsCommand(document, args)
          break
        case 'arrayObjects':
          result = await handleArrayObjectsCommand(document, args)
          break

        // View commands
        case 'zoomAll':
          result = await handleZoomAllCommand(document, args)
          break
        case 'zoomWindow':
          result = await handleZoomWindowCommand(document, args)
          break
        case 'panView':
          result = await handlePanViewCommand(document, args)
          break
        case 'orbitView':
          result = await handleOrbitViewCommand(document, args)
          break
        case 'setViewFront':
          result = await handleSetViewFrontCommand(document, args)
          break
        case 'setViewTop':
          result = await handleSetViewTopCommand(document, args)
          break
        case 'setViewSide':
          result = await handleSetViewSideCommand(document, args)
          break
        case 'setViewIsometric':
          result = await handleSetViewIsometricCommand(document, args)
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

  async function handleCreateConeCommand(document) {
    const nodeData = {
      id: `cone-${Date.now()}`,
      name: `Cone ${document.nodes.length + 1}`,
      type: 'cone',
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
    console.log('Created cone node:', node)
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

  async function handleCreateTorusCommand(document) {
    const nodeData = {
      id: `torus-${Date.now()}`,
      name: `Torus ${document.nodes.length + 1}`,
      type: 'torus',
      visible: true,
      properties: {
        radius: 5,
        tube: 2,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'default'
      }
    }

    const node = document.addNode(nodeData)
    document.selectNode(node, false)
    console.log('Created torus node:', node)
    return node
  }

  async function handleCreateLineCommand(document) {
    const nodeData = {
      id: `line-${Date.now()}`,
      name: `Line ${document.nodes.length + 1}`,
      type: 'line',
      visible: true,
      properties: {
        startPoint: { x: -5, y: 0, z: 0 },
        endPoint: { x: 5, y: 0, z: 0 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        material: 'default'
      }
    }

    const node = document.addNode(nodeData)
    document.selectNode(node, false)
    console.log('Created line node:', node)
    return node
  }

  async function handleCreateCircleCommand(document) {
    const nodeData = {
      id: `circle-${Date.now()}`,
      name: `Circle ${document.nodes.length + 1}`,
      type: 'circle',
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
    console.log('Created circle node:', node)
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
    // In a full implementation, this would start an interactive move mode
    // For now, just log the action
    emitToolChange('moveObjects')
    return { action: 'move', objects: selectedNodes.length }
  }

  async function handleRotateObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for rotate operation')
      return null
    }

    console.log('Rotate tool activated for', selectedNodes.length, 'objects')
    emitToolChange('rotateObjects')
    return { action: 'rotate', objects: selectedNodes.length }
  }

  async function handleScaleObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for scale operation')
      return null
    }

    console.log('Scale tool activated for', selectedNodes.length, 'objects')
    emitToolChange('scaleObjects')
    return { action: 'scale', objects: selectedNodes.length }
  }

  async function handleCopyObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for copy operation')
      return null
    }

    console.log('Copying', selectedNodes.length, 'objects')

    // Create copies of selected objects
    const copies = []
    selectedNodes.forEach((node, index) => {
      console.log('Processing node for copy:', { id: node.id, type: node.type, name: node.name })

      // Skip demo objects or objects without proper structure
      if (!node.type || !node.id || node.id.startsWith('demo-')) {
        console.warn('Skipping demo object or invalid node:', { id: node.id, type: node.type, name: node.name })
        return
      }

      // Get current properties safely
      const currentProps = node.properties || {}
      const currentPosition = currentProps.position || { x: 0, y: 0, z: 0 }

      const copyData = {
        id: `${node.type}-copy-${Date.now()}-${index}`,
        name: `${node.name} Copy`,
        type: node.type,
        visible: node.visible !== false,
        properties: {
          ...currentProps,
          position: {
            x: currentPosition.x + 2,
            y: currentPosition.y,
            z: currentPosition.z + 2
          }
        }
      }

      console.log('Creating copy with data:', copyData)
      const copyNode = document.addNode(copyData)
      copies.push(copyNode)
    })

    if (copies.length > 0) {
      // Select the copies
      document.clearSelection()
      copies.forEach(copy => document.selectNode(copy, true))
    }

    console.log('Created', copies.length, 'copies')
    return { action: 'copy', copies: copies.length }
  }

  async function handleMirrorObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for mirror operation')
      return null
    }

    console.log('Mirror tool activated for', selectedNodes.length, 'objects')
    emitToolChange('mirrorObjects')
    return { action: 'mirror', objects: selectedNodes.length }
  }

  async function handleArrayObjectsCommand(document) {
    const selectedNodes = document.selectedNodes.items
    if (selectedNodes.length === 0) {
      console.warn('No objects selected for array operation')
      return null
    }

    console.log('Array tool activated for', selectedNodes.length, 'objects')
    emitToolChange('arrayObjects')
    return { action: 'array', objects: selectedNodes.length }
  }

  // ==================== View Commands ====================

  async function handleZoomAllCommand() {
    console.log('Zoom All command executed')
    // Trigger fit to view on the active view
    fitToView()
    return { action: 'zoomAll' }
  }

  async function handleZoomWindowCommand() {
    console.log('Zoom Window tool activated')
    emitToolChange('zoomWindow')
    return { action: 'zoomWindow' }
  }

  async function handlePanViewCommand() {
    console.log('Pan View tool activated')
    emitToolChange('panView')
    return { action: 'panView' }
  }

  async function handleOrbitViewCommand() {
    console.log('Orbit View tool activated')
    emitToolChange('orbitView')
    return { action: 'orbitView' }
  }

  async function handleSetViewFrontCommand() {
    console.log('Setting camera to Front view')
    const view = activeView.value
    if (view && view.setCameraView) {
      view.setCameraView('front')
    }
    return { action: 'setViewFront' }
  }

  async function handleSetViewTopCommand() {
    console.log('Setting camera to Top view')
    const view = activeView.value
    if (view && view.setCameraView) {
      view.setCameraView('top')
    }
    return { action: 'setViewTop' }
  }

  async function handleSetViewSideCommand() {
    console.log('Setting camera to Side view')
    const view = activeView.value
    if (view && view.setCameraView) {
      view.setCameraView('left')
    }
    return { action: 'setViewSide' }
  }

  async function handleSetViewIsometricCommand() {
    console.log('Setting camera to Isometric view')
    const view = activeView.value
    if (view && view.setCameraView) {
      view.setCameraView('isometric')
    }
    return { action: 'setViewIsometric' }
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
