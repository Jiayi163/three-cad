/**
 * ConeCommand - Creates a 3D cone geometry
 *
 * Demonstrates parametric geometry creation with
 * customizable dimensions and material properties
 */

import { GeometryCommand, CommandResult } from '../cad-core/command/Command.js'
import { ConeVisualObject } from '../cad-three/BasicShapes.js'
import { markRaw } from 'vue'

/**
 * Command to create a cone geometry in the 3D scene
 */
export class ConeCommand extends GeometryCommand {
  constructor() {
    super()

    this.name = 'CreateCone'
    this.description = 'Create a 3D cone geometry'
    this.category = 'Geometry'

    // Cone parameters with defaults
    this.radius = 1.0
    this.height = 2.0
    this.position = { x: 0, y: 0, z: 0 }
    this.rotation = { x: 0, y: 0, z: 0 }

    // Subdivision parameters for geometry quality
    this.radialSegments = 32
    this.heightSegments = 1
    this.openEnded = false
    this.thetaStart = 0
    this.thetaLength = Math.PI * 2

    // Material properties
    this.color = '#E91E63'
    this.opacity = 1.0
    this.wireframe = false
    this.metalness = 0.0
    this.roughness = 0.5

    // Interactive creation state
    this.isInteractive = false
    this.centerPoint = null
    this.radiusPoint = null
    this.heightPoint = null
  }

  /**
   * Set cone dimensions
   * @param {number} radius - Base radius
   * @param {number} height - Cone height
   */
  setDimensions(radius, height) {
    this.radius = Math.max(0.1, radius)
    this.height = Math.max(0.1, height)
  }

  /**
   * Set cone position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  setPosition(x, y, z) {
    this.position = { x, y, z }
  }

  /**
   * Set cone rotation
   * @param {number} x - X rotation in radians
   * @param {number} y - Y rotation in radians
   * @param {number} z - Z rotation in radians
   */
  setRotation(x, y, z) {
    this.rotation = { x, y, z }
  }

  /**
   * Set geometry subdivision parameters
   * @param {number} radialSegments - Number of radial segments
   * @param {number} heightSegments - Number of height segments
   */
  setSubdivision(radialSegments = 32, heightSegments = 1) {
    this.radialSegments = Math.max(3, Math.min(64, radialSegments))
    this.heightSegments = Math.max(1, Math.min(32, heightSegments))
  }

  /**
   * Set cone section parameters for partial cones
   * @param {number} thetaStart - Start angle for sweep
   * @param {number} thetaLength - Length of sweep
   * @param {boolean} openEnded - Whether cone is open-ended
   */
  setSectionParameters(thetaStart = 0, thetaLength = Math.PI * 2, openEnded = false) {
    this.thetaStart = thetaStart
    this.thetaLength = Math.max(0.1, Math.min(Math.PI * 2, thetaLength))
    this.openEnded = openEnded
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
    this.heightPoint = null
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
    } else if (!this.radiusPoint) {
      // Second click - calculate radius
      this.radiusPoint = { ...point }

      // Calculate distance from center to radius point
      const dx = point.x - this.centerPoint.x
      const dz = point.z - this.centerPoint.z
      const radius = Math.sqrt(dx * dx + dz * dz)

      this.setDimensions(Math.max(0.1, radius), this.height)
      this.notifyPropertyChanged('radiusPoint', this.radiusPoint)
      return false
    } else {
      // Third click - set height
      this.heightPoint = { ...point }
      const height = Math.abs(point.y - this.centerPoint.y) || 2.0
      this.setDimensions(this.radius, height)
      this.notifyPropertyChanged('heightPoint', this.heightPoint)
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
      type: 'cone',
      position: this.position,
      radius: this.radius,
      height: this.height,
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
      this.error = new Error('Cone radius must be a positive value')
      return false
    }

    if (this.height <= 0) {
      this.error = new Error('Cone height must be a positive value')
      return false
    }

    if (this.radialSegments < 3 || this.heightSegments < 1) {
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
      // Create ConeVisualObject with proper parameters
      const visualObject = new ConeVisualObject(null, {
        radius: this.radius,
        height: this.height,
        radialSegments: this.radialSegments,
        heightSegments: this.heightSegments,
        openEnded: this.openEnded,
        thetaStart: this.thetaStart,
        thetaLength: this.thetaLength
      })

      visualObject.name = `Cone_${Date.now()}`

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
      visualObject.setProperty('type', 'Cone')
      visualObject.setProperty('radius', this.radius)
      visualObject.setProperty('height', this.height)
      visualObject.setProperty('radialSegments', this.radialSegments)
      visualObject.setProperty('heightSegments', this.heightSegments)
      visualObject.setProperty('color', this.color)
      visualObject.setProperty('opacity', this.opacity)
      visualObject.setProperty('wireframe', this.wireframe)
      visualObject.setProperty('metalness', this.metalness)
      visualObject.setProperty('roughness', this.roughness)

      // Calculate volume (cone formula: 1/3 * π * r² * h)
      const volume = (Math.PI * this.radius * this.radius * this.height) / 3
      visualObject.setProperty('volume', volume)

      // Add to the active document with proper nodeData format
      const nodeData = {
        id: visualObject.id,
        name: visualObject.name,
        type: visualObject.type || visualObject._type,
        visible: true,
        locked: false,
        geometry: visualObject.geometry,
        visualObject: markRaw(visualObject)  // Prevent Vue reactivity on VisualObject
      }

      await this.application.activeDocument.addNode(nodeData)

      // Track the created object for undo/redo
      this.addCreatedObject(visualObject)

      // Log creation details
      console.log(`Created cone: ${visualObject.name}`, {
        radius: this.radius,
        height: this.height,
        position: this.position,
        subdivision: { radial: this.radialSegments, height: this.heightSegments }
      })

      return CommandResult.success(
        visualObject,
        `Cone created successfully: ${visualObject.name}`
      )

    } catch (error) {
      console.error('ConeCommand execution failed:', error)
      throw error
    }
  }

  /**
   * Called before command execution
   */
  async beforeExecute() {
    console.log('Starting cone creation...', {
      radius: this.radius,
      height: this.height,
      position: this.position,
      subdivision: { radial: this.radialSegments, height: this.heightSegments },
      interactive: this.isInteractive
    })
  }

  /**
   * Called after successful command execution
   */
  async afterExecute() {
    console.log('Cone creation completed successfully')

    // If this was an interactive creation, clean up
    if (this.isInteractive) {
      this.centerPoint = null
      this.radiusPoint = null
      this.heightPoint = null
    }
  }

  /**
   * Called when command encounters an error
   * @param {Error} error - The error that occurred
   */
  async onError(error) {
    await super.onError(error)
    console.error('Cone creation failed:', error.message)
  }

  /**
   * Called when command is cancelled
   */
  async onCancel() {
    await super.onCancel()
    console.log('Cone creation cancelled')

    // Clean up interactive state
    if (this.isInteractive) {
      this.centerPoint = null
      this.radiusPoint = null
      this.heightPoint = null
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
        height: this.height,
        position: this.position,
        rotation: this.rotation,
        subdivision: { radial: this.radialSegments, height: this.heightSegments },
        sections: { thetaStart: this.thetaStart, thetaLength: this.thetaLength, openEnded: this.openEnded },
        material: { color: this.color, opacity: this.opacity, wireframe: this.wireframe, metalness: this.metalness, roughness: this.roughness }
      },
      interactive: {
        isInteractive: this.isInteractive,
        centerPoint: this.centerPoint,
        radiusPoint: this.radiusPoint,
        heightPoint: this.heightPoint
      },
      createdObjects: this.createdObjects.length
    }
  }
}

export default ConeCommand

