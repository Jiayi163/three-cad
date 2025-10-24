/**
 * CameraController - Professional camera control system
 * Provides orbit, pan, zoom, and view preset functionality for CAD applications
 */
import * as THREE from 'three'
import { Observable } from '../cad-core/foundation/Observable.js'

export class CameraController extends Observable {
  constructor(threeView) {
    super()
    
    this.threeView = threeView
    this.camera = threeView.camera
    this.element = null
    
    // Control state
    this.enabled = true
    this.autoRotate = false
    this.autoRotateSpeed = 2.0
    
    // Mouse interaction state
    this.isMouseDown = false
    this.mouseButton = null
    this.lastMousePosition = new THREE.Vector2()
    this.mouseDelta = new THREE.Vector2()
    
    // Camera state
    this.target = new THREE.Vector3(0, 0, 0)
    this.minDistance = 1
    this.maxDistance = 100
    this.minPolarAngle = 0 // radians
    this.maxPolarAngle = Math.PI // radians
    
    // Spherical coordinates for orbit
    this.spherical = new THREE.Spherical()
    this.sphericalDelta = new THREE.Spherical()
    
    // Pan state
    this.panOffset = new THREE.Vector3()
    this.scale = 1
    
    // Animation
    this.enableDamping = true
    this.dampingFactor = 0.05
    this.isAnimating = false
    
    // External control flag (e.g., ViewCube animation)
    this.externalControl = false
    
    // Control sensitivity
    this.rotateSpeed = 0.2  // Lower = less sensitive rotation (reduced from 0.5)
    this.panSpeed = 0.5     // Pan sensitivity (reduced from 1.0)
    this.zoomSpeed = 0.95   // Zoom sensitivity (closer to 1.0 = less sensitive)
    
    // View presets
    this.viewPresets = {
      front: { position: [0, 0, 10], target: [0, 0, 0] },
      back: { position: [0, 0, -10], target: [0, 0, 0] },
      left: { position: [-10, 0, 0], target: [0, 0, 0] },
      right: { position: [10, 0, 0], target: [0, 0, 0] },
      top: { position: [0, 10, 0], target: [0, 0, 0] },
      bottom: { position: [0, -10, 0], target: [0, 0, 0] },
      isometric: { position: [7, 7, 7], target: [0, 0, 0] },
      trimetric: { position: [5, 8, 6], target: [0, 0, 0] }
    }
    
    // Bind event handlers
    this._boundMouseMove = this._onDocumentMouseMove.bind(this)
    this._boundMouseUp = this._onDocumentMouseUp.bind(this)
    
    // Initialize
    this._setupInitialState()
    this._setupEventHandlers()
  }

  /**
   * Setup initial camera state
   */
  _setupInitialState() {
    if (!this.camera) return
    
    // Calculate initial spherical coordinates
    const offset = new THREE.Vector3()
    offset.copy(this.camera.position).sub(this.target)
    this.spherical.setFromVector3(offset)
    
    this.setProperty('distance', this.spherical.radius)
    this.setProperty('azimuthAngle', this.spherical.theta)
    this.setProperty('polarAngle', this.spherical.phi)
  }

  /**
   * Setup event handlers
   */
  _setupEventHandlers() {
    // Listen to ThreeView property changes
    this.threeView.onPropertyChanged('isAttached', (attached) => {
      if (attached) {
        this.element = this.threeView.element
      } else {
        this.element = null
      }
    })
  }

  /**
   * Mouse down event handler
   */
  _onMouseDown(event) {
    if (!this.enabled) return
    
    event.preventDefault()
    
    this.isMouseDown = true
    this.mouseButton = event.button
    this.lastMousePosition.set(event.clientX, event.clientY)
    
    // Add document-level mouse events
    document.addEventListener('mousemove', this._boundMouseMove)
    document.addEventListener('mouseup', this._boundMouseUp)
    
    this.setProperty('isInteracting', true)
  }

  /**
   * Mouse move event handler (when mouse is down)
   */
  _onDocumentMouseMove(event) {
    if (!this.enabled || !this.isMouseDown) return
    
    event.preventDefault()
    
    const currentMouse = new THREE.Vector2(event.clientX, event.clientY)
    this.mouseDelta.copy(currentMouse).sub(this.lastMousePosition)
    
    switch (this.mouseButton) {
      case 0: // Left button - Orbit (Rotate view)
        this._handleOrbit()
        break
      case 2: // Right button - Pan (Pan view)
        this._handlePan()
        break
      case 1: // Middle button - Pan (alternative)
        this._handlePan()
        break
    }
    
    this.lastMousePosition.copy(currentMouse)
    this.threeView.requestRender()
  }

  /**
   * Mouse up event handler
   */
  _onDocumentMouseUp(event) {
    if (!this.enabled) return
    
    event.preventDefault()
    
    this.isMouseDown = false
    this.mouseButton = null
    
    // Remove document-level mouse events
    document.removeEventListener('mousemove', this._boundMouseMove)
    document.removeEventListener('mouseup', this._boundMouseUp)
    
    this.setProperty('isInteracting', false)
  }

  /**
   * Mouse move event handler (general)
   */
  _onMouseMove(event) {
    // This is called from ThreeView for hover detection, etc.
    // We don't need to handle camera control here since it's handled in _onDocumentMouseMove
  }

  /**
   * Wheel event handler
   */
  _onWheel(event) {
    if (!this.enabled) return
    
    event.preventDefault()
    
    // Use zoom speed to control sensitivity
    const zoomDelta = 1 + (1 - this.zoomSpeed) * 0.2  // Convert to zoom delta
    const zoomScale = event.deltaY > 0 ? zoomDelta : 1 / zoomDelta
    this._zoom(zoomScale)
    
    this.threeView.requestRender()
  }

  /**
   * Handle orbit (rotation) movement
   */
  _handleOrbit() {
    if (!this.element) return
    
    const element = this.element
    
    // Calculate rotation based on mouse movement with sensitivity control
    this.sphericalDelta.theta -= 2 * Math.PI * this.mouseDelta.x / element.clientWidth * this.rotateSpeed
    this.sphericalDelta.phi -= 2 * Math.PI * this.mouseDelta.y / element.clientHeight * this.rotateSpeed
  }

  /**
   * Handle pan movement
   */
  _handlePan() {
    if (!this.element || !this.camera) return
    
    const element = this.element
    const position = this.camera.position
    
    // Calculate pan based on camera distance and mouse movement
    const offset = new THREE.Vector3()
    offset.copy(position).sub(this.target)
    
    // Half of the FOV is center to top of screen
    let targetDistance = offset.length() * Math.tan((this.camera.fov / 2) * Math.PI / 180)
    
    // Scale pan speed with sensitivity control
    const panLeft = 2 * this.mouseDelta.x * targetDistance / element.clientHeight * this.panSpeed
    const panUp = 2 * this.mouseDelta.y * targetDistance / element.clientHeight * this.panSpeed
    
    this._pan(panLeft, panUp)
  }

  /**
   * Handle zoom movement (mouse drag)
   */
  _handleZoom() {
    const zoomScale = 1 + this.mouseDelta.y * 0.01
    this._zoom(zoomScale)
  }

  /**
   * Pan the camera
   */
  _pan(deltaX, deltaY) {
    if (!this.camera) return
    
    const offset = new THREE.Vector3()
    
    // Get the camera's local X and Y axes
    const cameraRight = new THREE.Vector3()
    const cameraUp = new THREE.Vector3()
    
    cameraRight.setFromMatrixColumn(this.camera.matrix, 0) // X axis
    cameraUp.setFromMatrixColumn(this.camera.matrix, 1)    // Y axis
    
    // Calculate pan offset
    offset.copy(cameraRight).multiplyScalar(-deltaX)
    offset.addScaledVector(cameraUp, deltaY)
    
    this.panOffset.add(offset)
  }

  /**
   * Zoom the camera
   */
  _zoom(scale) {
    this.scale *= scale
    
    // Clamp scale to prevent extreme zoom
    this.scale = Math.max(0.1, Math.min(10.0, this.scale))
  }

  /**
   * Update camera position and rotation
   */
  update() {
    if (!this.camera) return
    
    // Skip update if camera is under external control (e.g., ViewCube animation)
    if (this.externalControl) {
      if (!this._loggedExternalControl) {
        console.log('⏸️ CameraController.update() skipped - external control active')
        this._loggedExternalControl = true
      }
      return
    }
    
    // Reset log flag when control is released
    if (this._loggedExternalControl) {
      console.log('▶️ CameraController.update() resumed')
      this._loggedExternalControl = false
    }
    
    // Store old position for debugging
    const oldPos = this.camera.position.clone()
    
    // Apply spherical delta (rotation)
    this.spherical.theta += this.sphericalDelta.theta
    this.spherical.phi += this.sphericalDelta.phi
    
    // Apply scale (zoom)
    this.spherical.radius *= this.scale
    
    // Apply constraints
    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi))
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius))
    
    // Apply pan offset to target
    this.target.add(this.panOffset)
    
    // Convert spherical to cartesian
    const offset = new THREE.Vector3()
    offset.setFromSpherical(this.spherical)
    
    // Position camera
    this.camera.position.copy(this.target).add(offset)
    this.camera.lookAt(this.target)
    
    // CRITICAL: Do NOT reset camera.up after ViewCube animation
    // The ViewCube sets the correct up-vector for orthographic views
    if (this._justReleasedControl && this._preserveUpVector) {
      // Preserve the up-vector set by ViewCube for orthographic views
      this.camera.up.copy(this._preserveUpVector)
      // Clear the flag after a few frames to allow normal camera control
      if (this._frameCount > 3) {
        this._justReleasedControl = false
        this._preserveUpVector = null
        this._frameCount = 0
      } else {
        this._frameCount = (this._frameCount || 0) + 1
      }
    } else if (!this._justReleasedControl) {
      // For normal camera control, maintain Y-up orientation
      this.camera.up.set(0, 1, 0)
    }
    
    // Debug log if position changed significantly after ViewCube animation
    const posChange = this.camera.position.distanceTo(oldPos)
    if (posChange > 0.1 && this._justReleasedControl) {
      console.warn('⚠️ CameraController.update() changed position after ViewCube!', {
        oldPos,
        newPos: this.camera.position.clone(),
        spherical: {
          theta: this.spherical.theta,
          phi: this.spherical.phi,
          radius: this.spherical.radius
        },
        target: this.target.clone()
      })
      this._justReleasedControl = false
    }
    
    // Apply damping
    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor)
      this.sphericalDelta.phi *= (1 - this.dampingFactor)
      this.panOffset.multiplyScalar(1 - this.dampingFactor)
      this.scale = 1 + (this.scale - 1) * (1 - this.dampingFactor)
      
      // Check if still moving
      const epsilon = 0.000001
      if (Math.abs(this.sphericalDelta.theta) > epsilon ||
          Math.abs(this.sphericalDelta.phi) > epsilon ||
          this.panOffset.length() > epsilon ||
          Math.abs(this.scale - 1) > epsilon) {
        this.threeView.requestRender()
      }
    } else {
      // Reset deltas
      this.sphericalDelta.set(0, 0, 0)
      this.panOffset.set(0, 0, 0)
      this.scale = 1
    }
    
    // Auto rotate
    if (this.autoRotate && !this.isMouseDown) {
      this.sphericalDelta.theta -= 2 * Math.PI / 60 / 60 * this.autoRotateSpeed
      this.threeView.requestRender()
    }
    
    // Update properties
    this.setProperty('distance', this.spherical.radius)
    this.setProperty('azimuthAngle', this.spherical.theta)
    this.setProperty('polarAngle', this.spherical.phi)
  }

  /**
   * Set camera to a predefined view
   */
  setView(viewName, animate = true) {
    // Skip view changes if camera is under external control (ViewCube animation)
    if (this.externalControl) {
      console.log('⏸️ setView() skipped - external control active')
      return
    }
    
    const preset = this.viewPresets[viewName]
    if (!preset) {
      console.warn(`Unknown view preset: ${viewName}`)
      return
    }
    
    if (animate) {
      this._animateToView(preset)
    } else {
      this._setView(preset)
    }
  }

  /**
   * Set camera view immediately (no animation)
   */
  _setView(preset) {
    if (!this.camera) return
    
    this.camera.position.set(...preset.position)
    this.target.set(...preset.target)
    this.camera.lookAt(this.target)
    
    // Update spherical coordinates
    const offset = new THREE.Vector3()
    offset.copy(this.camera.position).sub(this.target)
    this.spherical.setFromVector3(offset)
    
    // Reset deltas
    this.sphericalDelta.set(0, 0, 0)
    this.panOffset.set(0, 0, 0)
    this.scale = 1
    
    this.threeView.requestRender()
    this.setProperty('currentView', preset)
  }

  /**
   * Animate camera to view
   */
  _animateToView(preset) {
    if (!this.camera) return
    
    this.isAnimating = true
    
    const startPosition = this.camera.position.clone()
    const startTarget = this.target.clone()
    const endPosition = new THREE.Vector3(...preset.position)
    const endTarget = new THREE.Vector3(...preset.target)
    
    const duration = 1000 // ms
    const startTime = performance.now()
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-in-out)
      const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI)
      
      // Interpolate position and target
      this.camera.position.lerpVectors(startPosition, endPosition, easedProgress)
      this.target.lerpVectors(startTarget, endTarget, easedProgress)
      this.camera.lookAt(this.target)
      
      // Update spherical coordinates
      const offset = new THREE.Vector3()
      offset.copy(this.camera.position).sub(this.target)
      this.spherical.setFromVector3(offset)
      
      this.threeView.requestRender()
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.isAnimating = false
        this.setProperty('currentView', preset)
      }
    }
    
    requestAnimationFrame(animate)
  }

  /**
   * Focus camera on a bounding box
   */
  focusOn(boundingBox, animate = true) {
    if (!boundingBox || !this.camera) return
    
    // Skip focus operations if camera is under external control (ViewCube animation)
    if (this.externalControl) {
      console.log('⏸️ focusOn() skipped - external control active')
      return
    }
    
    const center = boundingBox.getCenter(new THREE.Vector3())
    const size = boundingBox.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    
    // Calculate distance to fit object in view
    const fov = this.camera.fov * (Math.PI / 180)
    const distance = maxDim / (2 * Math.tan(fov / 2))
    
    // Maintain current viewing angle but adjust distance and target
    const direction = new THREE.Vector3()
    direction.copy(this.camera.position).sub(this.target).normalize()
    
    const newPosition = center.clone().add(direction.multiplyScalar(distance * 1.5))
    const newTarget = center.clone()
    
    if (animate) {
      this._animateToView({
        position: newPosition.toArray(),
        target: newTarget.toArray()
      })
    } else {
      this._setView({
        position: newPosition.toArray(),
        target: newTarget.toArray()
      })
    }
  }

  /**
   * Fit all objects in view
   */
  fitAll(animate = true) {
    if (!this.threeView.scene) return
    
    // Skip fit operations if camera is under external control (ViewCube animation)
    if (this.externalControl) {
      console.log('⏸️ fitAll() skipped - external control active')
      return
    }
    
    const box = new THREE.Box3()
    box.setFromObject(this.threeView.scene)
    
    if (!box.isEmpty()) {
      this.focusOn(box, animate)
    }
  }

  /**
   * Reset camera to default view
   */
  reset(animate = true) {
    const defaultView = {
      position: [5, 5, 5],
      target: [0, 0, 0]
    }
    
    if (animate) {
      this._animateToView(defaultView)
    } else {
      this._setView(defaultView)
    }
  }

  /**
   * Set camera target
   */
  setTarget(x, y, z) {
    this.target.set(x, y, z)
    this.threeView.requestRender()
  }

  /**
   * Get current camera state
   */
  getState() {
    return {
      position: this.camera.position.toArray(),
      target: this.target.toArray(),
      distance: this.spherical.radius,
      azimuth: this.spherical.theta,
      polar: this.spherical.phi
    }
  }

  /**
   * Set camera state
   */
  setState(state, animate = false) {
    const view = {
      position: state.position,
      target: state.target
    }
    
    if (animate) {
      this._animateToView(view)
    } else {
      this._setView(view)
    }
  }

  /**
   * Enable/disable controls
   */
  setEnabled(enabled) {
    this.enabled = enabled
    this.setProperty('enabled', enabled)
  }

  /**
   * Enable/disable auto rotation
   */
  setAutoRotate(enabled) {
    this.autoRotate = enabled
    this.setProperty('autoRotate', enabled)
  }

  /**
   * Set rotation sensitivity
   */
  setRotateSpeed(speed) {
    this.rotateSpeed = Math.max(0.1, Math.min(2.0, speed))
    this.setProperty('rotateSpeed', this.rotateSpeed)
  }

  /**
   * Set pan sensitivity
   */
  setPanSpeed(speed) {
    this.panSpeed = Math.max(0.1, Math.min(3.0, speed))
    this.setProperty('panSpeed', this.panSpeed)
  }

  /**
   * Set zoom sensitivity
   */
  setZoomSpeed(speed) {
    this.zoomSpeed = Math.max(0.8, Math.min(0.99, speed))
    this.setProperty('zoomSpeed', this.zoomSpeed)
  }

  /**
   * Dispose of resources
   */
  dispose() {
    // Remove any remaining event listeners
    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove)
    }
    if (this._boundMouseUp) {
      document.removeEventListener('mouseup', this._boundMouseUp)
    }
    
    this.setProperty('isDisposed', true)
  }
}