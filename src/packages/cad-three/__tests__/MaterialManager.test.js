/**
 * MaterialManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MaterialManager, materialManager } from '../MaterialManager.js'

describe('MaterialManager', () => {
  let manager

  beforeEach(() => {
    manager = new MaterialManager()
  })

  afterEach(() => {
    manager.dispose()
  })

  describe('Preset Materials', () => {
    it('should have preset materials', () => {
      const presets = manager.getPresetMaterials()
      expect(presets).toBeDefined()
      expect(presets.length).toBeGreaterThan(0)
    })

    it('should get specific preset material', () => {
      const metal = manager.getPresetMaterial('metal')
      expect(metal).toBeDefined()
      expect(metal.name).toBe('Metal')
      expect(metal.config.metalness).toBe(0.9)
    })

    it('should return null for non-existent preset', () => {
      const nonExistent = manager.getPresetMaterial('non-existent')
      expect(nonExistent).toBeNull()
    })
  })

  describe('Material Creation', () => {
    it('should create material from preset ID', () => {
      const material = manager.createMaterial('gold')
      expect(material).toBeDefined()
      expect(material.color.getHex()).toBe(0xffd700)
      expect(material.metalness).toBe(0.8)
    })

    it('should create material from config object', () => {
      const config = {
        color: 0xff0000,
        metalness: 0.5,
        roughness: 0.3
      }
      const material = manager.createMaterial(config)
      expect(material).toBeDefined()
      expect(material.color.getHex()).toBe(0xff0000)
      expect(material.metalness).toBe(0.5)
    })

    it('should cache materials', () => {
      const material1 = manager.createMaterial('metal')
      const material2 = manager.createMaterial('metal')
      expect(material1).toBe(material2) // Same instance due to caching
    })
  })

  describe('Texture Loading', () => {
    it('should calculate texture repeat correctly', () => {
      const mockTexture = {
        image: { width: 100, height: 100 }
      }
      const surfaceSize = { x: 200, y: 150 }
      const repeat = manager.calculateTextureRepeat(mockTexture, surfaceSize)
      expect(repeat.x).toBe(2)
      expect(repeat.y).toBe(1.5)
    })

    it('should handle auto-fit texture', () => {
      const mockTexture = {
        image: { width: 100, height: 100 },
        repeat: { x: 1, y: 1 },
        needsUpdate: false
      }
      const surfaceSize = { x: 200, y: 150 }

      manager.autoFitTexture(mockTexture, surfaceSize, { fitMode: 'tile' })

      expect(mockTexture.repeat.x).toBe(2) // Math.ceil(2)
      expect(mockTexture.repeat.y).toBe(2) // Math.ceil(1.5)
      expect(mockTexture.needsUpdate).toBe(true)
    })
  })

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      manager.createMaterial('metal')
      manager.createMaterial('gold')

      const stats = manager.getCacheStats()
      expect(stats.materialCount).toBe(2)
      expect(stats.presetCount).toBeGreaterThan(0)
    })

    it('should clear cache', () => {
      manager.createMaterial('metal')
      expect(manager.getCacheStats().materialCount).toBe(1)

      manager.clearCache()
      expect(manager.getCacheStats().materialCount).toBe(0)
    })
  })

  describe('Global Instance', () => {
    it('should have global materialManager instance', () => {
      expect(materialManager).toBeDefined()
      expect(materialManager).toBeInstanceOf(MaterialManager)
    })
  })
})
