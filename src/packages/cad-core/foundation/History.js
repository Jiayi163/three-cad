/**
 * History - Undo/Redo system with command pattern
 * Provides transaction support and command history management
 */
import { Observable } from './Observable.js'

/**
 * History record interface
 */
export class IHistoryRecord {
  constructor(name) {
    this.name = name
  }

  /**
   * Execute undo operation
   */
  undo() {
    throw new Error('undo() method must be implemented')
  }

  /**
   * Execute redo operation
   */
  redo() {
    throw new Error('redo() method must be implemented')
  }

  /**
   * Dispose of the record
   */
  dispose() {
    // Default implementation - override if needed
  }
}

/**
 * Property change history record
 */
export class PropertyHistoryRecord extends IHistoryRecord {
  constructor(object, property, oldValue, newValue) {
    super(`Change ${String(property)} property`)
    this.object = object
    this.property = property
    this.oldValue = oldValue
    this.newValue = newValue
  }

  undo() {
    this.object[this.property] = this.oldValue
  }

  redo() {
    this.object[this.property] = this.newValue
  }
}

/**
 * Collection change history record
 */
export class CollectionHistoryRecord extends IHistoryRecord {
  constructor(collection, action, items, index, fromIndex, toIndex) {
    super(`Collection ${action} operation`)
    this.collection = collection
    this.action = action
    this.items = items
    this.index = index
    this.fromIndex = fromIndex
    this.toIndex = toIndex
  }

      undo() {
      switch (this.action) {
        case 'add':
          // 逆序删除，保证顺序一致
          for (let i = this.items.length - 1; i >= 0; i--) {
            this.collection.remove(this.items[i])
          }
          break
        case 'remove':
          if (this.index >= 0) {
            // 顺序插入到index + i，保证顺序一致
            for (let i = 0; i < this.items.length; i++) {
              this.collection.insert(this.index + i, this.items[i])
            }
          } else {
            for (let i = this.items.length - 1; i >= 0; i--) {
              this.collection.add(this.items[i])
            }
          }
          break
        case 'move':
          this.collection.move(this.toIndex, this.fromIndex)
          break
        case 'replace':
          // For replace, items[0] is the new value, we need to restore the original
          // The original value should be stored in items[1] or we need to handle this differently
          if (this.items.length > 1) {
            this.collection.replace(this.index, this.items[1]) // Original value
          } else {
            // If we don't have the original value, we can't undo replace
            console.warn('Cannot undo replace operation - original value not stored')
          }
          break
        case 'clear':
          this.collection.add(...this.items)
          break
      }
    }

      redo() {
      switch (this.action) {
        case 'add':
          if (this.index >= 0) {
            this.collection.insert(this.index, ...this.items)
          } else {
            this.collection.add(...this.items)
          }
          break
        case 'remove':
          this.collection.remove(...this.items)
          break
        case 'move':
          this.collection.move(this.fromIndex, this.toIndex)
          break
        case 'replace':
          // For replace, items[0] is the new value
          this.collection.replace(this.index, this.items[0])
          break
        case 'clear':
          this.collection.clear()
          break
      }
    }
}

/**
 * Composite history record for multiple operations
 */
export class CompositeHistoryRecord extends IHistoryRecord {
  constructor(name, records = []) {
    super(name)
    this.records = records
  }

  undo() {
    // Execute undo in reverse order
    for (let i = this.records.length - 1; i >= 0; i--) {
      this.records[i].undo()
    }
  }

  redo() {
    // Execute redo in forward order
    for (let i = 0; i < this.records.length; i++) {
      this.records[i].redo()
    }
  }

  dispose() {
    this.records.forEach(record => record.dispose())
    this.records.length = 0
  }
}

/**
 * History - Main history management class
 * Extends Observable to provide change notifications
 */
export class History extends Observable {
  constructor(undoLimit = 50) {
    super()
    this._undos = []
    this._redos = []
    this._undoLimit = undoLimit
    this._disabled = false
    this._transactionRecords = []
    this._inTransaction = false
    
    // Initialize properties
    this.setProperty('canUndo', false)
    this.setProperty('canRedo', false)
    this.setProperty('undoCount', 0)
    this.setProperty('redoCount', 0)
  }

  /**
   * Get undo limit
   * @returns {number} Maximum number of undo operations
   */
  get undoLimit() {
    return this._undoLimit
  }

  /**
   * Set undo limit
   * @param {number} limit - New undo limit
   */
  set undoLimit(limit) {
    this._undoLimit = limit
    this._enforceLimit()
  }

  /**
   * Check if history is disabled
   * @returns {boolean} True if history is disabled
   */
  get disabled() {
    return this._disabled
  }

  /**
   * Set disabled state
   * @param {boolean} disabled - Disabled state
   */
  set disabled(disabled) {
    this._disabled = disabled
  }

  /**
   * Check if undo is possible
   * @returns {boolean} True if undo is possible
   */
  get canUndo() {
    return this._undos.length > 0 && !this._disabled
  }

  /**
   * Check if redo is possible
   * @returns {boolean} True if redo is possible
   */
  get canRedo() {
    return this._redos.length > 0 && !this._disabled
  }

  /**
   * Get number of undo operations available
   * @returns {number} Number of undo operations
   */
  get undoCount() {
    return this._undos.length
  }

  /**
   * Get number of redo operations available
   * @returns {number} Number of redo operations
   */
  get redoCount() {
    return this._redos.length
  }

  /**
   * Add a history record
   * @param {IHistoryRecord} record - History record to add
   */
  add(record) {
    if (this._disabled || !record) {
      return
    }

    // Clear redo stack when new operation is added
    this._clearRedos()

    // Add to undo stack
    this._undos.push(record)

    // Enforce undo limit
    this._enforceLimit()

    // Update properties
    this._updateProperties()
  }

  /**
   * Execute undo operation
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (!this.canUndo) {
      return false
    }

    try {
      this._disabled = true
      const record = this._undos.pop()
      record.undo()
      this._redos.push(record)
      return true
    } catch (error) {
      console.error('Error during undo operation:', error)
      return false
    } finally {
      this._disabled = false
      this._updateProperties()
    }
  }

  /**
   * Execute redo operation
   * @returns {boolean} True if redo was successful
   */
  redo() {
    if (!this.canRedo) {
      return false
    }

    try {
      this._disabled = true
      const record = this._redos.pop()
      record.redo()
      this._undos.push(record)
      return true
    } catch (error) {
      console.error('Error during redo operation:', error)
      return false
    } finally {
      this._disabled = false
      this._updateProperties()
    }
  }

  /**
   * Begin a transaction
   * @param {string} name - Transaction name
   */
  beginTransaction(name = 'Transaction') {
    if (this._inTransaction) {
      console.warn('Transaction already in progress')
      return
    }

    this._inTransaction = true
    this._transactionRecords = []
    this._transactionName = name
  }

  /**
   * End current transaction
   * @returns {boolean} True if transaction was ended successfully
   */
  endTransaction() {
    if (!this._inTransaction) {
      console.warn('No transaction in progress')
      return false
    }

    if (this._transactionRecords.length > 0) {
      const compositeRecord = new CompositeHistoryRecord(
        this._transactionName,
        this._transactionRecords
      )
      this.add(compositeRecord)
    }

    this._inTransaction = false
    this._transactionRecords = []
    this._transactionName = null

    return true
  }

  /**
   * Cancel current transaction
   */
  cancelTransaction() {
    if (!this._inTransaction) {
      return
    }

    // Undo all records in transaction
    for (let i = this._transactionRecords.length - 1; i >= 0; i--) {
      this._transactionRecords[i].undo()
    }

    // Dispose records
    this._transactionRecords.forEach(record => record.dispose())

    this._inTransaction = false
    this._transactionRecords = []
    this._transactionName = null
  }

  /**
   * Add record to current transaction
   * @param {IHistoryRecord} record - Record to add to transaction
   */
  addToTransaction(record) {
    if (!this._inTransaction) {
      this.add(record)
    } else {
      this._transactionRecords.push(record)
    }
  }

  /**
   * Clear all history
   */
  clear() {
    this._clearUndos()
    this._clearRedos()
    this._updateProperties()
  }

  /**
   * Clear undo stack
   */
  clearUndo() {
    this._clearUndos()
    this._updateProperties()
  }

  /**
   * Clear redo stack
   */
  clearRedo() {
    this._clearRedos()
    this._updateProperties()
  }

  /**
   * Get all undo records
   * @returns {IHistoryRecord[]} Array of undo records
   */
  getUndoRecords() {
    return [...this._undos]
  }

  /**
   * Get all redo records
   * @returns {IHistoryRecord[]} Array of redo records
   */
  getRedoRecords() {
    return [...this._redos]
  }

  /**
   * Subscribe to undo state changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onUndoStateChanged(callback) {
    return this.onPropertyChanged('canUndo', callback)
  }

  /**
   * Subscribe to redo state changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onRedoStateChanged(callback) {
    return this.onPropertyChanged('canRedo', callback)
  }

  /**
   * Subscribe to undo count changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onUndoCountChanged(callback) {
    return this.onPropertyChanged('undoCount', callback)
  }

  /**
   * Subscribe to redo count changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onRedoCountChanged(callback) {
    return this.onPropertyChanged('redoCount', callback)
  }

  /**
   * Create property change record
   * @param {object} object - Object with property
   * @param {string} property - Property name
   * @param {any} oldValue - Old property value
   * @param {any} newValue - New property value
   * @returns {PropertyHistoryRecord} Property history record
   */
  createPropertyRecord(object, property, oldValue, newValue) {
    return new PropertyHistoryRecord(object, property, oldValue, newValue)
  }

  /**
   * Create collection change record
   * @param {ObservableCollection} collection - Collection object
   * @param {string} action - Action type
   * @param {Array} items - Items involved
   * @param {number} index - Index of change
   * @param {number} fromIndex - Source index for moves
   * @param {number} toIndex - Destination index for moves
   * @returns {CollectionHistoryRecord} Collection history record
   */
  createCollectionRecord(collection, action, items, index = -1, fromIndex = -1, toIndex = -1) {
    return new CollectionHistoryRecord(collection, action, items, index, fromIndex, toIndex)
  }

  /**
   * Create composite record
   * @param {string} name - Record name
   * @param {IHistoryRecord[]} records - Array of records
   * @returns {CompositeHistoryRecord} Composite history record
   */
  createCompositeRecord(name, records) {
    return new CompositeHistoryRecord(name, records)
  }

  /**
   * Clear undo stack
   * @private
   */
  _clearUndos() {
    this._undos.forEach(record => record.dispose())
    this._undos.length = 0
  }

  /**
   * Clear redo stack
   * @private
   */
  _clearRedos() {
    this._redos.forEach(record => record.dispose())
    this._redos.length = 0
  }

  /**
   * Enforce undo limit
   * @private
   */
  _enforceLimit() {
    while (this._undos.length > this._undoLimit) {
      const removed = this._undos.shift()
      removed.dispose()
    }
  }

  /**
   * Update observable properties
   * @private
   */
  _updateProperties() {
    this.setProperty('canUndo', this.canUndo)
    this.setProperty('canRedo', this.canRedo)
    this.setProperty('undoCount', this.undoCount)
    this.setProperty('redoCount', this.redoCount)
  }

  /**
   * Dispose of the history system
   */
  dispose() {
    this.clear()
    super.dispose()
  }
} 