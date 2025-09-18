/**
 * BoxCommand - Interactive 3D box creation command
 *
 * This command implements step-by-step interactive box creation:
 * 1. Select first corner point
 * 2. Select opposite corner with live preview
 * 3. Enter height value
 */

import { GeometryCommand, CommandResult } from '../cad-core/command/Command.js'
import { BoxVisualObject } from '../cad-three/BasicShapes.js'

/**
 * Interactive command to create a box geometry in the 3D scene
 */
export class BoxCommand extends GeometryCommand {
  constructor() {
    super()

    this.name = 'CreateBox'
    this.description = 'Create a 3D box by selecting two corners and height'
    this.category = 'Geometry'

    // Interactive creation state
    this.creationStep = 0 // 0: first corner, 1: opposite corner, 2: height, 3: complete
    this.firstCorner = null
    this.oppositeCorner = null
    this.height = 2.0

    // Preview state
    this.previewObject = null
    this.isShowingPreview = false

    // Material properties
    this.color = '#4CAF50'
    this.opacity = 1.0
    this.wireframe = false

    // User interaction controller
    this.interactionController = null

    // Status messages for each step
    this.stepMessages = [
      'Select first corner of the box',
      'Select opposite corner of the box',
      'Enter height for the box',
      'Box creation complete'
    ]
  }

  /**
   * Set box dimensions
   * @param {number} width - Box width
   * @param {number} height - Box height
   * @param {number} depth - Box depth
   */
  setDimensions(width, height, depth) {
    this.width = Math.max(0.1, width)
    this.height = Math.max(0.1, height)
    this.depth = Math.max(0.1, depth)
  }

  /**
   * Set box position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  setPosition(x, y, z) {
    this.position = { x, y, z }
  }

  /**
   * Set box rotation
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
   * @param {boolean} wireframe - Whether to show wireframe
   */
  setMaterial(color, opacity = 1.0, wireframe = false) {
    this.color = color
    this.opacity = Math.max(0, Math.min(1, opacity))
    this.wireframe = wireframe
  }

  /**
   * Enable interactive creation mode
   * @param {boolean} interactive - Whether to use interactive creation
   */
  setInteractive(interactive = true) {
    this.isInteractive = interactive
    this.creationStep = 0
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

    switch (this.creationStep) {
      case 0: // First point - set position
        this.startPoint = { ...point }
        this.setPosition(point.x, point.y, point.z)
        this.creationStep = 1
        this.notifyPropertyChanged('creationStep', 1)
        return false

      case 1: // Second point - calculate dimensions
        this.endPoint = { ...point }
        const width = Math.abs(point.x - this.startPoint.x)
        const height = Math.abs(point.y - this.startPoint.y)
        const depth = Math.abs(point.z - this.startPoint.z)

        // Use minimum dimensions if too small
        this.setDimensions(
          Math.max(0.5, width),
          Math.max(0.5, height),
          Math.max(0.5, depth)
        )

        // Center the box between the two points
        this.setPosition(
          (this.startPoint.x + point.x) / 2,
          (this.startPoint.y + point.y) / 2,
          (this.startPoint.z + point.z) / 2
        )

        this.creationStep = 2
        this.notifyPropertyChanged('creationStep', 2)
        return true // Creation complete

      default:
        return true
    }
  }

  /**
   * Get preview geometry for interactive creation
   * @returns {Object|null} Preview geometry data
   */
  getPreviewGeometry() {
    if (!this.isInteractive || this.creationStep === 0) {
      return null
    }

    return {
      type: 'box',
      position: this.position,
      dimensions: {
        width: this.width,
        height: this.height,
        depth: this.depth
      },
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
    if (this.width <= 0 || this.height <= 0 || this.depth <= 0) {
      this.error = new Error('Box dimensions must be positive values')
      return false
    }

    if (!this.application || !this.application.activeDocument) {
      this.error = new Error('No active document available')
      return false
    }

    return true
  }

  /**
   * Main interactive command execution logic
   * Implements step-by-step box creation as per CAD standards
   * @returns {Promise<CommandResult>} Command execution result
   */
  async executeAsync() {
    try {
      // Step 1: Get first corner point
      console.log('Step 1: Waiting for first corner selection...')
      this.firstCorner = await this.getPoint(this.stepMessages[0])

      if (this.isCancelled) {
        return CommandResult.error('Box creation cancelled by user')
      }

      this.creationStep = 1
      this.notifyPropertyChanged('creationStep', 1)
      this.notifyPropertyChanged('statusMessage', this.stepMessages[1])

      // Step 2: Get opposite corner with preview
      console.log('Step 2: Waiting for opposite corner selection...')
      this.oppositeCorner = await this.getPoint(this.stepMessages[1], {
        preview: (point) => this.updateBoxPreview(this.firstCorner, point)
      })

      if (this.isCancelled) {
        await this.cleanupPreview()
        return CommandResult.error('Box creation cancelled by user')
      }

      this.creationStep = 2
      this.notifyPropertyChanged('creationStep', 2)
      this.notifyPropertyChanged('statusMessage', this.stepMessages[2])

      // Step 3: Get height
      console.log('Step 3: Waiting for height input...')
      this.height = await this.getLength(this.stepMessages[2], {
        defaultValue: 2.0,
        preview: (height) => this.updateHeightPreview(height)
      })

      if (this.isCancelled) {
        await this.cleanupPreview()
        return CommandResult.error('Box creation cancelled by user')
      }

      // Clean up preview before creating final object
      await this.cleanupPreview()

      // Step 4: Create the final box
      const finalBox = await this.createFinalBox()

      this.creationStep = 3
      this.notifyPropertyChanged('creationStep', 3)
      this.notifyPropertyChanged('statusMessage', this.stepMessages[3])

      return CommandResult.success(
        finalBox,
        `Box created successfully: ${finalBox.name}`
      )

    } catch (error) {
      // Clean up on error
      await this.cleanupPreview()
      console.error('BoxCommand execution failed:', error)
      throw error
    }
  }

  /**
   * Called before command execution
   */
  async beforeExecute() {
    console.log('Starting box creation...', {
      dimensions: { width: this.width, height: this.height, depth: this.depth },
      position: this.position,
      interactive: this.isInteractive
    })
  }

  /**
   * Called after successful command execution
   */
  async afterExecute() {
    console.log('Box creation completed successfully')

    // If this was an interactive creation, clean up
    if (this.isInteractive) {
      this.creationStep = 0
      this.startPoint = null
      this.endPoint = null
    }
  }

  /**
   * Called when command encounters an error
   * @param {Error} error - The error that occurred
   */
  async onError(error) {
    await super.onError(error)
    console.error('Box creation failed:', error.message)
  }

  /**
   * Called when command is cancelled
   */
  async onCancel() {
    await super.onCancel()
    console.log('Box creation cancelled')

    // Clean up interactive state
    if (this.isInteractive) {
      this.creationStep = 0
      this.startPoint = null
      this.endPoint = null
    }
  }

  // ========================================
  // Interactive Methods
  // ========================================

  /**
   * Get a 3D point from user interaction
   * @param {string} prompt - Message to show user
   * @param {Object} options - Options for point selection
   * @returns {Promise<Object>} Selected 3D point
   */
  async getPoint(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.application) {
        reject(new Error('No application context available'))
        return
      }

      console.log(`BoxCommand: ${prompt}`)
      this.notifyPropertyChanged('userPrompt', prompt)

      // Set up interaction controller
      this.interactionController = {
        prompt,
        options,
        onPointSelected: (point) => {
          console.log('Point selected:', point)
          resolve(point)
        },
        onCancelled: () => {
          this.isCancelled = true
          reject(new Error('Point selection cancelled'))
        }
      }

      // For now, simulate point selection after a delay
      // In a real implementation, this would hook into the 3D viewport's mouse events
      setTimeout(() => {
        if (this.isCancelled) {
          reject(new Error('Command cancelled'))
          return
        }

        // Simulate point selection based on step
        let simulatedPoint
        switch (this.creationStep) {
          case 0: // First corner
            simulatedPoint = { x: -1, y: 0, z: -1 }
            break
          case 1: // Opposite corner
            simulatedPoint = { x: 1, y: 0, z: 1 }
            break
          default:
            simulatedPoint = { x: 0, y: 0, z: 0 }
        }

        resolve(simulatedPoint)
      }, 1000) // 1 second delay to simulate user interaction
    })
  }

  /**
   * Get a length value from user input
   * @param {string} prompt - Message to show user
   * @param {Object} options - Options for length input
   * @returns {Promise<number>} Length value
   */
  async getLength(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`BoxCommand: ${prompt}`)
      this.notifyPropertyChanged('userPrompt', prompt)

      // Set up interaction controller for length input
      this.interactionController = {
        prompt,
        options,
        onLengthEntered: (length) => {
          console.log('Length entered:', length)
          resolve(length)
        },
        onCancelled: () => {
          this.isCancelled = true
          reject(new Error('Length input cancelled'))
        }
      }

      // For now, simulate length input
      setTimeout(() => {
        if (this.isCancelled) {
          reject(new Error('Command cancelled'))
          return
        }

        const simulatedHeight = options.defaultValue || 2.0
        resolve(simulatedHeight)
      }, 1000)
    })
  }

  /**
   * Update box preview during opposite corner selection
   * @param {Object} firstCorner - First corner point
   * @param {Object} currentPoint - Current mouse position
   */
  updateBoxPreview(firstCorner, currentPoint) {
    try {
      // Calculate box dimensions from two corners
      const width = Math.abs(currentPoint.x - firstCorner.x)
      const height = Math.abs(currentPoint.y - firstCorner.y) || 0.1 // Default height for preview
      const depth = Math.abs(currentPoint.z - firstCorner.z)

      // Calculate center position
      const centerX = (firstCorner.x + currentPoint.x) / 2
      const centerY = (firstCorner.y + currentPoint.y) / 2
      const centerZ = (firstCorner.z + currentPoint.z) / 2

      // Create or update preview geometry
      this.createPreviewBox(
        { x: centerX, y: centerY, z: centerZ },
        { width: Math.max(0.1, width), height: Math.max(0.1, height), depth: Math.max(0.1, depth) }
      )

    } catch (error) {
      console.warn('Preview update failed:', error)
    }
  }

  /**
   * Update height preview during height input
   * @param {number} height - Current height value
   */
  updateHeightPreview(height) {
    if (!this.firstCorner || !this.oppositeCorner) return

    try {
      // Calculate final dimensions with new height
      const width = Math.abs(this.oppositeCorner.x - this.firstCorner.x)
      const depth = Math.abs(this.oppositeCorner.z - this.firstCorner.z)

      const centerX = (this.firstCorner.x + this.oppositeCorner.x) / 2
      const centerY = height / 2 // Center the box vertically
      const centerZ = (this.firstCorner.z + this.oppositeCorner.z) / 2

      this.createPreviewBox(
        { x: centerX, y: centerY, z: centerZ },
        { width: Math.max(0.1, width), height: Math.max(0.1, height), depth: Math.max(0.1, depth) }
      )

    } catch (error) {
      console.warn('Height preview update failed:', error)
    }
  }

  /**
   * Create or update preview box geometry
   * @param {Object} position - Box center position
   * @param {Object} dimensions - Box dimensions
   */
  createPreviewBox(position, dimensions) {
    // For now, just log the preview - in a real implementation this would create a temporary visual object
    console.log('Preview box:', { position, dimensions })

    // Store preview state
    this.isShowingPreview = true
    this.notifyPropertyChanged('previewBox', { position, dimensions })
  }

  /**
   * Create the final box object
   * @returns {Promise<VisualObject>} Created box object
   */
  async createFinalBox() {
    if (!this.firstCorner || !this.oppositeCorner) {
      throw new Error('Missing corner points for box creation')
    }

    // Calculate final dimensions
    const width = Math.abs(this.oppositeCorner.x - this.firstCorner.x)
    const depth = Math.abs(this.oppositeCorner.z - this.firstCorner.z)
    const height = this.height

    // Calculate center position
    const centerX = (this.firstCorner.x + this.oppositeCorner.x) / 2
    const centerY = height / 2
    const centerZ = (this.firstCorner.z + this.oppositeCorner.z) / 2

    // Create BoxVisualObject with proper parameters
    const visualObject = new BoxVisualObject(null, {
      width: width,
      height: height,
      depth: depth
    })

    visualObject.name = `Box_${Date.now()}`

    // Configure material properties
    visualObject.setMaterialConfig('default', {
      color: this.color,
      opacity: this.opacity,
      transparent: this.opacity < 1.0,
      wireframe: this.wireframe,
      metalness: 0.1,
      roughness: 0.3
    })

    // Set transform properties
    visualObject.position = { x: centerX, y: centerY, z: centerZ }
    visualObject.rotation = { x: 0, y: 0, z: 0 }
    visualObject.scale = { x: 1, y: 1, z: 1 }

    // Set properties for the property panel
    visualObject.setProperty('type', 'Box')
    visualObject.setProperty('width', width)
    visualObject.setProperty('height', height)
    visualObject.setProperty('depth', depth)
    visualObject.setProperty('color', this.color)
    visualObject.setProperty('opacity', this.opacity)
    visualObject.setProperty('wireframe', this.wireframe)
    visualObject.setProperty('volume', width * height * depth)

    // Add to the active document with proper nodeData format
    const nodeData = {
      id: visualObject.id,
      name: visualObject.name,
      type: visualObject.type || visualObject._type,
      visible: true,
      locked: false,
      geometry: visualObject.geometry,
      visualObject: visualObject  // The actual BoxVisualObject instance
    }

    await this.application.activeDocument.addNode(nodeData)

    // Track the created object for undo/redo
    this.addCreatedObject(visualObject)

    console.log(`Created final box: ${visualObject.name}`, {
      dimensions: { width, height, depth },
      position: { x: centerX, y: centerY, z: centerZ }
    })

    return visualObject
  }

  /**
   * Clean up preview objects and interaction state
   */
  async cleanupPreview() {
    if (this.previewObject && this.application?.activeDocument) {
      try {
        await this.application.activeDocument.removeNode(this.previewObject)
      } catch (error) {
        console.warn('Failed to clean up preview object:', error)
      }
    }

    this.previewObject = null
    this.isShowingPreview = false
    this.interactionController = null
    this.notifyPropertyChanged('previewBox', null)
  }

  /**
   * Get command-specific status information
   * @returns {Object} Extended status information
   */
  getStatus() {
    const baseStatus = super.getStatus()

    return {
      ...baseStatus,
      interactive: {
        creationStep: this.creationStep,
        stepMessage: this.stepMessages[this.creationStep] || 'Unknown step',
        firstCorner: this.firstCorner,
        oppositeCorner: this.oppositeCorner,
        height: this.height,
        isShowingPreview: this.isShowingPreview
      },
      parameters: {
        material: { color: this.color, opacity: this.opacity, wireframe: this.wireframe }
      },
      createdObjects: this.createdObjects.length
    }
  }
}

export default BoxCommand
