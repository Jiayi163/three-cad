/**
 * Observable - Base observable object class
 * Provides property change notification mechanism, integrated with Vue reactivity system
 */
export class Observable {
  constructor() {
    this._properties = new Map()
    this._listeners = new Map()
  }

  /**
   * Set property value
   * @param {string} name - Property name
   * @param {any} value - Property value
   */
  setProperty(name, value) {
    const oldValue = this._properties.get(name)
    if (oldValue !== value) {
      this._properties.set(name, value)
      this._notifyPropertyChanged(name, value, oldValue)
    }
  }

  /**
   * Get property value
   * @param {string} name - Property name
   * @returns {any} Property value
   */
  getProperty(name) {
    return this._properties.get(name)
  }

  /**
   * Check if property exists
   * @param {string} name - Property name
   * @returns {boolean} True if property exists
   */
  hasProperty(name) {
    return this._properties.has(name)
  }

  /**
   * Get all property names
   * @returns {string[]} Array of property names
   */
  getPropertyNames() {
    return Array.from(this._properties.keys())
  }

  /**
   * Subscribe to property changes
   * @param {string} name - Property name to watch
   * @param {Function} callback - Callback function (newValue, oldValue, propertyName) => void
   * @returns {Function} Unsubscribe function
   */
  onPropertyChanged(name, callback) {
    if (!this._listeners.has(name)) {
      this._listeners.set(name, [])
    }
    
    const callbacks = this._listeners.get(name)
    callbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to all property changes
   * @param {Function} callback - Callback function (propertyName, newValue, oldValue) => void
   * @returns {Function} Unsubscribe function
   */
  onAnyPropertyChanged(callback) {
    const listeners = []
    
    // Subscribe to existing properties
    this._properties.forEach((value, name) => {
      listeners.push(this.onPropertyChanged(name, (newValue, oldValue, propertyName) => {
        callback(propertyName, newValue, oldValue)
      }))
    })
    
    // Store callback for new properties
    if (!this._globalListeners) {
      this._globalListeners = []
    }
    this._globalListeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      listeners.forEach(unsubscribe => unsubscribe())
      if (this._globalListeners) {
        const index = this._globalListeners.indexOf(callback)
        if (index > -1) {
          this._globalListeners.splice(index, 1)
        }
      }
    }
  }

  /**
   * Remove property
   * @param {string} name - Property name
   * @returns {boolean} True if property was removed
   */
  removeProperty(name) {
    if (this._properties.has(name)) {
      const oldValue = this._properties.get(name)
      this._properties.delete(name)
      this._notifyPropertyChanged(name, undefined, oldValue)
      return true
    }
    return false
  }

  /**
   * Clear all properties
   */
  clearProperties() {
    const propertyNames = this.getPropertyNames()
    propertyNames.forEach(name => {
      this.removeProperty(name)
    })
  }

  /**
   * Notify property change to all listeners
   * @private
   * @param {string} name - Property name
   * @param {any} newValue - New property value
   * @param {any} oldValue - Old property value
   */
  _notifyPropertyChanged(name, newValue, oldValue) {
    // Notify specific property listeners
    const callbacks = this._listeners.get(name)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newValue, oldValue, name)
        } catch (error) {
          console.error(`Error in property change callback for "${name}":`, error)
        }
      })
    }
    
    // Notify global listeners
    if (this._globalListeners) {
      this._globalListeners.forEach(callback => {
        try {
          callback(name, newValue, oldValue)
        } catch (error) {
          console.error(`Error in global property change callback:`, error)
        }
      })
    }
  }

  /**
   * Dispose of the observable (cleanup all listeners)
   */
  dispose() {
    this._listeners.clear()
    this._properties.clear()
    if (this._globalListeners) {
      this._globalListeners.length = 0
    }
  }
} 