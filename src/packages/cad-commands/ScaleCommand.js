/**
 * ScaleCommand - Interactive 3D scale command
 *
 * This command implements step-by-step interactive object scaling:
 * 1. Select scale center point (or use object center)
 * 2. Specify scale factor (uniform or per-axis)
 * 3. Apply scaling with live preview
 */

import { ModificationCommand, CommandResult } from '../cad-core/command/Command.js'
import { InteractiveInput } from '../cad-core/command/InteractiveInput.js'
import * as THREE from 'three'

/**
 * Interactive command to scale objects in the 3D scene
 */
export class ScaleCommand extends ModificationCommand {
  constructor() {
    super()

    this.name = 'ScaleObjects'
    this.description = 'Scale selected objects by a specified factor'
    this.category = 'Transform'

    // Scale parameters
    this.scaleFactor = { x: 1, y: 1, z: 1 }
    this.uniformScale = false  // Default to non-uniform scaling for XYZ stretching
    this.scaleCenter = null
    this.useObjectCenter = true

    // Interactive creation state
    this.creationStep = 0 // 0: center selection, 1: scale input, 2: complete
    this.isInteractive = false

    // Preview state
    this.previewObjects = new Map() // original object -> preview scale
    this.isShowingPreview = false
    this.originalTransforms = new Map() // store original transforms for undo

    // User interaction controller
    this.interactionController = null
    this.interactiveInput = null

    // Status messages for each step
    this.stepMessages = [
      'Select scale center point (or use object center)',
      'Enter scale factor or drag to scale',
      'Scale operation complete'
    ]
  }

  /**
   * Set uniform scale factor
   * @param {number} factor - Scale factor (1.0 = no change, 2.0 = double size, 0.5 = half size)
   */
  setUniformScale(factor) {
    this.scaleFactor = { x: factor, y: factor, z: factor }
    this.uniformScale = true
  }

  /**
   * Set non-uniform scale factors
   * @param {number} x - X scale factor
   * @param {number} y - Y scale factor
   * @param {number} z - Z scale factor
   */
  setNonUniformScale(x, y, z) {
    this.scaleFactor = { x, y, z }
    this.uniformScale = false
  }

  /**
   * Set scale center point
   * @param {Object|null} center - Center point {x, y, z} or null for object center
   */
  setScaleCenter(center) {
    if (center && typeof center === 'object' && 'x' in center && 'y' in center && 'z' in center) {
      this.scaleCenter = { ...center }
      this.useObjectCenter = false
    } else {
      this.scaleCenter = null
      this.useObjectCenter = true
    }
  }

  /**
   * Get current parameters
   * @returns {Object} Current parameters
   */
  getParameters() {
    return {
      scaleFactor: this.scaleFactor,
      uniformScale: this.uniformScale,
      scaleCenter: this.scaleCenter,
      useObjectCenter: this.useObjectCenter,
      isInteractive: this.isInteractive
    }
  }

  /**
   * Set parameters from object
   * @param {Object} params - Parameters to set
   */
  setParameters(params) {
    if (params.scaleFactor !== undefined) {
      this.scaleFactor = { ...params.scaleFactor }
    }
    if (params.uniformScale !== undefined) {
      this.uniformScale = params.uniformScale
    }
    if (params.scaleCenter !== undefined) {
      this.setScaleCenter(params.scaleCenter)
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
      throw new Error('No objects selected for scale operation')
    }

    // Initialize interactive input
    this.interactiveInput = new InteractiveInput(this.application)

    console.log('Starting interactive scale...', {
      selectedCount: selectedNodes.length,
      uniformScale: this.uniformScale
    })

    try {
      // Store original transforms for undo
      this.storeOriginalTransforms(selectedNodes)

      // Step 1: Get scale center (if not using object center)
      let scaleCenter
      if (!this.useObjectCenter) {
        scaleCenter = await this.getScaleCenterFromUser()
      } else {
        scaleCenter = this.calculateObjectsCenter(selectedNodes)
      }

      // Step 2: Get scale factor from user (if interactive) or use default
      if (this.isInteractive) {
        if (this.uniformScale) {
          // Get single scale factor for uniform scaling
          const scaleFactor = await this.getUniformScaleFactorFromUser(selectedNodes, scaleCenter)
          this.setUniformScale(scaleFactor)
        } else {
          // Get separate X, Y, Z scale factors for non-uniform scaling using multi-dimension dialog
          const InteractiveInput = (await import('../cad-core/command/InteractiveInput.js')).InteractiveInput
          const interactiveInput = new InteractiveInput(this.application)

          const scaleFactors = await interactiveInput.getMultipleDimensions(
            'Scale Objects - Enter Scale Factors',
            { x: 1.0, y: 1.0, z: 1.0 },
            { x: 'X-Axis Scale', y: 'Y-Axis Scale', z: 'Z-Axis Scale' },
            { min: 0.1, max: 10.0 }
          )
          this.setNonUniformScale(scaleFactors.x, scaleFactors.y, scaleFactors.z)
        }
      } else {
        // Use default 1.5x scaling if not interactive
        if (this.uniformScale) {
          this.setUniformScale(1.5)
        } else {
          this.setNonUniformScale(1.5, 1.0, 1.0) // Default: stretch X axis only
        }
      }

      // Apply scale to each selected object
      const scaledObjects = []
      for (const node of selectedNodes) {
        if (node.visualObject) {
          await this.scaleObject(node, scaleCenter)
          scaledObjects.push(node)
          console.log(`Scaled ${node.name} by factors X:${this.scaleFactor.x.toFixed(2)}, Y:${this.scaleFactor.y.toFixed(2)}, Z:${this.scaleFactor.z.toFixed(2)}`)
        }
      }

      // Clear any preview objects
      this.clearPreview()

      const result = new CommandResult(true, 'Scale completed successfully', {
        scaleFactor: this.scaleFactor,
        uniformScale: this.uniformScale,
        scaleCenter: this.useObjectCenter ? 'object center' : this.scaleCenter,
        resultCount: scaledObjects.length
      })

      // Make sure the data is accessible via result.data
      result.data = result.data || {}
      Object.assign(result.data, {
        scaleFactor: this.scaleFactor,
        uniformScale: this.uniformScale,
        scaleCenter: this.useObjectCenter ? 'object center' : this.scaleCenter,
        resultCount: scaledObjects.length
      })

      console.log('Interactive scale completed successfully:', {
        scaleFactor: this.scaleFactor,
        resultCount: scaledObjects.length
      })

      return result

    } catch (error) {
      console.error('Scale command failed:', error)

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
   * Get scale center from user
   * @private
   */
  async getScaleCenterFromUser() {
    if (!this.interactiveInput) {
      throw new Error('Interactive input not initialized')
    }

    const centerPoint = await this.interactiveInput.getPoint(
      'Select scale center point',
      {
        preview: (point) => {
          console.log('Scale center preview:', point)
        }
      }
    )

    this.scaleCenter = centerPoint
    this.useObjectCenter = false

    return centerPoint
  }

  /**
   * Get uniform scale factor from user with live preview
   * @private
   */
  async getUniformScaleFactorFromUser(selectedNodes, scaleCenter) {
    if (!this.interactiveInput) {
      throw new Error('Interactive input not initialized')
    }

    console.log('Enter uniform scale factor:')

    const scaleFactor = await this.interactiveInput.getScale(
      'Enter scale factor (1.0 = no change, 2.0 = double size)',
      1.5, // default value
      'x' // unit
    )

    // Clear preview after getting final scale factor
    this.clearPreview()

    return scaleFactor
  }

  /**
   * Get non-uniform scale factors from user input
   * @param {Array} selectedNodes - Selected nodes to scale
   * @param {Object} scaleCenter - Scale center point
   * @returns {Promise<{x: number, y: number, z: number}>} Scale factors for each axis
   * @private
   */
  async getNonUniformScaleFactorsFromUser(selectedNodes, scaleCenter) {
    if (!this.interactiveInput) {
      throw new Error('Interactive input not initialized')
    }

    console.log('Enter non-uniform scale factors for X, Y, Z axes:')

    // Get X scale factor
    const scaleX = await this.interactiveInput.getScale(
      'Enter X-axis scale factor (1.0 = no change)',
      1.5, // default value
      'x' // unit
    )

    // Get Y scale factor
    const scaleY = await this.interactiveInput.getScale(
      'Enter Y-axis scale factor (1.0 = no change)',
      1.0, // default value
      'x' // unit
    )

    // Get Z scale factor
    const scaleZ = await this.interactiveInput.getScale(
      'Enter Z-axis scale factor (1.0 = no change)',
      1.0, // default value
      'x' // unit
    )

    // Clear preview after getting final scale factors
    this.clearPreview()

    console.log(`User entered non-uniform scale factors: X=${scaleX}, Y=${scaleY}, Z=${scaleZ}`)
    return { x: scaleX, y: scaleY, z: scaleZ }
  }

  /**
   * Preview scale effect
   * @private
   */
  previewScale(selectedNodes, scaleCenter, scaleFactor) {
    // This would show a preview of the scaling
    // For now, just log the preview
    console.log(`Preview: Scaling ${selectedNodes.length} objects by factor ${scaleFactor.toFixed(2)}`)
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
   * Scale a single object
   * @param {Object} node - Node to scale
   * @param {Object} scaleCenter - Center point for scaling
   */
  async scaleObject(node, scaleCenter) {
    if (!node.visualObject) return

    // Apply scale to the object's scale property
    const currentScale = node.visualObject.scale || { x: 1, y: 1, z: 1 }

    node.visualObject.scale = {
      x: currentScale.x * this.scaleFactor.x,
      y: currentScale.y * this.scaleFactor.y,
      z: currentScale.z * this.scaleFactor.z
    }

    // If not scaling from object center, also adjust position
    if (!this.useObjectCenter && scaleCenter) {
      const currentPos = node.visualObject.position || { x: 0, y: 0, z: 0 }

      // Calculate offset from scale center
      const offset = {
        x: currentPos.x - scaleCenter.x,
        y: currentPos.y - scaleCenter.y,
        z: currentPos.z - scaleCenter.z
      }

      // Scale the offset
      const scaledOffset = {
        x: offset.x * this.scaleFactor.x,
        y: offset.y * this.scaleFactor.y,
        z: offset.z * this.scaleFactor.z
      }

      // Update position
      node.visualObject.position = {
        x: scaleCenter.x + scaledOffset.x,
        y: scaleCenter.y + scaledOffset.y,
        z: scaleCenter.z + scaledOffset.z
      }
    }
  }

  /**
   * Clear scale preview
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

    console.log('Scale command cancelled')
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
    return 'Scale command ready'
  }

  /**
   * Quick scale methods for common operations
   */
  static scaleUniform(factor) {
    const command = new ScaleCommand()
    command.setUniformScale(factor)
    return command
  }

  static scaleDouble() {
    return ScaleCommand.scaleUniform(2.0)
  }

  static scaleHalf() {
    return ScaleCommand.scaleUniform(0.5)
  }

  static scaleNonUniform(x, y, z) {
    const command = new ScaleCommand()
    command.setNonUniformScale(x, y, z)
    return command
  }
}
