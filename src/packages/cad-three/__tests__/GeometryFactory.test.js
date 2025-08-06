/**
 * Tests for GeometryFactory class
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as THREE from 'three'
import { GeometryFactory, geometryFactory } from '../GeometryFactory.js'

describe('GeometryFactory', () => {
  let factory
  
  beforeEach(() => {
    factory = new GeometryFactory()
  })
  
  afterEach(() => {
    factory.dispose()
  })
  
  describe('Construction', () => {
    it('should create a factory with default settings', () => {
      expect(factory).toBeInstanceOf(GeometryFactory)
      
      const stats = factory.getStats()
      expect(stats.created).toBe(0)
      expect(stats.cached).toBe(0)
      expect(stats.disposed).toBe(0)
      expect(stats.cacheEnabled).toBe(true)
      expect(stats.maxCacheSize).toBe(100)
    })
    
    it('should have default parameters for all shape types', () => {
      const supportedTypes = factory.getSupportedTypes()
      expect(supportedTypes).toContain('box')
      expect(supportedTypes).toContain('sphere')
      expect(supportedTypes).toContain('cylinder')
      expect(supportedTypes).toContain('plane')
      expect(supportedTypes).toContain('cone')
      expect(supportedTypes).toContain('torus')
      
      supportedTypes.forEach(type => {
        const defaults = factory.getDefaults(type)
        expect(defaults).toBeDefined()
        expect(typeof defaults).toBe('object')
      })
    })
  })
  
  describe('Basic Shape Creation', () => {
    it('should create box geometry', () => {
      const geometry = factory.createBox({ width: 2, height: 3, depth: 4 })
      
      expect(geometry).toBeInstanceOf(THREE.BoxGeometry)
      expect(geometry.parameters.width).toBe(2)
      expect(geometry.parameters.height).toBe(3)
      expect(geometry.parameters.depth).toBe(4)
    })
    
    it('should create sphere geometry', () => {
      const geometry = factory.createSphere({ radius: 5, widthSegments: 16 })
      
      expect(geometry).toBeInstanceOf(THREE.SphereGeometry)
      expect(geometry.parameters.radius).toBe(5)
      expect(geometry.parameters.widthSegments).toBe(16)
    })
    
    it('should create cylinder geometry', () => {
      const geometry = factory.createCylinder({ 
        radiusTop: 1, 
        radiusBottom: 2, 
        height: 3 
      })
      
      expect(geometry).toBeInstanceOf(THREE.CylinderGeometry)
      expect(geometry.parameters.radiusTop).toBe(1)
      expect(geometry.parameters.radiusBottom).toBe(2)
      expect(geometry.parameters.height).toBe(3)
    })
    
    it('should create plane geometry', () => {
      const geometry = factory.createPlane({ width: 10, height: 8 })
      
      expect(geometry).toBeInstanceOf(THREE.PlaneGeometry)
      expect(geometry.parameters.width).toBe(10)
      expect(geometry.parameters.height).toBe(8)
    })
    
    it('should create cone geometry', () => {
      const geometry = factory.createCone({ radius: 3, height: 6 })
      
      expect(geometry).toBeInstanceOf(THREE.ConeGeometry)
      expect(geometry.parameters.radius).toBe(3)
      expect(geometry.parameters.height).toBe(6)
    })
    
    it('should create torus geometry', () => {
      const geometry = factory.createTorus({ radius: 2, tube: 0.5 })
      
      expect(geometry).toBeInstanceOf(THREE.TorusGeometry)
      expect(geometry.parameters.radius).toBe(2)
      expect(geometry.parameters.tube).toBe(0.5)
    })
  })
  
  describe('Generic Geometry Creation', () => {
    it('should create geometry by type string', () => {
      const boxGeometry = factory.createGeometry('box', { width: 2 })
      expect(boxGeometry).toBeInstanceOf(THREE.BoxGeometry)
      
      const sphereGeometry = factory.createGeometry('sphere', { radius: 3 })
      expect(sphereGeometry).toBeInstanceOf(THREE.SphereGeometry)
      
      const cylinderGeometry = factory.createGeometry('cylinder', { height: 4 })
      expect(cylinderGeometry).toBeInstanceOf(THREE.CylinderGeometry)
    })
    
    it('should handle alternative type names', () => {
      const cubeGeometry = factory.createGeometry('cube', { width: 2 })
      expect(cubeGeometry).toBeInstanceOf(THREE.BoxGeometry)
    })
    
    it('should throw error for unsupported types', () => {
      expect(() => {
        factory.createGeometry('pyramid', {})
      }).toThrow('Unsupported geometry type: pyramid')
    })
  })
  
  describe('Parameter Validation and Normalization', () => {
    it('should use default parameters when none provided', () => {
      const geometry = factory.createBox()
      const defaults = factory.getDefaults('box')
      
      expect(geometry.parameters.width).toBe(defaults.width)
      expect(geometry.parameters.height).toBe(defaults.height)
      expect(geometry.parameters.depth).toBe(defaults.depth)
    })
    
    it('should merge custom parameters with defaults', () => {
      const geometry = factory.createBox({ width: 5 })
      const defaults = factory.getDefaults('box')
      
      expect(geometry.parameters.width).toBe(5)
      expect(geometry.parameters.height).toBe(defaults.height)
      expect(geometry.parameters.depth).toBe(defaults.depth)
    })
    
    it('should handle negative values appropriately', () => {
      const geometry = factory.createBox({ width: -2, height: 3 })
      
      expect(geometry.parameters.width).toBe(2) // Absolute value
      expect(geometry.parameters.height).toBe(3)
    })
    
    it('should throw error for invalid parameters', () => {
      expect(() => {
        factory.createBox({ width: NaN })
      }).toThrow('Invalid width parameter: NaN')
      
      expect(() => {
        factory.createBox({ width: Infinity })
      }).toThrow('Invalid width parameter: Infinity')
    })
    
    it('should throw error for unknown geometry type in defaults', () => {
      expect(() => {
        factory.getDefaults('unknown')
      }).toThrow('Unknown geometry type: unknown')
    })
  })
  
  describe('Caching System', () => {
    it('should cache identical geometries', () => {
      const params = { width: 2, height: 2, depth: 2 }
      
      const geo1 = factory.createBox(params)
      const geo2 = factory.createBox(params)
      
      const stats = factory.getStats()
      expect(stats.created).toBe(1)
      expect(stats.cached).toBe(1)
      
      // Should be clones, not the same instance
      expect(geo1).not.toBe(geo2)
      expect(geo1.uuid).not.toBe(geo2.uuid)
    })
    
    it('should not cache different geometries', () => {
      const geo1 = factory.createBox({ width: 1 })
      const geo2 = factory.createBox({ width: 2 })
      
      const stats = factory.getStats()
      expect(stats.created).toBe(2)
      expect(stats.cached).toBe(0)
    })
    
    it('should respect cache size limit', () => {
      factory.setMaxCacheSize(2)
      
      factory.createBox({ width: 1 })
      factory.createBox({ width: 2 })
      factory.createBox({ width: 3 }) // Should not be cached due to limit
      
      const stats = factory.getStats()
      expect(stats.cacheSize).toBeLessThanOrEqual(2)
    })
    
    it('should allow disabling cache', () => {
      factory.setCacheEnabled(false)
      
      const params = { width: 2 }
      factory.createBox(params)
      factory.createBox(params)
      
      const stats = factory.getStats()
      expect(stats.created).toBe(2)
      expect(stats.cached).toBe(0)
      expect(stats.cacheSize).toBe(0)
    })
    
    it('should clear cache when disabled', () => {
      factory.createBox({ width: 1 })
      factory.createBox({ width: 2 })
      
      expect(factory.getStats().cacheSize).toBe(2)
      
      factory.setCacheEnabled(false)
      
      expect(factory.getStats().cacheSize).toBe(0)
    })
  })
  
  describe('Custom Geometry Creation', () => {
    it('should create custom geometry from vertices', () => {
      const vertices = [
        -1, -1, 0,  // vertex 0
         1, -1, 0,  // vertex 1
         1,  1, 0,  // vertex 2
        -1,  1, 0   // vertex 3
      ]
      const indices = [0, 1, 2, 2, 3, 0]
      
      const geometry = factory.createCustomGeometry(vertices, indices)
      
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
      expect(geometry.attributes.position).toBeDefined()
      expect(geometry.index).toBeDefined()
      expect(geometry.attributes.normal).toBeDefined()
    })
    
    it('should compute normals when not provided', () => {
      const vertices = [-1, -1, 0, 1, -1, 0, 1, 1, 0]
      const geometry = factory.createCustomGeometry(vertices)
      
      expect(geometry.attributes.normal).toBeDefined()
    })
    
    it('should use provided normals', () => {
      const vertices = [-1, -1, 0, 1, -1, 0, 1, 1, 0]
      const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1]
      
      const geometry = factory.createCustomGeometry(vertices, null, normals)
      
      expect(geometry.attributes.normal).toBeDefined()
      expect(geometry.attributes.normal.array).toEqual(new Float32Array(normals))
    })
    
    it('should throw error for empty vertices', () => {
      expect(() => {
        factory.createCustomGeometry([])
      }).toThrow('Vertices array is required and cannot be empty')
      
      expect(() => {
        factory.createCustomGeometry(null)
      }).toThrow('Vertices array is required and cannot be empty')
    })
  })
  
  describe('Line Geometry Creation', () => {
    it('should create line geometry from Vector3 points', () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(2, 0, 2)
      ]
      
      const geometry = factory.createLineGeometry(points)
      
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
      expect(geometry.attributes.position).toBeDefined()
      expect(geometry.attributes.position.count).toBe(3)
    })
    
    it('should create line geometry from object points', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
        { x: 2, y: 0, z: 2 }
      ]
      
      const geometry = factory.createLineGeometry(points)
      
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry)
      expect(geometry.attributes.position.count).toBe(3)
    })
    
    it('should handle partial coordinates in object points', () => {
      const points = [
        { x: 1 },
        { x: 2, y: 3 },
        { x: 4, y: 5, z: 6 }
      ]
      
      const geometry = factory.createLineGeometry(points)
      expect(geometry.attributes.position.count).toBe(3)
    })
    
    it('should throw error for insufficient points', () => {
      expect(() => {
        factory.createLineGeometry([new THREE.Vector3(0, 0, 0)])
      }).toThrow('At least 2 points are required for line geometry')
      
      expect(() => {
        factory.createLineGeometry([])
      }).toThrow('At least 2 points are required for line geometry')
    })
    
    it('should throw error for invalid point format', () => {
      expect(() => {
        factory.createLineGeometry([{ invalid: true }, { x: 1, y: 1, z: 1 }])
      }).toThrow('Invalid point format')
    })
  })
  
  describe('Wireframe and Edges', () => {
    it('should create wireframe geometry', () => {
      const sourceGeometry = factory.createBox()
      const wireframe = factory.createWireframe(sourceGeometry)
      
      expect(wireframe).toBeInstanceOf(THREE.WireframeGeometry)
    })
    
    it('should create edges geometry', () => {
      const sourceGeometry = factory.createBox()
      const edges = factory.createEdges(sourceGeometry)
      
      expect(edges).toBeInstanceOf(THREE.EdgesGeometry)
    })
    
    it('should throw error for invalid source geometry', () => {
      expect(() => {
        factory.createWireframe(null)
      }).toThrow('Valid BufferGeometry is required')
      
      expect(() => {
        factory.createEdges("not a geometry")
      }).toThrow('Valid BufferGeometry is required')
    })
  })
  
  describe('Statistics and Management', () => {
    it('should track creation statistics', () => {
      factory.createBox()
      factory.createSphere()
      factory.createBox() // This should be cached
      
      const stats = factory.getStats()
      expect(stats.created).toBe(2)
      expect(stats.cached).toBe(1)
    })
    
    it('should reset statistics', () => {
      factory.createBox()
      factory.createSphere()
      
      let stats = factory.getStats()
      expect(stats.created).toBe(2)
      
      factory.resetStats()
      
      stats = factory.getStats()
      expect(stats.created).toBe(0)
      expect(stats.cached).toBe(0)
      expect(stats.disposed).toBe(0)
    })
    
    it('should clear cache', () => {
      factory.createBox({ width: 1 })
      factory.createBox({ width: 2 })
      
      expect(factory.getStats().cacheSize).toBe(2)
      
      factory.clearCache()
      
      expect(factory.getStats().cacheSize).toBe(0)
    })
  })
  
  describe('Default Parameter Management', () => {
    it('should allow setting custom defaults', () => {
      const originalDefaults = factory.getDefaults('box')
      
      factory.setDefaults('box', { width: 10, height: 20 })
      
      const newDefaults = factory.getDefaults('box')
      expect(newDefaults.width).toBe(10)
      expect(newDefaults.height).toBe(20)
      expect(newDefaults.depth).toBe(originalDefaults.depth) // Should retain other defaults
    })
    
    it('should use new defaults for geometry creation', () => {
      factory.setDefaults('box', { width: 5 })
      
      const geometry = factory.createBox()
      expect(geometry.parameters.width).toBe(5)
    })
    
    it('should throw error for unknown type in setDefaults', () => {
      expect(() => {
        factory.setDefaults('unknown', {})
      }).toThrow('Unknown geometry type: unknown')
    })
  })
  
  describe('Disposal', () => {
    it('should dispose all resources', () => {
      factory.createBox({ width: 1 })
      factory.createBox({ width: 2 })
      
      expect(factory.getStats().cacheSize).toBe(2)
      
      factory.dispose()
      
      const stats = factory.getStats()
      expect(stats.cacheSize).toBe(0)
      expect(stats.created).toBe(0)
      expect(stats.cached).toBe(0)
    })
  })
})

describe('geometryFactory singleton', () => {
  it('should provide a singleton instance', () => {
    expect(geometryFactory).toBeInstanceOf(GeometryFactory)
  })
  
  it('should work with the singleton', () => {
    const geometry = geometryFactory.createBox({ width: 2 })
    expect(geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect(geometry.parameters.width).toBe(2)
  })
})