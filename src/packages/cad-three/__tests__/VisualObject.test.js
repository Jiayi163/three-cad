/**
 * Tests for VisualObject base class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as THREE from 'three'
import { VisualObject } from '../VisualObject.js'

// Create a test implementation of VisualObject
class TestVisualObject extends VisualObject {
  constructor(nodeId = null) {
    super(nodeId)
    this._type = 'TestVisualObject'
    this.setProperty('type', this._type)
  }
  
  async create(options = {}) {
    if (this._object3D) {
      return this._object3D
    }
    
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    this._geometry = geometry
    this._material = this.createMaterial('default')
    this._object3D = new THREE.Mesh(geometry, this._material)
    this._object3D.userData.visualObject = this
    this._object3D.userData.nodeId = this._nodeId
    
    return this._object3D
  }
}

describe('VisualObject', () => {
  let visualObject
  
  beforeEach(() => {
    visualObject = new TestVisualObject('test-node-1')
  })
  
  afterEach(() => {
    if (visualObject && !visualObject.disposed) {
      visualObject.dispose()
    }
  })
  
  describe('Construction', () => {
    it('should create a VisualObject with correct properties', () => {
      expect(visualObject.nodeId).toBe('test-node-1')
      expect(visualObject.id).toBeDefined()
      expect(visualObject.type).toBe('TestVisualObject')
      expect(visualObject.name).toContain('TestVisualObject_')
      expect(visualObject.visible).toBe(true)
      expect(visualObject.selected).toBe(false)
      expect(visualObject.highlighted).toBe(false)
      expect(visualObject.opacity).toBe(1.0)
    })
    
    it('should generate unique IDs', () => {
      const obj1 = new TestVisualObject('node-1')
      const obj2 = new TestVisualObject('node-2')
      
      expect(obj1.id).not.toBe(obj2.id)
      
      obj1.dispose()
      obj2.dispose()
    })
    
    it('should initialize properties correctly', () => {
      expect(visualObject.getProperty('id')).toBe(visualObject.id)
      expect(visualObject.getProperty('nodeId')).toBe(visualObject.nodeId)
      expect(visualObject.getProperty('type')).toBe(visualObject.type)
      expect(visualObject.getProperty('visible')).toBe(true)
    })
  })
  
  describe('Property Management', () => {
    it('should update name property', () => {
      const newName = 'Custom Test Object'
      visualObject.name = newName
      
      expect(visualObject.name).toBe(newName)
      expect(visualObject.getProperty('name')).toBe(newName)
    })
    
    it('should update visibility', () => {
      visualObject.visible = false
      
      expect(visualObject.visible).toBe(false)
      expect(visualObject.getProperty('visible')).toBe(false)
    })
    
    it('should update selection state', () => {
      visualObject.selected = true
      
      expect(visualObject.selected).toBe(true)
      expect(visualObject.getProperty('selected')).toBe(true)
    })
    
    it('should update highlight state', () => {
      visualObject.highlighted = true
      
      expect(visualObject.highlighted).toBe(true)
      expect(visualObject.getProperty('highlighted')).toBe(true)
    })
    
    it('should clamp opacity between 0 and 1', () => {
      visualObject.opacity = -0.5
      expect(visualObject.opacity).toBe(0)
      
      visualObject.opacity = 1.5
      expect(visualObject.opacity).toBe(1)
      
      visualObject.opacity = 0.5
      expect(visualObject.opacity).toBe(0.5)
    })
  })
  
  describe('Transform Properties', () => {
    it('should update position', () => {
      const newPosition = { x: 1, y: 2, z: 3 }
      visualObject.position = newPosition
      
      expect(visualObject.position.x).toBe(1)
      expect(visualObject.position.y).toBe(2)
      expect(visualObject.position.z).toBe(3)
    })
    
    it('should accept Vector3 for position', () => {
      const vector = new THREE.Vector3(4, 5, 6)
      visualObject.position = vector
      
      expect(visualObject.position.x).toBe(4)
      expect(visualObject.position.y).toBe(5)
      expect(visualObject.position.z).toBe(6)
    })
    
    it('should update rotation', () => {
      const newRotation = { x: Math.PI, y: Math.PI / 2, z: 0 }
      visualObject.rotation = newRotation
      
      expect(visualObject.rotation.x).toBe(Math.PI)
      expect(visualObject.rotation.y).toBe(Math.PI / 2)
      expect(visualObject.rotation.z).toBe(0)
    })
    
    it('should update scale', () => {
      visualObject.scale = 2
      
      expect(visualObject.scale.x).toBe(2)
      expect(visualObject.scale.y).toBe(2)
      expect(visualObject.scale.z).toBe(2)
    })
    
    it('should update scale with object', () => {
      const newScale = { x: 1, y: 2, z: 3 }
      visualObject.scale = newScale
      
      expect(visualObject.scale.x).toBe(1)
      expect(visualObject.scale.y).toBe(2)
      expect(visualObject.scale.z).toBe(3)
    })
  })
  
  describe('Material Management', () => {
    it('should create default material', () => {
      const material = visualObject.createMaterial('default')
      
      expect(material).toBeInstanceOf(THREE.Material)
      expect(material.color.getHex()).toBe(0x888888)
    })
    
    it('should create selected material', () => {
      const material = visualObject.createMaterial('selected')
      
      expect(material).toBeInstanceOf(THREE.Material)
      expect(material.color.getHex()).toBe(0xff0000)
    })
    
    it('should create highlighted material', () => {
      const material = visualObject.createMaterial('highlighted')
      
      expect(material).toBeInstanceOf(THREE.Material)
      expect(material.color.getHex()).toBe(0x0088ff)
    })
    
    it('should cache materials', () => {
      const material1 = visualObject.createMaterial('default')
      const material2 = visualObject.createMaterial('default')
      
      expect(material1).toBe(material2)
    })
    
    it('should allow custom material config', () => {
      visualObject.setMaterialConfig('custom', {
        color: 0x00ff00,
        metalness: 0.5,
        roughness: 0.2
      })
      
      const material = visualObject.createMaterial('custom')
      expect(material.color.getHex()).toBe(0x00ff00)
    })
  })
  
  describe('Three.js Integration', () => {
    it('should create Three.js object', async () => {
      const object3D = await visualObject.create()
      
      expect(object3D).toBeInstanceOf(THREE.Object3D)
      expect(visualObject.object3D).toBe(object3D)
      expect(visualObject.geometry).toBeInstanceOf(THREE.BufferGeometry)
      expect(visualObject.material).toBeInstanceOf(THREE.Material)
    })
    
    it('should set userData correctly', async () => {
      const object3D = await visualObject.create()
      
      expect(object3D.userData.visualObject).toBe(visualObject)
      expect(object3D.userData.nodeId).toBe(visualObject.nodeId)
    })
    
    it('should apply transforms to Three.js object', async () => {
      visualObject.position = { x: 1, y: 2, z: 3 }
      visualObject.rotation = { x: Math.PI, y: 0, z: 0 }
      visualObject.scale = { x: 2, y: 2, z: 2 }
      
      const object3D = await visualObject.create()
      
      expect(object3D.position.x).toBe(1)
      expect(object3D.position.y).toBe(2)
      expect(object3D.position.z).toBe(3)
      expect(object3D.rotation.x).toBe(Math.PI)
      expect(object3D.scale.x).toBe(2)
    })
  })
  
  describe('Metadata and Tags', () => {
    it('should set and get metadata', () => {
      visualObject.setMetadata('author', 'Test User')
      visualObject.setMetadata('version', '1.0')
      
      expect(visualObject.getMetadata('author')).toBe('Test User')
      expect(visualObject.getMetadata('version')).toBe('1.0')
      expect(visualObject.getMetadata('nonexistent')).toBeUndefined()
    })
    
    it('should manage tags', () => {
      visualObject.addTag('important')
      visualObject.addTag('geometry')
      visualObject.addTag('test')
      
      expect(visualObject.hasTag('important')).toBe(true)
      expect(visualObject.hasTag('geometry')).toBe(true)
      expect(visualObject.hasTag('nonexistent')).toBe(false)
      
      const tags = visualObject.getTags()
      expect(tags.size).toBe(3)
      expect(tags.has('important')).toBe(true)
      
      visualObject.removeTag('test')
      expect(visualObject.hasTag('test')).toBe(false)
    })
  })
  
  describe('Bounding Box and Center', () => {
    it('should calculate bounding box', async () => {
      await visualObject.create()
      const boundingBox = visualObject.getBoundingBox()
      
      expect(boundingBox).toBeInstanceOf(THREE.Box3)
      expect(boundingBox.min).toBeDefined()
      expect(boundingBox.max).toBeDefined()
    })
    
    it('should calculate center point', async () => {
      await visualObject.create()
      const center = visualObject.getCenter()
      
      expect(center).toBeInstanceOf(THREE.Vector3)
    })
    
    it('should return null for bounding box without object3D', () => {
      const boundingBox = visualObject.getBoundingBox()
      expect(boundingBox).toBeNull()
    })
    
    it('should return null for center without object3D', () => {
      const center = visualObject.getCenter()
      expect(center).toBeNull()
    })
  })
  
  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      visualObject.name = 'Test Object'
      visualObject.position = { x: 1, y: 2, z: 3 }
      visualObject.setMetadata('type', 'test')
      visualObject.addTag('serializable')
      
      const json = visualObject.toJSON()
      
      expect(json.id).toBe(visualObject.id)
      expect(json.nodeId).toBe(visualObject.nodeId)
      expect(json.name).toBe('Test Object')
      expect(json.position.x).toBe(1)
      expect(json.position.y).toBe(2)
      expect(json.position.z).toBe(3)
      expect(json.metadata.type).toBe('test')
      expect(json.tags).toContain('serializable')
      expect(json.created).toBeDefined()
      expect(json.modified).toBeDefined()
    })
    
    it('should load from JSON', () => {
      const data = {
        name: 'Loaded Object',
        visible: false,
        opacity: 0.5,
        position: { x: 5, y: 6, z: 7 },
        rotation: { x: Math.PI, y: 0, z: 0 },
        scale: { x: 2, y: 2, z: 2 },
        metadata: { source: 'file' },
        tags: ['loaded', 'test'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-02T00:00:00.000Z'
      }
      
      visualObject.fromJSON(data)
      
      expect(visualObject.name).toBe('Loaded Object')
      expect(visualObject.visible).toBe(false)
      expect(visualObject.opacity).toBe(0.5)
      expect(visualObject.position.x).toBe(5)
      expect(visualObject.getMetadata('source')).toBe('file')
      expect(visualObject.hasTag('loaded')).toBe(true)
    })
  })
  
  describe('Disposal', () => {
    it('should dispose resources correctly', async () => {
      await visualObject.create()
      
      expect(visualObject.disposed).toBe(false)
      expect(visualObject.geometry).toBeDefined()
      expect(visualObject.material).toBeDefined()
      
      visualObject.dispose()
      
      expect(visualObject.disposed).toBe(true)
      expect(visualObject.geometry).toBeNull()
      expect(visualObject.material).toBeNull()
      expect(visualObject.object3D).toBeNull()
    })
    
    it('should be safe to dispose multiple times', async () => {
      await visualObject.create()
      
      visualObject.dispose()
      expect(() => visualObject.dispose()).not.toThrow()
    })
  })
  
  describe('Property Change Notifications', () => {
    it('should notify on property changes', () => {
      const callback = vi.fn()
      visualObject.onPropertyChanged('visible', callback)
      
      visualObject.visible = false
      
      expect(callback).toHaveBeenCalledWith(false)
    })
    
    it('should notify on position changes', () => {
      const callback = vi.fn()
      visualObject.onPropertyChanged('position', callback)
      
      const newPosition = { x: 1, y: 2, z: 3 }
      visualObject.position = newPosition
      
      expect(callback).toHaveBeenCalled()
      const callArg = callback.mock.calls[0][0]
      expect(callArg.x).toBe(1)
      expect(callArg.y).toBe(2)
      expect(callArg.z).toBe(3)
    })
  })
})