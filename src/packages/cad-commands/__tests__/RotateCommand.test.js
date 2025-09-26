/**
 * RotateCommand Tests
 *
 * Tests for the interactive rotation command functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RotateCommand } from '../RotateCommand.js'
import { CommandResult } from '../../cad-core/command/Command.js'

// Mock Three.js
vi.mock('three', () => ({
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x
      this.y = y
      this.z = z
    }

    clone() {
      return new Vector3(this.x, this.y, this.z)
    }

    normalize() {
      const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
      if (length > 0) {
        this.x /= length
        this.y /= length
        this.z /= length
      }
      return this
    }

    add(vector) {
      this.x += vector.x
      this.y += vector.y
      this.z += vector.z
      return this
    }

    sub(vector) {
      this.x -= vector.x
      this.y -= vector.y
      this.z -= vector.z
      return this
    }

    divideScalar(scalar) {
      this.x /= scalar
      this.y /= scalar
      this.z /= scalar
      return this
    }

    applyAxisAngle(axis, angle) {
      // Simplified rotation for testing
      if (axis.y === 1 && axis.x === 0 && axis.z === 0) {
        // Y-axis rotation
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const x = this.x * cos - this.z * sin
        const z = this.x * sin + this.z * cos
        this.x = x
        this.z = z
      }
      return this
    }
  }
}))

describe('RotateCommand', () => {
  let rotateCommand
  let mockApplication
  let mockDocument
  let mockVisualObject

  beforeEach(() => {
    // Create mock visual object
    mockVisualObject = {
      position: { x: 1, y: 0, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      notifyPropertyChanged: vi.fn()
    }

    // Create mock document
    mockDocument = {
      selectedNodes: {
        items: [
          {
            name: 'TestObject',
            visualObject: mockVisualObject
          }
        ]
      }
    }

    // Create mock application
    mockApplication = {
      activeDocument: mockDocument
    }

    // Create command instance
    rotateCommand = new RotateCommand()
  })

  describe('Constructor and Configuration', () => {
    it('should initialize with default values', () => {
      expect(rotateCommand.name).toBe('RotateObjects')
      expect(rotateCommand.category).toBe('Transform')
      expect(rotateCommand.rotationAxis).toBe('y')
      expect(rotateCommand.rotationAngle).toBe(0)
      expect(rotateCommand.useObjectCenter).toBe(true)
    })

    it('should set rotation axis correctly', () => {
      rotateCommand.setRotationAxis('x')
      expect(rotateCommand.rotationAxis).toBe('x')

      rotateCommand.setRotationAxis('z')
      expect(rotateCommand.rotationAxis).toBe('z')
    })

    it('should throw error for invalid rotation axis', () => {
      expect(() => {
        rotateCommand.setRotationAxis('invalid')
      }).toThrow('Invalid rotation axis: invalid')
    })

    it('should set rotation angle in degrees', () => {
      rotateCommand.setRotationAngle(45)
      expect(rotateCommand.rotationAngle).toBeCloseTo(Math.PI / 4)

      rotateCommand.setRotationAngle(90)
      expect(rotateCommand.rotationAngle).toBeCloseTo(Math.PI / 2)
    })

    it('should set rotation angle in radians', () => {
      rotateCommand.setRotationAngleRadians(Math.PI)
      expect(rotateCommand.rotationAngle).toBeCloseTo(Math.PI)
    })

    it('should set rotation center', () => {
      const center = { x: 5, y: 2, z: 3 }
      rotateCommand.setRotationCenter(center)

      expect(rotateCommand.rotationCenter).toEqual(center)
      expect(rotateCommand.useObjectCenter).toBe(false)
    })
  })

  describe('Parameter Management', () => {
    it('should get parameters correctly', () => {
      rotateCommand.setRotationAxis('x')
      rotateCommand.setRotationAngle(45)

      const params = rotateCommand.getParameters()

      expect(params.rotationAxis).toBe('x')
      expect(params.rotationAngleDegrees).toBe(45)
      expect(params.useObjectCenter).toBe(true)
    })

    it('should set parameters correctly', () => {
      const params = {
        rotationAxis: 'z',
        rotationAngleDegrees: 180,
        useObjectCenter: false,
        rotationCenter: { x: 1, y: 2, z: 3 }
      }

      rotateCommand.setParameters(params)

      expect(rotateCommand.rotationAxis).toBe('z')
      expect(rotateCommand.rotationAngle).toBeCloseTo(Math.PI)
      expect(rotateCommand.useObjectCenter).toBe(false)
      expect(rotateCommand.rotationCenter).toEqual({ x: 1, y: 2, z: 3 })
    })
  })

  describe('Rotation Transformations', () => {
    it('should calculate objects center correctly', () => {
      const nodes = [
        { visualObject: { position: { x: 0, y: 0, z: 0 } } },
        { visualObject: { position: { x: 2, y: 0, z: 2 } } }
      ]

      const center = rotateCommand.calculateObjectsCenter(nodes)

      expect(center.x).toBe(1)
      expect(center.y).toBe(0)
      expect(center.z).toBe(1)
    })

    it('should get rotation axis vector correctly', () => {
      rotateCommand.setRotationAxis('x')
      const axis = rotateCommand.getRotationAxisVector()
      expect(axis.x).toBe(1)
      expect(axis.y).toBe(0)
      expect(axis.z).toBe(0)

      rotateCommand.setRotationAxis('y')
      const axisY = rotateCommand.getRotationAxisVector()
      expect(axisY.x).toBe(0)
      expect(axisY.y).toBe(1)
      expect(axisY.z).toBe(0)
    })
  })

  describe('Command Execution', () => {
    it('should throw error when no document available', async () => {
      rotateCommand.application = { activeDocument: null }

      await expect(rotateCommand.executeAsync()).rejects.toThrow('No active document available')
    })

    it('should throw error when no objects selected', async () => {
      mockDocument.selectedNodes.items = []
      rotateCommand.application = mockApplication

      await expect(rotateCommand.executeAsync()).rejects.toThrow('No objects selected for rotation')
    })

    it('should rotate object around Y-axis', async () => {
      rotateCommand.application = mockApplication
      rotateCommand.setRotationAngle(90) // 90 degrees
      rotateCommand.setRotationAxis('y')

      const result = await rotateCommand.executeAsync()

      expect(result).toBeInstanceOf(CommandResult)
      expect(result.success).toBe(true)
      expect(result.data.resultCount).toBe(1)
      expect(result.data.axis).toBe('y')
      expect(result.data.angleDegrees).toBe(90)

      // Check that rotation was applied
      expect(mockVisualObject.rotation.y).toBeCloseTo(Math.PI / 2)
    })

    it('should rotate object around X-axis', async () => {
      rotateCommand.application = mockApplication
      rotateCommand.setRotationAngle(45)
      rotateCommand.setRotationAxis('x')

      const result = await rotateCommand.executeAsync()

      expect(result.success).toBe(true)
      expect(mockVisualObject.rotation.x).toBeCloseTo(Math.PI / 4)
    })

    it('should store and restore original transforms', async () => {
      rotateCommand.application = mockApplication

      const originalPosition = { ...mockVisualObject.position }
      const originalRotation = { ...mockVisualObject.rotation }

      // Store original transforms
      rotateCommand.storeOriginalTransforms([mockDocument.selectedNodes.items[0]])

      // Modify the object
      mockVisualObject.position.x = 999
      mockVisualObject.rotation.y = 999

      // Restore
      await rotateCommand.restoreOriginalTransforms()

      expect(mockVisualObject.position.x).toBe(originalPosition.x)
      expect(mockVisualObject.rotation.y).toBe(originalRotation.y)
    })
  })

  describe('Static Factory Methods', () => {
    it('should create X-axis rotation command', () => {
      const command = RotateCommand.rotateAroundX(45)
      expect(command.rotationAxis).toBe('x')
      expect(command.rotationAngle).toBeCloseTo(Math.PI / 4)
    })

    it('should create Y-axis rotation command', () => {
      const command = RotateCommand.rotateAroundY(90)
      expect(command.rotationAxis).toBe('y')
      expect(command.rotationAngle).toBeCloseTo(Math.PI / 2)
    })

    it('should create Z-axis rotation command', () => {
      const command = RotateCommand.rotateAroundZ(180)
      expect(command.rotationAxis).toBe('z')
      expect(command.rotationAngle).toBeCloseTo(Math.PI)
    })

    it('should create 90-degree Y rotation command', () => {
      const command = RotateCommand.rotate90DegreesY()
      expect(command.rotationAxis).toBe('y')
      expect(command.rotationAngle).toBeCloseTo(Math.PI / 2)
    })
  })

  describe('Status and Cleanup', () => {
    it('should provide status messages', () => {
      const message = rotateCommand.getStatusMessage()
      expect(message).toBe('Select rotation axis (X, Y, Z) or specify custom axis')
    })

    it('should handle cancellation', async () => {
      rotateCommand.application = mockApplication

      // Store original transforms
      rotateCommand.storeOriginalTransforms([mockDocument.selectedNodes.items[0]])

      // Modify object
      mockVisualObject.rotation.y = 999

      // Cancel should restore
      await rotateCommand.onCancel()

      expect(mockVisualObject.rotation.y).toBe(0)
    })

    it('should dispose resources', () => {
      rotateCommand.previewObjects.set('test', {})
      rotateCommand.originalTransforms.set('test', {})

      rotateCommand.dispose()

      expect(rotateCommand.previewObjects.size).toBe(0)
      expect(rotateCommand.originalTransforms.size).toBe(0)
    })
  })
})
