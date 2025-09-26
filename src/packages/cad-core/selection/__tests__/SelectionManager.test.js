/**
 * Tests for SelectionManager class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SelectionManager } from '../SelectionManager.js'
import { Document } from '../../application/Document.js'

// Mock Three.js
vi.mock('three', () => ({
  Vector2: vi.fn(() => ({ x: 0, y: 0 })),
  Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  Box3: vi.fn(() => ({
    isEmpty: () => false,
    setFromObject: vi.fn(),
    union: vi.fn(),
    getSize: vi.fn(() => ({ x: 1, y: 1, z: 1 }))
  })),
  Raycaster: vi.fn(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => [])
  }))
}))

// Mock ThreeView
const createMockThreeView = () => ({
  element: {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    parentElement: {
      style: {},
      appendChild: vi.fn()
    }
  },
  scene: {
    traverse: vi.fn(),
    children: []
  },
  camera: {},
  raycaster: {
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => [])
  },
  _updateObjectMaterial: vi.fn()
})

describe('SelectionManager', () => {
  let selectionManager
  let mockDocument
  let mockThreeView

  beforeEach(() => {
    mockDocument = new Document('Test Document')
    mockThreeView = createMockThreeView()
    selectionManager = new SelectionManager(mockDocument, mockThreeView)
  })

  afterEach(() => {
    if (selectionManager) {
      selectionManager.dispose()
    }
  })

  describe('Construction', () => {
    it('should create a selection manager with default settings', () => {
      expect(selectionManager).toBeDefined()
      expect(selectionManager.document).toBe(mockDocument)
      expect(selectionManager.threeView).toBe(mockThreeView)
      expect(selectionManager.selectedObjects).toBeDefined()
      expect(selectionManager.selectedNodes).toBeDefined()
      expect(selectionManager.selectionMode).toBe('single')
    })

    it('should initialize with empty selection', () => {
      expect(selectionManager.selectedObjects.length).toBe(0)
      expect(selectionManager.selectedNodes.length).toBe(0)
    })

    it('should set up default filters', () => {
      expect(selectionManager.filterPredicates.has('visible')).toBe(true)
      expect(selectionManager.filterPredicates.has('unlocked')).toBe(true)
      expect(selectionManager.filterPredicates.has('geometry')).toBe(true)
    })
  })

  describe('Basic Selection', () => {
    let mockObject

    beforeEach(() => {
      mockObject = {
        visible: true,
        userData: {
          nodeId: 'test-node-1',
          type: 'box'
        },
        geometry: { type: 'BoxGeometry' },
        parent: {}
      }
    })

    it('should select an object', () => {
      const count = selectionManager.select(mockObject)

      expect(count).toBe(1)
      expect(selectionManager.selectedObjects.contains(mockObject)).toBe(true)
    })

    it('should deselect an object', () => {
      selectionManager.select(mockObject)
      selectionManager.deselect(mockObject)

      expect(selectionManager.selectedObjects.contains(mockObject)).toBe(false)
    })

    it('should clear all selection', () => {
      selectionManager.select(mockObject)
      selectionManager.clearSelection()

      expect(selectionManager.selectedObjects.length).toBe(0)
    })

    it('should toggle selection', () => {
      // First toggle - should select
      selectionManager.toggleSelection(mockObject)
      expect(selectionManager.selectedObjects.contains(mockObject)).toBe(true)

      // Second toggle - should deselect
      selectionManager.toggleSelection(mockObject)
      expect(selectionManager.selectedObjects.contains(mockObject)).toBe(false)
    })
  })

  describe('Multi-Selection', () => {
    let mockObjects

    beforeEach(() => {
      mockObjects = [
        {
          visible: true,
          userData: { nodeId: 'node-1', type: 'box' },
          geometry: { type: 'BoxGeometry' },
          parent: {}
        },
        {
          visible: true,
          userData: { nodeId: 'node-2', type: 'sphere' },
          geometry: { type: 'SphereGeometry' },
          parent: {}
        }
      ]
    })

    it('should select multiple objects', () => {
      const count = selectionManager.select(mockObjects)

      expect(count).toBe(2)
      expect(selectionManager.selectedObjects.length).toBe(2)
    })

    it('should add to existing selection', () => {
      selectionManager.select(mockObjects[0])
      selectionManager.select(mockObjects[1], { addToSelection: true })

      expect(selectionManager.selectedObjects.length).toBe(2)
    })

    it('should replace selection by default', () => {
      selectionManager.select(mockObjects[0])
      selectionManager.select(mockObjects[1])

      expect(selectionManager.selectedObjects.length).toBe(1)
      expect(selectionManager.selectedObjects.contains(mockObjects[1])).toBe(true)
    })
  })

  describe('Selection Tools', () => {
    let mockObjects

    beforeEach(() => {
      mockObjects = [
        {
          visible: true,
          userData: { nodeId: 'node-1', type: 'box' },
          geometry: { type: 'BoxGeometry' },
          parent: {}
        },
        {
          visible: true,
          userData: { nodeId: 'node-2', type: 'box' },
          geometry: { type: 'BoxGeometry' },
          parent: {}
        },
        {
          visible: true,
          userData: { nodeId: 'node-3', type: 'sphere' },
          geometry: { type: 'SphereGeometry' },
          parent: {}
        }
      ]

      // Mock _getAllSelectableObjects to return our test objects
      selectionManager._getAllSelectableObjects = vi.fn(() => mockObjects)
    })

    it('should select all objects', () => {
      const count = selectionManager.selectAll()

      expect(count).toBe(3)
      expect(selectionManager.selectedObjects.length).toBe(3)
    })

    it('should invert selection', () => {
      selectionManager.select(mockObjects[0])
      selectionManager.invertSelection()

      expect(selectionManager.selectedObjects.length).toBe(2)
      expect(selectionManager.selectedObjects.contains(mockObjects[0])).toBe(false)
      expect(selectionManager.selectedObjects.contains(mockObjects[1])).toBe(true)
      expect(selectionManager.selectedObjects.contains(mockObjects[2])).toBe(true)
    })

    it('should select by type', () => {
      const count = selectionManager.selectByType('box')

      expect(count).toBe(2)
      mockObjects.slice(0, 2).forEach(obj => {
        expect(selectionManager.selectedObjects.contains(obj)).toBe(true)
      })
    })

    it('should select similar objects', () => {
      const count = selectionManager.selectSimilar(mockObjects[0], ['type'])

      expect(count).toBe(2) // Both box objects
    })
  })

  describe('Selection Filters', () => {
    let mockObjects

    beforeEach(() => {
      mockObjects = [
        {
          visible: true,
          userData: { nodeId: 'node-1', locked: false },
          geometry: { type: 'BoxGeometry' },
          parent: {}
        },
        {
          visible: false,
          userData: { nodeId: 'node-2', locked: false },
          geometry: { type: 'SphereGeometry' },
          parent: {}
        },
        {
          visible: true,
          userData: { nodeId: 'node-3', locked: true },
          geometry: { type: 'CylinderGeometry' },
          parent: {}
        }
      ]
    })

    it('should filter visible objects', () => {
      selectionManager.enableFilter('visible')

      expect(selectionManager._isSelectable(mockObjects[0])).toBe(true)
      expect(selectionManager._isSelectable(mockObjects[1])).toBe(false) // Not visible
    })

    it('should filter unlocked objects', () => {
      selectionManager.enableFilter('unlocked')

      expect(selectionManager._isSelectable(mockObjects[0])).toBe(true)
      expect(selectionManager._isSelectable(mockObjects[2])).toBe(false) // Locked
    })

    it('should add custom filters', () => {
      selectionManager.addFilter('customFilter', (obj) => obj.userData.nodeId.includes('1'))
      selectionManager.enableFilter('customFilter')

      expect(selectionManager._isSelectable(mockObjects[0])).toBe(true) // node-1
      expect(selectionManager._isSelectable(mockObjects[1])).toBe(false) // node-2
    })
  })

  describe('Box Selection', () => {
    it('should start box selection', () => {
      const startPoint = { x: 100, y: 100 }
      selectionManager.startBoxSelection(startPoint)

      expect(selectionManager.isBoxSelecting).toBe(true)
      expect(selectionManager.boxSelectionStart).toEqual(startPoint)
    })

    it('should update box selection', () => {
      const startPoint = { x: 100, y: 100 }
      const currentPoint = { x: 200, y: 200 }

      selectionManager.startBoxSelection(startPoint)
      selectionManager.updateBoxSelection(currentPoint)

      expect(selectionManager.boxSelectionEnd).toEqual(currentPoint)
    })

    it('should end box selection', () => {
      const startPoint = { x: 100, y: 100 }
      const endPoint = { x: 200, y: 200 }

      selectionManager.startBoxSelection(startPoint)
      selectionManager.updateBoxSelection(endPoint)

      // Mock _performBoxSelection
      selectionManager._performBoxSelection = vi.fn(() => 2)

      const count = selectionManager.endBoxSelection()

      expect(selectionManager.isBoxSelecting).toBe(false)
      expect(count).toBe(2)
    })

    it('should cancel box selection', () => {
      selectionManager.startBoxSelection({ x: 100, y: 100 })
      selectionManager.cancelBoxSelection()

      expect(selectionManager.isBoxSelecting).toBe(false)
      expect(selectionManager.boxSelectionStart).toBeNull()
    })
  })

  describe('Selection History', () => {
    let mockObject

    beforeEach(() => {
      mockObject = {
        visible: true,
        userData: { nodeId: 'test-node' },
        geometry: { type: 'BoxGeometry' },
        parent: {}
      }
    })

    it('should save selection state to history', () => {
      selectionManager.select(mockObject)

      expect(selectionManager.selectionHistory.length).toBeGreaterThan(0)
      expect(selectionManager.historyIndex).toBeGreaterThanOrEqual(0)
    })

    it('should undo selection', () => {
      // Initial state (empty)
      selectionManager._saveSelectionState()

      // Select object
      selectionManager.select(mockObject, { silent: true })
      selectionManager._saveSelectionState()

      // Undo should go back to empty selection
      const undone = selectionManager.undoSelection()

      expect(undone).toBe(true)
      expect(selectionManager.selectedObjects.length).toBe(0)
    })

    it('should redo selection', () => {
      // Save initial empty state
      selectionManager._saveSelectionState()

      // Select and save
      selectionManager.select(mockObject, { silent: true })
      selectionManager._saveSelectionState()

      // Undo
      selectionManager.undoSelection()

      // Redo should restore selection
      const redone = selectionManager.redoSelection()

      expect(redone).toBe(true)
      expect(selectionManager.selectedObjects.length).toBe(1)
    })
  })

  describe('Event Handling', () => {
    it('should handle property changes', () => {
      let changeNotified = false

      selectionManager.onPropertyChanged('selectionChanged', () => {
        changeNotified = true
      })

      const mockObject = {
        visible: true,
        userData: { nodeId: 'test' },
        geometry: { type: 'BoxGeometry' },
        parent: {}
      }

      selectionManager.select(mockObject)

      expect(changeNotified).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of objects efficiently', () => {
      const largeObjectSet = []
      for (let i = 0; i < 1000; i++) {
        largeObjectSet.push({
          visible: true,
          userData: { nodeId: `node-${i}`, type: 'box' },
          geometry: { type: 'BoxGeometry' },
          parent: {}
        })
      }

      const startTime = performance.now()
      selectionManager.select(largeObjectSet)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(selectionManager.selectedObjects.length).toBe(1000)
    })
  })

  describe('Disposal', () => {
    it('should clean up resources on dispose', () => {
      const mockObject = {
        visible: true,
        userData: { nodeId: 'test' },
        geometry: { type: 'BoxGeometry' },
        parent: {}
      }

      selectionManager.select(mockObject)
      selectionManager.dispose()

      expect(selectionManager.document).toBeNull()
      expect(selectionManager.threeView).toBeNull()
      expect(selectionManager.selectionHistory.length).toBe(0)
    })
  })
})

