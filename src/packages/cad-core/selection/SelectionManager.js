/**
 * SelectionManager - Advanced selection system for CAD objects
 *
 * Provides comprehensive selection functionality including:
 * - Multi-selection with Ctrl+click
 * - Box selection (drag to select multiple objects)
 * - Selection filtering by type, properties, etc.
 * - Selection tools (select all, invert, similar objects)
 * - Selection history and undo/redo integration
 * - Performance optimization for large object counts
 */

import { Observable } from '../foundation/Observable.js'
import { ObservableCollection } from '../foundation/Collection.js'
import * as THREE from 'three'

export class SelectionManager extends Observable {
  constructor(document, threeView) {
    super()

    // Core references
    this.document = document
    this.threeView = threeView

    // Selection state
    this.selectedObjects = new ObservableCollection()
    this.selectedNodes = new ObservableCollection()
    this.selectionHistory = []
    this.historyIndex = -1
    this.maxHistorySize = 50

    // Selection modes
    this.selectionMode = 'single' // 'single', 'multi', 'box', 'lasso'
    this.multiSelectKey = 'ctrlKey' // 'ctrlKey', 'shiftKey', 'altKey'

    // Box selection state
    this.isBoxSelecting = false
    this.boxSelectionStart = null
    this.boxSelectionEnd = null
    this.boxSelectionElement = null

    // Selection filters
    this.activeFilters = new Set()
    this.filterPredicates = new Map()

    // Performance settings
    this.maxSelectableObjects = 10000
    this.batchSize = 100
    this.useOctree = false // For spatial optimization

    // Event handlers
    this._boundHandlers = {
      mouseDown: this._onMouseDown.bind(this),
      mouseMove: this._onMouseMove.bind(this),
      mouseUp: this._onMouseUp.bind(this),
      keyDown: this._onKeyDown.bind(this),
      keyUp: this._onKeyUp.bind(this)
    }

    // Initialize
    this._setupEventListeners()
    this._setupSelectionFilters()
    this._initializeBoxSelection()

    // Listen to document changes
    if (this.document) {
      this.document.onPropertyChanged('nodeAdded', this._onNodeAdded.bind(this))
      this.document.onPropertyChanged('nodeRemoved', this._onNodeRemoved.bind(this))
    }
  }

  /**
   * Set up event listeners for selection interaction
   */
  _setupEventListeners() {
    if (this.threeView && this.threeView.element) {
      const element = this.threeView.element

      element.addEventListener('mousedown', this._boundHandlers.mouseDown)
      element.addEventListener('mousemove', this._boundHandlers.mouseMove)
      element.addEventListener('mouseup', this._boundHandlers.mouseUp)

      // Keyboard events for multi-selection
      document.addEventListener('keydown', this._boundHandlers.keyDown)
      document.addEventListener('keyup', this._boundHandlers.keyUp)
    }
  }

  /**
   * Initialize box selection overlay
   */
  _initializeBoxSelection() {
    if (!this.threeView || !this.threeView.element) return

    // Create box selection overlay element
    this.boxSelectionElement = document.createElement('div')
    this.boxSelectionElement.className = 'selection-box'
    this.boxSelectionElement.style.cssText = `
      position: absolute;
      border: 2px dashed #0088ff;
      background: rgba(0, 136, 255, 0.1);
      pointer-events: none;
      display: none;
      z-index: 1000;
    `

    // Append to viewport container
    const container = this.threeView.element.parentElement
    if (container) {
      container.style.position = 'relative'
      container.appendChild(this.boxSelectionElement)
    }
  }

  /**
   * Set up default selection filters
   */
  _setupSelectionFilters() {
    // Type-based filters
    this.addFilter('visible', (object) => object.visible)
    this.addFilter('unlocked', (object) => !object.userData.locked)
    this.addFilter('geometry', (object) => object.geometry && object.geometry.type)

    // Layer-based filters (if implemented)
    this.addFilter('activeLayer', (object) => {
      const layer = object.userData.layer
      return !layer || layer.visible !== false
    })
  }

  // ==================== Core Selection Methods ====================

  /**
   * Select objects with various options
   * @param {Array|Object} objects - Objects to select
   * @param {Object} options - Selection options
   */
  select(objects, options = {}) {
    const {
      addToSelection = false,
      clearPrevious = !addToSelection,
      silent = false,
      source = 'api'
    } = options

    // Normalize to array
    const objectsToSelect = Array.isArray(objects) ? objects : [objects]

    // Clear previous selection if needed
    if (clearPrevious) {
      this.clearSelection({ silent: true })
    }

    // Filter selectable objects
    const selectableObjects = objectsToSelect.filter(obj => this._isSelectable(obj))

    // Add to selection
    selectableObjects.forEach(obj => {
      if (!this.selectedObjects.contains(obj)) {
        this.selectedObjects.add(obj)
        this._setObjectSelected(obj, true)

        // Add corresponding node if available
        const nodeId = obj.userData?.nodeId
        if (nodeId && this.document && this.document.getNode) {
          const node = this.document.getNode(nodeId)
          if (node && !this.selectedNodes.contains(node)) {
            this.selectedNodes.add(node)
          }
        }
      }
    })

    // Save to history
    if (!silent) {
      this._saveSelectionState()
      this._notifySelectionChanged(source)
    }

    return selectableObjects.length
  }

  /**
   * Deselect objects
   * @param {Array|Object} objects - Objects to deselect
   * @param {Object} options - Deselection options
   */
  deselect(objects, options = {}) {
    const { silent = false, source = 'api' } = options

    // Normalize to array
    const objectsToDeselect = Array.isArray(objects) ? objects : [objects]

    objectsToDeselect.forEach(obj => {
      if (this.selectedObjects.contains(obj)) {
        this.selectedObjects.remove(obj)
        this._setObjectSelected(obj, false)

        // Remove corresponding node
        const nodeId = obj.userData?.nodeId
        if (nodeId && this.document && this.document.getNode) {
          const node = this.document.getNode(nodeId)
          if (node && this.selectedNodes.contains(node)) {
            this.selectedNodes.remove(node)
          }
        }
      }
    })

    if (!silent) {
      this._saveSelectionState()
      this._notifySelectionChanged(source)
    }
  }

  /**
   * Clear all selection
   * @param {Object} options - Clear options
   */
  clearSelection(options = {}) {
    const { silent = false, source = 'api' } = options

    // Clear visual selection state
    this.selectedObjects.forEach(obj => {
      this._setObjectSelected(obj, false)
    })

    // Clear collections
    this.selectedObjects.clear()
    this.selectedNodes.clear()

    if (!silent) {
      this._saveSelectionState()
      this._notifySelectionChanged(source)
    }
  }

  /**
   * Toggle selection of objects
   * @param {Array|Object} objects - Objects to toggle
   * @param {Object} options - Toggle options
   */
  toggleSelection(objects, options = {}) {
    const objectsArray = Array.isArray(objects) ? objects : [objects]

    const toSelect = []
    const toDeselect = []

    objectsArray.forEach(obj => {
      if (this.selectedObjects.contains(obj)) {
        toDeselect.push(obj)
      } else {
        toSelect.push(obj)
      }
    })

    if (toDeselect.length > 0) {
      this.deselect(toDeselect, { ...options, silent: true })
    }

    if (toSelect.length > 0) {
      this.select(toSelect, { ...options, addToSelection: true, silent: true })
    }

    if (!options.silent) {
      this._saveSelectionState()
      this._notifySelectionChanged(options.source || 'api')
    }
  }

  // ==================== Advanced Selection Tools ====================

  /**
   * Select all selectable objects
   * @param {Object} options - Selection options
   */
  selectAll(options = {}) {
    const allObjects = this._getAllSelectableObjects()
    return this.select(allObjects, { ...options, clearPrevious: true, source: 'selectAll' })
  }

  /**
   * Invert current selection
   * @param {Object} options - Selection options
   */
  invertSelection(options = {}) {
    const allObjects = this._getAllSelectableObjects()
    const currentSelection = Array.from(this.selectedObjects)

    // Objects to select = all objects - currently selected
    const toSelect = allObjects.filter(obj => !this.selectedObjects.contains(obj))

    this.clearSelection({ silent: true })
    return this.select(toSelect, { ...options, source: 'invertSelection' })
  }

  /**
   * Select similar objects based on properties
   * @param {Object} referenceObject - Object to match against
   * @param {Array} properties - Properties to match ['type', 'material', 'layer']
   * @param {Object} options - Selection options
   */
  selectSimilar(referenceObject, properties = ['type'], options = {}) {
    if (!referenceObject) return 0

    const allObjects = this._getAllSelectableObjects()
    const similarObjects = allObjects.filter(obj => {
      return properties.every(prop => this._compareProperty(obj, referenceObject, prop))
    })

    return this.select(similarObjects, { ...options, source: 'selectSimilar' })
  }

  /**
   * Select objects by type
   * @param {String} type - Object type to select
   * @param {Object} options - Selection options
   */
  selectByType(type, options = {}) {
    const allObjects = this._getAllSelectableObjects()
    const objectsOfType = allObjects.filter(obj => {
      return obj.userData.type === type || obj.geometry?.type === type
    })

    return this.select(objectsOfType, { ...options, source: 'selectByType' })
  }

  // ==================== Box Selection ====================

  /**
   * Start box selection
   * @param {Object} startPoint - Starting point {x, y}
   */
  startBoxSelection(startPoint) {
    this.isBoxSelecting = true
    this.boxSelectionStart = { ...startPoint }
    this.boxSelectionEnd = { ...startPoint }

    if (this.boxSelectionElement) {
      this.boxSelectionElement.style.display = 'block'
      this._updateBoxSelectionVisual()
    }
  }

  /**
   * Update box selection
   * @param {Object} currentPoint - Current point {x, y}
   */
  updateBoxSelection(currentPoint) {
    if (!this.isBoxSelecting) return

    this.boxSelectionEnd = { ...currentPoint }
    this._updateBoxSelectionVisual()
  }

  /**
   * End box selection and select objects within box
   * @param {Object} options - Selection options
   */
  endBoxSelection(options = {}) {
    if (!this.isBoxSelecting) return 0

    const selectedCount = this._performBoxSelection(options)

    // Clean up
    this.isBoxSelecting = false
    this.boxSelectionStart = null
    this.boxSelectionEnd = null

    if (this.boxSelectionElement) {
      this.boxSelectionElement.style.display = 'none'
    }

    return selectedCount
  }

  /**
   * Cancel box selection
   */
  cancelBoxSelection() {
    this.isBoxSelecting = false
    this.boxSelectionStart = null
    this.boxSelectionEnd = null

    if (this.boxSelectionElement) {
      this.boxSelectionElement.style.display = 'none'
    }
  }

  // ==================== Selection Filters ====================

  /**
   * Add a selection filter
   * @param {String} name - Filter name
   * @param {Function} predicate - Filter function
   */
  addFilter(name, predicate) {
    this.filterPredicates.set(name, predicate)
  }

  /**
   * Remove a selection filter
   * @param {String} name - Filter name
   */
  removeFilter(name) {
    this.filterPredicates.delete(name)
    this.activeFilters.delete(name)
  }

  /**
   * Enable a filter
   * @param {String} name - Filter name
   */
  enableFilter(name) {
    if (this.filterPredicates.has(name)) {
      this.activeFilters.add(name)
    }
  }

  /**
   * Disable a filter
   * @param {String} name - Filter name
   */
  disableFilter(name) {
    this.activeFilters.delete(name)
  }

  // ==================== Selection History ====================

  /**
   * Save current selection state to history
   */
  _saveSelectionState() {
    const state = {
      objects: Array.from(this.selectedObjects),
      nodes: Array.from(this.selectedNodes),
      timestamp: Date.now()
    }

    // Remove future history if we're not at the end
    if (this.historyIndex < this.selectionHistory.length - 1) {
      this.selectionHistory = this.selectionHistory.slice(0, this.historyIndex + 1)
    }

    // Add new state
    this.selectionHistory.push(state)
    this.historyIndex++

    // Limit history size
    if (this.selectionHistory.length > this.maxHistorySize) {
      this.selectionHistory.shift()
      this.historyIndex--
    }
  }

  /**
   * Undo selection change
   */
  undoSelection() {
    if (this.historyIndex > 0) {
      this.historyIndex--
      this._restoreSelectionState(this.selectionHistory[this.historyIndex])
      return true
    }
    return false
  }

  /**
   * Redo selection change
   */
  redoSelection() {
    if (this.historyIndex < this.selectionHistory.length - 1) {
      this.historyIndex++
      this._restoreSelectionState(this.selectionHistory[this.historyIndex])
      return true
    }
    return false
  }

  // ==================== Event Handlers ====================

  /**
   * Handle mouse down events
   */
  _onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
      const rect = this.threeView.element.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }

      // Check if we should start box selection
      if (event.shiftKey && !event.ctrlKey) {
        this.startBoxSelection(point)
        event.preventDefault()
        return
      }

      // Handle object selection
      const intersectedObject = this._getObjectAtPoint(point)
      if (intersectedObject) {
        const multiSelect = event[this.multiSelectKey]

        if (multiSelect) {
          this.toggleSelection(intersectedObject, { source: 'mouse' })
        } else {
          this.select(intersectedObject, { clearPrevious: true, source: 'mouse' })
        }
      } else if (!event[this.multiSelectKey]) {
        // Clear selection if clicking on empty space
        this.clearSelection({ source: 'mouse' })
      }
    }
  }

  /**
   * Handle mouse move events
   */
  _onMouseMove(event) {
    if (this.isBoxSelecting) {
      const rect = this.threeView.element.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
      this.updateBoxSelection(point)
    }
  }

  /**
   * Handle mouse up events
   */
  _onMouseUp(event) {
    if (this.isBoxSelecting && event.button === 0) {
      const multiSelect = event[this.multiSelectKey]
      this.endBoxSelection({ addToSelection: multiSelect, source: 'boxSelection' })
    }
  }

  /**
   * Handle key down events
   */
  _onKeyDown(event) {
    // Handle keyboard shortcuts for selection
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault()
          this.selectAll({ source: 'keyboard' })
          break
        case 'i':
          event.preventDefault()
          this.invertSelection({ source: 'keyboard' })
          break
        case 'd':
          event.preventDefault()
          this.clearSelection({ source: 'keyboard' })
          break
      }
    }

    // Escape to cancel box selection
    if (event.key === 'Escape' && this.isBoxSelecting) {
      this.cancelBoxSelection()
    }
  }

  /**
   * Handle key up events
   */
  _onKeyUp(event) {
    // Handle key releases if needed
  }

  // ==================== Helper Methods ====================

  /**
   * Check if an object is selectable
   */
  _isSelectable(object) {
    if (!object || !object.visible) return false

    // Apply active filters
    for (const filterName of this.activeFilters) {
      const predicate = this.filterPredicates.get(filterName)
      if (predicate && !predicate(object)) {
        return false
      }
    }

    return true
  }

  /**
   * Set visual selection state on object
   */
  _setObjectSelected(object, selected) {
    if (object.userData.visualObject) {
      object.userData.visualObject.selected = selected
    }

    // Update Three.js object material if needed
    if (this.threeView && this.threeView._updateObjectMaterial) {
      this.threeView._updateObjectMaterial(object)
    }
  }

  /**
   * Get all selectable objects in the scene
   */
  _getAllSelectableObjects() {
    const allObjects = []

    if (this.threeView && this.threeView.scene) {
      this.threeView.scene.traverse((object) => {
        if (object.userData.nodeId && this._isSelectable(object)) {
          allObjects.push(object)
        }
      })
    }

    return allObjects
  }

  /**
   * Get object at screen point using raycasting
   */
  _getObjectAtPoint(point) {
    if (!this.threeView || !this.threeView.raycaster) return null

    // Convert screen coordinates to normalized device coordinates
    const rect = this.threeView.element.getBoundingClientRect()
    const mouse = new THREE.Vector2()
    mouse.x = (point.x / rect.width) * 2 - 1
    mouse.y = -(point.y / rect.height) * 2 + 1

    // Perform raycasting
    this.threeView.raycaster.setFromCamera(mouse, this.threeView.camera)
    const intersects = this.threeView.raycaster.intersectObjects(this.threeView.scene.children, true)

    // Find first selectable object
    for (const intersect of intersects) {
      if (intersect.object.userData.nodeId && this._isSelectable(intersect.object)) {
        return intersect.object
      }
    }

    return null
  }

  /**
   * Update box selection visual
   */
  _updateBoxSelectionVisual() {
    if (!this.boxSelectionElement || !this.boxSelectionStart || !this.boxSelectionEnd) return

    const left = Math.min(this.boxSelectionStart.x, this.boxSelectionEnd.x)
    const top = Math.min(this.boxSelectionStart.y, this.boxSelectionEnd.y)
    const width = Math.abs(this.boxSelectionEnd.x - this.boxSelectionStart.x)
    const height = Math.abs(this.boxSelectionEnd.y - this.boxSelectionStart.y)

    this.boxSelectionElement.style.left = left + 'px'
    this.boxSelectionElement.style.top = top + 'px'
    this.boxSelectionElement.style.width = width + 'px'
    this.boxSelectionElement.style.height = height + 'px'
  }

  /**
   * Perform box selection
   */
  _performBoxSelection(options = {}) {
    if (!this.boxSelectionStart || !this.boxSelectionEnd) return 0

    const selectedObjects = []
    const allObjects = this._getAllSelectableObjects()

    // Get box bounds in screen space
    const left = Math.min(this.boxSelectionStart.x, this.boxSelectionEnd.x)
    const right = Math.max(this.boxSelectionStart.x, this.boxSelectionEnd.x)
    const top = Math.min(this.boxSelectionStart.y, this.boxSelectionEnd.y)
    const bottom = Math.max(this.boxSelectionStart.y, this.boxSelectionEnd.y)

    // Check each object's screen position
    allObjects.forEach(object => {
      const screenPos = this._getObjectScreenPosition(object)
      if (screenPos &&
          screenPos.x >= left && screenPos.x <= right &&
          screenPos.y >= top && screenPos.y <= bottom) {
        selectedObjects.push(object)
      }
    })

    // Select the objects
    return this.select(selectedObjects, options)
  }

  /**
   * Get object's screen position
   */
  _getObjectScreenPosition(object) {
    if (!this.threeView || !object.geometry) return null

    // Get object's world position
    const worldPos = new THREE.Vector3()
    object.getWorldPosition(worldPos)

    // Project to screen coordinates
    const screenPos = worldPos.clone().project(this.threeView.camera)
    const rect = this.threeView.element.getBoundingClientRect()

    return {
      x: (screenPos.x + 1) * rect.width / 2,
      y: (-screenPos.y + 1) * rect.height / 2
    }
  }

  /**
   * Compare property between two objects
   */
  _compareProperty(obj1, obj2, property) {
    switch (property) {
      case 'type':
        return obj1.userData.type === obj2.userData.type
      case 'material':
        return obj1.material?.type === obj2.material?.type
      case 'layer':
        return obj1.userData.layer === obj2.userData.layer
      case 'geometry':
        return obj1.geometry?.type === obj2.geometry?.type
      default:
        return obj1.userData[property] === obj2.userData[property]
    }
  }

  /**
   * Restore selection state from history
   */
  _restoreSelectionState(state) {
    this.clearSelection({ silent: true })

    // Restore object selection
    state.objects.forEach(obj => {
      if (obj.parent) { // Check if object still exists in scene
        this.selectedObjects.add(obj)
        this._setObjectSelected(obj, true)
      }
    })

    // Restore node selection
    state.nodes.forEach(node => {
      if (this.document && this.document.getNode && this.document.getNode(node.id)) {
        this.selectedNodes.add(node)
      }
    })

    this._notifySelectionChanged('history')
  }

  /**
   * Notify selection changed
   */
  _notifySelectionChanged(source) {
    this.notifyPropertyChanged('selectionChanged', null, {
      selectedObjects: Array.from(this.selectedObjects),
      selectedNodes: Array.from(this.selectedNodes),
      count: this.selectedObjects.length,
      source
    })

    // Update properties
    this.setProperty('selectedCount', this.selectedObjects.length)
    this.setProperty('hasSelection', this.selectedObjects.length > 0)
  }

  /**
   * Handle node added to document
   */
  _onNodeAdded(oldValue, newNode) {
    // Auto-select newly created nodes if configured
    if (this.autoSelectNewObjects && newNode) {
      // Find corresponding 3D object
      setTimeout(() => {
        const object = this._findObjectByNodeId(newNode.id)
        if (object) {
          this.select(object, { clearPrevious: true, source: 'nodeAdded' })
        }
      }, 100) // Small delay to ensure 3D object is created
    }
  }

  /**
   * Handle node removed from document
   */
  _onNodeRemoved(oldValue, removedNode) {
    if (removedNode && this.selectedNodes && this.selectedNodes.contains(removedNode)) {
      this.selectedNodes.remove(removedNode)
      this._notifySelectionChanged('nodeRemoved')
    }
  }

  /**
   * Find 3D object by node ID
   */
  _findObjectByNodeId(nodeId) {
    if (!this.threeView || !this.threeView.scene) return null

    let foundObject = null
    this.threeView.scene.traverse((object) => {
      if (object.userData.nodeId === nodeId) {
        foundObject = object
      }
    })

    return foundObject
  }

  // ==================== Public API ====================

  /**
   * Get current selection info
   */
  getSelectionInfo() {
    return {
      objects: Array.from(this.selectedObjects),
      nodes: Array.from(this.selectedNodes),
      count: this.selectedObjects.length,
      types: this._getSelectedTypes(),
      bounds: this._getSelectionBounds()
    }
  }

  /**
   * Get types of selected objects
   */
  _getSelectedTypes() {
    const types = new Set()
    this.selectedObjects.forEach(obj => {
      if (obj.userData.type) {
        types.add(obj.userData.type)
      }
    })
    return Array.from(types)
  }

  /**
   * Get bounding box of selected objects
   */
  _getSelectionBounds() {
    if (this.selectedObjects.length === 0) return null

    const box = new THREE.Box3()
    this.selectedObjects.forEach(obj => {
      if (obj.geometry) {
        const objBox = new THREE.Box3().setFromObject(obj)
        box.union(objBox)
      }
    })

    return box.isEmpty() ? null : box
  }

  /**
   * Dispose of the selection manager
   */
  dispose() {
    // Remove event listeners
    if (this.threeView && this.threeView.element) {
      const element = this.threeView.element
      element.removeEventListener('mousedown', this._boundHandlers.mouseDown)
      element.removeEventListener('mousemove', this._boundHandlers.mouseMove)
      element.removeEventListener('mouseup', this._boundHandlers.mouseUp)
    }

    document.removeEventListener('keydown', this._boundHandlers.keyDown)
    document.removeEventListener('keyup', this._boundHandlers.keyUp)

    // Remove box selection element
    if (this.boxSelectionElement && this.boxSelectionElement.parentElement) {
      this.boxSelectionElement.parentElement.removeChild(this.boxSelectionElement)
    }

    // Clear collections
    this.selectedObjects.dispose()
    this.selectedNodes.dispose()

    // Clear references
    this.document = null
    this.threeView = null
    this.selectionHistory = []
    this.filterPredicates.clear()
    this.activeFilters.clear()

    super.dispose()
  }
}

export default SelectionManager
