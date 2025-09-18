/**
 * CAD Commands Package - Entry Point
 *
 * This file exports all available commands and provides
 * utilities for command registration and management.
 */

// Import all command classes
import { BoxCommand } from './BoxCommand.js'
import { SphereCommand } from './SphereCommand.js'

// Export individual commands
export { BoxCommand } from './BoxCommand.js'
export { SphereCommand } from './SphereCommand.js'

/**
 * Registry of all available commands with their metadata
 */
export const COMMAND_REGISTRY = {
  'create-box': {
    CommandClass: BoxCommand,
    metadata: {
      name: 'Create Box',
      description: 'Create a 3D box with customizable dimensions',
      category: 'Geometry',
      icon: '🟦',
      shortcut: 'B',
      parameters: {
        width: { type: 'number', default: 2, min: 0.1, max: 100 },
        height: { type: 'number', default: 2, min: 0.1, max: 100 },
        depth: { type: 'number', default: 2, min: 0.1, max: 100 },
        color: { type: 'color', default: '#4CAF50' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        wireframe: { type: 'boolean', default: false }
      }
    }
  },

  'create-sphere': {
    CommandClass: SphereCommand,
    metadata: {
      name: 'Create Sphere',
      description: 'Create a 3D sphere with customizable radius and quality',
      category: 'Geometry',
      icon: '🔵',
      shortcut: 'S',
      parameters: {
        radius: { type: 'number', default: 1.0, min: 0.1, max: 50 },
        widthSegments: { type: 'integer', default: 32, min: 3, max: 64 },
        heightSegments: { type: 'integer', default: 16, min: 2, max: 32 },
        color: { type: 'color', default: '#2196F3' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        wireframe: { type: 'boolean', default: false },
        metalness: { type: 'number', default: 0.0, min: 0, max: 1, step: 0.1 },
        roughness: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 }
      }
    }
  }
}

/**
 * Get all available command IDs
 * @returns {string[]} Array of command IDs
 */
export function getAvailableCommands() {
  return Object.keys(COMMAND_REGISTRY)
}

/**
 * Get command metadata by ID
 * @param {string} commandId - The command ID
 * @returns {Object|null} Command metadata or null if not found
 */
export function getCommandMetadata(commandId) {
  const entry = COMMAND_REGISTRY[commandId]
  return entry ? entry.metadata : null
}

/**
 * Get command class by ID
 * @param {string} commandId - The command ID
 * @returns {Class|null} Command class or null if not found
 */
export function getCommandClass(commandId) {
  const entry = COMMAND_REGISTRY[commandId]
  return entry ? entry.CommandClass : null
}

/**
 * Get commands by category
 * @param {string} category - The category to filter by
 * @returns {Object} Object with command IDs as keys and metadata as values
 */
export function getCommandsByCategory(category) {
  const result = {}

  for (const [commandId, entry] of Object.entries(COMMAND_REGISTRY)) {
    if (entry.metadata.category === category) {
      result[commandId] = entry.metadata
    }
  }

  return result
}

/**
 * Get all available categories
 * @returns {string[]} Array of unique categories
 */
export function getCategories() {
  const categories = new Set()

  for (const entry of Object.values(COMMAND_REGISTRY)) {
    categories.add(entry.metadata.category)
  }

  return Array.from(categories).sort()
}

/**
 * Register all commands with a command manager
 * @param {CommandManager} commandManager - The command manager instance
 */
export function registerAllCommands(commandManager) {
  for (const [commandId, entry] of Object.entries(COMMAND_REGISTRY)) {
    commandManager.registerCommand(commandId, entry.CommandClass, entry.metadata)
  }

  console.log(`Registered ${Object.keys(COMMAND_REGISTRY).length} commands`)
}

/**
 * Create a command instance by ID with parameters
 * @param {string} commandId - The command ID
 * @param {Object} parameters - Parameters to apply to the command
 * @returns {CancelableCommand|null} Command instance or null if not found
 */
export function createCommand(commandId, parameters = {}) {
  const CommandClass = getCommandClass(commandId)

  if (!CommandClass) {
    console.error(`Command ${commandId} not found`)
    return null
  }

  const command = new CommandClass()

  // Apply parameters
  Object.assign(command, parameters)

  return command
}

/**
 * Validate command parameters against metadata
 * @param {string} commandId - The command ID
 * @param {Object} parameters - Parameters to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateCommandParameters(commandId, parameters) {
  const metadata = getCommandMetadata(commandId)

  if (!metadata || !metadata.parameters) {
    return { valid: true, errors: [] }
  }

  const errors = []

  for (const [paramName, paramDef] of Object.entries(metadata.parameters)) {
    const value = parameters[paramName]

    // Check required parameters (if not specified, all are optional)
    if (paramDef.required && (value === undefined || value === null)) {
      errors.push(`Parameter '${paramName}' is required`)
      continue
    }

    // Skip validation if parameter is not provided and not required
    if (value === undefined || value === null) {
      continue
    }

    // Type validation
    switch (paramDef.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Parameter '${paramName}' must be a number`)
        } else {
          if (paramDef.min !== undefined && value < paramDef.min) {
            errors.push(`Parameter '${paramName}' must be >= ${paramDef.min}`)
          }
          if (paramDef.max !== undefined && value > paramDef.max) {
            errors.push(`Parameter '${paramName}' must be <= ${paramDef.max}`)
          }
        }
        break

      case 'integer':
        if (!Number.isInteger(value)) {
          errors.push(`Parameter '${paramName}' must be an integer`)
        } else {
          if (paramDef.min !== undefined && value < paramDef.min) {
            errors.push(`Parameter '${paramName}' must be >= ${paramDef.min}`)
          }
          if (paramDef.max !== undefined && value > paramDef.max) {
            errors.push(`Parameter '${paramName}' must be <= ${paramDef.max}`)
          }
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Parameter '${paramName}' must be a boolean`)
        }
        break

      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter '${paramName}' must be a string`)
        }
        break

      case 'color':
        if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          errors.push(`Parameter '${paramName}' must be a valid hex color (e.g., #FF0000)`)
        }
        break
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export default {
  COMMAND_REGISTRY,
  getAvailableCommands,
  getCommandMetadata,
  getCommandClass,
  getCommandsByCategory,
  getCategories,
  registerAllCommands,
  createCommand,
  validateCommandParameters
}
