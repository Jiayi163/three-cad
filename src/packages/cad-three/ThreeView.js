/**
 * ThreeView - Advanced Three.js viewport class
 * Manages 3D scene, camera, rendering, and interaction for CAD application
 */
import * as THREE from 'three'
import { markRaw } from 'vue'
import { Observable } from '../cad-core/foundation/Observable.js'
import { CameraController } from './CameraController.js'
import { VisualObject } from './VisualObject.js'
import { ViewCube } from './ViewCube.js'
import { SelectionOverlay } from './SelectionOverlay.js'
import { saveStateDebounced, restoreScene, hasPersistedState, loadState } from '../cad-core/io/ScenePersistence.js'

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
    this.viewCube = null

    // Rendering
    this.needsRender = true
    this.isRendering = false
    this.animationId = null

    // Interaction
    this.raycaster = markRaw(new THREE.Raycaster())
    this.mouse = markRaw(new THREE.Vector2())
    this.selectedObjects = new Set()
    this.hoveredObject = null

    // Layers for selective raycasting
    this.LAYER_INTERACTIVE = 0      // Real selectable objects
    this.LAYER_NON_INTERACTIVE = 1  // Helpers, grid, axes, gizmos

    // Selection system integration
    this.selectionManager = null

    // Scene objects
    this.visualObjects = new Map()  // Maps document nodes to Three.js objects
    this.visualObjectInstances = new Map()  // Maps nodeId to VisualObject instances
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
   * Force recreate renderer with proper settings
   * CRITICAL: Creates brand new canvas + WebGL context with alpha:false
   */
  recreateRenderer() {
    console.log('🔄 FORCING COMPLETE RENDERER RECREATION...')

    if (!this.element) {
      console.error('❌ Cannot recreate renderer: no DOM element!')
      return
    }

    // Dispose old renderer completely
    if (this.renderer) {
      const oldCanvas = this.renderer.domElement
      const oldAlpha = this.renderer.getContext().getContextAttributes().alpha
      console.log('🗑️ Disposing old renderer (alpha was:', oldAlpha, ')')

      try {
        this.renderer.forceContextLoss?.()
      } catch (e) {
        console.warn('Could not force context loss:', e)
      }

      try {
        this.renderer.dispose()
      } catch (e) {
        console.warn('Could not dispose renderer:', e)
      }

      // CRITICAL: Remove old canvas completely from DOM
      if (oldCanvas && oldCanvas.parentElement) {
        oldCanvas.parentElement.removeChild(oldCanvas)
        console.log('✅ Old canvas removed from DOM')
      }
    }

    // CRITICAL: Create BRAND NEW canvas element
    const newCanvas = document.createElement('canvas')
    newCanvas.style.width = '100%'
    newCanvas.style.height = '100%'
    newCanvas.style.display = 'block'

    console.log('✅ Created new canvas element')

    // CRITICAL: Create WebGL context ourselves with alpha:false
    const contextAttributes = {
      alpha: false,              // CRITICAL: opaque canvas
      antialias: this.settings.antialias,
      premultipliedAlpha: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    }

    // Try WebGL2 first, fall back to WebGL1
    let gl = newCanvas.getContext('webgl2', contextAttributes)
    if (!gl) {
      console.log('WebGL2 not available, trying WebGL1...')
      gl = newCanvas.getContext('webgl', contextAttributes) ||
           newCanvas.getContext('experimental-webgl', contextAttributes)
    }

    if (!gl) {
      console.error('❌ Failed to create WebGL context!')
      throw new Error('WebGL not supported')
    }

    // Verify context attributes BEFORE creating Three.js renderer
    const preAttrs = gl.getContextAttributes()
    console.log('🔍 WebGL context created with attributes:', {
      alpha: preAttrs.alpha,
      premultipliedAlpha: preAttrs.premultipliedAlpha,
      antialias: preAttrs.antialias,
      isWebGL2: gl instanceof WebGL2RenderingContext
    })

    if (preAttrs.alpha !== false) {
      console.error('❌ CRITICAL: Context still has alpha:true even after explicit creation!')
      console.error('This should never happen. Browser may be overriding our settings.')
    }

    // Create Three.js renderer using OUR pre-created context
    const newRenderer = markRaw(new THREE.WebGLRenderer({
      canvas: newCanvas,
      context: gl  // CRITICAL: Use our opaque context
    }))

    // Configure renderer
    newRenderer.setPixelRatio(window.devicePixelRatio)
    newRenderer.shadowMap.enabled = this.settings.enableShadows
    newRenderer.shadowMap.type = THREE.PCFSoftShadowMap
    newRenderer.outputColorSpace = THREE.SRGBColorSpace
    newRenderer.toneMapping = THREE.ACESFilmicToneMapping
    newRenderer.toneMappingExposure = 1.0
    newRenderer.setClearColor(0x000000, 1.0)
    newRenderer.autoClear = true

    this.renderer = newRenderer

    // Add new canvas to DOM
    this.element.appendChild(newCanvas)
    newRenderer.setSize(this.element.clientWidth, this.element.clientHeight)

    console.log('✅ New canvas added to DOM and sized')

    // Verify FINAL context attributes
    const finalGl = newRenderer.getContext()
    const finalAttrs = finalGl.getContextAttributes()
    console.log('✅ FINAL WebGL Context Attributes:', {
      alpha: finalAttrs.alpha,
      premultipliedAlpha: finalAttrs.premultipliedAlpha,
      antialias: finalAttrs.antialias
    })

    if (finalAttrs.alpha === false) {
      console.log('🎉 SUCCESS: Renderer has alpha:false - EXR backgrounds will work!')
    } else {
      console.error('❌ FAILED: Renderer STILL has alpha:true!')
      console.error('Something is forcing alpha:true (browser, extension, or bug)')
    }

    // Rebind ViewCube if it exists
    if (this.viewCube) {
      // ViewCube has its own renderer, doesn't need rebinding
      console.log('✅ ViewCube will continue working')
    }

    // Force a render
    this.requestRender()

    return newRenderer
  }

  /**
   * Initialize the Three.js scene and components
   */
  _initializeScene() {
    try {
      // Create scene - use markRaw to prevent Vue reactivity
      this.scene = markRaw(new THREE.Scene())
      this.scene.background = this.settings.backgroundColor

      // Create camera - keep a raw reference for ViewCube
      const cameraObject = new THREE.PerspectiveCamera(
        75, // FOV
        1,  // Aspect ratio (will be updated when DOM element is set)
        0.1, // Near plane
        1000 // Far plane
      )
      cameraObject.position.set(5, 5, 5)

      // CRITICAL: Set up-vector explicitly for consistent XYZ orientation
      cameraObject.up.set(0, 1, 0)
      cameraObject.lookAt(0, 0, 0)
      cameraObject.updateProjectionMatrix()
      cameraObject.updateMatrixWorld(true) // Force matrix update to finalize quaternion

      // Enable camera to see both interactive and non-interactive layers
      // This allows rendering helpers while raycaster only checks interactive objects
      cameraObject.layers.enableAll()

      // Store raw camera for ViewCube to avoid proxy issues
      this.rawCamera = cameraObject

      // Use markRaw for Vue reactivity prevention
      this.camera = markRaw(cameraObject)

      // Create renderer - use markRaw to prevent Vue reactivity
      // CRITICAL: alpha:false so scene.background actually shows (not transparent canvas)
      this.renderer = markRaw(new THREE.WebGLRenderer({
        antialias: this.settings.antialias,
        alpha: false,  // Changed from true - backgrounds need opaque canvas
        premultipliedAlpha: false
      }))
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.shadowMap.enabled = this.settings.enableShadows
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

      // Set proper color space for modern Three.js
      this.renderer.outputColorSpace = THREE.SRGBColorSpace

      console.log('✅ Renderer created with alpha:false for proper backgrounds')

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
      // Make grid non-interactive (not selectable, no raycasting)
      gridHelper.layers.set(this.LAYER_NON_INTERACTIVE)
      gridHelper.raycast = () => {} // Completely disable raycasting
      this.helpers.add(gridHelper)
    }

    if (this.settings.showAxes) {
      const axesHelper = new THREE.AxesHelper(5)
      // Make axes non-interactive (not selectable, no raycasting)
      axesHelper.layers.set(this.LAYER_NON_INTERACTIVE)
      axesHelper.raycast = () => {} // Completely disable raycasting
      this.helpers.add(axesHelper)
    }

    // Make the entire helpers group non-interactive
    this.helpers.layers.set(this.LAYER_NON_INTERACTIVE)
    this.helpers.traverse((child) => {
      child.layers.set(this.LAYER_NON_INTERACTIVE)
      child.raycast = () => {} // Disable raycasting on all helper children
    })
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
   * Initialize the view cube overlay
   */
  _initializeViewCube() {
    if (!this.element || !this.rawCamera || !this.scene) return

    try {
      // Make sure container has position: relative
      const computedStyle = window.getComputedStyle(this.element)
      if (computedStyle.position === 'static') {
        this.element.style.position = 'relative'
      }

      // Create ViewCube navigation control with main camera and controls
      this.viewCube = new ViewCube({
        container: this.element,
        mainCamera: this.rawCamera,
        controls: this.cameraController,
        threeView: this, // Pass reference to ThreeView for forcing renders
        size: 180,
        margin: 12
      })

      console.log('ViewCube navigation control initialized')
    } catch (error) {
      console.error('Failed to initialize ViewCube:', error)
    }
  }

  /**
   * Update the view cube scene clone
   * No longer needed - ViewCube renders main scene directly
   */
  _updateViewCubeScene() {
    // No-op - kept for API compatibility
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

      // Clean up view cube
      if (this.viewCube) {
        this.viewCube.dispose()
        this.viewCube = null
      }
    }

    this.element = element

    if (element && this.renderer) {
      // Attach renderer to new element
      element.appendChild(this.renderer.domElement)

      // Update size
      this._updateSize()

      // Setup DOM event listeners
      this._addEventListeners()

      // Initialize ViewCube (two-pass mini mirror)
      // No complex orientation sync needed - it just renders the same scene/camera
      this._initializeViewCube()

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

    // NO HOVER EFFECTS - removed hover highlighting
    // Selection is click-based only and persists until deselected

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

    // Update view cube on resize
    if (this.viewCube) {
      this.viewCube.onResize()
    }
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
   * Only checks INTERACTIVE layer (excludes helpers, grid, axes, gizmos)
   */
  _raycastFromMouse() {
    if (!this.camera || !this.scene) return []

    // Configure raycaster to only check interactive layer
    this.raycaster.layers.set(this.LAYER_INTERACTIVE)
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // Get all intersections, but filter to only mesh objects (not helpers)
    const intersections = this.raycaster.intersectObjects(this.scene.children, true)

    // Filter to only real mesh objects that are on interactive layer
    return intersections.filter(hit => {
      return hit.object &&
             hit.object.isMesh &&
             hit.object.layers.test(this.raycaster.layers) &&
             !hit.object.userData.isSelectionOverlay // Don't select the overlay itself
    })
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
   * Set hovered object (DISABLED - no hover effects)
   */
  _setHoveredObject(object) {
    // NO-OP: Hover effects are disabled
    // Selection is persistent and click-based only
  }

  /**
   * Set selection manager for advanced selection features
   * @param {SelectionManager} selectionManager - The selection manager instance
   */
  setSelectionManager(selectionManager) {
    this.selectionManager = selectionManager
    console.log('Selection manager integrated with ThreeView')
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
      // Skip temporary objects as they are not real document nodes
      if (this.document && object.userData.nodeId && !object.userData.nodeId.startsWith('temp-')) {
        // Find the actual node object by ID
        const node = this.document.findNodeById(object.userData.nodeId)
        if (node) {
          this.document.selectNode(node, multiSelect)
        } else {
          console.warn('Could not find document node for ID:', object.userData.nodeId)
        }
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
    if (selected) {
      // Apply red outline overlay
      SelectionOverlay.applySelection(object, false)
    } else {
      // Remove outline overlay
      SelectionOverlay.clearSelection(object)
    }

    // Update ViewCube to show selection state
    this._updateViewCubeScene()
  }

  /**
   * Set object hover state (DISABLED - no hover effects)
   */
  _setObjectHover(object, hovered) {
    // NO-OP: Hover effects are completely disabled
    // Only selection (click-based) shows overlays
  }

  /**
   * Set up property change listeners for a VisualObject
   * @param {VisualObject} visualObject - VisualObject to set up listeners for
   * @private
   */
  _setupVisualObjectListeners(visualObject) {
    // Listen for visibility changes
    visualObject.onPropertyChanged('visible', (newValue) => {
      const object3D = this.visualObjects.get(visualObject.nodeId)
      if (object3D) {
        object3D.visible = newValue
        this.requestRender()
      }
    })

    // Listen for position changes
    visualObject.onPropertyChanged('position', (newValue) => {
      const object3D = this.visualObjects.get(visualObject.nodeId)
      if (object3D && newValue) {
        object3D.position.copy(newValue)
        this.requestRender()
      }
    })

    // Listen for rotation changes
    visualObject.onPropertyChanged('rotation', (newValue) => {
      const object3D = this.visualObjects.get(visualObject.nodeId)
      if (object3D && newValue) {
        object3D.rotation.copy(newValue)
        this.requestRender()
      }
    })

    // Listen for scale changes
    visualObject.onPropertyChanged('scale', (newValue) => {
      const object3D = this.visualObjects.get(visualObject.nodeId)
      if (object3D && newValue) {
        object3D.scale.copy(newValue)
        this.requestRender()
      }
    })

    // Listen for selection changes
    visualObject.onPropertyChanged('selected', (newValue) => {
      const object3D = this.visualObjects.get(visualObject.nodeId)
      if (object3D) {
        if (newValue) {
          this.selectedObjects.add(object3D)
        } else {
          this.selectedObjects.delete(object3D)
        }
        this._updateObjectMaterial(object3D)
        this.requestRender()
      }
    })

    // Listen for highlight changes
    visualObject.onPropertyChanged('highlighted', (newValue) => {
      const object3D = this.visualObjects.get(visualObject.nodeId)
      if (object3D) {
        this._updateObjectMaterial(object3D)
        this.requestRender()
      }
    })
  }

  /**
   * Remove property change listeners from a VisualObject
   * @param {VisualObject} visualObject - VisualObject to remove listeners from
   * @private
   */
  _removeVisualObjectListeners(visualObject) {
    // Remove all listeners - VisualObject should handle this in dispose()
    // This is a placeholder for any cleanup specific to ThreeView
  }

  /**
   * Update material for an object based on its visual state
   * @param {THREE.Object3D} object3D - Object to update
   * @private
   */
  _updateObjectMaterial(object3D) {
    if (!object3D || !object3D.userData.visualObject) {
      return
    }

    const visualObject = object3D.userData.visualObject

    // Let the VisualObject handle its own material state
    // This will trigger the internal _updateMaterialState method
    if (visualObject instanceof VisualObject) {
      // The VisualObject will handle material updates internally
      // We just need to ensure the object3D gets the updated material
      const currentMaterial = visualObject.material
      if (currentMaterial && object3D.material !== currentMaterial) {
        object3D.material = currentMaterial
      }
    }
  }

  /**
   * Get VisualObject instance by nodeId
   * @param {string} nodeId - Node ID to look up
   * @returns {VisualObject|null}
   */
  getVisualObjectInstance(nodeId) {
    return this.visualObjectInstances.get(nodeId) || null
  }

  /**
   * Get all VisualObject instances
   * @returns {Map<string, VisualObject>}
   */
  getAllVisualObjectInstances() {
    return new Map(this.visualObjectInstances)
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

      // Render main scene to full viewport
      this.renderer.render(this.scene, this.camera)

      // Render mini viewport (ViewCube)
      // ViewCube has its own renderer and canvas, but uses the same camera and scene
      // This creates a perfect 1:1 mirror that zooms/pans/orbits identically
      if (this.viewCube) {
        this.viewCube.render()
      }
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
   * Add a VisualObject instance to the scene
   * @param {VisualObject} visualObject - VisualObject instance to add
   * @returns {Promise<THREE.Object3D>}
   */
  async addVisualObjectInstance(visualObject) {
    if (!(visualObject instanceof VisualObject)) {
      throw new Error('Expected VisualObject instance')
    }

    const nodeId = visualObject.nodeId
    if (!nodeId) {
      throw new Error('VisualObject must have a nodeId')
    }

    // Remove existing object if present
    if (this.visualObjectInstances.has(nodeId)) {
      this.removeVisualObjectInstance(nodeId)
    }

    try {
      // Create the Three.js representation
      const object3D = await visualObject.create()

      if (!object3D) {
        throw new Error('VisualObject.create() returned null/undefined')
      }

      // Mark as raw to prevent Vue reactivity
      const rawObject = markRaw(object3D)
      rawObject.userData.nodeId = nodeId
      rawObject.userData.visualObject = visualObject

      // Make object interactive (selectable) by putting it on the interactive layer
      rawObject.layers.set(this.LAYER_INTERACTIVE)
      // Ensure all children are also on interactive layer
      rawObject.traverse((child) => {
        // Don't change overlay layers (they inherit from parent anyway)
        if (!child.userData.isSelectionOverlay) {
          child.layers.set(this.LAYER_INTERACTIVE)
        }
      })

      // Store both the VisualObject instance and Three.js object
      this.visualObjectInstances.set(nodeId, visualObject)
      this.visualObjects.set(nodeId, rawObject)

      // Add to scene
      this.scene.add(rawObject)
      this.requestRender()

      // Set up property change listeners
      this._setupVisualObjectListeners(visualObject)

      // Update view cube scene clone
      this._updateViewCubeScene()

      return rawObject
    } catch (error) {
      console.error('Failed to add VisualObject:', error)
      throw error
    }
  }

  /**
   * Add a visual object to the scene (legacy method for Three.js objects)
   */
  addVisualObject(nodeId, object3D) {
    if (this.visualObjects.has(nodeId)) {
      this.removeVisualObject(nodeId)
    }

    // Mark the object as raw to prevent Vue reactivity
    const rawObject = markRaw(object3D)
    rawObject.userData.nodeId = nodeId
    rawObject.userData.visualObject = true // Mark as visualObject for ViewCube cloning

    // Make object interactive (selectable)
    rawObject.layers.set(this.LAYER_INTERACTIVE)
    rawObject.traverse((child) => {
      if (!child.userData.isSelectionOverlay) {
        child.layers.set(this.LAYER_INTERACTIVE)
      }
    })

    this.visualObjects.set(nodeId, rawObject)
    this.scene.add(rawObject)
    this.requestRender()

    // Update view cube scene clone
    this._updateViewCubeScene()
  }

  /**
   * Remove a VisualObject instance from the scene
   * @param {string} nodeId - Node ID of the object to remove
   */
  removeVisualObjectInstance(nodeId) {
    const visualObject = this.visualObjectInstances.get(nodeId)
    const object3D = this.visualObjects.get(nodeId)

    if (object3D) {
      this.scene.remove(object3D)
      this.visualObjects.delete(nodeId)
      this.selectedObjects.delete(object3D)
    }

    if (visualObject) {
      this._removeVisualObjectListeners(visualObject)
      this.visualObjectInstances.delete(nodeId)

      // Dispose the VisualObject
      try {
        visualObject.dispose()
      } catch (error) {
        console.error('Error disposing VisualObject:', error)
      }
    }

    this.requestRender()

    // Update view cube scene clone
    this._updateViewCubeScene()
  }

  /**
   * Remove a visual object from the scene (legacy method)
   */
  removeVisualObject(nodeId) {
    // Try VisualObject removal first
    if (this.visualObjectInstances.has(nodeId)) {
      this.removeVisualObjectInstance(nodeId)
      return
    }

    // Fallback to legacy removal
    const object3D = this.visualObjects.get(nodeId)
    if (object3D) {
      this.scene.remove(object3D)
      this.visualObjects.delete(nodeId)
      this.selectedObjects.delete(object3D)
      this.requestRender()

      // Update view cube scene clone
      this._updateViewCubeScene()
    }
  }

  /**
   * Save current scene state to IndexedDB (debounced)
   * Auto-persists: scene geometry, materials, textures, environment, camera, UI
   */
  async saveSceneState() {
    try {
      // Collect texture metadata
      const textureMetadata = []
      this._textureRegistry = this._textureRegistry || new Map()

      this.scene.traverse((object) => {
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]

          for (const material of materials) {
            if (material.map && !textureMetadata.find(t => t.id === material.map.uuid)) {
              // Store texture ID in material userData for restoration
              material.userData.textureId = material.map.uuid

              const registryEntry = this._textureRegistry.get(material.map.uuid)

              textureMetadata.push({
                id: material.map.uuid,
                name: registryEntry?.name || 'texture',
                blob: registryEntry?.blob,
                url: registryEntry?.url,
                props: {
                  wrapS: material.map.wrapS,
                  wrapT: material.map.wrapT,
                  repeat: material.map.repeat.toArray(),
                  offset: material.map.offset.toArray(),
                  rotation: material.map.rotation,
                  colorSpace: material.map.colorSpace || 'SRGBColorSpace',
                  flipY: material.map.flipY,
                  generateMipmaps: material.map.generateMipmaps
                }
              })
            }
          }
        }
      })

      // Collect environment metadata
      const environment = {
        kind: 'none'
      }

      if (this._environmentData) {
        environment.kind = this._environmentData.kind || 'none'
        environment.color = this._environmentData.color
        environment.imageName = this._environmentData.imageName
        environment.imageType = this._environmentData.imageType
        environment.settings = this._environmentData.settings
      }

      // Save to IndexedDB (debounced to avoid excessive writes)
      await saveStateDebounced({
        scene: this.scene,
        camera: this.camera,
        renderer: this.renderer,
        environment,
        textures: textureMetadata,
        ui: {
          panels: this._uiPanelState || {},
          layout: 'default'
        }
      })

      console.log('💾 Scene state saved (debounced)')
    } catch (error) {
      console.error('❌ Failed to save scene state:', error)
    }
  }

  /**
   * Register a texture for persistence
   * Call this when loading textures so they can be saved/restored
   *
   * @param {THREE.Texture} texture - Texture instance
   * @param {Object} metadata - Texture metadata
   * @param {string} metadata.name - Texture name
   * @param {Blob} [metadata.blob] - Original blob (if user-imported)
   * @param {string} [metadata.url] - URL (if from network)
   */
  registerTexture(texture, metadata) {
    this._textureRegistry = this._textureRegistry || new Map()

    this._textureRegistry.set(texture.uuid, {
      name: metadata.name || 'texture',
      blob: metadata.blob,
      url: metadata.url
    })

    console.log(`📝 Registered texture for persistence: ${metadata.name} (${texture.uuid})`)
  }

  /**
   * Register environment/background data for persistence
   *
   * @param {Object} envData - Environment metadata
   */
  registerEnvironment(envData) {
    this._environmentData = envData
    console.log(`🌄 Registered environment for persistence:`, envData.kind)
  }

  /**
   * Restore scene from IndexedDB
   * Called on app initialization to restore previous session
   *
   * @returns {Promise<boolean>} True if restoration successful
   */
  async restoreSceneState() {
    try {
      const hasState = await hasPersistedState()

      if (!hasState) {
        console.log('📭 No persisted scene state found')
        return false
      }

      console.log('🔄 Restoring scene from IndexedDB...')

      const savedState = await loadState()
      if (!savedState) {
        return false
      }

      const restored = await restoreScene(savedState, this.renderer)

      if (!restored) {
        return false
      }

      // Replace current scene
      this.scene = restored.scene

      // Replace camera
      const oldCamera = this.camera
      this.camera = restored.camera
      this.camera.aspect = oldCamera.aspect
      this.camera.updateProjectionMatrix()

      // Update camera controller
      if (this.cameraController) {
        this.cameraController.camera = this.camera
      }

      // Store environment data
      this._environmentData = restored.environment

      // Store UI state
      this._uiPanelState = restored.ui?.panels || {}

      // Re-setup helpers (grid, axes)
      this._setupHelpers()

      // Request render
      this.requestRender()

      console.log('✅ Scene successfully restored from IndexedDB')
      return true

    } catch (error) {
      console.error('❌ Failed to restore scene state:', error)
      return false
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

      // Dispose view cube
      if (this.viewCube) {
        this.viewCube.dispose()
        this.viewCube = null
      }

      if (this.renderer) {
        this.renderer.dispose()
      }

      if (this.cameraController) {
        this.cameraController.dispose()
      }

      // Dispose all VisualObject instances
      if (this.visualObjectInstances) {
        this.visualObjectInstances.forEach(visualObject => {
          try {
            visualObject.dispose()
          } catch (error) {
            console.error('Error disposing VisualObject:', error)
          }
        })
        this.visualObjectInstances.clear()
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
