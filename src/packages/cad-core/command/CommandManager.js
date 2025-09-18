/**
 * Command Manager - Manages command execution, history, and queuing
 *
 * Features:
 * - Command registration and execution
 * - Command queue management
 * - History tracking for undo/redo
 * - Error handling and recovery
 * - Command cancellation
 */

import { Observable } from '../foundation/Observable.js'
import { ObservableCollection } from '../foundation/Collection.js'
import { History } from '../foundation/History.js'

/**
 * Manages the execution of commands in the CAD application
 */
export class CommandManager extends Observable {
  constructor(application) {
    super()

    this.application = application

    // Command registration
    this.registeredCommands = new Map()

    // Execution state
    this.currentCommand = null
    this.isExecuting = false

    // Command queue for sequential execution
    this.commandQueue = new ObservableCollection()
    this.isProcessingQueue = false

    // History for undo/redo operations
    this.history = new History()

    // Statistics
    this.executedCommandsCount = 0
    this.failedCommandsCount = 0

    // Event handlers
    this.setupEventHandlers()
  }

  /**
   * Register a command class with the manager
   * @param {string} commandId - Unique identifier for the command
   * @param {Class} CommandClass - Command class constructor
   * @param {Object} metadata - Additional metadata for the command
   */
  registerCommand(commandId, CommandClass, metadata = {}) {
    if (this.registeredCommands.has(commandId)) {
      console.warn(`Command ${commandId} is already registered. Overriding...`)
    }

    this.registeredCommands.set(commandId, {
      CommandClass,
      metadata: {
        name: metadata.name || commandId,
        description: metadata.description || '',
        category: metadata.category || 'General',
        icon: metadata.icon || null,
        shortcut: metadata.shortcut || null,
        ...metadata
      }
    })

    this.notifyPropertyChanged('registeredCommands', this.getRegisteredCommandsList())

    console.log(`Registered command: ${commandId}`)
  }

  /**
   * Get list of all registered commands
   * @returns {Array} List of registered command information
   */
  getRegisteredCommandsList() {
    return Array.from(this.registeredCommands.entries()).map(([id, info]) => ({
      id,
      ...info.metadata
    }))
  }

  /**
   * Create a command instance by ID
   * @param {string} commandId - The registered command ID
   * @param {Object} parameters - Parameters to pass to the command constructor
   * @returns {CancelableCommand} Command instance
   */
  createCommand(commandId, parameters = {}) {
    const commandInfo = this.registeredCommands.get(commandId)
    if (!commandInfo) {
      throw new Error(`Command ${commandId} is not registered`)
    }

    const command = new commandInfo.CommandClass()

    // Apply parameters to command
    Object.assign(command, parameters)

    return command
  }

  /**
   * Execute a command immediately
   * @param {string|CancelableCommand} commandOrId - Command ID or command instance
   * @param {Object} parameters - Parameters for command creation (if using ID)
   * @returns {Promise<any>} Command execution result
   */
  async executeCommand(commandOrId, parameters = {}) {
    let command

    if (typeof commandOrId === 'string') {
      command = this.createCommand(commandOrId, parameters)
    } else {
      command = commandOrId
    }

    if (this.isExecuting) {
      throw new Error('Another command is currently executing')
    }

    this.currentCommand = command
    this.isExecuting = true

    try {
      this.notifyPropertyChanged('currentCommand', command)
      this.notifyPropertyChanged('isExecuting', true)

      // Execute the command
      const result = await command.execute(this.application)

      // Add to history for undo/redo (only if command completed successfully)
      if (command.isCompleted && !command.isCancelled) {
        // Create a custom history record for command execution
        const commandHistoryRecord = {
          name: command.name,
          command: command,
          undo: () => this.undoCommand(command),
          redo: () => this.redoCommand(command),
          dispose: () => {
            // Clean up command resources if needed
            if (command.dispose) {
              command.dispose()
            }
          }
        }

        this.history.add(commandHistoryRecord)
      }

      this.executedCommandsCount++
      this.notifyPropertyChanged('executedCommandsCount', this.executedCommandsCount)

      console.log(`Command ${command.name} executed successfully`)
      return result

    } catch (error) {
      this.failedCommandsCount++
      this.notifyPropertyChanged('failedCommandsCount', this.failedCommandsCount)

      console.error(`Command ${command.name} failed:`, error)
      throw error

    } finally {
      this.currentCommand = null
      this.isExecuting = false
      this.notifyPropertyChanged('currentCommand', null)
      this.notifyPropertyChanged('isExecuting', false)

      // Process next command in queue if any
      this.processQueue()
    }
  }

  /**
   * Queue a command for execution
   * @param {string|CancelableCommand} commandOrId - Command ID or command instance
   * @param {Object} parameters - Parameters for command creation (if using ID)
   */
  queueCommand(commandOrId, parameters = {}) {
    let command

    if (typeof commandOrId === 'string') {
      command = this.createCommand(commandOrId, parameters)
    } else {
      command = commandOrId
    }

    this.commandQueue.add(command)

    // Start processing queue if not already processing
    if (!this.isProcessingQueue) {
      this.processQueue()
    }
  }

  /**
   * Process the command queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.commandQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true
    this.notifyPropertyChanged('isProcessingQueue', true)

    try {
      while (this.commandQueue.length > 0) {
        const command = this.commandQueue.get(0)
        this.commandQueue.removeAt(0)

        try {
          await this.executeCommand(command)
        } catch (error) {
          console.error('Queued command failed:', error)
          // Continue processing other commands in queue
        }
      }
    } finally {
      this.isProcessingQueue = false
      this.notifyPropertyChanged('isProcessingQueue', false)
    }
  }

  /**
   * Cancel the currently executing command
   */
  async cancelCurrentCommand() {
    if (this.currentCommand && this.isExecuting) {
      console.log(`Cancelling command: ${this.currentCommand.name}`)
      await this.currentCommand.cancel()
    }
  }

  /**
   * Clear the command queue
   */
  clearQueue() {
    this.commandQueue.clear()
    console.log('Command queue cleared')
  }

  /**
   * Undo the last executed command
   * @returns {boolean} True if undo was successful
   */
  async undo() {
    if (!this.canUndo()) {
      return false
    }

    try {
      await this.history.undo()
      console.log('Undo completed')
      return true
    } catch (error) {
      console.error('Undo failed:', error)
      return false
    }
  }

  /**
   * Redo the last undone command
   * @returns {boolean} True if redo was successful
   */
  async redo() {
    if (!this.canRedo()) {
      return false
    }

    try {
      await this.history.redo()
      console.log('Redo completed')
      return true
    } catch (error) {
      console.error('Redo failed:', error)
      return false
    }
  }

  /**
   * Check if undo is possible
   * @returns {boolean} True if undo is available
   */
  canUndo() {
    return this.history.canUndo()
  }

  /**
   * Check if redo is possible
   * @returns {boolean} True if redo is available
   */
  canRedo() {
    return this.history.canRedo()
  }

  /**
   * Get undo history information
   * @returns {Array} List of undoable operations
   */
  getUndoHistory() {
    return this.history.getUndoHistory()
  }

  /**
   * Get redo history information
   * @returns {Array} List of redoable operations
   */
  getRedoHistory() {
    return this.history.getRedoHistory()
  }

  /**
   * Handle redo operation for a command
   * @param {CancelableCommand} command - The command to redo
   */
  async redoCommand(command) {
    // For geometry commands, re-add created objects
    if (command.createdObjects && command.createdObjects.length > 0) {
      for (const obj of command.createdObjects) {
        await this.application.activeDocument.addNode(obj)
      }
    }

    // For modification commands, reapply modifications
    if (command.modifiedObjects && command.modifiedObjects.length > 0) {
      // The current state is already the modified state
      // Just ensure objects are properly updated
      for (const obj of command.modifiedObjects) {
        obj.notifyPropertyChanged('modified', true)
      }
    }
  }

  /**
   * Handle undo operation for a command
   * @param {CancelableCommand} command - The command to undo
   */
  async undoCommand(command) {
    // For geometry commands, remove created objects
    if (command.createdObjects && command.createdObjects.length > 0) {
      for (const obj of command.createdObjects) {
        await this.application.activeDocument.removeNode(obj)
      }
    }

    // For modification commands, restore original states
    if (command.restoreOriginalStates) {
      await command.restoreOriginalStates()
    }
  }

  /**
   * Get command manager statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      registeredCommands: this.registeredCommands.size,
      executedCommands: this.executedCommandsCount,
      failedCommands: this.failedCommandsCount,
      queuedCommands: this.commandQueue.length,
      isExecuting: this.isExecuting,
      isProcessingQueue: this.isProcessingQueue,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoHistorySize: this.getUndoHistory().length,
      redoHistorySize: this.getRedoHistory().length
    }
  }

  /**
   * Set up event handlers for internal state management
   */
  setupEventHandlers() {
    // Listen to history changes
    this.history.onPropertyChanged('canUndo', (canUndo) => {
      this.notifyPropertyChanged('canUndo', canUndo)
    })

    this.history.onPropertyChanged('canRedo', (canRedo) => {
      this.notifyPropertyChanged('canRedo', canRedo)
    })

    // Listen to queue changes
    this.commandQueue.onCollectionChanged(() => {
      this.notifyPropertyChanged('queueLength', this.commandQueue.length)
    })
  }

  /**
   * Dispose of the command manager and clean up resources
   */
  dispose() {
    // Cancel current command if executing
    if (this.currentCommand && this.isExecuting) {
      this.currentCommand.cancel()
    }

    // Clear queue
    this.clearQueue()

    // Clear history
    this.history.clear()

    // Clear registrations
    this.registeredCommands.clear()

    console.log('CommandManager disposed')
  }
}

export default CommandManager
