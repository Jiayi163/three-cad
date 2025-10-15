/**
 * CAD Commands Package - Entry Point
 *
 * This file exports all available commands and provides
 * utilities for command registration and management.
 */

// Import all command classes
import { BoxCommand } from './BoxCommand.js'
import { SphereCommand } from './SphereCommand.js'
import { CylinderCommand } from './CylinderCommand.js'
import { PlaneCommand } from './PlaneCommand.js'
import { ConeCommand } from './ConeCommand.js'
import { TorusCommand } from './TorusCommand.js'
import { LineCommand } from './LineCommand.js'
import { CircleCommand } from './CircleCommand.js'
import { RotateCommand } from './RotateCommand.js'
import { MoveCommand } from './MoveCommand.js'
import { ScaleCommand } from './ScaleCommand.js'
import { MirrorCommand } from './MirrorCommand.js'

// Export individual commands
export { BoxCommand } from './BoxCommand.js'
export { SphereCommand } from './SphereCommand.js'
export { CylinderCommand } from './CylinderCommand.js'
export { PlaneCommand } from './PlaneCommand.js'
export { ConeCommand } from './ConeCommand.js'
export { TorusCommand } from './TorusCommand.js'
export { LineCommand } from './LineCommand.js'
export { CircleCommand } from './CircleCommand.js'
export { RotateCommand } from './RotateCommand.js'
export { MoveCommand } from './MoveCommand.js'
export { ScaleCommand } from './ScaleCommand.js'
export { MirrorCommand } from './MirrorCommand.js'

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
  },

  'create-cylinder': {
    CommandClass: CylinderCommand,
    metadata: {
      name: 'Create Cylinder',
      description: 'Create a 3D cylinder with customizable dimensions',
      category: 'Geometry',
      icon: '🟠',
      shortcut: 'C',
      parameters: {
        radiusTop: { type: 'number', default: 1.0, min: 0.1, max: 50 },
        radiusBottom: { type: 'number', default: 1.0, min: 0.1, max: 50 },
        height: { type: 'number', default: 2.0, min: 0.1, max: 100 },
        radialSegments: { type: 'integer', default: 32, min: 3, max: 64 },
        heightSegments: { type: 'integer', default: 1, min: 1, max: 32 },
        color: { type: 'color', default: '#FF9800' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        wireframe: { type: 'boolean', default: false },
        metalness: { type: 'number', default: 0.0, min: 0, max: 1, step: 0.1 },
        roughness: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 },
        openEnded: { type: 'boolean', default: false }
      }
    }
  },

  'create-plane': {
    CommandClass: PlaneCommand,
    metadata: {
      name: 'Create Plane',
      description: 'Create a 3D plane with customizable dimensions',
      category: 'Geometry',
      icon: '🟣',
      shortcut: 'P',
      parameters: {
        width: { type: 'number', default: 2.0, min: 0.1, max: 100 },
        height: { type: 'number', default: 2.0, min: 0.1, max: 100 },
        widthSegments: { type: 'integer', default: 1, min: 1, max: 32 },
        heightSegments: { type: 'integer', default: 1, min: 1, max: 32 },
        color: { type: 'color', default: '#9C27B0' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        wireframe: { type: 'boolean', default: false },
        metalness: { type: 'number', default: 0.0, min: 0, max: 1, step: 0.1 },
        roughness: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 },
        side: { type: 'string', default: 'DoubleSide', options: ['FrontSide', 'BackSide', 'DoubleSide'] }
      }
    }
  },

  'create-cone': {
    CommandClass: ConeCommand,
    metadata: {
      name: 'Create Cone',
      description: 'Create a 3D cone with customizable dimensions',
      category: 'Geometry',
      icon: '🔺',
      shortcut: 'N',
      parameters: {
        radius: { type: 'number', default: 1.0, min: 0.1, max: 50 },
        height: { type: 'number', default: 2.0, min: 0.1, max: 100 },
        radialSegments: { type: 'integer', default: 32, min: 3, max: 64 },
        heightSegments: { type: 'integer', default: 1, min: 1, max: 32 },
        color: { type: 'color', default: '#E91E63' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        wireframe: { type: 'boolean', default: false },
        metalness: { type: 'number', default: 0.0, min: 0, max: 1, step: 0.1 },
        roughness: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 },
        openEnded: { type: 'boolean', default: false }
      }
    }
  },

  'create-torus': {
    CommandClass: TorusCommand,
    metadata: {
      name: 'Create Torus',
      description: 'Create a 3D torus with customizable dimensions',
      category: 'Geometry',
      icon: '🍩',
      shortcut: 'T',
      parameters: {
        radius: { type: 'number', default: 1.0, min: 0.1, max: 50 },
        tube: { type: 'number', default: 0.4, min: 0.05, max: 10 },
        radialSegments: { type: 'integer', default: 16, min: 3, max: 32 },
        tubularSegments: { type: 'integer', default: 100, min: 3, max: 200 },
        arc: { type: 'number', default: 6.28318, min: 0.1, max: 6.28318, step: 0.1 },
        color: { type: 'color', default: '#607D8B' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        wireframe: { type: 'boolean', default: false },
        metalness: { type: 'number', default: 0.0, min: 0, max: 1, step: 0.1 },
        roughness: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 }
      }
    }
  },

  'create-line': {
    CommandClass: LineCommand,
    metadata: {
      name: 'Create Line',
      description: 'Create a 3D line with multiple points',
      category: 'Geometry',
      icon: '📏',
      shortcut: 'L',
      parameters: {
        points: { type: 'array', default: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] },
        color: { type: 'color', default: '#00FF00' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        linewidth: { type: 'number', default: 1, min: 1, max: 10 }
      }
    }
  },

  'create-circle': {
    CommandClass: CircleCommand,
    metadata: {
      name: 'Create Circle',
      description: 'Create a 3D circle with customizable radius',
      category: 'Geometry',
      icon: '⭕',
      shortcut: 'O',
      parameters: {
        radius: { type: 'number', default: 1.0, min: 0.1, max: 50 },
        segments: { type: 'integer', default: 32, min: 3, max: 64 },
        thetaStart: { type: 'number', default: 0, min: 0, max: 6.28318, step: 0.1 },
        thetaLength: { type: 'number', default: 6.28318, min: 0.1, max: 6.28318, step: 0.1 },
        color: { type: 'color', default: '#FFEB3B' },
        opacity: { type: 'number', default: 1.0, min: 0, max: 1, step: 0.1 },
        wireframe: { type: 'boolean', default: false },
        metalness: { type: 'number', default: 0.0, min: 0, max: 1, step: 0.1 },
        roughness: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1 }
      }
    }
  },


  'rotate-objects': {
    CommandClass: RotateCommand,
    metadata: {
      name: 'Rotate Objects',
      description: 'Rotate selected objects around a specified axis',
      category: 'Transform',
      icon: '🔄',
      shortcut: 'R',
      parameters: {
        rotationAxis: {
          type: 'string',
          default: 'y',
          options: ['x', 'y', 'z', 'custom'],
          description: 'Rotation axis (X, Y, Z, or custom)'
        },
        rotationAngleDegrees: {
          type: 'number',
          default: 90,
          min: -360,
          max: 360,
          step: 1,
          description: 'Rotation angle in degrees'
        },
        useObjectCenter: {
          type: 'boolean',
          default: true,
          description: 'Use object center as rotation center'
        },
        rotationCenter: {
          type: 'object',
          default: { x: 0, y: 0, z: 0 },
          description: 'Custom rotation center point'
        },
        isInteractive: {
          type: 'boolean',
          default: false,
          description: 'Enable interactive rotation mode'
        }
      }
    }
  },

  'move-objects': {
    CommandClass: MoveCommand,
    metadata: {
      name: 'Move Objects',
      description: 'Move selected objects to a new location',
      category: 'Transform',
      icon: '⬆️',
      shortcut: 'M',
      parameters: {
        moveVector: {
          type: 'object',
          default: { x: 0, y: 0, z: 0 },
          description: 'Move offset vector'
        },
        useCurrentPosition: {
          type: 'boolean',
          default: true,
          description: 'Use current position as base point'
        },
        basePoint: {
          type: 'object',
          default: { x: 0, y: 0, z: 0 },
          description: 'Base point for move operation'
        },
        isInteractive: {
          type: 'boolean',
          default: false,
          description: 'Enable interactive move mode'
        }
      }
    }
  },

  'scale-objects': {
    CommandClass: ScaleCommand,
    metadata: {
      name: 'Scale Objects',
      description: 'Scale selected objects by a specified factor',
      category: 'Transform',
      icon: '🔍',
      shortcut: 'S',
      parameters: {
        scaleFactor: {
          type: 'object',
          default: { x: 1, y: 1, z: 1 },
          description: 'Scale factors for X, Y, Z axes'
        },
        uniformScale: {
          type: 'boolean',
          default: false,
          description: 'Use uniform scaling (same factor for all axes) - default is non-uniform for XYZ stretching'
        },
        useObjectCenter: {
          type: 'boolean',
          default: true,
          description: 'Use object center as scale center'
        },
        scaleCenter: {
          type: 'object',
          default: { x: 0, y: 0, z: 0 },
          description: 'Custom scale center point'
        },
        isInteractive: {
          type: 'boolean',
          default: false,
          description: 'Enable interactive scale mode'
        }
      }
    }
  },

  'mirror-objects': {
    CommandClass: MirrorCommand,
    metadata: {
      name: 'Mirror Objects',
      description: 'Mirror selected objects across a specified axis or plane',
      category: 'Transform',
      icon: '🪞',
      shortcut: 'I',
      parameters: {
        axis: {
          type: 'string',
          default: 'x',
          options: ['x', 'y', 'z', 'custom'],
          description: 'Mirror axis (X, Y, Z, or custom plane)'
        },
        createCopy: {
          type: 'boolean',
          default: false,
          description: 'Create mirrored copy instead of modifying original'
        },
        center: {
          type: 'object',
          default: { x: 0, y: 0, z: 0 },
          description: 'Mirror center point'
        }
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
