/**
 * ObservableCollection - Reactive collection class with change notifications
 * Extends Observable to provide array-like operations with Vue integration
 */
import { Observable } from './Observable.js'

/**
 * Collection change action types
 */
export const CollectionAction = {
  ADD: 'add',
  REMOVE: 'remove',
  MOVE: 'move',
  REPLACE: 'replace',
  CLEAR: 'clear'
}

/**
 * Collection change event arguments
 */
export class CollectionChangedArgs {
  constructor(action, items = [], index = -1, fromIndex = -1, toIndex = -1) {
    this.action = action
    this.items = items
    this.index = index
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.timestamp = Date.now()
  }
}

/**
 * ObservableCollection - Reactive collection with change notifications
 * Extends Observable to provide array-like operations
 */
export class ObservableCollection extends Observable {
  constructor(...items) {
    super()
    this._items = [...items]
    this._callbacks = new Set()
    
    // Don't notify during initialization
    // Initialize length property
    this.setProperty('length', this._items.length)
  }

  /**
   * Get the underlying items array (read-only)
   * @returns {Array} Copy of the items array
   */
  get items() {
    return [...this._items]
  }

  /**
   * Get the length of the collection
   * @returns {number} Number of items in the collection
   */
  get length() {
    return this._items.length
  }

  /**
   * Get the count of items (alias for length)
   * @returns {number} Number of items in the collection
   */
  get count() {
    return this._items.length
  }

  /**
   * Add one or more items to the collection
   * @param {...any} items - Items to add
   */
  add(...items) {
    if (items.length === 0) return

    this._items.push(...items)
    this._notifyCollectionChanged(CollectionAction.ADD, items)
    this._updateLengthProperty()
  }

  /**
   * Add an item at a specific index
   * @param {number} index - Index to insert at
   * @param {any} item - Item to add
   */
  insert(index, item) {
    if (index < 0 || index > this._items.length) {
      throw new Error(`Index ${index} is out of bounds`)
    }

    this._items.splice(index, 0, item)
    this._notifyCollectionChanged(CollectionAction.ADD, [item], index)
    this._updateLengthProperty()
  }

  /**
   * Remove one or more items from the collection
   * @param {...any} items - Items to remove
   * @returns {boolean} True if any items were removed
   */
  remove(...items) {
    if (items.length === 0) return false

    const itemSet = new Set(items)
    const originalLength = this._items.length
    this._items = this._items.filter(item => !itemSet.has(item))
    
    const removedCount = originalLength - this._items.length
    if (removedCount > 0) {
      this._notifyCollectionChanged(CollectionAction.REMOVE, items)
      this._updateLengthProperty()
      return true
    }
    
    return false
  }

  /**
   * Remove item at specific index
   * @param {number} index - Index of item to remove
   * @returns {any} The removed item or undefined
   */
  removeAt(index) {
    if (index < 0 || index >= this._items.length) {
      return undefined
    }

    const removedItem = this._items.splice(index, 1)[0]
    this._notifyCollectionChanged(CollectionAction.REMOVE, [removedItem], index)
    this._updateLengthProperty()
    return removedItem
  }

  /**
   * Move an item from one index to another
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Destination index
   * @returns {boolean} True if move was successful
   */
  move(fromIndex, toIndex) {
    if (!this._isValidMove(fromIndex, toIndex)) {
      return false
    }

    const items = this._items.splice(fromIndex, 1)
    this._items.splice(toIndex, 0, ...items)
    
    this._notifyCollectionChanged(CollectionAction.MOVE, items, toIndex, fromIndex, toIndex)
    return true
  }

  /**
   * Replace item at specific index
   * @param {number} index - Index to replace
   * @param {any} newItem - New item
   * @returns {any} The old item or undefined
   */
  replace(index, newItem) {
    if (index < 0 || index >= this._items.length) {
      return undefined
    }

    const oldItem = this._items[index]
    this._items[index] = newItem
    
    this._notifyCollectionChanged(CollectionAction.REPLACE, [newItem], index, index, index)
    return oldItem
  }

  /**
   * Clear all items from the collection
   */
  clear() {
    if (this._items.length === 0) return

    const items = [...this._items]
    this._items = []
    
    this._notifyCollectionChanged(CollectionAction.CLEAR, items)
    this._updateLengthProperty()
  }

  /**
   * Get item at specific index
   * @param {number} index - Index of item
   * @returns {any} Item at index or undefined
   */
  get(index) {
    return this._items[index]
  }

  /**
   * Get item at specific index (alias for get)
   * @param {number} index - Index of item
   * @returns {any} Item at index or undefined
   */
  item(index) {
    return this.get(index)
  }

  /**
   * Get item at specific index with negative index support
   * @param {number} index - Index of item (can be negative)
   * @returns {any} Item at index or undefined
   */
  at(index) {
    return this._items.at(index)
  }

  /**
   * Find index of an item
   * @param {any} item - Item to find
   * @param {number} fromIndex - Starting index for search
   * @returns {number} Index of item or -1 if not found
   */
  indexOf(item, fromIndex = 0) {
    return this._items.indexOf(item, fromIndex)
  }

  /**
   * Check if collection contains an item
   * @param {any} item - Item to check
   * @returns {boolean} True if item is in collection
   */
  contains(item) {
    return this._items.indexOf(item) !== -1
  }

  /**
   * Check if collection has an item (alias for contains)
   * @param {any} item - Item to check
   * @returns {boolean} True if item is in collection
   */
  has(item) {
    return this.contains(item)
  }

  /**
   * Find first item that matches predicate
   * @param {Function} predicate - Function to test each item
   * @returns {any} First matching item or undefined
   */
  find(predicate) {
    return this._items.find(predicate)
  }

  /**
   * Find index of first item that matches predicate
   * @param {Function} predicate - Function to test each item
   * @returns {number} Index of first matching item or -1
   */
  findIndex(predicate) {
    return this._items.findIndex(predicate)
  }

  /**
   * Filter items that match predicate
   * @param {Function} predicate - Function to test each item
   * @returns {Array} Array of matching items
   */
  filter(predicate) {
    return this._items.filter(predicate)
  }

  /**
   * Map items using transform function
   * @param {Function} transform - Function to transform each item
   * @returns {Array} Array of transformed items
   */
  map(transform) {
    return this._items.map(transform)
  }

  /**
   * Execute function for each item
   * @param {Function} callback - Function to execute for each item
   */
  forEach(callback) {
    this._items.forEach((item, index) => {
      callback(item, index)
    })
  }

  /**
   * Reduce items to a single value
   * @param {Function} reducer - Function to reduce items
   * @param {any} initialValue - Initial value for reduction
   * @returns {any} Reduced value
   */
  reduce(reducer, initialValue) {
    return this._items.reduce(reducer, initialValue)
  }

  /**
   * Check if all items match predicate
   * @param {Function} predicate - Function to test each item
   * @returns {boolean} True if all items match
   */
  every(predicate) {
    return this._items.every(predicate)
  }

  /**
   * Check if any items match predicate
   * @param {Function} predicate - Function to test each item
   * @returns {boolean} True if any items match
   */
  some(predicate) {
    return this._items.some(predicate)
  }

  /**
   * Subscribe to collection changes
   * @param {Function} callback - Function to call when collection changes
   * @returns {Function} Unsubscribe function
   */
  onCollectionChanged(callback) {
    this._callbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this._callbacks.delete(callback)
    }
  }

  /**
   * Subscribe to item added events
   * @param {Function} callback - Function to call when items are added
   * @returns {Function} Unsubscribe function
   */
  onItemAdded(callback) {
    const wrappedCallback = (args) => {
      if (args.action === CollectionAction.ADD) {
        callback(args.items, args.index)
      }
    }
    
    this._callbacks.add(wrappedCallback)
    
    return () => {
      this._callbacks.delete(wrappedCallback)
    }
  }

  /**
   * Subscribe to item removed events
   * @param {Function} callback - Function to call when items are removed
   * @returns {Function} Unsubscribe function
   */
  onItemRemoved(callback) {
    const wrappedCallback = (args) => {
      if (args.action === CollectionAction.REMOVE || args.action === CollectionAction.CLEAR) {
        callback(args.items, args.index)
      }
    }
    
    this._callbacks.add(wrappedCallback)
    
    return () => {
      this._callbacks.delete(wrappedCallback)
    }
  }

  /**
   * Subscribe to item moved events
   * @param {Function} callback - Function to call when items are moved
   * @returns {Function} Unsubscribe function
   */
  onItemMoved(callback) {
    const wrappedCallback = (args) => {
      if (args.action === CollectionAction.MOVE) {
        callback(args.items, args.fromIndex, args.toIndex)
      }
    }
    
    this._callbacks.add(wrappedCallback)
    
    return () => {
      this._callbacks.delete(wrappedCallback)
    }
  }

  /**
   * Subscribe to item replaced events
   * @param {Function} callback - Function to call when items are replaced
   * @returns {Function} Unsubscribe function
   */
  onItemReplaced(callback) {
    const wrappedCallback = (args) => {
      if (args.action === CollectionAction.REPLACE) {
        callback(args.items[0], args.index)
      }
    }
    
    this._callbacks.add(wrappedCallback)
    
    return () => {
      this._callbacks.delete(wrappedCallback)
    }
  }

  /**
   * Remove collection change callback
   * @param {Function} callback - Callback to remove
   */
  removeCollectionChanged(callback) {
    this._callbacks.delete(callback)
  }

  /**
   * Clear all collection change callbacks
   */
  clearCollectionChanged() {
    this._callbacks.clear()
  }

  /**
   * Get array representation of collection
   * @returns {Array} Copy of items array
   */
  toArray() {
    return [...this._items]
  }

  /**
   * Convert collection to string
   * @returns {string} String representation
   */
  toString() {
    return `ObservableCollection(${this._items.length} items)`
  }

  /**
   * Iterator support for for...of loops
   * @returns {Iterator} Iterator for collection items
   */
  [Symbol.iterator]() {
    return this._items[Symbol.iterator]()
  }

  /**
   * Check if move operation is valid
   * @private
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Destination index
   * @returns {boolean} True if move is valid
   */
  _isValidMove(fromIndex, toIndex) {
    return fromIndex !== toIndex && 
           fromIndex >= 0 && 
           fromIndex < this._items.length && 
           toIndex >= 0 && 
           toIndex < this._items.length
  }

  /**
   * Notify collection change to all callbacks
   * @private
   * @param {string} action - Action type
   * @param {Array} items - Items involved
   * @param {number} index - Index of change
   * @param {number} fromIndex - Source index for moves
   * @param {number} toIndex - Destination index for moves
   */
  _notifyCollectionChanged(action, items, index = -1, fromIndex = -1, toIndex = -1) {
    const args = new CollectionChangedArgs(action, items, index, fromIndex, toIndex)
    
    this._callbacks.forEach(callback => {
      try {
        callback(args)
      } catch (error) {
        console.error('Error in collection change callback:', error)
      }
    })
  }

  /**
   * Update the length property to trigger change notifications
   * @private
   */
  _updateLengthProperty() {
    this.setProperty('length', this._items.length)
  }

  /**
   * Dispose of the collection (cleanup all callbacks and items)
   */
  dispose() {
    this.clearCollectionChanged()
    this._items.length = 0
    super.dispose()
  }
} 