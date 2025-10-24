/**
 * ViewCube - Interactive navigation cube for camera control (Fusion 360 style)
 * Displays a clickable cube in the top-right corner
 * Clicking faces snaps the main camera to orthographic views with smooth animation
 */
import * as THREE from 'three'
import { markRaw } from 'vue'

export class ViewCube {
  constructor({ container, mainCamera, controls, threeView = null, size = 180, margin = 12 }) {
    this.container = container
    this.mainCamera = mainCamera
    this.controls = controls // OrbitControls or CameraController
    this.threeView = threeView // Reference to ThreeView instance for forcing renders
    this.size = size
    this.margin = margin

    // Fixed dimensions
    this.width = size
    this.height = size

    // Create mini scene with navigation cube
    this.miniScene = markRaw(new THREE.Scene())
    this.miniCamera = markRaw(new THREE.PerspectiveCamera(50, 1, 0.1, 100))

    // miniCamera looks at cube from front (along +Z axis)
    // Cube will rotate to show correct orientation
    this.miniCamera.up.set(0, 1, 0)
    this.miniCamera.position.set(0, 0, 4)
    this.miniCamera.lookAt(0, 0, 0)
    this.miniCamera.updateMatrixWorld(true)

    // Create the navigation cube
    this._createNavigationCube()

    // Create separate renderer for the mini viewport
    const rendererObj = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    rendererObj.setSize(size, size)
    rendererObj.setPixelRatio(window.devicePixelRatio)
    rendererObj.setClearColor(0x000000, 0)

    this.renderer = markRaw(rendererObj)

    // Style canvas
    this.canvas = this.renderer.domElement
    this.canvas.style.position = 'absolute'
    this.canvas.style.top = `${margin}px`
    this.canvas.style.right = `${margin}px`
    this.canvas.style.width = `${size}px`
    this.canvas.style.height = `${size}px`
    this.canvas.style.zIndex = '9999'
    this.canvas.style.pointerEvents = 'auto' // Enable interaction
    this.canvas.style.borderRadius = '8px'
    this.canvas.style.border = '2px solid rgba(255, 255, 255, 0.2)'
    this.canvas.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
    this.canvas.style.background = 'rgba(30, 30, 30, 0.95)'
    this.canvas.style.backdropFilter = 'blur(10px)'
    this.canvas.style.cursor = 'pointer'

    this.container.appendChild(this.canvas)

    // Setup interaction
    this._setupInteraction()

    // Animation state
    this.isAnimating = false

    // Raycaster for click detection
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    console.log('✅ ViewCube navigation control initialized:', size, 'x', size)
  }

  /**
   * Create the navigation cube with labeled faces
   */
  _createNavigationCube() {
    // Create cube geometry
    const geometry = new THREE.BoxGeometry(1, 1, 1)

    // Create materials for each face with different colors and labels
    const materials = [
      this._createFaceMaterial(0x4da3ff, 'Right', '+X'),  // Right (positive X)
      this._createFaceMaterial(0x4da3ff, 'Left', '-X'),   // Left (negative X)
      this._createFaceMaterial(0x7bd88f, 'Top', '+Y'),    // Top (positive Y)
      this._createFaceMaterial(0x7bd88f, 'Bottom', '-Y'), // Bottom (negative Y)
      this._createFaceMaterial(0xff7a7a, 'Front', '+Z'),  // Front (positive Z)
      this._createFaceMaterial(0xff7a7a, 'Back', '-Z')    // Back (negative Z)
    ]

    this.cube = markRaw(new THREE.Mesh(geometry, materials))

    // CRITICAL: Ensure cube starts with NO rotation (aligned with world axes)
    this.cube.rotation.set(0, 0, 0)
    this.cube.updateMatrixWorld(true)

    this.miniScene.add(this.cube)

    // Add edges for better visibility
    const edges = new THREE.EdgesGeometry(geometry)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.4
    })
    const wireframe = markRaw(new THREE.LineSegments(edges, lineMaterial))
    this.cube.add(wireframe)

    // Add axis helpers as child of cube so they rotate together
    // Size 1.8 to extend beyond the cube (cube is 1x1x1)
    const axesHelper = markRaw(new THREE.AxesHelper(1.8))
    axesHelper.renderOrder = 999 // Render on top
    this.cube.add(axesHelper) // Add to cube, not scene

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    this.miniScene.add(ambientLight)

    // Add directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(1, 1, 1)
    this.miniScene.add(dirLight)
  }

  /**
   * Create material for a cube face with label
   */
  _createFaceMaterial(color, label, axis) {
    const material = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })

    // Store metadata for click detection
    material.userData = { label, axis }

    return material
  }

  /**
   * Setup mouse interaction for click detection
   */
  _setupInteraction() {
    this.canvas.addEventListener('click', (event) => {
      event.stopPropagation()

      if (this.isAnimating) return

      // Calculate mouse position in normalized device coordinates
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Raycast against the cube
      this.raycaster.setFromCamera(this.mouse, this.miniCamera)
      const intersects = this.raycaster.intersectObject(this.cube, false)

      if (intersects.length > 0) {
        const intersection = intersects[0]

        // Get the material index to determine which face was clicked
        // BoxGeometry face order: Right(+X), Left(-X), Top(+Y), Bottom(-Y), Front(+Z), Back(-Z)
        const faceIndex = intersection.faceIndex
        const materialIndex = Math.floor(faceIndex / 2) // Each face has 2 triangles

        // Map material index to view direction
        const direction = this._getFaceDirection(materialIndex)

        if (direction) {
          console.log('ViewCube face clicked:', direction.label, 'materialIndex:', materialIndex)
          this._animateCameraToView(direction)
        }
      }
    })

    // Hover effect
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.mouse, this.miniCamera)
      const intersects = this.raycaster.intersectObject(this.cube, false)

      if (intersects.length > 0) {
        this.canvas.style.cursor = 'pointer'

        // Show which face is being hovered
        const faceIndex = intersects[0].faceIndex
        const materialIndex = Math.floor(faceIndex / 2)
        const direction = this._getFaceDirection(materialIndex)
        if (direction) {
          this.canvas.title = direction.label
        }
      } else {
        this.canvas.style.cursor = 'default'
        this.canvas.title = ''
      }
    })
  }

  /**
   * Get face direction from material index
   * BoxGeometry material order: Right(+X), Left(-X), Top(+Y), Bottom(-Y), Front(+Z), Back(-Z)
   */
  _getFaceDirection(materialIndex) {
    const directions = [
      { vector: new THREE.Vector3(1, 0, 0), label: 'Right', axis: '+X' },      // 0: Right
      { vector: new THREE.Vector3(-1, 0, 0), label: 'Left', axis: '-X' },      // 1: Left
      { vector: new THREE.Vector3(0, 1, 0), label: 'Top', axis: '+Y' },        // 2: Top
      { vector: new THREE.Vector3(0, -1, 0), label: 'Bottom', axis: '-Y' },    // 3: Bottom
      { vector: new THREE.Vector3(0, 0, 1), label: 'Front', axis: '+Z' },      // 4: Front
      { vector: new THREE.Vector3(0, 0, -1), label: 'Back', axis: '-Z' }       // 5: Back
    ]

    return directions[materialIndex] || null
  }

  /**
   * Map face normal to view direction (legacy method, kept for compatibility)
   */
  _normalToDirection(normal) {
    const threshold = 0.5
    const directions = [
      { vector: new THREE.Vector3(1, 0, 0), label: 'Right', axis: '+X' },
      { vector: new THREE.Vector3(-1, 0, 0), label: 'Left', axis: '-X' },
      { vector: new THREE.Vector3(0, 1, 0), label: 'Top', axis: '+Y' },
      { vector: new THREE.Vector3(0, -1, 0), label: 'Bottom', axis: '-Y' },
      { vector: new THREE.Vector3(0, 0, 1), label: 'Front', axis: '+Z' },
      { vector: new THREE.Vector3(0, 0, -1), label: 'Back', axis: '-Z' }
    ]

    for (const dir of directions) {
      if (normal.dot(dir.vector) > threshold) {
        return dir
      }
    }

    return null
  }

  /**
   * Ease in/out function (smooth animation curve)
   */
  _ease(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t)
  }

  /**
   * Animate main camera to target view with smooth transition
   * Implements Fusion 360 / Inventor style view cube behavior
   */
  _animateCameraToView(direction) {
    if (this.isAnimating) return

    this.isAnimating = true

    // Take control of the camera - prevent CameraController from updating
    if (this.controls) {
      this.controls.externalControl = true
    }

    console.log('🎯 Switching to view:', direction.label, direction.axis)

    // Get current camera position and orbit center (target)
    const startPos = this.mainCamera.position.clone()
    const target = this.controls?.target ? this.controls.target.clone() : new THREE.Vector3(0, 0, 0)

    // Maintain the same distance from target, but ensure minimum distance
    let distance = startPos.distanceTo(target) || 15
    distance = Math.max(distance, 5) // Minimum distance to prevent camera getting too close

    // Calculate target camera position
    // direction.vector points FROM the target TOWARD the camera
    const endPos = target.clone().add(direction.vector.clone().normalize().multiplyScalar(distance))

    console.log('📍 Animation setup:')
    console.log('   Start position:', startPos)
    console.log('   End position:', endPos)
    console.log('   Target:', target)
    console.log('   Distance:', distance)
    console.log('   Direction vector:', direction.vector)

    // Determine the up vector for this view
    // For orthographic views, we need consistent up vectors following CAD standards
    let upVector
    switch (direction.label) {
      case 'Front':
      case 'Back':
      case 'Right':
      case 'Left':
        // For all side views, Y is up (consistent with world axes)
        upVector = new THREE.Vector3(0, 1, 0)
        break
      case 'Top':
        // Looking down (-Y direction), use +Z as up (CAD standard)
        upVector = new THREE.Vector3(0, 0, 1)
        break
      case 'Bottom':
        // Looking up (+Y direction), use +Z as up (keep screen "up" as +Z)
        upVector = new THREE.Vector3(0, 0, 1)
        break
      default:
        // Fallback to Y-up
        upVector = new THREE.Vector3(0, 1, 0)
        break
    }

    // Store starting state
    const startQuat = this.mainCamera.quaternion.clone()
    const startUp = this.mainCamera.up.clone()

    // Create a temporary camera to calculate the target orientation
    const tempCamera = new THREE.PerspectiveCamera()
    tempCamera.position.copy(endPos)
    tempCamera.up.copy(upVector)
    tempCamera.lookAt(target)
    tempCamera.updateMatrixWorld()
    const endQuat = tempCamera.quaternion.clone()

    // Animation parameters
    const duration = 500 // milliseconds (smooth transition)
    const startTime = performance.now()

    let frameCount = 0
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const t = Math.min(elapsed / duration, 1)

      // Apply easing (smooth in-out)
      const k = this._ease(t)

      // Interpolate camera position
      this.mainCamera.position.lerpVectors(startPos, endPos, k)

      // Interpolate camera rotation (quaternion slerp for smooth rotation)
      this.mainCamera.quaternion.slerpQuaternions(startQuat, endQuat, k)

      // Interpolate up vector
      this.mainCamera.up.lerpVectors(startUp, upVector, k).normalize()

      // Update camera matrices
      this.mainCamera.updateMatrixWorld()

      // CRITICAL FIX: Force render on EVERY animation frame
      // This fixes the "only updates after mouse move" issue
      if (this.threeView) {
        // Call requestRender() to set the flag
        this.threeView.requestRender()

        // Also force an immediate render to ensure smooth animation
        // This bypasses the render-on-demand system during animation
        if (typeof this.threeView._render === 'function') {
          this.threeView._render()
        }
      }

      // Update controls state during animation (without overriding camera position)
      if (this.controls && typeof this.controls.update === 'function') {
        // Only update if controls won't override our camera position
        // (externalControl flag should prevent this)
        this.controls.update()
      }

      // Debug: log every 10 frames
      frameCount++
      if (frameCount % 10 === 0) {
        console.log(`🎬 Animation frame ${frameCount}: t=${t.toFixed(2)}, pos=(${this.mainCamera.position.x.toFixed(1)}, ${this.mainCamera.position.y.toFixed(1)}, ${this.mainCamera.position.z.toFixed(1)})`)
      }

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        // Animation complete
        this.isAnimating = false

        // Ensure final state is exact
        this.mainCamera.position.copy(endPos)
        this.mainCamera.quaternion.copy(endQuat)
        this.mainCamera.up.copy(upVector)
        this.mainCamera.lookAt(target)
        this.mainCamera.updateMatrixWorld()

        // CRITICAL: Ensure up-vector is properly set and maintained
        console.log('🎯 Final camera state:')
        console.log('   Position:', this.mainCamera.position)
        console.log('   Up vector:', this.mainCamera.up)
        console.log('   Target:', target)

        // NOW sync the CameraController's internal state to match
        if (this.controls) {
          // Calculate correct spherical coordinates for each view direction
          let theta, phi, radius
          radius = distance

          // Use automatic calculation for all views to ensure correctness
          const offset = new THREE.Vector3().copy(endPos).sub(target)
          this.controls.spherical.setFromVector3(offset)
          theta = this.controls.spherical.theta
          phi = this.controls.spherical.phi

          console.log('🔍 Auto-calculated spherical coords for', direction.label, ':', {
            theta: theta,
            phi: phi,
            radius: radius,
            endPos: endPos,
            offset: offset
          })

          // Set the calculated spherical coordinates
          this.controls.spherical.set(radius, phi, theta)
          this.controls.sphericalDelta.set(0, 0, 0)
          this.controls.panOffset.set(0, 0, 0)
          this.controls.scale = 1

          // Update target
          this.controls.target.copy(target)

          // Final controls.update() to sync everything
          if (typeof this.controls.update === 'function') {
            this.controls.update()
          }

          // Verify: calculate position from spherical coords and compare
          const testOffset = new THREE.Vector3()
          testOffset.setFromSpherical(this.controls.spherical)
          const testPos = this.controls.target.clone().add(testOffset)

          console.log('🔄 CameraController state synced and control released')
          console.log('   Calculated spherical coords:', {
            theta: theta,
            phi: phi,
            radius: radius
          })
          console.log('   Verification - spherical to position:', testPos)
          console.log('   Expected position:', endPos)
          console.log('   Position match:', testPos.distanceTo(endPos) < 0.1 ? '✅' : '❌')

          // Release camera control back to CameraController
          this.controls._justReleasedControl = true  // Debug flag
          this.controls._preserveUpVector = upVector.clone() // Store the correct up-vector
          this.controls.externalControl = false
        }

        console.log('✅ Camera switched to', direction.label, 'view')
        console.log('   Position:', this.mainCamera.position)
        console.log('   Target:', target)
        console.log('   Up:', this.mainCamera.up)

        // Force final renders to ensure everything is updated
        if (this.threeView) {
          this.threeView.requestRender()
          if (typeof this.threeView._render === 'function') {
            this.threeView._render()
          }
        }

        console.log('🎯 ViewCube: Camera animation complete!')
      }
    }

    requestAnimationFrame(animate)
  }

  /**
   * Render the mini viewport with navigation cube
   */
  render() {
    if (!this.renderer || !this.miniScene || !this.miniCamera) return

    // CRITICAL: Rotate the cube based on main camera's quaternion (inverted)
    // This makes the cube show the correct face as you orbit the main scene
    // The miniCamera stays FIXED, only the cube rotates
    if (this.mainCamera && this.cube) {
      // Use inverse of main camera quaternion to rotate the cube
      this.cube.quaternion.copy(this.mainCamera.quaternion).invert()
      this.cube.updateMatrixWorld()
    }

    // Render the mini scene
    this.renderer.render(this.miniScene, this.miniCamera)
  }

  /**
   * No-op methods for compatibility with old API
   */
  updateFrom(mainCamera) {
    // Compatibility method - render() now handles sync
  }

  updateSceneClone(mainScene) {
    // Not needed - we have our own mini scene
  }

  onResize() {
    // ViewCube maintains fixed size, but update pixel ratio if needed
    const currentPixelRatio = this.renderer.getPixelRatio()
    const newPixelRatio = window.devicePixelRatio
    if (currentPixelRatio !== newPixelRatio) {
      this.renderer.setPixelRatio(newPixelRatio)
    }
  }

  dispose() {
    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('click', null)
      this.canvas.removeEventListener('mousemove', null)
    }

    // Clean up canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }

    // Dispose Three.js objects
    if (this.cube) {
      this.cube.geometry.dispose()
      if (Array.isArray(this.cube.material)) {
        this.cube.material.forEach(mat => mat.dispose())
      }
    }

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose()
    }

    this.canvas = null
    this.renderer = null
    this.miniScene = null
    this.miniCamera = null
    this.cube = null
    this.container = null
    this.mainCamera = null
    this.controls = null
    this.threeView = null
  }

  setVisible(visible) {
    if (this.canvas) {
      this.canvas.style.display = visible ? 'block' : 'none'
    }
  }
}
