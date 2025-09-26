/**
 * LineCommand - Creates a 3D line geometry
 *
 * Demonstrates line creation with multiple points
 * and customizable material properties
 */

import { GeometryCommand, CommandResult } from '../cad-core/command/Command.js'
import { LineVisualObject } from '../cad-three/BasicShapes.js'
import { markRaw } from 'vue'

/**
 * Command to create a line geometry in the 3D scene
 */
export class LineCommand extends GeometryCommand {
  constructor() {
    super()

    this.name = 'CreateLine'
    this.description = 'Create a 3D line geometry'
    this.category = 'Geometry'

    // Line parameters with defaults
    this.points = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 }
    ]
    this.position = { x: 0, y: 0, z: 0 }
    this.rotation = { x: 0, y: 0, z: 0 }

    // Material properties
    this.color = '#00FF00'
    this.opacity = 1.0
    this.linewidth = 1

    // Interactive creation state
    this.isInteractive = false
    this.currentPoints = []
    this.isComplete = false
  }

  /**
   * Set line points
   * @param {Array} points - Array of 3D points [{x, y, z}, ...]
   */
  setPoints(points) {
    this.points = points.map(p => ({ ...p }))
  }

  /**
   * Add a point to the line
   * @param {Object} point - 3D point {x, y, z}
   */
  addPoint(point) {
    this.points.push({ ...point })
  }

  /**
   * Set line position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  setPosition(x, y, z) {
    this.position = { x, y, z }
  }

  /**
   * Set line rotation
   * @param {number} x - X rotation in radians
   * @param {number} y - Y rotation in radians
   * @param {number} z - Z rotation in radians
   */
  setRotation(x, y, z) {
    this.rotation = { x, y, z }
  }

  /**
   * Set material properties
   * @param {string} color - Hex color string
   * @param {number} opacity - Opacity (0-1)
   * @param {number} linewidth - Line width
   */
  setMaterial(color, opacity = 1.0, linewidth = 1) {
    this.color = color
    this.opacity = Math.max(0, Math.min(1, opacity))
    this.linewidth = Math.max(1, linewidth)
  }

  /**
   * Enable interactive creation mode
   * @param {boolean} interactive - Whether to use interactive creation
   */
  setInteractive(interactive = true) {
    this.isInteractive = interactive
    this.currentPoints = []
    this.isComplete = false
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

    // Add point to current line
    this.currentPoints.push({ ...point })
    this.notifyPropertyChanged('currentPoints', this.currentPoints)

    // For now, complete line after 2 points (can be extended for multi-point lines)
    if (this.currentPoints.length >= 2) {
      this.setPoints(this.currentPoints)
      this.isComplete = true
      return true
    }

    return false
  }

  /**
   * Get preview geometry for interactive creation
   * @returns {Object|null} Preview geometry data
   */
  getPreviewGeometry() {
    if (!this.isInteractive || this.currentPoints.length === 0) {
      return null
    }

    return {
      type: 'line',
      points: this.currentPoints,
      material: {
        color: this.color,
        opacity: 0.5, // Semi-transparent for preview
        linewidth: this.linewidth
      }
    }
  }

  /**
   * Validate command parameters before execution
   * @returns {boolean} True if parameters are valid
   */
  validateParameters() {
    if (!this.points || this.points.length < 2) {
      this.error = new Error('Line must have at least 2 points')
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
      // Create LineVisualObject with proper parameters
      const visualObject = new LineVisualObject(null, {
        points: this.points
      })

      visualObject.name = `Line_${Date.now()}`

      // Configure material properties
      visualObject.setMaterialConfig('default', {
        color: this.color,
        opacity: this.opacity,
        transparent: this.opacity < 1.0,
        linewidth: this.linewidth
      })

      // Set transform properties
      visualObject.position = { ...this.position }
      visualObject.rotation = { ...this.rotation }
      visualObject.scale = { x: 1, y: 1, z: 1 }

      // Set properties for the property panel
      visualObject.setProperty('type', 'Line')
      visualObject.setProperty('points', this.points)
      visualObject.setProperty('pointCount', this.points.length)
      visualObject.setProperty('color', this.color)
      visualObject.setProperty('opacity', this.opacity)
      visualObject.setProperty('linewidth', this.linewidth)

      // Calculate length
      let length = 0
      for (let i = 1; i < this.points.length; i++) {
        const p1 = this.points[i - 1]
        const p2 = this.points[i]
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const dz = p2.z - p1.z
        length += Math.sqrt(dx * dx + dy * dy + dz * dz)
      }
      visualObject.setProperty('length', length)

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
      console.log(`Created line: ${visualObject.name}`, {
        points: this.points,
        length: length,
        position: this.position
      })

      return CommandResult.success(
        visualObject,
        `Line created successfully: ${visualObject.name}`
      )

    } catch (error) {
      console.error('LineCommand execution failed:', error)
      throw error
    }
  }

  /**
   * Called before command execution
   */
  async beforeExecute() {
    console.log('Starting line creation...', {
      points: this.points,
      position: this.position,
      interactive: this.isInteractive
    })
  }

  /**
   * Called after successful command execution
   */
  async afterExecute() {
    console.log('Line creation completed successfully')

    // If this was an interactive creation, clean up
    if (this.isInteractive) {
      this.currentPoints = []
      this.isComplete = false
    }
  }

  /**
   * Called when command encounters an error
   * @param {Error} error - The error that occurred
   */
  async onError(error) {
    await super.onError(error)
    console.error('Line creation failed:', error.message)
  }

  /**
   * Called when command is cancelled
   */
  async onCancel() {
    await super.onCancel()
    console.log('Line creation cancelled')

    // Clean up interactive state
    if (this.isInteractive) {
      this.currentPoints = []
      this.isComplete = false
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
        points: this.points,
        pointCount: this.points.length,
        position: this.position,
        rotation: this.rotation,
        material: { color: this.color, opacity: this.opacity, linewidth: this.linewidth }
      },
      interactive: {
        isInteractive: this.isInteractive,
        currentPoints: this.currentPoints,
        isComplete: this.isComplete
      },
      createdObjects: this.createdObjects.length
    }
  }
}

export default LineCommand

