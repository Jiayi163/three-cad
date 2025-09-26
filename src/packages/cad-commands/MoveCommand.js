/**
 * MoveCommand - Interactive 3D move/translate command
 *
 * This command implements step-by-step interactive object movement:
 * 1. Select base point (current position or custom point)
 * 2. Select destination point or specify offset
 * 3. Apply movement with live preview
 */

import { ModificationCommand, CommandResult } from '../cad-core/command/Command.js'
import { InteractiveInput } from '../cad-core/command/InteractiveInput.js'
import * as THREE from 'three'

/**
 * Interactive command to move objects in the 3D scene
 */
export class MoveCommand extends ModificationCommand {
  constructor() {
    super()

    this.name = 'MoveObjects'
    this.description = 'Move selected objects to a new location'
    this.category = 'Transform'

    // Move parameters
    this.moveVector = { x: 0, y: 0, z: 0 }
    this.basePoint = null
    this.destinationPoint = null
    this.useCurrentPosition = true

    // Interactive creation state
    this.creationStep = 0 // 0: base point, 1: destination point, 2: complete
    this.isInteractive = false

    // Preview state
    this.previewObjects = new Map() // original object -> preview offset
    this.isShowingPreview = false
    this.originalTransforms = new Map() // store original transforms for undo

    // User interaction controller
    this.interactionController = null
    this.interactiveInput = null

    // Status messages for each step
    this.stepMessages = [
      'Select base point or press Enter to use current position',
      'Select destination point or enter offset values',
      'Move operation complete'
    ]
  }

  /**
   * Set move vector/offset
   * @param {number} x - X offset
   * @param {number} y - Y offset
   * @param {number} z - Z offset
   */
  setMoveVector(x, y, z) {
    this.moveVector = { x, y, z }
  }

  /**
   * Set base point
   * @param {Object} point - Base point {x, y, z}
   */
  setBasePoint(point) {
    this.basePoint = point
    this.useCurrentPosition = false
  }

  /**
   * Set destination point
   * @param {Object} point - Destination point {x, y, z}
   */
  setDestinationPoint(point) {
    this.destinationPoint = point
    if (this.basePoint) {
      this.moveVector = {
        x: point.x - this.basePoint.x,
        y: point.y - this.basePoint.y,
        z: point.z - this.basePoint.z
      }
    }
  }

  /**
   * Get current parameters
   * @returns {Object} Current parameters
   */
  getParameters() {
    return {
      moveVector: this.moveVector,
      basePoint: this.basePoint,
      destinationPoint: this.destinationPoint,
      useCurrentPosition: this.useCurrentPosition,
      isInteractive: this.isInteractive
    }
  }

  /**
   * Set parameters from object
   * @param {Object} params - Parameters to set
   */
  setParameters(params) {
    if (params.moveVector !== undefined) {
      this.moveVector = { ...params.moveVector }
    }
    if (params.basePoint !== undefined) {
      this.setBasePoint(params.basePoint)
    }
    if (params.destinationPoint !== undefined) {
      this.setDestinationPoint(params.destinationPoint)
    }
    if (params.useCurrentPosition !== undefined) {
      this.useCurrentPosition = params.useCurrentPosition
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
      throw new Error('No objects selected for move operation')
    }

    // Initialize interactive input
    this.interactiveInput = new InteractiveInput(this.application)

    console.log('Starting interactive move...', {
      selectedCount: selectedNodes.length,
      useCurrentPosition: this.useCurrentPosition
    })

    try {
      // Store original transforms for undo
      this.storeOriginalTransforms(selectedNodes)

      // Step 1: Get base point (if not using current position)
      if (!this.useCurrentPosition) {
        this.basePoint = await this.getBasePointFromUser()
      } else {
        // Use center of selected objects as base point
        this.basePoint = this.calculateObjectsCenter(selectedNodes)
      }

      // Step 2: Get move offset from user (if interactive) or use default
      if (this.isInteractive) {
        await this.getMoveOffsetFromUser(selectedNodes)
      } else {
        // Use default 2-unit move in X direction if not interactive
        this.setMoveVector(2, 0, 0)
      }

      // Apply move to each selected object
      const movedObjects = []
      for (const node of selectedNodes) {
        if (node.visualObject) {
          await this.moveObject(node)
          movedObjects.push(node)
          console.log(`Moved ${node.name} by offset (${this.moveVector.x.toFixed(2)}, ${this.moveVector.y.toFixed(2)}, ${this.moveVector.z.toFixed(2)})`)
        }
      }

      // Clear any preview objects
      this.clearPreview()

      const result = new CommandResult(true, 'Move completed successfully', {
        moveVector: this.moveVector,
        basePoint: this.basePoint,
        destinationPoint: this.destinationPoint,
        resultCount: movedObjects.length
      })

      // Make sure the data is accessible via result.data
      result.data = result.data || {}
      Object.assign(result.data, {
        moveVector: this.moveVector,
        basePoint: this.basePoint,
        destinationPoint: this.destinationPoint,
        resultCount: movedObjects.length
      })

      console.log('Interactive move completed successfully:', {
        offset: this.moveVector,
        resultCount: movedObjects.length
      })

      return result

    } catch (error) {
      console.error('Move command failed:', error)

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
   * Get base point from user
   * @private
   */
  async getBasePointFromUser() {
    if (!this.interactiveInput) {
      throw new Error('Interactive input not initialized')
    }

    const basePoint = await this.interactiveInput.getPoint(
      'Select base point (or press Enter to use current position)',
      {
        preview: (point) => {
          console.log('Base point preview:', point)
        }
      }
    )

    return basePoint
  }

  /**
   * Get move offset from user with numeric input
   * @private
   */
  async getMoveOffsetFromUser(selectedNodes) {
    if (!this.interactiveInput) {
      throw new Error('Interactive input not initialized')
    }

    console.log('Enter move distance:')

    // Get X, Y, Z offsets from user
    const xOffset = await this.interactiveInput.getDistance(
      'Enter X offset (horizontal distance)',
      2, // default value
      'units'
    )

    const yOffset = await this.interactiveInput.getDistance(
      'Enter Y offset (vertical distance)',
      0, // default value
      'units'
    )

    const zOffset = await this.interactiveInput.getDistance(
      'Enter Z offset (depth distance)',
      0, // default value
      'units'
    )

    this.setMoveVector(xOffset, yOffset, zOffset)

    // Clear preview after getting final offset
    this.clearPreview()
  }

  /**
   * Preview move effect
   * @private
   */
  previewMove(selectedNodes, moveVector) {
    // This would show a preview of the move
    // For now, just log the preview
    console.log(`Preview: Moving ${selectedNodes.length} objects by (${moveVector.x.toFixed(2)}, ${moveVector.y.toFixed(2)}, ${moveVector.z.toFixed(2)})`)
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
   * @returns {Object} Center point {x, y, z}
   */
  calculateObjectsCenter(nodes) {
    const center = { x: 0, y: 0, z: 0 }
    let validObjects = 0

    nodes.forEach(node => {
      if (node.visualObject && node.visualObject.position) {
        center.x += node.visualObject.position.x || 0
        center.y += node.visualObject.position.y || 0
        center.z += node.visualObject.position.z || 0
        validObjects++
      }
    })

    if (validObjects > 0) {
      center.x /= validObjects
      center.y /= validObjects
      center.z /= validObjects
    }

    return center
  }

  /**
   * Move a single object
   * @param {Object} node - Node to move
   */
  async moveObject(node) {
    if (!node.visualObject) return

    // Get current position
    const currentPos = node.visualObject.position || { x: 0, y: 0, z: 0 }

    // Apply move vector
    node.visualObject.position = {
      x: currentPos.x + this.moveVector.x,
      y: currentPos.y + this.moveVector.y,
      z: currentPos.z + this.moveVector.z
    }
  }

  /**
   * Clear move preview
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

    console.log('Move command cancelled')
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
    return 'Move command ready'
  }

  /**
   * Quick move methods for common operations
   */
  static moveByOffset(x, y, z) {
    const command = new MoveCommand()
    command.setMoveVector(x, y, z)
    return command
  }

  static moveToPoint(destination) {
    const command = new MoveCommand()
    command.setDestinationPoint(destination)
    command.useCurrentPosition = true
    return command
  }
}
