/**
 * Command System Tests
 *
 * Tests for the command infrastructure including:
 * - Command base classes
 * - CommandManager functionality
 * - Command execution and cancellation
 * - Undo/Redo operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CancelableCommand, GeometryCommand, CommandResult } from '../Command.js'
import { CommandManager } from '../CommandManager.js'
import { CADApplication } from '../../application/CADApplication.js'
import { Document } from '../../application/Document.js'

// Mock command for testing
class TestCommand extends CancelableCommand {
  constructor() {
    super()
    this.name = 'TestCommand'
    this.description = 'A test command'
    this.executionDelay = 0
    this.shouldFail = false
  }

  async executeAsync() {
    if (this.executionDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.executionDelay))
    }

    if (this.shouldFail) {
      throw new Error('Test command failed intentionally')
    }

    return CommandResult.success({ message: 'Test command executed successfully' })
  }
}

// Mock geometry command for testing
class TestGeometryCommand extends GeometryCommand {
  constructor() {
    super()
    this.name = 'TestGeometryCommand'
    this.description = 'A test geometry command'
  }

  async executeAsync() {
    // Simulate creating a visual object
    const mockObject = {
      id: 'test-object-' + Date.now(),
      name: 'Test Object',
      type: 'test'
    }

    // Track the created object
    this.addCreatedObject(mockObject)

    return CommandResult.success(mockObject, 'Test geometry created')
  }
}

describe('CancelableCommand', () => {
  let command
  let mockApplication

  beforeEach(() => {
    command = new TestCommand()
    mockApplication = {
      activeDocument: {
        addNode: vi.fn(),
        removeNode: vi.fn()
      }
    }
  })

  it('should initialize with correct default state', () => {
    expect(command.isCompleted).toBe(false)
    expect(command.isCancelled).toBe(false)
    expect(command.isExecuting).toBe(false)
    expect(command.application).toBe(null)
    expect(command.result).toBe(null)
    expect(command.error).toBe(null)
    expect(command.name).toBe('TestCommand')
  })

  it('should execute successfully', async () => {
    const result = await command.execute(mockApplication)

    expect(command.isCompleted).toBe(true)
    expect(command.isExecuting).toBe(false)
    expect(command.isCancelled).toBe(false)
    expect(command.application).toBe(mockApplication)
    expect(result.success).toBe(true)
    expect(result.data.message).toBe('Test command executed successfully')
    expect(command.getDuration()).toBeGreaterThan(0)
  })

  it('should handle execution errors', async () => {
    command.shouldFail = true

    await expect(command.execute(mockApplication)).rejects.toThrow('Test command failed intentionally')

    expect(command.isCompleted).toBe(false)
    expect(command.isExecuting).toBe(false)
    expect(command.error).toBeInstanceOf(Error)
    expect(command.error.message).toBe('Test command failed intentionally')
  })

  it('should prevent double execution', async () => {
    const promise1 = command.execute(mockApplication)

    await expect(command.execute(mockApplication)).rejects.toThrow('Command TestCommand is already executing')

    await promise1 // Clean up
  })

  it('should prevent re-execution of completed command', async () => {
    await command.execute(mockApplication)

    await expect(command.execute(mockApplication)).rejects.toThrow('Command TestCommand has already been completed')
  })

  it('should support cancellation', async () => {
    command.executionDelay = 100

    const executePromise = command.execute(mockApplication)

    // Cancel after a short delay
    setTimeout(() => command.cancel(), 10)

    await expect(executePromise).rejects.toThrow()
    expect(command.isCancelled).toBe(true)
  })

  it('should provide status information', async () => {
    const initialStatus = command.getStatus()
    expect(initialStatus.isExecuting).toBe(false)
    expect(initialStatus.isCompleted).toBe(false)
    expect(initialStatus.name).toBe('TestCommand')

    await command.execute(mockApplication)

    const finalStatus = command.getStatus()
    expect(finalStatus.isCompleted).toBe(true)
    expect(finalStatus.duration).toBeGreaterThan(0)
    expect(finalStatus.result).toBeDefined()
  })
})

describe('GeometryCommand', () => {
  let command
  let mockApplication

  beforeEach(() => {
    command = new TestGeometryCommand()
    mockApplication = {
      activeDocument: {
        addNode: vi.fn(),
        removeNode: vi.fn()
      }
    }
  })

  it('should track created objects', async () => {
    expect(command.createdObjects).toHaveLength(0)

    const result = await command.execute(mockApplication)

    expect(command.createdObjects).toHaveLength(1)
    expect(command.createdObjects[0].name).toBe('Test Object')
    expect(result.success).toBe(true)
  })

  it('should remove created objects on cancellation', async () => {
    command.executionDelay = 100

    const executePromise = command.execute(mockApplication)

    // Cancel after objects might be created
    setTimeout(() => command.cancel(), 10)

    try {
      await executePromise
    } catch (error) {
      // Expected to fail due to cancellation
    }

    // Should have attempted to remove created objects
    expect(mockApplication.activeDocument.removeNode).toHaveBeenCalled()
  })
})

describe('CommandManager', () => {
  let commandManager
  let mockApplication

  beforeEach(() => {
    mockApplication = new CADApplication()
    commandManager = new CommandManager(mockApplication)
  })

  afterEach(() => {
    commandManager.dispose()
  })

  it('should register commands correctly', () => {
    commandManager.registerCommand('test-command', TestCommand, {
      name: 'Test Command',
      description: 'A test command',
      category: 'Test'
    })

    const registeredCommands = commandManager.getRegisteredCommandsList()
    expect(registeredCommands).toHaveLength(1)
    expect(registeredCommands[0].id).toBe('test-command')
    expect(registeredCommands[0].name).toBe('Test Command')
  })

  it('should create command instances', () => {
    commandManager.registerCommand('test-command', TestCommand)

    const command = commandManager.createCommand('test-command')
    expect(command).toBeInstanceOf(TestCommand)
    expect(command.name).toBe('TestCommand')
  })

  it('should execute commands', async () => {
    commandManager.registerCommand('test-command', TestCommand)

    const result = await commandManager.executeCommand('test-command')

    expect(result.success).toBe(true)
    expect(result.data.message).toBe('Test command executed successfully')
    expect(commandManager.executedCommandsCount).toBe(1)
  })

  it('should handle command execution errors', async () => {
    commandManager.registerCommand('test-command', TestCommand)

    await expect(
      commandManager.executeCommand('test-command', { shouldFail: true })
    ).rejects.toThrow('Test command failed intentionally')

    expect(commandManager.failedCommandsCount).toBe(1)
  })

  it('should queue commands for execution', async () => {
    commandManager.registerCommand('test-command', TestCommand)

    // Queue multiple commands
    commandManager.queueCommand('test-command')
    commandManager.queueCommand('test-command')
    commandManager.queueCommand('test-command')

    expect(commandManager.commandQueue.length).toBe(3)

    // Wait for queue to process
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(commandManager.commandQueue.length).toBe(0)
    expect(commandManager.executedCommandsCount).toBe(3)
  })

  it('should support undo/redo operations', async () => {
    commandManager.registerCommand('test-geometry', TestGeometryCommand)

    // Execute a command
    await commandManager.executeCommand('test-geometry')

    expect(commandManager.canUndo()).toBe(true)
    expect(commandManager.canRedo()).toBe(false)

    // Undo the command
    const undoResult = await commandManager.undo()
    expect(undoResult).toBe(true)

    expect(commandManager.canUndo()).toBe(false)
    expect(commandManager.canRedo()).toBe(true)

    // Redo the command
    const redoResult = await commandManager.redo()
    expect(redoResult).toBe(true)

    expect(commandManager.canUndo()).toBe(true)
    expect(commandManager.canRedo()).toBe(false)
  })

  it('should provide statistics', () => {
    commandManager.registerCommand('test-command', TestCommand)

    const stats = commandManager.getStatistics()
    expect(stats.registeredCommands).toBe(1)
    expect(stats.executedCommands).toBe(0)
    expect(stats.failedCommands).toBe(0)
    expect(stats.isExecuting).toBe(false)
  })

  it('should clear command queue', () => {
    commandManager.registerCommand('test-command', TestCommand)

    commandManager.queueCommand('test-command')
    commandManager.queueCommand('test-command')

    expect(commandManager.commandQueue.length).toBe(2)

    commandManager.clearQueue()

    expect(commandManager.commandQueue.length).toBe(0)
  })
})

describe('CommandResult', () => {
  it('should create success results', () => {
    const result = CommandResult.success({ value: 42 }, 'Operation completed')

    expect(result.success).toBe(true)
    expect(result.data.value).toBe(42)
    expect(result.message).toBe('Operation completed')
    expect(result.timestamp).toBeGreaterThan(0)
  })

  it('should create error results', () => {
    const result = CommandResult.error('Operation failed', { errorCode: 500 })

    expect(result.success).toBe(false)
    expect(result.data.errorCode).toBe(500)
    expect(result.message).toBe('Operation failed')
    expect(result.timestamp).toBeGreaterThan(0)
  })
})
