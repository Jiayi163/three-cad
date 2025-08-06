/**
 * Tests for BasicShapes - concrete VisualObject implementations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as THREE from 'three'
import { 
  BoxVisualObject, 
  SphereVisualObject, 
  CylinderVisualObject, 
  PlaneVisualObject,
  createVisualObject,
  getAvailableTypes
} from '../BasicShapes.js'

describe('BoxVisualObject', () => {
  let boxObject
  
  beforeEach(() => {
    boxObject = new BoxVisualObject('test-box-node')
  })
  
  afterEach(() => {
    if (boxObject && !boxObject.disposed) {
      boxObject.dispose()
    }
  })
  
  it('should create box with default parameters', () => {
    expect(boxObject.type).toBe('BoxVisualObject')
    expect(boxObject.name).toContain('Box_')
    expect(boxObject.nodeId).toBe('test-box-node')
  })
  
  it('should create box with custom parameters', () => {
    const customBox = new BoxVisualObject('custom-node', {
      width: 5,
      height: 10,
      depth: 3
    })
    
    const params = customBox.getProperty('boxParams')
    expect(params.width).toBe(5)
    expect(params.height).toBe(10)
    expect(params.depth).toBe(3)
    
    customBox.dispose()
  })
  
  it('should create Three.js representation', async () => {
    const object3D = await boxObject.create()
    
    expect(object3D).toBeInstanceOf(THREE.Mesh)
    expect(object3D.geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect(object3D.material).toBeInstanceOf(THREE.Material)
    expect(object3D.userData.visualObject).toBe(boxObject)
  })
  
  it('should update parameters and recreate geometry', async () => {
    await boxObject.create()
    const originalGeometry = boxObject.geometry
    
    boxObject.updateParams({ width: 10 })
    
    expect(boxObject.geometry).not.toBe(originalGeometry)
    expect(boxObject.geometry.parameters.width).toBe(10)
  })
  
  it('should get dimensions correctly', () => {
    boxObject.updateParams({ width: 2, height: 3, depth: 4 })
    
    const dimensions = boxObject.getDimensions()
    expect(dimensions.width).toBe(2)
    expect(dimensions.height).toBe(3)
    expect(dimensions.depth).toBe(4)
  })
  
  it('should serialize and deserialize correctly', () => {
    boxObject.updateParams({ width: 5, height: 6, depth: 7 })
    boxObject.position = { x: 1, y: 2, z: 3 }
    
    const json = boxObject.toJSON()
    expect(json.boxParams).toBeDefined()
    expect(json.boxParams.width).toBe(5)
    
    const newBox = new BoxVisualObject('new-node')
    newBox.fromJSON(json)
    
    const newParams = newBox.getProperty('boxParams')
    expect(newParams.width).toBe(5)
    expect(newParams.height).toBe(6)
    expect(newParams.depth).toBe(7)
    
    newBox.dispose()
  })
})

describe('SphereVisualObject', () => {
  let sphereObject
  
  beforeEach(() => {
    sphereObject = new SphereVisualObject('test-sphere-node')
  })
  
  afterEach(() => {
    if (sphereObject && !sphereObject.disposed) {
      sphereObject.dispose()
    }
  })
  
  it('should create sphere with default parameters', () => {
    expect(sphereObject.type).toBe('SphereVisualObject')
    expect(sphereObject.name).toContain('Sphere_')
    expect(sphereObject.nodeId).toBe('test-sphere-node')
  })
  
  it('should create sphere with custom parameters', () => {
    const customSphere = new SphereVisualObject('custom-node', {
      radius: 3,
      widthSegments: 16,
      heightSegments: 8
    })
    
    const params = customSphere.getProperty('sphereParams')
    expect(params.radius).toBe(3)
    expect(params.widthSegments).toBe(16)
    expect(params.heightSegments).toBe(8)
    
    customSphere.dispose()
  })
  
  it('should create Three.js representation', async () => {
    const object3D = await sphereObject.create()
    
    expect(object3D).toBeInstanceOf(THREE.Mesh)
    expect(object3D.geometry).toBeInstanceOf(THREE.SphereGeometry)
    expect(object3D.material).toBeInstanceOf(THREE.Material)
  })
  
  it('should get radius correctly', () => {
    sphereObject.updateParams({ radius: 5 })
    
    const radius = sphereObject.getRadius()
    expect(radius).toBe(5)
  })
  
  it('should update parameters correctly', async () => {
    await sphereObject.create()
    const originalGeometry = sphereObject.geometry
    
    sphereObject.updateParams({ radius: 2 })
    
    expect(sphereObject.geometry).not.toBe(originalGeometry)
    expect(sphereObject.geometry.parameters.radius).toBe(2)
  })
})

describe('CylinderVisualObject', () => {
  let cylinderObject
  
  beforeEach(() => {
    cylinderObject = new CylinderVisualObject('test-cylinder-node')
  })
  
  afterEach(() => {
    if (cylinderObject && !cylinderObject.disposed) {
      cylinderObject.dispose()
    }
  })
  
  it('should create cylinder with default parameters', () => {
    expect(cylinderObject.type).toBe('CylinderVisualObject')
    expect(cylinderObject.name).toContain('Cylinder_')
    expect(cylinderObject.nodeId).toBe('test-cylinder-node')
  })
  
  it('should create cylinder with custom parameters', () => {
    const customCylinder = new CylinderVisualObject('custom-node', {
      radiusTop: 2,
      radiusBottom: 3,
      height: 5,
      radialSegments: 16
    })
    
    const params = customCylinder.getProperty('cylinderParams')
    expect(params.radiusTop).toBe(2)
    expect(params.radiusBottom).toBe(3)
    expect(params.height).toBe(5)
    expect(params.radialSegments).toBe(16)
    
    customCylinder.dispose()
  })
  
  it('should create Three.js representation', async () => {
    const object3D = await cylinderObject.create()
    
    expect(object3D).toBeInstanceOf(THREE.Mesh)
    expect(object3D.geometry).toBeInstanceOf(THREE.CylinderGeometry)
    expect(object3D.material).toBeInstanceOf(THREE.Material)
  })
  
  it('should get dimensions correctly', () => {
    cylinderObject.updateParams({ 
      radiusTop: 1, 
      radiusBottom: 2, 
      height: 4 
    })
    
    const dimensions = cylinderObject.getDimensions()
    expect(dimensions.radiusTop).toBe(1)
    expect(dimensions.radiusBottom).toBe(2)
    expect(dimensions.height).toBe(4)
  })
})

describe('PlaneVisualObject', () => {
  let planeObject
  
  beforeEach(() => {
    planeObject = new PlaneVisualObject('test-plane-node')
  })
  
  afterEach(() => {
    if (planeObject && !planeObject.disposed) {
      planeObject.dispose()
    }
  })
  
  it('should create plane with default parameters', () => {
    expect(planeObject.type).toBe('PlaneVisualObject')
    expect(planeObject.name).toContain('Plane_')
    expect(planeObject.nodeId).toBe('test-plane-node')
  })
  
  it('should create plane with custom parameters', () => {
    const customPlane = new PlaneVisualObject('custom-node', {
      width: 10,
      height: 8,
      widthSegments: 5,
      heightSegments: 4
    })
    
    const params = customPlane.getProperty('planeParams')
    expect(params.width).toBe(10)
    expect(params.height).toBe(8)
    expect(params.widthSegments).toBe(5)
    expect(params.heightSegments).toBe(4)
    
    customPlane.dispose()
  })
  
  it('should create Three.js representation', async () => {
    const object3D = await planeObject.create()
    
    expect(object3D).toBeInstanceOf(THREE.Mesh)
    expect(object3D.geometry).toBeInstanceOf(THREE.PlaneGeometry)
    expect(object3D.material).toBeInstanceOf(THREE.Material)
  })
})

describe('createVisualObject factory function', () => {
  let createdObjects = []
  
  afterEach(() => {
    // Clean up created objects
    createdObjects.forEach(obj => {
      if (obj && !obj.disposed) {
        obj.dispose()
      }
    })
    createdObjects = []
  })
  
  it('should create box visual objects', () => {
    const box = createVisualObject('box', 'test-node', { width: 5 })
    createdObjects.push(box)
    
    expect(box).toBeInstanceOf(BoxVisualObject)
    expect(box.nodeId).toBe('test-node')
    
    const params = box.getProperty('boxParams')
    expect(params.width).toBe(5)
  })
  
  it('should create cube visual objects (alias for box)', () => {
    const cube = createVisualObject('cube', 'test-node', { width: 3 })
    createdObjects.push(cube)
    
    expect(cube).toBeInstanceOf(BoxVisualObject)
    
    const params = cube.getProperty('boxParams')
    expect(params.width).toBe(3)
  })
  
  it('should create sphere visual objects', () => {
    const sphere = createVisualObject('sphere', 'test-node', { radius: 2 })
    createdObjects.push(sphere)
    
    expect(sphere).toBeInstanceOf(SphereVisualObject)
    expect(sphere.nodeId).toBe('test-node')
    
    const params = sphere.getProperty('sphereParams')
    expect(params.radius).toBe(2)
  })
  
  it('should create cylinder visual objects', () => {
    const cylinder = createVisualObject('cylinder', 'test-node', { height: 4 })
    createdObjects.push(cylinder)
    
    expect(cylinder).toBeInstanceOf(CylinderVisualObject)
    expect(cylinder.nodeId).toBe('test-node')
    
    const params = cylinder.getProperty('cylinderParams')
    expect(params.height).toBe(4)
  })
  
  it('should create plane visual objects', () => {
    const plane = createVisualObject('plane', 'test-node', { width: 6 })
    createdObjects.push(plane)
    
    expect(plane).toBeInstanceOf(PlaneVisualObject)
    expect(plane.nodeId).toBe('test-node')
    
    const params = plane.getProperty('planeParams')
    expect(params.width).toBe(6)
  })
  
  it('should throw error for unsupported types', () => {
    expect(() => {
      createVisualObject('pyramid', 'test-node')
    }).toThrow('Unsupported visual object type: pyramid')
  })
  
  it('should handle case insensitive type names', () => {
    const box1 = createVisualObject('BOX', 'test-node-1')
    const box2 = createVisualObject('Box', 'test-node-2')
    const sphere = createVisualObject('SPHERE', 'test-node-3')
    
    createdObjects.push(box1, box2, sphere)
    
    expect(box1).toBeInstanceOf(BoxVisualObject)
    expect(box2).toBeInstanceOf(BoxVisualObject)
    expect(sphere).toBeInstanceOf(SphereVisualObject)
  })
})

describe('getAvailableTypes function', () => {
  it('should return all available types', () => {
    const types = getAvailableTypes()
    
    expect(types).toContain('box')
    expect(types).toContain('sphere')
    expect(types).toContain('cylinder')
    expect(types).toContain('plane')
    expect(types.length).toBeGreaterThan(0)
  })
  
  it('should return an array', () => {
    const types = getAvailableTypes()
    expect(Array.isArray(types)).toBe(true)
  })
})

describe('Material System Integration', () => {
  let visualObject
  
  beforeEach(() => {
    visualObject = createVisualObject('box', 'test-material-node')
  })
  
  afterEach(() => {
    if (visualObject && !visualObject.disposed) {
      visualObject.dispose()
    }
  })
  
  it('should use VisualObject material system', async () => {
    // Set custom material configuration
    visualObject.setMaterialConfig('default', {
      color: 0x00ff00,
      metalness: 0.5,
      roughness: 0.2
    })
    
    const object3D = await visualObject.create()
    const material = object3D.material
    
    expect(material.color.getHex()).toBe(0x00ff00)
    expect(material.metalness).toBe(0.5)
    expect(material.roughness).toBe(0.2)
  })
  
  it('should handle selection state changes', async () => {
    await visualObject.create()
    
    // Should start with default material
    const defaultMaterial = visualObject.material
    
    // Change to selected state
    visualObject.selected = true
    const selectedMaterial = visualObject.material
    
    expect(selectedMaterial).not.toBe(defaultMaterial)
    expect(selectedMaterial.color.getHex()).toBe(0xff0000) // Red for selected
  })
  
  it('should handle highlight state changes', async () => {
    await visualObject.create()
    
    // Should start with default material
    const defaultMaterial = visualObject.material
    
    // Change to highlighted state
    visualObject.highlighted = true
    const highlightedMaterial = visualObject.material
    
    expect(highlightedMaterial).not.toBe(defaultMaterial)
    expect(highlightedMaterial.color.getHex()).toBe(0x0088ff) // Blue for highlighted
  })
})

describe('Performance and Memory Management', () => {
  it('should properly dispose of resources', async () => {
    const visualObject = createVisualObject('box', 'test-dispose-node')
    
    // Create the Three.js representation
    await visualObject.create()
    
    expect(visualObject.geometry).toBeDefined()
    expect(visualObject.material).toBeDefined()
    expect(visualObject.object3D).toBeDefined()
    expect(visualObject.disposed).toBe(false)
    
    // Dispose the object
    visualObject.dispose()
    
    expect(visualObject.geometry).toBeNull()
    expect(visualObject.material).toBeNull()
    expect(visualObject.object3D).toBeNull()
    expect(visualObject.disposed).toBe(true)
  })
  
  it('should handle multiple creations safely', async () => {
    const visualObject = createVisualObject('sphere', 'test-multiple-node')
    
    // Create multiple times
    const object1 = await visualObject.create()
    const object2 = await visualObject.create()
    
    // Should return the same object
    expect(object1).toBe(object2)
    expect(visualObject.object3D).toBe(object1)
    
    visualObject.dispose()
  })
})