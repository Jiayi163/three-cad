/**
 * ThreeView - Advanced Three.js viewport class
 * Manages 3D scene, camera, rendering, and interaction for CAD application
 */
import * as THREE from 'three'
import { markRaw } from 'vue'
import { Observable } from '../cad-core/foundation/Observable.js'
import { CameraController } from './CameraController.js'

export class ThreeView extends Observable {
  constructor(document, name = 'default') {
    super()
    
    // Core properties
    this.document = document
    this.name = name
    this.element = null
    this.isInitialized = false
    
    // Three.js components
    this.scene = null
    this.camera = null
    this.renderer = null
    this.cameraController = null
    
    // Rendering
    this.needsRender = true
    this.isRendering = false
    this.animationId = null
    
    // Interaction
    this.raycaster = markRaw(new THREE.Raycaster())
    this.mouse = markRaw(new THREE.Vector2())
    this.selectedObjects = new Set()
    this.hoveredObject = null
    
    // Scene objects
    this.visualObjects = new Map()  // Maps document nodes to Three.js objects
    this.helpers = markRaw(new THREE.Group())  // Grid, axes, etc.
    this.overlays = markRaw(new THREE.Group())  // Selection highlights, etc.
    
    // Settings
    this.settings = {
      backgroundColor: markRaw(new THREE.Color(0x222222)),
      showGrid: true,
      showAxes: true,
      enableShadows: true,
      antialias: true
    }
    
    // Bind event handlers once
    this._boundMouseMove = this._onMouseMove.bind(this)
    this._boundMouseDown = this._onMouseDown.bind(this)
    this._boundMouseUp = this._onMouseUp.bind(this)
    this._boundClick = this._onClick.bind(this)
    this._boundContextMenu = this._onContextMenu.bind(this)
    this._boundWheel = this._onWheel.bind(this)
    this._boundResize = this._onResize.bind(this)

    // Initialize
    this._initializeScene()
    this._setupEventHandlers()
  }

  /**
   * Initialize the Three.js scene and components
   */
  _initializeScene() {
    try {
      // Create scene - use markRaw to prevent Vue reactivity
      this.scene = markRaw(new THREE.Scene())
      this.scene.background = this.settings.backgroundColor
      
      // Create camera - use markRaw to prevent Vue reactivity
      this.camera = markRaw(new THREE.PerspectiveCamera(
        75, // FOV
        1,  // Aspect ratio (will be updated when DOM element is set)
        0.1, // Near plane
        1000 // Far plane
      ))
      this.camera.position.set(5, 5, 5)
      this.camera.lookAt(0, 0, 0)
      
      // Create renderer - use markRaw to prevent Vue reactivity
      this.renderer = markRaw(new THREE.WebGLRenderer({
        antialias: this.settings.antialias,
        alpha: true
      }))
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.shadowMap.enabled = this.settings.enableShadows
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      
      // Create camera controller
      this.cameraController = new CameraController(this)
      
      // Add helper groups to scene
      this.scene.add(this.helpers)
      this.scene.add(this.overlays)
      
      // Setup lighting
      this._setupLighting()
      
      // Setup helpers
      this._setupHelpers()
      
      this.setProperty('isInitialized', true)
      
    } catch (error) {
      console.error('Failed to initialize ThreeView:', error)
      this.setProperty('error', error.message)
    }
  }

  /**
   * Setup scene lighting
   */
  _setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)
    
    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    this.scene.add(directionalLight)
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-5, 0, -5)
    this.scene.add(fillLight)
  }

  /**
   * Setup scene helpers (grid, axes, etc.)
   */
  _setupHelpers() {
    if (this.settings.showGrid) {
      const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x333333)
      this.helpers.add(gridHelper)
    }
    
    if (this.settings.showAxes) {
      const axesHelper = new THREE.AxesHelper(5)
      this.helpers.add(axesHelper)
    }
  }

  /**
   * Setup event handlers
   */
  _setupEventHandlers() {
    // Listen to document changes
    if (this.document) {
      this.document.onPropertyChanged('nodes', () => {
        this._updateVisualObjects()
      })
      
      this.document.onPropertyChanged('selection', () => {
        this._updateSelection()
      })
    }
  }

  /**
   * Attach this view to a DOM element
   * @param {HTMLElement} element - DOM element to attach to
   */
  setDom(element) {
    if (this.element === element) return
    
    // Clean up previous element
    if (this.element && this.renderer) {
      this.element.removeChild(this.renderer.domElement)
      this._removeEventListeners()
    }
    
    this.element = element
    
    if (element && this.renderer) {
      // Attach renderer to new element
      element.appendChild(this.renderer.domElement)
      
      // Update size
      this._updateSize()
      
      // Setup DOM event listeners
      this._addEventListeners()
      
      // Start render loop
      this._startRenderLoop()
      
      this.setProperty('isAttached', true)
    } else {
      this.setProperty('isAttached', false)
    }
  }

  /**
   * Update renderer size to match container
   */
  _updateSize() {
    if (!this.element || !this.renderer || !this.camera) return
    
    const width = this.element.clientWidth
    const height = this.element.clientHeight
    
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      
      this.renderer.setSize(width, height)
      this.needsRender = true
    }
  }

  /**
   * Add DOM event listeners
   */
  _addEventListeners() {
    if (!this.element) return
    
    this.element.addEventListener('mousemove', this._boundMouseMove)
    this.element.addEventListener('mousedown', this._boundMouseDown)
    this.element.addEventListener('mouseup', this._boundMouseUp)
    this.element.addEventListener('click', this._boundClick)
    this.element.addEventListener('contextmenu', this._boundContextMenu)
    this.element.addEventListener('wheel', this._boundWheel)
    
    window.addEventListener('resize', this._boundResize)
  }

  /**
   * Remove DOM event listeners
   */
  _removeEventListeners() {
    if (!this.element) return
    
    this.element.removeEventListener('mousemove', this._boundMouseMove)
    this.element.removeEventListener('mousedown', this._boundMouseDown)
    this.element.removeEventListener('mouseup', this._boundMouseUp)
    this.element.removeEventListener('click', this._boundClick)
    this.element.removeEventListener('contextmenu', this._boundContextMenu)
    this.element.removeEventListener('wheel', this._boundWheel)
    
    window.removeEventListener('resize', this._boundResize)
  }

  /**
   * Mouse move event handler
   */
  _onMouseMove(event) {
    this._updateMousePosition(event)
    
    // Update hover
    const intersections = this._raycastFromMouse()
    const newHovered = intersections.length > 0 ? intersections[0].object : null
    
    if (this.hoveredObject !== newHovered) {
      this._setHoveredObject(newHovered)
    }
    
    // Notify camera controller
    if (this.cameraController) {
      this.cameraController._onMouseMove(event)
    }
  }

  /**
   * Mouse down event handler
   */
  _onMouseDown(event) {
    if (this.cameraController) {
      this.cameraController._onMouseDown(event)
    }
  }

  /**
   * Mouse up event handler
   */
  _onMouseUp(event) {
    if (this.cameraController) {
      this.cameraController._onDocumentMouseUp(event)
    }
  }

  /**
   * Click event handler
   */
  _onClick(event) {
    const intersections = this._raycastFromMouse()
    
    if (intersections.length > 0) {
      const object = intersections[0].object
      this._selectObject(object, event.ctrlKey || event.metaKey)
    } else {
      // Clear selection if clicking empty space
      if (!event.ctrlKey && !event.metaKey) {
        this._clearSelection()
      }
    }
  }

  /**
   * Context menu event handler
   */
  _onContextMenu(event) {
    event.preventDefault()
    // TODO: Show context menu
  }

  /**
   * Wheel event handler
   */
  _onWheel(event) {
    if (this.cameraController) {
      this.cameraController._onWheel(event)
    }
  }

  /**
   * Resize event handler
   */
  _onResize() {
    this._updateSize()
  }

  /**
   * Update mouse position for raycasting
   */
  _updateMousePosition(event) {
    if (!this.element) return
    
    const rect = this.element.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  /**
   * Perform raycasting from mouse position
   */
  _raycastFromMouse() {
    if (!this.camera || !this.scene) return []
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    return this.raycaster.intersectObjects(this.scene.children, true)
  }

  /**
   * Convert screen coordinates to world ray
   */
  rayAt(screenX, screenY) {
    if (!this.element || !this.camera) return null
    
    const rect = this.element.getBoundingClientRect()
    const x = ((screenX - rect.left) / rect.width) * 2 - 1
    const y = -((screenY - rect.top) / rect.height) * 2 + 1
    
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(x, y), this.camera)
    
    return ray
  }

  /**
   * Set hovered object
   */
  _setHoveredObject(object) {
    // Clear previous hover
    if (this.hoveredObject) {
      this._setObjectHover(this.hoveredObject, false)
    }
    
    this.hoveredObject = object
    
    // Set new hover
    if (object) {
      this._setObjectHover(object, true)
    }
    
    this.needsRender = true
  }

  /**
   * Select object
   */
  _selectObject(object, multiSelect = false) {
    if (!multiSelect) {
      this._clearSelection()
    }
    
    if (object && !this.selectedObjects.has(object)) {
      this.selectedObjects.add(object)
      this._setObjectSelected(object, true)
      
      // Update document selection if possible
      if (this.document && object.userData.nodeId) {
        this.document.selectNode(object.userData.nodeId, multiSelect)
      }
    }
    
    this.needsRender = true
    this.setProperty('selectionCount', this.selectedObjects.size)
  }

  /**
   * Clear selection
   */
  _clearSelection() {
    this.selectedObjects.forEach(object => {
      this._setObjectSelected(object, false)
    })
    this.selectedObjects.clear()
    
    if (this.document) {
      this.document.clearSelection()
    }
    
    this.needsRender = true
    this.setProperty('selectionCount', 0)
  }

  /**
   * Set object selection state
   */
  _setObjectSelected(object, selected) {
    if (object.material) {
      if (selected) {
        object.material.color.setHex(0xff4444)  // Red for selection
      } else {
        object.material.color.setHex(0x666666)  // Default gray
      }
    }
  }

  /**
   * Set object hover state
   */
  _setObjectHover(object, hovered) {
    if (object.material && !this.selectedObjects.has(object)) {
      if (hovered) {
        object.material.color.setHex(0x4444ff)  // Blue for hover
      } else {
        object.material.color.setHex(0x666666)  // Default gray
      }
    }
  }

  /**
   * Update visual objects from document
   */
  _updateVisualObjects() {
    // TODO: Implement visual object synchronization with document
    // This will be expanded when we have document nodes with geometry
  }

  /**
   * Update selection from document
   */
  _updateSelection() {
    // TODO: Implement selection synchronization with document
  }

  /**
   * Start the render loop
   */
  _startRenderLoop() {
    if (this.isRendering) return
    
    this.isRendering = true
    this._renderLoop()
  }

  /**
   * Stop the render loop
   */
  _stopRenderLoop() {
    this.isRendering = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Render loop
   */
  _renderLoop() {
    if (!this.isRendering) return
    
    this.animationId = requestAnimationFrame(() => this._renderLoop())
    
    // Update camera controller
    if (this.cameraController) {
      this.cameraController.update()
    }
    
    // Render if needed
    if (this.needsRender) {
      this._render()
      this.needsRender = false
    }
  }

  /**
   * Render the scene
   */
  _render() {
    if (!this.renderer || !this.scene || !this.camera) return
    
    try {
      // Ensure camera matrix is updated
      this.camera.updateMatrixWorld()
      this.renderer.render(this.scene, this.camera)
    } catch (error) {
      console.error('Render error:', error)
      this.setProperty('error', error.message)
    }
  }

  /**
   * Request a new frame to be rendered
   */
  requestRender() {
    this.needsRender = true
  }

  /**
   * Add a visual object to the scene
   */
  addVisualObject(nodeId, object3D) {
    if (this.visualObjects.has(nodeId)) {
      this.removeVisualObject(nodeId)
    }
    
    // Mark the object as raw to prevent Vue reactivity
    const rawObject = markRaw(object3D)
    rawObject.userData.nodeId = nodeId
    this.visualObjects.set(nodeId, rawObject)
    this.scene.add(rawObject)
    this.requestRender()
  }

  /**
   * Remove a visual object from the scene
   */
  removeVisualObject(nodeId) {
    const object3D = this.visualObjects.get(nodeId)
    if (object3D) {
      this.scene.remove(object3D)
      this.visualObjects.delete(nodeId)
      this.selectedObjects.delete(object3D)
      this.requestRender()
    }
  }

  /**
   * Dispose of resources
   */
  dispose() {
    try {
      this._stopRenderLoop()
      
      if (this.element && this.renderer && this.renderer.domElement) {
        try {
          this.element.removeChild(this.renderer.domElement)
        } catch (e) {
          // Element might already be removed
          console.warn('Could not remove renderer DOM element:', e)
        }
      }
      
      this._removeEventListeners()
      
      if (this.renderer) {
        this.renderer.dispose()
      }
      
      if (this.cameraController) {
        this.cameraController.dispose()
      }
      
      // Clear collections
      if (this.visualObjects) {
        this.visualObjects.clear()
      }
      if (this.selectedObjects) {
        this.selectedObjects.clear()
      }
      
      this.setProperty('isDisposed', true)
    } catch (error) {
      console.error('Error during ThreeView disposal:', error)
    }
  }
}