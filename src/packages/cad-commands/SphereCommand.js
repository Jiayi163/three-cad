/**
 * SphereCommand - Creates a 3D sphere geometry
 *
 * Demonstrates parametric geometry creation with
 * customizable subdivision levels and material properties
 */

import { GeometryCommand, CommandResult } from '../cad-core/command/Command.js'
import { SphereVisualObject } from '../cad-three/BasicShapes.js'

/**
 * Command to create a sphere geometry in the 3D scene
 */
export class SphereCommand extends GeometryCommand {
  constructor() {
    super()

    this.name = 'CreateSphere'
    this.description = 'Create a 3D sphere geometry'
    this.category = 'Geometry'

    // Sphere parameters with defaults
    this.radius = 1.0
    this.position = { x: 0, y: 0, z: 0 }
    this.rotation = { x: 0, y: 0, z: 0 }

    // Subdivision parameters for geometry quality
    this.widthSegments = 32
    this.heightSegments = 16
    this.phiStart = 0
    this.phiLength = Math.PI * 2
    this.thetaStart = 0
    this.thetaLength = Math.PI

    // Material properties
    this.color = '#2196F3'
    this.opacity = 1.0
    this.wireframe = false
    this.metalness = 0.0
    this.roughness = 0.5

    // Interactive creation state
    this.isInteractive = false
    this.centerPoint = null
    this.radiusPoint = null
  }

  /**
   * Set sphere radius
   * @param {number} radius - Sphere radius
   */
  setRadius(radius) {
    this.radius = Math.max(0.1, radius)
  }

  /**
   * Set sphere position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  setPosition(x, y, z) {
    this.position = { x, y, z }
  }

  /**
   * Set sphere rotation
   * @param {number} x - X rotation in radians
   * @param {number} y - Y rotation in radians
   * @param {number} z - Z rotation in radians
   */
  setRotation(x, y, z) {
    this.rotation = { x, y, z }
  }

  /**
   * Set geometry subdivision parameters
   * @param {number} widthSegments - Number of horizontal segments
   * @param {number} heightSegments - Number of vertical segments
   */
  setSubdivision(widthSegments = 32, heightSegments = 16) {
    this.widthSegments = Math.max(3, Math.min(64, widthSegments))
    this.heightSegments = Math.max(2, Math.min(32, heightSegments))
  }

  /**
   * Set sphere section parameters for partial spheres
   * @param {number} phiStart - Start angle for horizontal sweep
   * @param {number} phiLength - Length of horizontal sweep
   * @param {number} thetaStart - Start angle for vertical sweep
   * @param {number} thetaLength - Length of vertical sweep
   */
  setSectionParameters(phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    this.phiStart = phiStart
    this.phiLength = Math.max(0.1, Math.min(Math.PI * 2, phiLength))
    this.thetaStart = thetaStart
    this.thetaLength = Math.max(0.1, Math.min(Math.PI, thetaLength))
  }

  /**
   * Set material properties
   * @param {string} color - Hex color string
   * @param {number} opacity - Opacity (0-1)
   * @param {boolean} wireframe - Whether to show wireframe
   * @param {number} metalness - Metalness value (0-1)
   * @param {number} roughness - Roughness value (0-1)
   */
  setMaterial(color, opacity = 1.0, wireframe = false, metalness = 0.0, roughness = 0.5) {
    this.color = color
    this.opacity = Math.max(0, Math.min(1, opacity))
    this.wireframe = wireframe
    this.metalness = Math.max(0, Math.min(1, metalness))
    this.roughness = Math.max(0, Math.min(1, roughness))
  }

  /**
   * Enable interactive creation mode
   * @param {boolean} interactive - Whether to use interactive creation
   */
  setInteractive(interactive = true) {
    this.isInteractive = interactive
    this.centerPoint = null
    this.radiusPoint = null
  }

  /**
   * Handle mouse input for interactive creation
   * @param {Object} point - 3D point from mouse interaction
   * @returns {boolean} True if creation is complete
   */
  handleMouseInput(point) {
    if (!this.isInteractive) {
      return false
    }

    if (!this.centerPoint) {
      // First click - set center point
      this.centerPoint = { ...point }
      this.setPosition(point.x, point.y, point.z)
      this.notifyPropertyChanged('centerPoint', this.centerPoint)
      return false
    } else {
      // Second click - calculate radius and complete
      this.radiusPoint = { ...point }

      // Calculate distance from center to radius point
      const dx = point.x - this.centerPoint.x
      const dy = point.y - this.centerPoint.y
      const dz = point.z - this.centerPoint.z
      const radius = Math.sqrt(dx * dx + dy * dy + dz * dz)

      this.setRadius(Math.max(0.1, radius))
      this.notifyPropertyChanged('radiusPoint', this.radiusPoint)
      return true // Creation complete
    }
  }

  /**
   * Get preview geometry for interactive creation
   * @returns {Object|null} Preview geometry data
   */
  getPreviewGeometry() {
    if (!this.isInteractive || !this.centerPoint) {
      return null
    }

    return {
      type: 'sphere',
      position: this.position,
      radius: this.radius,
      material: {
        color: this.color,
        opacity: 0.5, // Semi-transparent for preview
        wireframe: true
      }
    }
  }

  /**
   * Validate command parameters before execution
   * @returns {boolean} True if parameters are valid
   */
  validateParameters() {
    if (this.radius <= 0) {
      this.error = new Error('Sphere radius must be a positive value')
      return false
    }

    if (this.widthSegments < 3 || this.heightSegments < 2) {
      this.error = new Error('Invalid subdivision parameters')
      return false
    }

    if (!this.application || !this.application.activeDocument) {
      this.error = new Error('No active document available')
      return false
    }

    return true
  }

  /**
   * Main command execution logic
   * @returns {Promise<CommandResult>} Command execution result
   */
  async executeAsync() {
    // Validate parameters
    if (!this.validateParameters()) {
      throw this.error
    }

    try {
      // Create SphereVisualObject with proper parameters
      const visualObject = new SphereVisualObject(null, {
        radius: this.radius,
        widthSegments: this.widthSegments,
        heightSegments: this.heightSegments,
        phiStart: this.phiStart,
        phiLength: this.phiLength,
        thetaStart: this.thetaStart,
        thetaLength: this.thetaLength
      })

      visualObject.name = `Sphere_${Date.now()}`

      // Configure material properties
      visualObject.setMaterialConfig('default', {
        color: this.color,
        opacity: this.opacity,
        transparent: this.opacity < 1.0,
        wireframe: this.wireframe,
        metalness: this.metalness,
        roughness: this.roughness
      })

      // Set transform properties
      visualObject.position = { ...this.position }
      visualObject.rotation = { ...this.rotation }
      visualObject.scale = { x: 1, y: 1, z: 1 }

      // Set properties for the property panel
      visualObject.setProperty('type', 'Sphere')
      visualObject.setProperty('radius', this.radius)
      visualObject.setProperty('widthSegments', this.widthSegments)
      visualObject.setProperty('heightSegments', this.heightSegments)
      visualObject.setProperty('color', this.color)
      visualObject.setProperty('opacity', this.opacity)
      visualObject.setProperty('wireframe', this.wireframe)
      visualObject.setProperty('metalness', this.metalness)
      visualObject.setProperty('roughness', this.roughness)
      visualObject.setProperty('volume', (4/3) * Math.PI * Math.pow(this.radius, 3))
      visualObject.setProperty('surfaceArea', 4 * Math.PI * Math.pow(this.radius, 2))

      // Add to the active document
      await this.application.activeDocument.addNode(visualObject)

      // Track the created object for undo/redo
      this.addCreatedObject(visualObject)

      // Log creation details
      console.log(`Created sphere: ${visualObject.name}`, {
        radius: this.radius,
        position: this.position,
        subdivision: { width: this.widthSegments, height: this.heightSegments }
      })

      return CommandResult.success(
        visualObject,
        `Sphere created successfully: ${visualObject.name}`
      )

    } catch (error) {
      console.error('SphereCommand execution failed:', error)
      throw error
    }
  }

  /**
   * Called before command execution
   */
  async beforeExecute() {
    console.log('Starting sphere creation...', {
      radius: this.radius,
      position: this.position,
      subdivision: { width: this.widthSegments, height: this.heightSegments },
      interactive: this.isInteractive
    })
  }

  /**
   * Called after successful command execution
   */
  async afterExecute() {
    console.log('Sphere creation completed successfully')

    // If this was an interactive creation, clean up
    if (this.isInteractive) {
      this.centerPoint = null
      this.radiusPoint = null
    }
  }

  /**
   * Called when command encounters an error
   * @param {Error} error - The error that occurred
   */
  async onError(error) {
    await super.onError(error)
    console.error('Sphere creation failed:', error.message)
  }

  /**
   * Called when command is cancelled
   */
  async onCancel() {
    await super.onCancel()
    console.log('Sphere creation cancelled')

    // Clean up interactive state
    if (this.isInteractive) {
      this.centerPoint = null
      this.radiusPoint = null
    }
  }

  /**
   * Get command-specific status information
   * @returns {Object} Extended status information
   */
  getStatus() {
    const baseStatus = super.getStatus()

    return {
      ...baseStatus,
      parameters: {
        radius: this.radius,
        position: this.position,
        rotation: this.rotation,
        subdivision: { width: this.widthSegments, height: this.heightSegments },
        sections: { phiStart: this.phiStart, phiLength: this.phiLength, thetaStart: this.thetaStart, thetaLength: this.thetaLength },
        material: { color: this.color, opacity: this.opacity, wireframe: this.wireframe, metalness: this.metalness, roughness: this.roughness }
      },
      interactive: {
        isInteractive: this.isInteractive,
        centerPoint: this.centerPoint,
        radiusPoint: this.radiusPoint
      },
      createdObjects: this.createdObjects.length
    }
  }
}

export default SphereCommand
