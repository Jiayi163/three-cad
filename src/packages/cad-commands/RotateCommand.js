/**
 * RotateCommand - Interactive 3D rotation command
 *
 * This command implements step-by-step interactive object rotation:
 * 1. Select rotation axis (X, Y, Z or custom)
 * 2. Select rotation center point (or use object center)
 * 3. Specify rotation angle (click-drag or numeric input)
 * 4. Apply rotation with live preview
 */

import { ModificationCommand, CommandResult } from '../cad-core/command/Command.js'
import { InteractiveInput } from '../cad-core/command/InteractiveInput.js'
import * as THREE from 'three'
import { markRaw } from 'vue'

/**
 * Interactive command to rotate objects in the 3D scene
 */
export class RotateCommand extends ModificationCommand {
  constructor() {
    super()

    this.name = 'RotateObjects'
    this.description = 'Rotate selected objects around an axis'
    this.category = 'Transform'

    // Rotation parameters
    this.rotationAxis = 'y' // 'x', 'y', 'z', or 'custom'
    this.rotationAngle = 0 // in radians
    this.rotationCenter = null // { x, y, z } or null for object center
    this.useObjectCenter = true

    // Interactive creation state
    this.creationStep = 0 // 0: axis selection, 1: center selection, 2: angle input, 3: complete
    this.isInteractive = false
    this.startAngle = 0
    this.currentAngle = 0

    // Preview state
    this.previewObjects = new Map() // original object -> preview object
    this.isShowingPreview = false
    this.originalTransforms = new Map() // store original transforms for undo

    // User interaction controller
    this.interactionController = null
    this.interactiveInput = null

    // Status messages for each step
    this.stepMessages = [
      'Select rotation axis (X, Y, Z) or specify custom axis',
      'Select rotation center point (or use object center)',
      'Drag to rotate or enter angle value',
      'Rotation complete'
    ]

    // Supported rotation modes
    this.rotationModes = {
      'x': { axis: new THREE.Vector3(1, 0, 0), name: 'X-Axis', color: '#ff0000' },
      'y': { axis: new THREE.Vector3(0, 1, 0), name: 'Y-Axis', color: '#00ff00' },
      'z': { axis: new THREE.Vector3(0, 0, 1), name: 'Z-Axis', color: '#0000ff' },
      'custom': { axis: null, name: 'Custom', color: '#ffff00' }
    }
  }

  /**
   * Set rotation axis
   * @param {string|THREE.Vector3} axis - Rotation axis ('x', 'y', 'z', 'custom', or Vector3)
   */
  setRotationAxis(axis) {
    if (typeof axis === 'string' && this.rotationModes[axis]) {
      this.rotationAxis = axis
    } else if (axis instanceof THREE.Vector3) {
      this.rotationAxis = 'custom'
      this.rotationModes.custom.axis = axis.clone().normalize()
    } else {
      throw new Error(`Invalid rotation axis: ${axis}`)
    }
  }

  /**
   * Set rotation angle in degrees
   * @param {number} degrees - Rotation angle in degrees
   */
  setRotationAngle(degrees) {
    this.rotationAngle = (degrees * Math.PI) / 180
  }

  /**
   * Set rotation angle in radians
   * @param {number} radians - Rotation angle in radians
   */
  setRotationAngleRadians(radians) {
    this.rotationAngle = radians
  }

  /**
   * Set rotation center point
   * @param {Object|null} center - Center point {x, y, z} or null for object center
   */
  setRotationCenter(center) {
    if (center && typeof center === 'object' && 'x' in center && 'y' in center && 'z' in center) {
      this.rotationCenter = { ...center }
      this.useObjectCenter = false
    } else {
      this.rotationCenter = null
      this.useObjectCenter = true
    }
  }

  /**
   * Get current rotation parameters
   * @returns {Object} Current parameters
   */
  getParameters() {
    return {
      rotationAxis: this.rotationAxis,
      rotationAngle: this.rotationAngle,
      rotationAngleDegrees: (this.rotationAngle * 180) / Math.PI,
      rotationCenter: this.rotationCenter,
      useObjectCenter: this.useObjectCenter,
      isInteractive: this.isInteractive
    }
  }

  /**
   * Set parameters from object
   * @param {Object} params - Parameters to set
   */
  setParameters(params) {
    if (params.rotationAxis !== undefined) {
      this.setRotationAxis(params.rotationAxis)
    }
    if (params.rotationAngle !== undefined) {
      this.rotationAngle = params.rotationAngle
    }
    if (params.rotationAngleDegrees !== undefined) {
      this.setRotationAngle(params.rotationAngleDegrees)
    }
    if (params.rotationCenter !== undefined) {
      this.setRotationCenter(params.rotationCenter)
    }
    if (params.useObjectCenter !== undefined) {
      this.useObjectCenter = params.useObjectCenter
    }
    if (params.isInteractive !== undefined) {
      this.isInteractive = params.isInteractive
    }
  }

  /**
   * Main command execution with interactive input
   * @returns {Promise<CommandResult>}
   */
  async executeAsync() {
    if (!this.application || !this.application.activeDocument) {
      throw new Error('No active document available')
    }

    const document = this.application.activeDocument
    const selectedNodes = document.selectedNodes.items

    if (selectedNodes.length === 0) {
      throw new Error('No objects selected for rotation')
    }

    // Initialize interactive input
    this.interactiveInput = new InteractiveInput(this.application)

    console.log('Starting interactive rotation...', {
      selectedCount: selectedNodes.length,
      currentAxis: this.rotationAxis
    })

    try {
      // Store original transforms for undo
      this.storeOriginalTransforms(selectedNodes)

      // Step 1: Get rotation axis (if not already set or if interactive mode)
      if (this.isInteractive || !this.rotationAxis) {
        await this.getRotationAxisFromUser()
      }

      // Step 2: Get rotation center (if not using object center)
      let rotationCenter
      if (!this.useObjectCenter) {
        rotationCenter = await this.getRotationCenterFromUser()
      } else {
        rotationCenter = this.calculateObjectsCenter(selectedNodes)
      }

      // Step 3: Get rotation angle from user (if interactive) or use default
      if (this.isInteractive) {
        const angle = await this.getRotationAngleFromUser(selectedNodes, rotationCenter)
        this.rotationAngle = angle
      } else {
        // Use default 90-degree rotation if not interactive
        this.rotationAngle = Math.PI / 2 // 90 degrees
      }

      // Get rotation axis vector
      const axisVector = this.getRotationAxisVector()

      // Apply rotation to each selected object
      const rotatedObjects = []
      for (const node of selectedNodes) {
        if (node.visualObject) {
          await this.rotateObject(node, axisVector, rotationCenter)
          rotatedObjects.push(node)
          console.log(`Rotated ${node.name} by ${(this.rotationAngle * 180 / Math.PI).toFixed(1)}° around ${this.rotationAxis.toUpperCase()}-axis`)
        }
      }

      // Clear any preview objects
      this.clearPreview()

      const result = new CommandResult(true, 'Rotation completed successfully', {
        axis: this.rotationAxis,
        angle: this.rotationAngle,
        angleDegrees: (this.rotationAngle * 180) / Math.PI,
        center: this.useObjectCenter ? 'object center' : this.rotationCenter,
        resultCount: rotatedObjects.length
      })

      // Make sure the data is accessible via result.data
      result.data = result.data || {}
      Object.assign(result.data, {
        axis: this.rotationAxis,
        angle: this.rotationAngle,
        angleDegrees: (this.rotationAngle * 180) / Math.PI,
        center: this.useObjectCenter ? 'object center' : this.rotationCenter,
        resultCount: rotatedObjects.length
      })

      console.log('Interactive rotation completed successfully:', {
        axis: this.rotationAxis,
        angle: `${(this.rotationAngle * 180 / Math.PI).toFixed(1)}°`,
        resultCount: rotatedObjects.length
      })

      return result

    } catch (error) {
      console.error('Rotation command failed:', error)

      // Restore original transforms on error
      await this.restoreOriginalTransforms()
      this.clearPreview()

      throw error
    } finally {
      // Cleanup interactive input
      if (this.interactiveInput) {
        this.interactiveInput.cancel()
        this.interactiveInput = null
      }
    }
  }

  /**
   * Get rotation axis from user
   * @private
   */
  async getRotationAxisFromUser() {
    // For now, use default Y axis, but this could be enhanced with UI selection
    console.log(`Using rotation axis: ${this.rotationAxis}`)
    return this.rotationAxis
  }

  /**
   * Get rotation center from user
   * @private
   */
  async getRotationCenterFromUser() {
    if (!this.interactiveInput) {
      throw new Error('Interactive input not initialized')
    }

    const centerPoint = await this.interactiveInput.getPoint(
      'Select rotation center point',
      {
        preview: (point) => {
          // Preview rotation center
          console.log('Rotation center preview:', point)
        }
      }
    )

    this.rotationCenter = centerPoint
    this.useObjectCenter = false

    return new THREE.Vector3(centerPoint.x, centerPoint.y, centerPoint.z)
  }

  /**
   * Get rotation angle from user with live preview
   * @private
   */
  async getRotationAngleFromUser(selectedNodes, rotationCenter) {
    if (!this.interactiveInput) {
      throw new Error('Interactive input not initialized')
    }

    const axisVector = this.getRotationAxisVector()

    console.log(`Enter rotation angle around ${this.rotationAxis.toUpperCase()}-axis:`)

    const angleDegrees = await this.interactiveInput.getAngle(
      `Enter rotation angle around ${this.rotationAxis.toUpperCase()}-axis`,
      90, // default value in degrees
      '°' // unit
    )

    // Clear preview after getting final angle
    this.clearPreview()

    return angleDegrees // Already converted to radians by getAngle()
  }

  /**
   * Preview rotation effect
   * @private
   */
  previewRotation(selectedNodes, axisVector, rotationCenter, angle) {
    // This would show a preview of the rotation
    // For now, just log the preview
    console.log(`Preview: Rotating ${selectedNodes.length} objects by ${(angle * 180 / Math.PI).toFixed(1)}° around ${this.rotationAxis}-axis`)
  }

  /**
   * Store original transforms for undo functionality
   * @param {Array} nodes - Selected nodes
   */
  storeOriginalTransforms(nodes) {
    this.originalTransforms.clear()

    nodes.forEach(node => {
      if (node.visualObject) {
        const transform = {
          position: { ...node.visualObject.position },
          rotation: { ...node.visualObject.rotation },
          scale: { ...node.visualObject.scale }
        }
        this.originalTransforms.set(node, transform)
      }
    })
  }

  /**
   * Restore original transforms (for undo)
   */
  async restoreOriginalTransforms() {
    for (const [node, transform] of this.originalTransforms) {
      if (node.visualObject) {
        node.visualObject.position = { ...transform.position }
        node.visualObject.rotation = { ...transform.rotation }
        node.visualObject.scale = { ...transform.scale }
      }
    }
  }

  /**
   * Calculate the center point of all selected objects
   * @param {Array} nodes - Selected nodes
   * @returns {THREE.Vector3} Center point
   */
  calculateObjectsCenter(nodes) {
    const center = new THREE.Vector3()
    let validObjects = 0

    nodes.forEach(node => {
      if (node.visualObject && node.visualObject.position) {
        center.add(new THREE.Vector3(
          node.visualObject.position.x || 0,
          node.visualObject.position.y || 0,
          node.visualObject.position.z || 0
        ))
        validObjects++
      }
    })

    if (validObjects > 0) {
      center.divideScalar(validObjects)
    }

    return center
  }

  /**
   * Get the rotation axis as a THREE.Vector3
   * @returns {THREE.Vector3} Normalized axis vector
   */
  getRotationAxisVector() {
    const mode = this.rotationModes[this.rotationAxis]
    if (!mode || !mode.axis) {
      throw new Error(`Invalid rotation axis: ${this.rotationAxis}`)
    }
    return mode.axis.clone().normalize()
  }

  /**
   * Rotate a single object
   * @param {Object} node - Node to rotate
   * @param {THREE.Vector3} axis - Rotation axis
   * @param {THREE.Vector3} center - Rotation center
   */
  async rotateObject(node, axis, center) {
    if (!node.visualObject) return

    // Get current position
    const currentPos = new THREE.Vector3(
      node.visualObject.position.x || 0,
      node.visualObject.position.y || 0,
      node.visualObject.position.z || 0
    )

    // Translate to rotation center
    currentPos.sub(center)

    // Apply rotation
    currentPos.applyAxisAngle(axis, this.rotationAngle)

    // Translate back
    currentPos.add(center)

    // Update position
    node.visualObject.position = {
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z
    }

    // Update rotation (add to existing rotation)
    const currentRotation = node.visualObject.rotation || { x: 0, y: 0, z: 0 }

    // Apply rotation based on axis
    if (this.rotationAxis === 'x') {
      node.visualObject.rotation = {
        x: currentRotation.x + this.rotationAngle,
        y: currentRotation.y,
        z: currentRotation.z
      }
    } else if (this.rotationAxis === 'y') {
      node.visualObject.rotation = {
        x: currentRotation.x,
        y: currentRotation.y + this.rotationAngle,
        z: currentRotation.z
      }
    } else if (this.rotationAxis === 'z') {
      node.visualObject.rotation = {
        x: currentRotation.x,
        y: currentRotation.y,
        z: currentRotation.z + this.rotationAngle
      }
    }
  }

  /**
   * Create preview of rotation (for interactive mode)
   * @param {Array} nodes - Nodes to preview
   */
  async createPreview(nodes) {
    this.clearPreview()

    // Implementation for preview would go here
    // This would create temporary visual objects showing the rotation result
    this.isShowingPreview = true
  }

  /**
   * Clear rotation preview
   */
  clearPreview() {
    if (this.isShowingPreview) {
      // Clear preview objects from scene
      this.previewObjects.clear()
      this.isShowingPreview = false
    }
  }

  /**
   * Handle command cancellation
   */
  async onCancel() {
    await super.onCancel()

    // Restore original transforms
    await this.restoreOriginalTransforms()

    // Clear preview
    this.clearPreview()

    console.log('Rotation command cancelled')
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.clearPreview()
    this.originalTransforms.clear()
    this.previewObjects.clear()
    if (super.dispose) {
      super.dispose()
    }
  }

  /**
   * Get command status message
   * @returns {string} Status message
   */
  getStatusMessage() {
    if (this.creationStep < this.stepMessages.length) {
      return this.stepMessages[this.creationStep]
    }
    return 'Rotation command ready'
  }

  /**
   * Quick rotation methods for common operations
   */
  static rotateAroundX(angle) {
    const command = new RotateCommand()
    command.setRotationAxis('x')
    command.setRotationAngle(angle)
    return command
  }

  static rotateAroundY(angle) {
    const command = new RotateCommand()
    command.setRotationAxis('y')
    command.setRotationAngle(angle)
    return command
  }

  static rotateAroundZ(angle) {
    const command = new RotateCommand()
    command.setRotationAxis('z')
    command.setRotationAngle(angle)
    return command
  }

  static rotate90DegreesY() {
    return RotateCommand.rotateAroundY(90)
  }
}
