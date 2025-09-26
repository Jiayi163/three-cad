/**
 * PlaneCommand - Creates a 3D plane geometry
 *
 * Demonstrates parametric geometry creation with
 * customizable dimensions and material properties
 */

import { GeometryCommand, CommandResult } from '../cad-core/command/Command.js'
import { PlaneVisualObject } from '../cad-three/BasicShapes.js'
import { markRaw } from 'vue'

/**
 * Command to create a plane geometry in the 3D scene
 */
export class PlaneCommand extends GeometryCommand {
  constructor() {
    super()

    this.name = 'CreatePlane'
    this.description = 'Create a 3D plane geometry'
    this.category = 'Geometry'

    // Plane parameters with defaults
    this.width = 2.0
    this.height = 2.0
    this.position = { x: 0, y: 0, z: 0 }
    this.rotation = { x: 0, y: 0, z: 0 }

    // Subdivision parameters for geometry quality
    this.widthSegments = 1
    this.heightSegments = 1

    // Material properties
    this.color = '#9C27B0'
    this.opacity = 1.0
    this.wireframe = false
    this.metalness = 0.0
    this.roughness = 0.5
    this.side = 'DoubleSide' // Show both sides of the plane

    // Interactive creation state
    this.isInteractive = false
    this.firstCorner = null
    this.secondCorner = null

    // Dimension input mode
    this.useDimensionInput = false
  }

  /**
   * Set plane dimensions
   * @param {number} width - Plane width
   * @param {number} height - Plane height
   */
  setDimensions(width, height) {
    this.width = Math.max(0.1, width)
    this.height = Math.max(0.1, height)
  }

  /**
   * Set plane position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  setPosition(x, y, z) {
    this.position = { x, y, z }
  }

  /**
   * Set plane rotation
   * @param {number} x - X rotation in radians
   * @param {number} y - Y rotation in radians
   * @param {number} z - Z rotation in radians
   */
  setRotation(x, y, z) {
    this.rotation = { x, y, z }
  }

  /**
   * Set geometry subdivision parameters
   * @param {number} widthSegments - Number of width segments
   * @param {number} heightSegments - Number of height segments
   */
  setSubdivision(widthSegments = 1, heightSegments = 1) {
    this.widthSegments = Math.max(1, Math.min(32, widthSegments))
    this.heightSegments = Math.max(1, Math.min(32, heightSegments))
  }

  /**
   * Set material properties
   * @param {string} color - Hex color string
   * @param {number} opacity - Opacity (0-1)
   * @param {boolean} wireframe - Whether to show wireframe
   * @param {number} metalness - Metalness value (0-1)
   * @param {number} roughness - Roughness value (0-1)
   * @param {string} side - Material side ('FrontSide', 'BackSide', 'DoubleSide')
   */
  setMaterial(color, opacity = 1.0, wireframe = false, metalness = 0.0, roughness = 0.5, side = 'DoubleSide') {
    this.color = color
    this.opacity = Math.max(0, Math.min(1, opacity))
    this.wireframe = wireframe
    this.metalness = Math.max(0, Math.min(1, metalness))
    this.roughness = Math.max(0, Math.min(1, roughness))
    this.side = side
  }

  /**
   * Enable interactive creation mode
   * @param {boolean} interactive - Whether to use interactive creation
   */
  setInteractive(interactive = true) {
    this.isInteractive = interactive
    this.firstCorner = null
    this.secondCorner = null
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

    if (!this.firstCorner) {
      // First click - set first corner
      this.firstCorner = { ...point }
      this.notifyPropertyChanged('firstCorner', this.firstCorner)
      return false
    } else {
      // Second click - calculate dimensions and complete
      this.secondCorner = { ...point }

      // Calculate dimensions from two corners
      const width = Math.abs(point.x - this.firstCorner.x)
      const height = Math.abs(point.z - this.firstCorner.z) // Use Z for depth in XZ plane

      this.setDimensions(Math.max(0.1, width), Math.max(0.1, height))

      // Calculate center position
      const centerX = (this.firstCorner.x + point.x) / 2
      const centerY = (this.firstCorner.y + point.y) / 2
      const centerZ = (this.firstCorner.z + point.z) / 2

      this.setPosition(centerX, centerY, centerZ)
      this.notifyPropertyChanged('secondCorner', this.secondCorner)
      return true // Creation complete
    }
  }

  /**
   * Get preview geometry for interactive creation
   * @returns {Object|null} Preview geometry data
   */
  getPreviewGeometry() {
    if (!this.isInteractive || !this.firstCorner) {
      return null
    }

    return {
      type: 'plane',
      position: this.position,
      width: this.width,
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
    if (this.width <= 0 || this.height <= 0) {
      this.error = new Error('Plane dimensions must be positive values')
      return false
    }

    if (this.widthSegments < 1 || this.heightSegments < 1) {
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
    // Check if we should use dimension input mode
    if (this.useDimensionInput) {
      return await this.executeWithDimensionInput()
    }

    // Validate parameters
    if (!this.validateParameters()) {
      throw this.error
    }

    try {
      // Create PlaneVisualObject with proper parameters
      const visualObject = new PlaneVisualObject(null, {
        width: this.width,
        height: this.height,
        widthSegments: this.widthSegments,
        heightSegments: this.heightSegments
      })

      visualObject.name = `Plane_${Date.now()}`

      // Configure material properties
      visualObject.setMaterialConfig('default', {
        color: this.color,
        opacity: this.opacity,
        transparent: this.opacity < 1.0,
        wireframe: this.wireframe,
        metalness: this.metalness,
        roughness: this.roughness,
        side: this.side === 'DoubleSide' ? 2 : (this.side === 'BackSide' ? 1 : 0) // THREE.DoubleSide = 2
      })

      // Set transform properties
      visualObject.position = { ...this.position }
      visualObject.rotation = { ...this.rotation }
      visualObject.scale = { x: 1, y: 1, z: 1 }

      // Set properties for the property panel
      visualObject.setProperty('type', 'Plane')
      visualObject.setProperty('width', this.width)
      visualObject.setProperty('height', this.height)
      visualObject.setProperty('widthSegments', this.widthSegments)
      visualObject.setProperty('heightSegments', this.heightSegments)
      visualObject.setProperty('color', this.color)
      visualObject.setProperty('opacity', this.opacity)
      visualObject.setProperty('wireframe', this.wireframe)
      visualObject.setProperty('metalness', this.metalness)
      visualObject.setProperty('roughness', this.roughness)
      visualObject.setProperty('side', this.side)
      visualObject.setProperty('area', this.width * this.height)

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
      console.log(`Created plane: ${visualObject.name}`, {
        width: this.width,
        height: this.height,
        position: this.position,
        subdivision: { width: this.widthSegments, height: this.heightSegments }
      })

      return CommandResult.success(
        visualObject,
        `Plane created successfully: ${visualObject.name}`
      )

    } catch (error) {
      console.error('PlaneCommand execution failed:', error)
      throw error
    }
  }

  /**
   * Called before command execution
   */
  async beforeExecute() {
    console.log('Starting plane creation...', {
      width: this.width,
      height: this.height,
      position: this.position,
      subdivision: { width: this.widthSegments, height: this.heightSegments },
      interactive: this.isInteractive
    })
  }

  /**
   * Called after successful command execution
   */
  async afterExecute() {
    console.log('Plane creation completed successfully')

    // If this was an interactive creation, clean up
    if (this.isInteractive) {
      this.firstCorner = null
      this.secondCorner = null
    }
  }

  /**
   * Called when command encounters an error
   * @param {Error} error - The error that occurred
   */
  async onError(error) {
    await super.onError(error)
    console.error('Plane creation failed:', error.message)
  }

  /**
   * Called when command is cancelled
   */
  async onCancel() {
    await super.onCancel()
    console.log('Plane creation cancelled')

    // Clean up interactive state
    if (this.isInteractive) {
      this.firstCorner = null
      this.secondCorner = null
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
        width: this.width,
        height: this.height,
        position: this.position,
        rotation: this.rotation,
        subdivision: { width: this.widthSegments, height: this.heightSegments },
        material: {
          color: this.color,
          opacity: this.opacity,
          wireframe: this.wireframe,
          metalness: this.metalness,
          roughness: this.roughness,
          side: this.side
        }
      },
      interactive: {
        isInteractive: this.isInteractive,
        firstCorner: this.firstCorner,
        secondCorner: this.secondCorner
      },
      createdObjects: this.createdObjects.length
    }
  }

  /**
   * Execute command with dimension input dialogs
   * @returns {Promise<CommandResult>}
   */
  async executeWithDimensionInput() {
    try {
      console.log('Creating plane with dimension input...')

      // Initialize interactive input
      const InteractiveInput = (await import('../cad-core/command/InteractiveInput.js')).InteractiveInput
      const interactiveInput = new InteractiveInput(this.application)

      // Get plane dimensions (width and height)
      const dimensions = await interactiveInput.getTwoDimensions(
        'Create Plane - Enter Dimensions',
        { x: this.width, y: this.height },
        { x: 'Length', y: 'Width' },
        { min: 0.1, max: 100 }
      )

      if (this.isCancelled) {
        return CommandResult.error('Plane creation cancelled by user')
      }

      // Set the dimensions
      this.setDimensions(dimensions.x, dimensions.y)

      // Temporarily disable dimension input to avoid recursion
      this.useDimensionInput = false

      // Create the plane using the existing logic
      const result = await this.executeAsync()

      // Restore dimension input flag
      this.useDimensionInput = true

      return result

    } catch (error) {
      console.error('PlaneCommand dimension input failed:', error)
      throw error
    }
  }
}

export default PlaneCommand

