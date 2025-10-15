/**
 * Command System - Base Command Classes
 *
 * Implements the Command pattern for CAD operations with support for:
 * - Asynchronous execution
 * - Cancellation
 * - Undo/Redo integration
 * - Observable pattern integration
 */

import { Observable } from '../foundation/Observable.js'

/**
 * Base class for all commands in the CAD system
 * Provides infrastructure for cancellable, observable commands
 */
export class CancelableCommand extends Observable {
  constructor() {
    super()

    // Command state
    this.isCompleted = false
    this.isCancelled = false
    this.isExecuting = false

    // Application context
    this.application = null
    this.controller = null

    // Command metadata
    this.name = this.constructor.name
    this.description = ''
    this.category = 'General'

    // Execution results
    this.result = null
    this.error = null

    // Timing information
    this.startTime = null
    this.endTime = null
  }

  /**
   * Execute the command with the given application context
   * @param {CADApplication} application - The CAD application instance
   * @returns {Promise<any>} Command execution result
   */
  async execute(application) {
    if (this.isExecuting) {
      throw new Error(`Command ${this.name} is already executing`)
    }

    if (this.isCompleted) {
      throw new Error(`Command ${this.name} has already been completed`)
    }

    this.application = application
    this.isExecuting = true
    this.startTime = Date.now()

    try {
      // Notify observers that execution started
      this.notifyPropertyChanged('isExecuting', true)
      this.notifyPropertyChanged('status', 'executing')

      // Pre-execution hook
      await this.beforeExecute()

      // Main execution logic (implemented by subclasses)
      this.result = await this.executeAsync()

      // Mark as completed
      this.isCompleted = true
      this.isExecuting = false
      this.endTime = Date.now()

      // Post-execution hook
      await this.afterExecute()

      // Notify completion
      this.notifyPropertyChanged('isCompleted', true)
      this.notifyPropertyChanged('isExecuting', false)
      this.notifyPropertyChanged('status', 'completed')
      this.notifyPropertyChanged('result', this.result)

      return this.result

    } catch (error) {
      this.error = error
      this.isExecuting = false
      this.endTime = Date.now()

      // Handle cancellation vs actual errors
      if (this.isCancelled) {
        this.notifyPropertyChanged('status', 'cancelled')
      } else {
        this.notifyPropertyChanged('status', 'error')
        this.notifyPropertyChanged('error', error)
      }

      this.notifyPropertyChanged('isExecuting', false)

      // Cleanup on error
      await this.onError(error)

      throw error
    }
  }

  /**
   * Cancel the command execution
   * @returns {Promise<void>}
   */
  async cancel() {
    if (!this.isExecuting) {
      return // Already completed or not started
    }

    this.isCancelled = true

    // Cancel the controller if available
    if (this.controller && typeof this.controller.cancel === 'function') {
      await this.controller.cancel()
    }

    // Custom cancellation logic
    await this.onCancel()

    this.notifyPropertyChanged('isCancelled', true)
    this.notifyPropertyChanged('status', 'cancelling')
  }

  /**
   * Get command execution duration in milliseconds
   * @returns {number|null} Duration or null if not completed
   */
  getDuration() {
    if (!this.startTime) return null
    const endTime = this.endTime || Date.now()
    return endTime - this.startTime
  }

  /**
   * Get command status information
   * @returns {Object} Status object with detailed information
   */
  getStatus() {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      isExecuting: this.isExecuting,
      isCompleted: this.isCompleted,
      isCancelled: this.isCancelled,
      duration: this.getDuration(),
      result: this.result,
      error: this.error
    }
  }

  // ========================================
  // Hooks for subclasses to override
  // ========================================

  /**
   * Called before command execution starts
   * Override in subclasses for setup logic
   */
  async beforeExecute() {
    // Default implementation - no-op
  }

  /**
   * Main execution logic - MUST be implemented by subclasses
   * @returns {Promise<any>} Command result
   */
  async executeAsync() {
    throw new Error('executeAsync() must be implemented by subclass')
  }

  /**
   * Called after successful command execution
   * Override in subclasses for cleanup logic
   */
  async afterExecute() {
    // Default implementation - no-op
  }

  /**
   * Called when command execution encounters an error
   * @param {Error} error - The error that occurred
   */
  async onError(error) {
    console.error(`Command ${this.name} failed:`, error)
  }

  /**
   * Called when command is being cancelled
   * Override in subclasses for custom cancellation logic
   */
  async onCancel() {
    // Default implementation - no-op
  }
}

/**
 * Base class for commands that create geometry
 * Provides common functionality for geometry creation commands
 */
export class GeometryCommand extends CancelableCommand {
  constructor() {
    super()
    this.category = 'Geometry'
    this.createdObjects = []
  }

  /**
   * Add a created object to the tracking list
   * @param {VisualObject} object - The created visual object
   */
  addCreatedObject(object) {
    this.createdObjects.push(object)
    this.notifyPropertyChanged('createdObjects', [...this.createdObjects])
  }

  /**
   * Remove all created objects (for undo operations)
   */
  async removeCreatedObjects() {
    if (this.application && this.application.activeDocument) {
      for (const obj of this.createdObjects) {
        await this.application.activeDocument.removeNode(obj)
      }
    }
    this.createdObjects = []
  }

  async onCancel() {
    await super.onCancel()
    // Remove any objects created before cancellation
    await this.removeCreatedObjects()
  }
}

/**
 * Base class for commands that modify existing geometry
 */
export class ModificationCommand extends CancelableCommand {
  constructor() {
    super()
    this.category = 'Modify'
    this.originalStates = new Map()
    this.modifiedObjects = []
  }

  /**
   * Store the original state of an object before modification
   * @param {VisualObject} object - The object to track
   */
  storeOriginalState(object) {
    if (!this.originalStates.has(object)) {
      this.originalStates.set(object, {
        position: { ...object.position },
        rotation: { ...object.rotation },
        scale: { ...object.scale },
        properties: { ...object.properties }
      })
      this.modifiedObjects.push(object)
    }
  }

  /**
   * Restore objects to their original states (for undo)
   */
  async restoreOriginalStates() {
    for (const [object, state] of this.originalStates) {
      object.position = { ...state.position }
      object.rotation = { ...state.rotation }
      object.scale = { ...state.scale }
      Object.assign(object.properties, state.properties)

      // Notify that the object has been modified
      object.notifyPropertyChanged('position', object.position)
      object.notifyPropertyChanged('rotation', object.rotation)
      object.notifyPropertyChanged('scale', object.scale)
    }
  }

  async onCancel() {
    await super.onCancel()
    // Restore original states on cancellation
    await this.restoreOriginalStates()
  }
}

/**
 * Command execution result wrapper
 */
export class CommandResult {
  constructor(success = true, data = null, message = '') {
    this.success = success
    this.data = data
    this.message = message
    this.timestamp = Date.now()
  }

  static success(data, message = 'Command executed successfully') {
    return new CommandResult(true, data, message)
  }

  static error(message, data = null) {
    return new CommandResult(false, data, message)
  }

  static cancelled(message = 'Command cancelled by user') {
    return new CommandResult(false, null, message)
  }
}

