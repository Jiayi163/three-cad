/**
 * ViewCube - A mini viewport that mirrors the main camera view in a fixed-size frame
 * Displays in the top-right corner of the viewport as an overlay
 * Uses the main camera for perfect 1:1 zoom/pan/orbit mirroring
 */
import * as THREE from 'three'
import { markRaw } from 'vue'

export class ViewCube {
  constructor({ container, mainCamera, mainScene, size = 120, margin = 12 }) {
    this.container = container
    this.mainCamera = mainCamera
    this.mainScene = mainScene
    this.baseSize = size // Base size for height
    this.margin = margin

    // Calculate initial size based on camera aspect ratio
    const aspect = mainCamera.aspect || 1
    const width = Math.round(size * aspect)
    const height = size

    this.width = width
    this.height = height

    // Create separate renderer for the mini viewport
    const rendererObj = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    rendererObj.setSize(width, height)
    rendererObj.setPixelRatio(window.devicePixelRatio)
    rendererObj.setClearColor(0x000000, 0)

    this.renderer = markRaw(rendererObj)

    // Style canvas with blue glowing frame
    this.canvas = this.renderer.domElement
    this.canvas.style.position = 'absolute'
    this.canvas.style.top = `${margin}px`
    this.canvas.style.right = `${margin}px`
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.canvas.style.zIndex = '9999'
    this.canvas.style.pointerEvents = 'none'
    this.canvas.style.borderRadius = '8px'
    this.canvas.style.border = '4px solid #3498db'
    this.canvas.style.boxShadow = '0 4px 20px rgba(52, 152, 219, 0.8), 0 0 40px rgba(52, 152, 219, 0.4)'
    this.canvas.style.background = 'rgba(20, 20, 20, 0.98)'
    this.canvas.style.backdropFilter = 'blur(10px)'

    this.container.appendChild(this.canvas)

    console.log('✅ ViewCube initialized:', width, 'x', height, 'aspect:', aspect.toFixed(2))
  }

  /**
   * Render the mini viewport
   * Uses the SAME camera as main view for perfect 1:1 mirroring of zoom/pan/orbit
   * Hides grid helpers, only shows objects and axes
   */
  render() {
    if (!this.renderer || !this.mainScene || !this.mainCamera) return

    // Temporarily hide grid helpers (but keep axes and objects)
    const hiddenObjects = []
    this.mainScene.traverse((object) => {
      // Hide GridHelper but keep AxesHelper
      if (object.type === 'GridHelper') {
        if (object.visible) {
          hiddenObjects.push(object)
          object.visible = false
        }
      }
    })

    // Render the main scene using the main camera
    // This creates a perfect miniature mirror with same aspect ratio
    this.renderer.render(this.mainScene, this.mainCamera)

    // Restore hidden objects
    hiddenObjects.forEach(object => {
      object.visible = true
    })
  }

  /**
   * No-op methods for compatibility with old API
   */
  updateFrom(mainCamera) {
    // No longer needed - we use the main camera directly
  }

  updateSceneClone(mainScene) {
    // No longer needed - we render the main scene directly
  }

  onResize() {
    // Update size to match main camera's aspect ratio
    if (this.mainCamera && this.mainCamera.aspect) {
      const aspect = this.mainCamera.aspect
      const newWidth = Math.round(this.baseSize * aspect)
      const newHeight = this.baseSize

      // Only update if size actually changed
      if (newWidth !== this.width || newHeight !== this.height) {
        this.width = newWidth
        this.height = newHeight

        // Update renderer size
        this.renderer.setSize(newWidth, newHeight)

        // Update canvas CSS
        this.canvas.style.width = `${newWidth}px`
        this.canvas.style.height = `${newHeight}px`

        console.log('ViewCube resized:', newWidth, 'x', newHeight, 'aspect:', aspect.toFixed(2))
      }
    }

    // Update pixel ratio if device pixel ratio changed
    const currentPixelRatio = this.renderer.getPixelRatio()
    const newPixelRatio = window.devicePixelRatio
    if (currentPixelRatio !== newPixelRatio) {
      this.renderer.setPixelRatio(newPixelRatio)
    }
  }

  dispose() {
    // Clean up canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose()
    }

    this.canvas = null
    this.renderer = null
    this.container = null
    this.mainCamera = null
    this.mainScene = null
  }

  setVisible(visible) {
    if (this.canvas) {
      this.canvas.style.display = visible ? 'block' : 'none'
    }
  }
}
