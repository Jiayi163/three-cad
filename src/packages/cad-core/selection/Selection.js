/**
 * Selection - Main selection interface for CAD application
 *
 * Provides a simplified API for selection operations while delegating
 * complex functionality to SelectionManager
 */

import { SelectionManager } from './SelectionManager.js'

export class Selection {
  constructor(document, threeView) {
    this.manager = new SelectionManager(document, threeView)

    // Expose commonly used properties
    this.selectedObjects = this.manager.selectedObjects
    this.selectedNodes = this.manager.selectedNodes
  }

  // ==================== Basic Selection API ====================

  /**
   * Select objects
   * @param {Array|Object} objects - Objects to select
   * @param {Boolean} addToSelection - Whether to add to current selection
   */
  select(objects, addToSelection = false) {
    return this.manager.select(objects, { addToSelection })
  }

  /**
   * Deselect objects
   * @param {Array|Object} objects - Objects to deselect
   */
  deselect(objects) {
    return this.manager.deselect(objects)
  }

  /**
   * Clear all selection
   */
  clear() {
    return this.manager.clearSelection()
  }

  /**
   * Toggle selection of objects
   * @param {Array|Object} objects - Objects to toggle
   */
  toggle(objects) {
    return this.manager.toggleSelection(objects)
  }

  // ==================== Advanced Selection Tools ====================

  /**
   * Select all objects
   */
  selectAll() {
    return this.manager.selectAll()
  }

  /**
   * Invert selection
   */
  invert() {
    return this.manager.invertSelection()
  }

  /**
   * Select similar objects
   * @param {Object} referenceObject - Object to match against
   * @param {Array} properties - Properties to match
   */
  selectSimilar(referenceObject, properties = ['type']) {
    return this.manager.selectSimilar(referenceObject, properties)
  }

  /**
   * Select objects by type
   * @param {String} type - Object type
   */
  selectByType(type) {
    return this.manager.selectByType(type)
  }

  // ==================== Selection State ====================

  /**
   * Get selection count
   */
  get count() {
    return this.manager.selectedObjects.length
  }

  /**
   * Check if has selection
   */
  get hasSelection() {
    return this.count > 0
  }

  /**
   * Get selection info
   */
  getInfo() {
    return this.manager.getSelectionInfo()
  }

  // ==================== Event Handling ====================

  /**
   * Listen to selection changes
   * @param {Function} callback - Callback function
   */
  onChange(callback) {
    return this.manager.onPropertyChanged('selectionChanged', callback)
  }

  /**
   * Remove selection change listener
   * @param {Function} callback - Callback function to remove
   */
  offChange(callback) {
    return this.manager.offPropertyChanged('selectionChanged', callback)
  }

  // ==================== History ====================

  /**
   * Undo selection change
   */
  undo() {
    return this.manager.undoSelection()
  }

  /**
   * Redo selection change
   */
  redo() {
    return this.manager.redoSelection()
  }

  // ==================== Filters ====================

  /**
   * Enable selection filter
   * @param {String} filterName - Filter name
   */
  enableFilter(filterName) {
    return this.manager.enableFilter(filterName)
  }

  /**
   * Disable selection filter
   * @param {String} filterName - Filter name
   */
  disableFilter(filterName) {
    return this.manager.disableFilter(filterName)
  }

  // ==================== Cleanup ====================

  /**
   * Dispose of selection system
   */
  dispose() {
    if (this.manager) {
      this.manager.dispose()
      this.manager = null
    }
  }
}

export default Selection

