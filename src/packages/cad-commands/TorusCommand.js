/**
 * TorusCommand - Creates a 3D torus geometry
 *
 * Demonstrates parametric geometry creation with
 * customizable dimensions and material properties
 */

import { GeometryCommand, CommandResult } from '../cad-core/command/Command.js'
import { TorusVisualObject } from '../cad-three/BasicShapes.js'
import { markRaw } from 'vue'

/**
 * Command to create a torus geometry in the 3D scene
 */
export class TorusCommand extends GeometryCommand {
  constructor() {
    super()

    this.name = 'CreateTorus'
    this.description = 'Create a 3D torus geometry'
    this.category = 'Geometry'

    // Torus parameters with defaults
    this.radius = 1.0
    this.tube = 0.4
    this.position = { x: 0, y: 0, z: 0 }
    this.rotation = { x: 0, y: 0, z: 0 }

    // Subdivision parameters for geometry quality
    this.radialSegments = 16
    this.tubularSegments = 100
    this.arc = Math.PI * 2

    // Material properties
    this.color = '#607D8B'
    this.opacity = 1.0
    this.wireframe = false
    this.metalness = 0.0
    this.roughness = 0.5

    // Interactive creation state
    this.isInteractive = false
    this.centerPoint = null
    this.radiusPoint = null
    this.tubePoint = null
  }

  /**
   * Set torus dimensions
   * @param {number} radius - Major radius (distance from center to tube center)
   * @param {number} tube - Minor radius (tube thickness)
   */
  setDimensions(radius, tube) {
    this.radius = Math.max(0.1, radius)
    this.tube = Math.max(0.05, Math.min(tube, radius * 0.9)) // Tube can't be larger than radius
  }

  /**
   * Set torus position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  setPosition(x, y, z) {
    this.position = { x, y, z }
  }

  /**
   * Set torus rotation
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
   * @param {number} tubularSegments - Number of tubular segments
   */
  setSubdivision(radialSegments = 16, tubularSegments = 100) {
    this.radialSegments = Math.max(3, Math.min(32, radialSegments))
    this.tubularSegments = Math.max(3, Math.min(200, tubularSegments))
  }

  /**
   * Set torus arc parameter for partial torus
   * @param {number} arc - Arc length in radians (0 to 2π)
   */
  setArc(arc = Math.PI * 2) {
    this.arc = Math.max(0.1, Math.min(Math.PI * 2, arc))
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
    this.tubePoint = null
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
      // Second click - calculate major radius
      this.radiusPoint = { ...point }

      // Calculate distance from center to radius point
      const dx = point.x - this.centerPoint.x
      const dz = point.z - this.centerPoint.z
      const radius = Math.sqrt(dx * dx + dz * dz)

      this.setDimensions(Math.max(0.1, radius), this.tube)
      this.notifyPropertyChanged('radiusPoint', this.radiusPoint)
      return false
    } else {
      // Third click - set tube radius
      this.tubePoint = { ...point }

      // Calculate tube radius based on distance from the torus ring
      const dx = point.x - this.centerPoint.x
      const dz = point.z - this.centerPoint.z
      const distanceFromCenter = Math.sqrt(dx * dx + dz * dz)
      const tube = Math.abs(distanceFromCenter - this.radius)

      this.setDimensions(this.radius, Math.max(0.05, Math.min(tube, this.radius * 0.9)))
      this.notifyPropertyChanged('tubePoint', this.tubePoint)
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
      type: 'torus',
      position: this.position,
      radius: this.radius,
      tube: this.tube,
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
      this.error = new Error('Torus radius must be a positive value')
      return false
    }

    if (this.tube <= 0) {
      this.error = new Error('Torus tube radius must be a positive value')
      return false
    }

    if (this.tube >= this.radius) {
      this.error = new Error('Torus tube radius must be smaller than the major radius')
      return false
    }

    if (this.radialSegments < 3 || this.tubularSegments < 3) {
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
      // Create TorusVisualObject with proper parameters
      const visualObject = new TorusVisualObject(null, {
        radius: this.radius,
        tube: this.tube,
        radialSegments: this.radialSegments,
        tubularSegments: this.tubularSegments,
        arc: this.arc
      })

      visualObject.name = `Torus_${Date.now()}`

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
      visualObject.setProperty('type', 'Torus')
      visualObject.setProperty('radius', this.radius)
      visualObject.setProperty('tube', this.tube)
      visualObject.setProperty('radialSegments', this.radialSegments)
      visualObject.setProperty('tubularSegments', this.tubularSegments)
      visualObject.setProperty('arc', this.arc)
      visualObject.setProperty('color', this.color)
      visualObject.setProperty('opacity', this.opacity)
      visualObject.setProperty('wireframe', this.wireframe)
      visualObject.setProperty('metalness', this.metalness)
      visualObject.setProperty('roughness', this.roughness)

      // Calculate volume (torus formula: 2π²Rr² where R=radius, r=tube)
      const volume = 2 * Math.PI * Math.PI * this.radius * this.tube * this.tube
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
      console.log(`Created torus: ${visualObject.name}`, {
        radius: this.radius,
        tube: this.tube,
        position: this.position,
        subdivision: { radial: this.radialSegments, tubular: this.tubularSegments }
      })

      return CommandResult.success(
        visualObject,
        `Torus created successfully: ${visualObject.name}`
      )

    } catch (error) {
      console.error('TorusCommand execution failed:', error)
      throw error
    }
  }

  /**
   * Called before command execution
   */
  async beforeExecute() {
    console.log('Starting torus creation...', {
      radius: this.radius,
      tube: this.tube,
      position: this.position,
      subdivision: { radial: this.radialSegments, tubular: this.tubularSegments },
      interactive: this.isInteractive
    })
  }

  /**
   * Called after successful command execution
   */
  async afterExecute() {
    console.log('Torus creation completed successfully')

    // If this was an interactive creation, clean up
    if (this.isInteractive) {
      this.centerPoint = null
      this.radiusPoint = null
      this.tubePoint = null
    }
  }

  /**
   * Called when command encounters an error
   * @param {Error} error - The error that occurred
   */
  async onError(error) {
    await super.onError(error)
    console.error('Torus creation failed:', error.message)
  }

  /**
   * Called when command is cancelled
   */
  async onCancel() {
    await super.onCancel()
    console.log('Torus creation cancelled')

    // Clean up interactive state
    if (this.isInteractive) {
      this.centerPoint = null
      this.radiusPoint = null
      this.tubePoint = null
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
        tube: this.tube,
        position: this.position,
        rotation: this.rotation,
        subdivision: { radial: this.radialSegments, tubular: this.tubularSegments },
        arc: this.arc,
        material: { color: this.color, opacity: this.opacity, wireframe: this.wireframe, metalness: this.metalness, roughness: this.roughness }
      },
      interactive: {
        isInteractive: this.isInteractive,
        centerPoint: this.centerPoint,
        radiusPoint: this.radiusPoint,
        tubePoint: this.tubePoint
      },
      createdObjects: this.createdObjects.length
    }
  }
}

export default TorusCommand

