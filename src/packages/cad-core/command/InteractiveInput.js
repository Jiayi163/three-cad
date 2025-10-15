/**
 * Interactive Input System - For getting user input in commands
 *
 * Provides methods for getting various types of user input:
 * - Points in 3D space
 * - Numeric values (distances, angles, scale factors)
 * - Text input
 * - Interactive drag operations
 */

import { Observable } from '../foundation/Observable.js'
import * as THREE from 'three'

/**
 * Interactive input manager for CAD commands
 */
export class InteractiveInput extends Observable {
  constructor(application) {
    super()

    this.application = application
    this.isActive = false
    this.currentPrompt = ''
    this.inputType = null

    // Event handlers
    this._boundHandlers = {
      keyDown: this._onKeyDown.bind(this),
      keyUp: this._onKeyUp.bind(this),
      mouseDown: this._onMouseDown.bind(this),
      mouseMove: this._onMouseMove.bind(this),
      mouseUp: this._onMouseUp.bind(this)
    }

    // Input state
    this._currentResolver = null
    this._currentRejecter = null
    this._isDragging = false
    this._startPoint = null
    this._currentValue = null

    // Preview callback
    this._previewCallback = null
  }

  /**
   * Get a point in 3D space from user click
   * @param {string} prompt - Prompt message for user
   * @param {Object} options - Options for point input
   * @returns {Promise<{x: number, y: number, z: number}>}
   */
  async getPoint(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      this._setupInput('point', prompt, resolve, reject, options)

      // Find the ThreeView instance from the Vue component
      const threeView = this._getThreeView()
      if (!threeView) {
        reject(new Error('No active 3D view available'))
        return
      }

      // Add click handler for point selection
      const handleClick = (event) => {
        const point = this._screenToWorld(event.clientX, event.clientY)
        if (point) {
          this._cleanup()
          resolve(point)
        }
      }

      threeView.renderer.domElement.addEventListener('click', handleClick)
      this._clickHandler = handleClick
      this._targetElement = threeView.renderer.domElement
    })
  }

  /**
   * Get a numeric value from user input (keyboard or drag)
   * @param {string} prompt - Prompt message for user
   * @param {Object} options - Options for numeric input
   * @returns {Promise<number>}
   */
  async getNumber(prompt, options = {}) {
    const {
      defaultValue = 1,
      min = -Infinity,
      max = Infinity,
      step = 0.1,
      allowDrag = true,
      unit = ''
    } = options

    return new Promise((resolve, reject) => {
      this._setupInput('number', prompt, resolve, reject, options)

      let currentValue = defaultValue
      let isDragging = false
      let startY = 0
      let startValue = defaultValue

      // Show input dialog or enable drag mode
      this._showNumericInput(prompt, currentValue, unit, (value) => {
        const clampedValue = Math.max(min, Math.min(max, value))
        if (this._previewCallback) {
          this._previewCallback(clampedValue)
        }
        return clampedValue
      })

      // Keyboard input handling
      const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          this._cleanup()
          resolve(currentValue)
        } else if (event.key === 'Escape') {
          this._cleanup()
          reject(new Error('Input cancelled'))
        }
      }

      // Drag input handling (if enabled)
      const handleMouseDown = (event) => {
        if (allowDrag && event.button === 0) {
          isDragging = true
          startY = event.clientY
          startValue = currentValue
          event.preventDefault()
        }
      }

      const handleMouseMove = (event) => {
        if (isDragging) {
          const deltaY = startY - event.clientY
          const newValue = startValue + (deltaY * step)
          currentValue = Math.max(min, Math.min(max, newValue))

          this._updateNumericDisplay(currentValue, unit)

          if (this._previewCallback) {
            this._previewCallback(currentValue)
          }
        }
      }

      const handleMouseUp = (event) => {
        if (isDragging) {
          isDragging = false
          this._cleanup()
          resolve(currentValue)
        }
      }

      // Store handlers for cleanup
      this._keyDownHandler = handleKeyDown
      this._mouseDownHandler = handleMouseDown
      this._mouseMoveHandler = handleMouseMove
      this._mouseUpHandler = handleMouseUp

      // Add event listeners
      document.addEventListener('keydown', handleKeyDown)
      if (allowDrag) {
        document.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
      }
    })
  }

  /**
   * Get an angle value from user input
   * @param {string} prompt - Prompt message for user
   * @param {number} defaultValue - Default angle value in degrees
   * @param {string} unit - Unit display (degrees/radians)
   * @returns {Promise<number>} Angle in radians
   */
  async getAngle(prompt, defaultValue = 90, unit = '°') {
    return new Promise((resolve, reject) => {
      this._currentResolver = (degrees) => {
        // Convert degrees to radians
        const radians = degrees * Math.PI / 180
        resolve(radians)
      }
      this._currentRejecter = reject

      // Show input dialog
      this._createInputDialog(prompt, defaultValue, unit, null)
    })
  }

  /**
   * Get a distance/length value from user input
   * @param {string} prompt - Prompt message for user
   * @param {Object} options - Options for distance input
   * @returns {Promise<number>}
   */
  async getDistance(prompt, defaultValue = 1, unit = 'units') {
    return new Promise((resolve, reject) => {
      this._currentResolver = resolve
      this._currentRejecter = reject

      // Show input dialog
      this._createInputDialog(prompt, defaultValue, unit, null)
    })
  }

  /**
   * Get a scale factor from user input
   * @param {string} prompt - Prompt message for user
   * @param {Object} options - Options for scale input
   * @returns {Promise<number>}
   */
  async getScale(prompt, defaultValue = 1.5, unit = 'x') {
    return new Promise((resolve, reject) => {
      this._currentResolver = resolve
      this._currentRejecter = reject

      // Show input dialog
      this._createInputDialog(prompt, defaultValue, unit, null)
    })
  }

  /**
   * Cancel current input operation
   */
  cancel() {
    if (this._currentRejecter && typeof this._currentRejecter === 'function') {
      const rejecter = this._currentRejecter
      this._cleanup()
      rejecter(new Error('Input cancelled'))
    } else {
      // Just cleanup if no rejecter
      this._cleanup()
    }
  }

  /**
   * Setup input operation
   * @private
   */
  _setupInput(type, prompt, resolve, reject, options) {
    this.inputType = type
    this.currentPrompt = prompt
    this.isActive = true
    this._currentResolver = resolve
    this._currentRejecter = reject
    this._previewCallback = options.preview || null

    this.notifyPropertyChanged('isActive', true)
    this.notifyPropertyChanged('currentPrompt', prompt)
    this.notifyPropertyChanged('inputType', type)
  }

  /**
   * Cleanup input handlers and state
   * @private
   */
  _cleanup() {
    this.isActive = false
    this.inputType = null
    this.currentPrompt = ''
    this._currentResolver = null
    this._currentRejecter = null
    this._previewCallback = null

    // Remove event listeners
    if (this._keyDownHandler) {
      document.removeEventListener('keydown', this._keyDownHandler)
      this._keyDownHandler = null
    }
    if (this._mouseDownHandler) {
      document.removeEventListener('mousedown', this._mouseDownHandler)
      this._mouseDownHandler = null
    }
    if (this._mouseMoveHandler) {
      document.removeEventListener('mousemove', this._mouseMoveHandler)
      this._mouseMoveHandler = null
    }
    if (this._mouseUpHandler) {
      document.removeEventListener('mouseup', this._mouseUpHandler)
      this._mouseUpHandler = null
    }
    if (this._clickHandler && this._targetElement) {
      this._targetElement.removeEventListener('click', this._clickHandler)
      this._clickHandler = null
      this._targetElement = null
    }

    // Hide any input dialogs
    this._hideNumericInput()
    this._removeInputDialog()

    this.notifyPropertyChanged('isActive', false)
    this.notifyPropertyChanged('currentPrompt', '')
    this.notifyPropertyChanged('inputType', null)
  }

  /**
   * Get the ThreeView instance from the application
   * @private
   */
  _getThreeView() {
    // Try to get ThreeView from the global Vue app instance
    // This is a temporary solution - in a real app, we'd have a better way to access this
    if (typeof window !== 'undefined' && window.__THREESCENE_INSTANCE__) {
      return window.__THREESCENE_INSTANCE__
    }

    // Alternative: try to find it in the DOM
    const threeContainer = document.querySelector('.three-container')
    if (threeContainer && threeContainer.__threeView__) {
      return threeContainer.__threeView__
    }

    return null
  }

  /**
   * Convert screen coordinates to world coordinates
   * @private
   */
  _screenToWorld(screenX, screenY) {
    const threeView = this._getThreeView()
    if (!threeView) return null

    const rect = threeView.renderer.domElement.getBoundingClientRect()

    // Convert to normalized device coordinates
    const x = ((screenX - rect.left) / rect.width) * 2 - 1
    const y = -((screenY - rect.top) / rect.height) * 2 + 1

    // Create raycaster
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(x, y), threeView.camera)

    // For now, return point on ground plane (y = 0)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersectPoint = new THREE.Vector3()
    raycaster.ray.intersectPlane(groundPlane, intersectPoint)

    return {
      x: intersectPoint.x,
      y: intersectPoint.y,
      z: intersectPoint.z
    }
  }

  /**
   * Show numeric input dialog
   * @private
   */
  _showNumericInput(prompt, value, unit, onChange) {
    // Create a simple HTML input dialog
    this._createInputDialog(prompt, value, unit, onChange)

    // Also update the status
    if (this.application.activeDocument) {
      this.application.activeDocument.setProperty('statusText', `${prompt} (current: ${value}${unit})`)
    }
  }

  /**
   * Create a simple input dialog
   * @private
   */
  _createInputDialog(prompt, defaultValue, unit, onChange) {
    // Remove any existing dialog
    this._removeInputDialog()

    // Create dialog container
    const dialog = document.createElement('div')
    dialog.id = 'cad-input-dialog'
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2c3e50;
      border: 2px solid #3498db;
      border-radius: 8px;
      padding: 20px;
      z-index: 10000;
      color: white;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      min-width: 300px;
    `

    // Create content
    const title = document.createElement('h3')
    title.textContent = prompt
    title.style.cssText = 'margin: 0 0 15px 0; color: #ecf0f1;'

    const input = document.createElement('input')
    input.type = 'number'
    input.value = defaultValue
    input.step = 0.1
    input.min = -999999
    input.max = 999999
    input.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 2px solid #3498db;
      border-radius: 4px;
      background: #2c3e50;
      color: #ecf0f1;
      font-size: 16px;
      margin-bottom: 15px;
      outline: none;
      box-sizing: border-box;
    `

    // Make sure input is editable
    input.readOnly = false
    input.disabled = false

    const unitLabel = document.createElement('span')
    unitLabel.textContent = unit
    unitLabel.style.cssText = 'margin-left: 10px; color: #bdc3c7;'

    const buttonContainer = document.createElement('div')
    buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;'

    const okButton = document.createElement('button')
    okButton.textContent = 'OK'
    okButton.style.cssText = `
      background: #3498db;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `

    const cancelButton = document.createElement('button')
    cancelButton.textContent = 'Cancel'
    cancelButton.style.cssText = `
      background: #e74c3c;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `

    // Add event listeners
    const handleOk = () => {
      const value = parseFloat(input.value)
      // Only use defaultValue if input is empty or invalid
      const finalValue = isNaN(value) ? defaultValue : value
      this._removeInputDialog()
      if (this._currentResolver) {
        this._currentResolver(finalValue)
      }
    }

    const handleCancel = () => {
      this._removeInputDialog()
      if (this._currentRejecter) {
        this._currentRejecter(new Error('Input cancelled'))
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleOk()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        handleCancel()
      }
    }

    okButton.addEventListener('click', handleOk)
    cancelButton.addEventListener('click', handleCancel)
    input.addEventListener('keydown', handleKeyDown)

    // Update value on input change
    input.addEventListener('input', () => {
      const value = parseFloat(input.value) || defaultValue
      if (onChange) {
        onChange(value)
      }
    })

    // Assemble dialog
    buttonContainer.appendChild(cancelButton)
    buttonContainer.appendChild(okButton)

    const inputContainer = document.createElement('div')
    inputContainer.style.cssText = 'display: flex; align-items: center; margin-bottom: 15px;'
    inputContainer.appendChild(input)
    inputContainer.appendChild(unitLabel)

    dialog.appendChild(title)
    dialog.appendChild(inputContainer)
    dialog.appendChild(buttonContainer)

    // Add to page
    document.body.appendChild(dialog)

    // Focus input and make it interactive
    setTimeout(() => {
      input.focus()
      input.select()

      // Add focus and blur styling
      input.addEventListener('focus', () => {
        input.style.borderColor = '#3498db'
        input.style.boxShadow = '0 0 5px rgba(52, 152, 219, 0.5)'
      })

      input.addEventListener('blur', () => {
        input.style.borderColor = '#34495e'
        input.style.boxShadow = 'none'
      })
    }, 50)

    // Store reference for cleanup
    this._inputDialog = dialog
  }

  /**
   * Remove input dialog
   * @private
   */
  _removeInputDialog() {
    if (this._inputDialog) {
      this._inputDialog.remove()
      this._inputDialog = null
    }

    // Also remove any dialog with the standard ID
    const existingDialog = document.getElementById('cad-input-dialog')
    if (existingDialog) {
      existingDialog.remove()
    }
  }

  /**
   * Update numeric display
   * @private
   */
  _updateNumericDisplay(value, unit) {
    console.log(`Value updated: ${value}${unit}`)

    if (this.application.activeDocument) {
      this.application.activeDocument.setProperty('statusText', `${this.currentPrompt} (current: ${value}${unit})`)
    }
  }

  /**
   * Hide numeric input dialog
   * @private
   */
  _hideNumericInput() {
    if (this.application.activeDocument) {
      this.application.activeDocument.setProperty('statusText', 'Ready')
    }
  }

  /**
   * Event handlers
   * @private
   */
  _onKeyDown(event) {
    // Global key handlers
  }

  _onKeyUp(event) {
    // Global key handlers
  }

  _onMouseDown(event) {
    // Global mouse handlers
  }

  _onMouseMove(event) {
    // Global mouse handlers
  }

  _onMouseUp(event) {
    // Global mouse handlers
  }

  /**
   * Get multiple dimensions (X, Y, Z) from user input with a single dialog
   * @param {string} title - Dialog title
   * @param {Object} defaults - Default values {x, y, z}
   * @param {Object} labels - Labels for each axis {x, y, z}
   * @param {Object} constraints - Min/max constraints {min, max}
   * @returns {Promise<{x: number, y: number, z: number}>} The input dimensions
   */
  async getMultipleDimensions(title, defaults = {x: 2, y: 2, z: 2}, labels = {x: 'Width (X)', y: 'Height (Y)', z: 'Depth (Z)'}, constraints = {min: 0.1, max: 100}) {
    return new Promise((resolve, reject) => {
      // Remove any existing dialog
      this._removeInputDialog()

      // Create dialog container
      const dialog = document.createElement('div')
      dialog.id = 'cad-input-dialog'
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c3e50;
        border: 2px solid #3498db;
        border-radius: 8px;
        padding: 25px;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        min-width: 350px;
      `

      // Create title
      const titleElement = document.createElement('h3')
      titleElement.textContent = title
      titleElement.style.cssText = 'margin: 0 0 20px 0; color: #ecf0f1; text-align: center;'

      // Create input container
      const inputContainer = document.createElement('div')
      inputContainer.style.cssText = 'margin-bottom: 20px;'

      // Create inputs for X, Y, Z
      const inputs = {}
      const inputConfigs = [
        { key: 'x', label: labels.x, default: defaults.x },
        { key: 'y', label: labels.y, default: defaults.y },
        { key: 'z', label: labels.z, default: defaults.z }
      ]

      inputConfigs.forEach(config => {
        // Label
        const label = document.createElement('label')
        label.textContent = config.label + ':'
        label.style.cssText = `
          display: block;
          margin-bottom: 5px;
          color: #bdc3c7;
          font-size: 14px;
        `

        // Input
        const input = document.createElement('input')
        input.type = 'number'
        input.value = config.default || ''  // Handle empty defaults
        input.placeholder = config.default || 'Enter value'
        input.step = 0.1
        input.min = constraints.min
        input.max = constraints.max
        input.style.cssText = `
          width: 100%;
          padding: 8px;
          border: 2px solid #3498db;
          border-radius: 4px;
          background: #34495e;
          color: #ecf0f1;
          font-size: 16px;
          margin-bottom: 15px;
          outline: none;
          box-sizing: border-box;
        `

        input.addEventListener('focus', () => {
          input.style.borderColor = '#5dade2'
        })

        input.addEventListener('blur', () => {
          input.style.borderColor = '#3498db'
        })

        inputs[config.key] = input
        inputContainer.appendChild(label)
        inputContainer.appendChild(input)
      })

      // Create button container
      const buttonContainer = document.createElement('div')
      buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;'

      // Create OK button
      const okButton = document.createElement('button')
      okButton.textContent = 'OK'
      okButton.style.cssText = `
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      `

      okButton.addEventListener('mouseenter', () => {
        okButton.style.backgroundColor = '#2980b9'
      })

      okButton.addEventListener('mouseleave', () => {
        okButton.style.backgroundColor = '#3498db'
      })

      // Create Cancel button
      const cancelButton = document.createElement('button')
      cancelButton.textContent = 'Cancel'
      cancelButton.style.cssText = `
        background: #95a5a6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      `

      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.backgroundColor = '#7f8c8d'
      })

      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.backgroundColor = '#95a5a6'
      })

      // Event handlers
      const handleOk = () => {
        const values = {
          x: parseFloat(inputs.x.value) || (defaults.x || 1),
          y: parseFloat(inputs.y.value) || (defaults.y || 1),
          z: parseFloat(inputs.z.value) || (defaults.z || 1)
        }

        // Validate values
        for (const [key, value] of Object.entries(values)) {
          if (value < constraints.min || value > constraints.max) {
            alert(`${labels[key]} must be between ${constraints.min} and ${constraints.max}`)
            return
          }
        }

        this._removeInputDialog()
        resolve(values)
      }

      const handleCancel = () => {
        this._removeInputDialog()
        reject(new Error('Input cancelled by user'))
      }

      const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          handleOk()
        } else if (event.key === 'Escape') {
          handleCancel()
        }
      }

      // Add event listeners
      okButton.addEventListener('click', handleOk)
      cancelButton.addEventListener('click', handleCancel)
      document.addEventListener('keydown', handleKeyDown)

      // Assemble dialog
      buttonContainer.appendChild(okButton)
      buttonContainer.appendChild(cancelButton)

      dialog.appendChild(titleElement)
      dialog.appendChild(inputContainer)
      dialog.appendChild(buttonContainer)

      document.body.appendChild(dialog)

      // Focus first input
      inputs.x.focus()
      inputs.x.select()

      // Clean up event listener when dialog is removed
      const originalRemove = this._removeInputDialog.bind(this)
      this._removeInputDialog = () => {
        document.removeEventListener('keydown', handleKeyDown)
        originalRemove()
        this._removeInputDialog = originalRemove
      }
    })
  }

  /**
   * Get single dimension from user input with a dialog
   * @param {string} title - Dialog title
   * @param {string} label - Input label
   * @param {number} defaultValue - Default value
   * @param {Object} constraints - Min/max constraints {min, max}
   * @returns {Promise<number>} The input value
   */
  async getSingleDimension(title, label, defaultValue = 1.0, constraints = {min: 0.1, max: 100}) {
    return new Promise((resolve, reject) => {
      // Remove any existing dialog
      this._removeInputDialog()

      // Create dialog container
      const dialog = document.createElement('div')
      dialog.id = 'cad-input-dialog'
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c3e50;
        border: 2px solid #3498db;
        border-radius: 8px;
        padding: 25px;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        min-width: 300px;
      `

      // Create title
      const titleElement = document.createElement('h3')
      titleElement.textContent = title
      titleElement.style.cssText = 'margin: 0 0 20px 0; color: #ecf0f1; text-align: center;'

      // Create input container
      const inputContainer = document.createElement('div')
      inputContainer.style.cssText = 'margin-bottom: 20px;'

      // Label
      const labelElement = document.createElement('label')
      labelElement.textContent = label + ':'
      labelElement.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #bdc3c7;
        font-size: 14px;
      `

      // Input
      const input = document.createElement('input')
      input.type = 'number'
      input.value = defaultValue
      input.step = 0.1
      input.min = constraints.min
      input.max = constraints.max
      input.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 2px solid #3498db;
        border-radius: 4px;
        background: #34495e;
        color: #ecf0f1;
        font-size: 16px;
        outline: none;
        box-sizing: border-box;
      `

      input.addEventListener('focus', () => {
        input.style.borderColor = '#5dade2'
      })

      input.addEventListener('blur', () => {
        input.style.borderColor = '#3498db'
      })

      inputContainer.appendChild(labelElement)
      inputContainer.appendChild(input)

      // Create button container
      const buttonContainer = document.createElement('div')
      buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;'

      // Create OK button
      const okButton = document.createElement('button')
      okButton.textContent = 'OK'
      okButton.style.cssText = `
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      `

      okButton.addEventListener('mouseenter', () => {
        okButton.style.backgroundColor = '#2980b9'
      })

      okButton.addEventListener('mouseleave', () => {
        okButton.style.backgroundColor = '#3498db'
      })

      // Create Cancel button
      const cancelButton = document.createElement('button')
      cancelButton.textContent = 'Cancel'
      cancelButton.style.cssText = `
        background: #95a5a6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      `

      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.backgroundColor = '#7f8c8d'
      })

      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.backgroundColor = '#95a5a6'
      })

      // Event handlers
      const handleOk = () => {
        const value = parseFloat(input.value) || (defaultValue || 1)

        // Validate value
        if (value < constraints.min || value > constraints.max) {
          alert(`${label} must be between ${constraints.min} and ${constraints.max}`)
          return
        }

        this._removeInputDialog()
        resolve(value)
      }

      const handleCancel = () => {
        this._removeInputDialog()
        reject(new Error('Input cancelled by user'))
      }

      const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          handleOk()
        } else if (event.key === 'Escape') {
          handleCancel()
        }
      }

      // Add event listeners
      okButton.addEventListener('click', handleOk)
      cancelButton.addEventListener('click', handleCancel)
      document.addEventListener('keydown', handleKeyDown)

      // Assemble dialog
      buttonContainer.appendChild(okButton)
      buttonContainer.appendChild(cancelButton)

      dialog.appendChild(titleElement)
      dialog.appendChild(inputContainer)
      dialog.appendChild(buttonContainer)

      document.body.appendChild(dialog)

      // Focus input
      input.focus()
      input.select()

      // Clean up event listener when dialog is removed
      const originalRemove = this._removeInputDialog.bind(this)
      this._removeInputDialog = () => {
        document.removeEventListener('keydown', handleKeyDown)
        originalRemove()
        this._removeInputDialog = originalRemove
      }
    })
  }

  /**
   * Get two dimensions from user input with a dialog
   * @param {string} title - Dialog title
   * @param {Object} defaults - Default values {x, y}
   * @param {Object} labels - Labels for each axis {x, y}
   * @param {Object} constraints - Min/max constraints {min, max}
   * @returns {Promise<{x: number, y: number}>} The input dimensions
   */
  async getTwoDimensions(title, defaults = {x: 2, y: 2}, labels = {x: 'Width (X)', y: 'Height (Y)'}, constraints = {min: 0.1, max: 100}) {
    return new Promise((resolve, reject) => {
      // Remove any existing dialog
      this._removeInputDialog()

      // Create dialog container
      const dialog = document.createElement('div')
      dialog.id = 'cad-input-dialog'
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c3e50;
        border: 2px solid #3498db;
        border-radius: 8px;
        padding: 25px;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        min-width: 350px;
      `

      // Create title
      const titleElement = document.createElement('h3')
      titleElement.textContent = title
      titleElement.style.cssText = 'margin: 0 0 20px 0; color: #ecf0f1; text-align: center;'

      // Create input container
      const inputContainer = document.createElement('div')
      inputContainer.style.cssText = 'margin-bottom: 20px;'

      // Create inputs for X, Y
      const inputs = {}
      const inputConfigs = [
        { key: 'x', label: labels.x, default: defaults.x },
        { key: 'y', label: labels.y, default: defaults.y }
      ]

      inputConfigs.forEach(config => {
        // Label
        const label = document.createElement('label')
        label.textContent = config.label + ':'
        label.style.cssText = `
          display: block;
          margin-bottom: 5px;
          color: #bdc3c7;
          font-size: 14px;
        `

        // Input
        const input = document.createElement('input')
        input.type = 'number'
        input.value = config.default || ''  // Handle empty defaults
        input.placeholder = config.default || 'Enter value'
        input.step = 0.1
        input.min = constraints.min
        input.max = constraints.max
        input.style.cssText = `
          width: 100%;
          padding: 8px;
          border: 2px solid #3498db;
          border-radius: 4px;
          background: #34495e;
          color: #ecf0f1;
          font-size: 16px;
          margin-bottom: 15px;
          outline: none;
          box-sizing: border-box;
        `

        input.addEventListener('focus', () => {
          input.style.borderColor = '#5dade2'
        })

        input.addEventListener('blur', () => {
          input.style.borderColor = '#3498db'
        })

        inputs[config.key] = input
        inputContainer.appendChild(label)
        inputContainer.appendChild(input)
      })

      // Create button container
      const buttonContainer = document.createElement('div')
      buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;'

      // Create OK button
      const okButton = document.createElement('button')
      okButton.textContent = 'OK'
      okButton.style.cssText = `
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      `

      okButton.addEventListener('mouseenter', () => {
        okButton.style.backgroundColor = '#2980b9'
      })

      okButton.addEventListener('mouseleave', () => {
        okButton.style.backgroundColor = '#3498db'
      })

      // Create Cancel button
      const cancelButton = document.createElement('button')
      cancelButton.textContent = 'Cancel'
      cancelButton.style.cssText = `
        background: #95a5a6;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      `

      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.backgroundColor = '#7f8c8d'
      })

      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.backgroundColor = '#95a5a6'
      })

      // Event handlers
      const handleOk = () => {
        const values = {
          x: parseFloat(inputs.x.value) || (defaults.x || 1),
          y: parseFloat(inputs.y.value) || (defaults.y || 1)
        }

        // Validate values
        for (const [key, value] of Object.entries(values)) {
          if (value < constraints.min || value > constraints.max) {
            alert(`${labels[key]} must be between ${constraints.min} and ${constraints.max}`)
            return
          }
        }

        this._removeInputDialog()
        resolve(values)
      }

      const handleCancel = () => {
        this._removeInputDialog()
        reject(new Error('Input cancelled by user'))
      }

      const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          handleOk()
        } else if (event.key === 'Escape') {
          handleCancel()
        }
      }

      // Add event listeners
      okButton.addEventListener('click', handleOk)
      cancelButton.addEventListener('click', handleCancel)
      document.addEventListener('keydown', handleKeyDown)

      // Assemble dialog
      buttonContainer.appendChild(okButton)
      buttonContainer.appendChild(cancelButton)

      dialog.appendChild(titleElement)
      dialog.appendChild(inputContainer)
      dialog.appendChild(buttonContainer)

      document.body.appendChild(dialog)

      // Focus first input
      inputs.x.focus()
      inputs.x.select()

      // Clean up event listener when dialog is removed
      const originalRemove = this._removeInputDialog.bind(this)
      this._removeInputDialog = () => {
        document.removeEventListener('keydown', handleKeyDown)
        originalRemove()
        this._removeInputDialog = originalRemove
      }
    })
  }

  /**
   * Get enhanced object creation parameters including dimensions, position, and material
   * @param {string} title - Dialog title
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Object with dimensions, position, and material properties
   */
  async getEnhancedObjectParameters(title, options = {}) {
    return new Promise((resolve, reject) => {
      // Remove any existing dialog
      this._removeInputDialog()

      // Default options
      const config = {
        dimensions: {
          defaults: { x: 2, y: 2, z: 2 },
          labels: { x: 'Width (X)', y: 'Height (Y)', z: 'Depth (Z)' },
          constraints: { min: 0.1, max: 100 }
        },
        position: {
          defaults: { x: 0, y: 0, z: 0 },
          labels: { x: 'Position X', y: 'Position Y', z: 'Position Z' },
          constraints: { min: -1000, max: 1000 }
        },
        material: {
          defaults: {
            color: '#4CAF50',
            opacity: 1.0,
            wireframe: false,
            metalness: 0.1,
            roughness: 0.3
          }
        },
        ...options
      }

      // Create dialog container
      const dialog = document.createElement('div')
      dialog.id = 'cad-input-dialog'
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2c3e50;
        border: 2px solid #3498db;
        border-radius: 8px;
        padding: 25px;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        min-width: 400px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
      `

      // Create title
      const titleElement = document.createElement('h3')
      titleElement.textContent = title
      titleElement.style.cssText = 'margin: 0 0 20px 0; color: #ecf0f1; text-align: center;'

      // Create tabs container
      const tabsContainer = document.createElement('div')
      tabsContainer.style.cssText = 'margin-bottom: 20px;'

      const tabs = document.createElement('div')
      tabs.style.cssText = 'display: flex; border-bottom: 2px solid #3498db; margin-bottom: 20px;'

      const tabButtons = ['Dimensions', 'Position', 'Material']
      const tabContents = []
      let activeTab = 0

      // Create tab buttons
      tabButtons.forEach((tabName, index) => {
        const tabButton = document.createElement('button')
        tabButton.textContent = tabName
        tabButton.style.cssText = `
          background: ${index === 0 ? '#3498db' : 'transparent'};
          color: white;
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 14px;
          border-radius: 4px 4px 0 0;
          transition: background-color 0.3s;
        `

        tabButton.addEventListener('click', () => {
          // Update active tab
          activeTab = index
          tabButtons.forEach((_, i) => {
            const btn = tabs.children[i]
            btn.style.background = i === index ? '#3498db' : 'transparent'
          })

          // Show/hide tab contents
          tabContents.forEach((content, i) => {
            content.style.display = i === index ? 'block' : 'none'
          })
        })

        tabs.appendChild(tabButton)
      })

      // Create tab contents
      const contentContainer = document.createElement('div')
      contentContainer.style.cssText = 'min-height: 200px;'

      // Dimensions tab
      const dimensionsContent = this._createDimensionsTab(config.dimensions)
      dimensionsContent.style.display = 'block'
      tabContents.push(dimensionsContent)

      // Position tab
      const positionContent = this._createPositionTab(config.position)
      positionContent.style.display = 'none'
      tabContents.push(positionContent)

      // Material tab
      const materialContent = this._createMaterialTab(config.material)
      materialContent.style.display = 'none'
      tabContents.push(materialContent)

      // Add tab contents to container
      tabContents.forEach(content => contentContainer.appendChild(content))

      // Create button container
      const buttonContainer = document.createElement('div')
      buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;'

      // Create OK button
      const okButton = document.createElement('button')
      okButton.textContent = 'Create Object'
      okButton.style.cssText = `
        background: #27ae60;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: background-color 0.3s;
      `

      okButton.addEventListener('mouseenter', () => {
        okButton.style.backgroundColor = '#229954'
      })

      okButton.addEventListener('mouseleave', () => {
        okButton.style.backgroundColor = '#27ae60'
      })

      // Create Cancel button
      const cancelButton = document.createElement('button')
      cancelButton.textContent = 'Cancel'
      cancelButton.style.cssText = `
        background: #e74c3c;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      `

      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.backgroundColor = '#c0392b'
      })

      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.backgroundColor = '#e74c3c'
      })

      // Assemble dialog
      dialog.appendChild(titleElement)
      dialog.appendChild(tabs)
      dialog.appendChild(contentContainer)
      buttonContainer.appendChild(cancelButton)
      buttonContainer.appendChild(okButton)
      dialog.appendChild(buttonContainer)

      // Add to document
      document.body.appendChild(dialog)

      // Focus first input
      const firstInput = dialog.querySelector('input[type="number"]')
      if (firstInput) {
        firstInput.focus()
        firstInput.select()
      }

      // Event handlers
      const handleOK = () => {
        try {
          const result = {
            dimensions: this._getDimensionsFromDialog(dialog),
            position: this._getPositionFromDialog(dialog),
            material: this._getMaterialFromDialog(dialog)
          }
          this._removeInputDialog()
          resolve(result)
        } catch (error) {
          console.error('Error getting enhanced object parameters:', error)
          reject(error)
        }
      }

      const handleCancel = () => {
        this._removeInputDialog()
        reject(new Error('User cancelled object creation'))
      }

      okButton.addEventListener('click', handleOK)
      cancelButton.addEventListener('click', handleCancel)

      // Handle Enter key
      const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          handleOK()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          handleCancel()
        }
      }

      document.addEventListener('keydown', handleKeyDown)

      // Cleanup on dialog removal
      const originalRemove = this._removeInputDialog.bind(this)
      this._removeInputDialog = () => {
        document.removeEventListener('keydown', handleKeyDown)
        originalRemove()
        this._removeInputDialog = originalRemove
      }
    })
  }

  /**
   * Create dimensions tab content
   * @private
   */
  _createDimensionsTab(config) {
    const container = document.createElement('div')
    container.className = 'tab-content'

    // Ensure config has proper defaults
    const safeConfig = {
      defaults: config.defaults || { x: 2, y: 2, z: 2 },
      labels: config.labels || { x: 'Width (X)', y: 'Height (Y)', z: 'Depth (Z)' },
      constraints: config.constraints || { min: 0.1, max: 100 }
    }

    const inputs = {}
    const inputConfigs = [
      { key: 'x', label: safeConfig.labels.x, default: safeConfig.defaults.x, constraints: safeConfig.constraints },
      { key: 'y', label: safeConfig.labels.y, default: safeConfig.defaults.y, constraints: safeConfig.constraints },
      { key: 'z', label: safeConfig.labels.z, default: safeConfig.defaults.z, constraints: safeConfig.constraints }
    ]

    inputConfigs.forEach(inputConfig => {
      // Label
      const label = document.createElement('label')
      label.textContent = inputConfig.label + ':'
      label.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #bdc3c7;
        font-size: 14px;
        font-weight: bold;
      `

      // Input
      const input = document.createElement('input')
      input.type = 'number'
      input.value = inputConfig.default
      input.step = 0.1
      input.min = inputConfig.constraints.min
      input.max = inputConfig.constraints.max
      input.style.cssText = `
        width: 100%;
        padding: 10px;
        border: 2px solid #3498db;
        border-radius: 4px;
        background: #34495e;
        color: #ecf0f1;
        font-size: 16px;
        margin-bottom: 15px;
        outline: none;
        box-sizing: border-box;
      `

      input.addEventListener('focus', () => {
        input.style.borderColor = '#5dade2'
      })

      input.addEventListener('blur', () => {
        input.style.borderColor = '#3498db'
      })

      inputs[inputConfig.key] = input
      container.appendChild(label)
      container.appendChild(input)
    })

    // Store inputs for later retrieval
    container._inputs = inputs
    return container
  }

  /**
   * Create position tab content
   * @private
   */
  _createPositionTab(config) {
    const container = document.createElement('div')
    container.className = 'tab-content'

    // Ensure config has proper defaults
    const safeConfig = {
      defaults: config.defaults || { x: 0, y: 0, z: 0 },
      labels: config.labels || { x: 'Position X', y: 'Position Y', z: 'Position Z' },
      constraints: config.constraints || { min: -1000, max: 1000 }
    }

    const inputs = {}
    const inputConfigs = [
      { key: 'x', label: safeConfig.labels.x, default: safeConfig.defaults.x, constraints: safeConfig.constraints },
      { key: 'y', label: safeConfig.labels.y, default: safeConfig.defaults.y, constraints: safeConfig.constraints },
      { key: 'z', label: safeConfig.labels.z, default: safeConfig.defaults.z, constraints: safeConfig.constraints }
    ]

    inputConfigs.forEach(inputConfig => {
      // Label
      const label = document.createElement('label')
      label.textContent = inputConfig.label + ':'
      label.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #bdc3c7;
        font-size: 14px;
        font-weight: bold;
      `

      // Input
      const input = document.createElement('input')
      input.type = 'number'
      input.value = inputConfig.default
      input.step = 0.1
      input.min = inputConfig.constraints.min
      input.max = inputConfig.constraints.max
      input.style.cssText = `
        width: 100%;
        padding: 10px;
        border: 2px solid #3498db;
        border-radius: 4px;
        background: #34495e;
        color: #ecf0f1;
        font-size: 16px;
        margin-bottom: 15px;
        outline: none;
        box-sizing: border-box;
      `

      input.addEventListener('focus', () => {
        input.style.borderColor = '#5dade2'
      })

      input.addEventListener('blur', () => {
        input.style.borderColor = '#3498db'
      })

      inputs[inputConfig.key] = input
      container.appendChild(label)
      container.appendChild(input)
    })

    // Store inputs for later retrieval
    container._inputs = inputs
    return container
  }

  /**
   * Create material tab content
   * @private
   */
  _createMaterialTab(config) {
    const container = document.createElement('div')
    container.className = 'tab-content'

    // Ensure config has proper defaults
    const safeConfig = {
      defaults: {
        color: config.defaults?.color || '#4CAF50',
        opacity: config.defaults?.opacity || 1.0,
        wireframe: config.defaults?.wireframe || false,
        metalness: config.defaults?.metalness || 0.1,
        roughness: config.defaults?.roughness || 0.3
      }
    }

    // Color picker
    const colorLabel = document.createElement('label')
    colorLabel.textContent = 'Color:'
    colorLabel.style.cssText = `
      display: block;
      margin-bottom: 5px;
      color: #bdc3c7;
      font-size: 14px;
      font-weight: bold;
    `

    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.value = safeConfig.defaults.color
    colorInput.style.cssText = `
      width: 100%;
      padding: 10px;
      border: 2px solid #3498db;
      border-radius: 4px;
      background: #34495e;
      margin-bottom: 15px;
      outline: none;
      box-sizing: border-box;
      height: 50px;
    `

    // Opacity slider
    const opacityLabel = document.createElement('label')
    opacityLabel.textContent = 'Opacity:'
    opacityLabel.style.cssText = `
      display: block;
      margin-bottom: 5px;
      color: #bdc3c7;
      font-size: 14px;
      font-weight: bold;
    `

    const opacityContainer = document.createElement('div')
    opacityContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 15px;'

    const opacitySlider = document.createElement('input')
    opacitySlider.type = 'range'
    opacitySlider.min = '0'
    opacitySlider.max = '1'
    opacitySlider.step = '0.01'
    opacitySlider.value = safeConfig.defaults.opacity
    opacitySlider.style.cssText = 'flex: 1;'

    const opacityValue = document.createElement('span')
    opacityValue.textContent = Math.round(safeConfig.defaults.opacity * 100) + '%'
    opacityValue.style.cssText = 'color: #ecf0f1; font-weight: bold; min-width: 40px;'

    opacitySlider.addEventListener('input', () => {
      opacityValue.textContent = Math.round(opacitySlider.value * 100) + '%'
    })

    opacityContainer.appendChild(opacitySlider)
    opacityContainer.appendChild(opacityValue)

    // Wireframe checkbox
    const wireframeLabel = document.createElement('label')
    wireframeLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
      color: #bdc3c7;
      font-size: 14px;
      cursor: pointer;
    `

    const wireframeCheckbox = document.createElement('input')
    wireframeCheckbox.type = 'checkbox'
    wireframeCheckbox.checked = safeConfig.defaults.wireframe
    wireframeCheckbox.style.cssText = 'transform: scale(1.2);'

    const wireframeText = document.createElement('span')
    wireframeText.textContent = 'Wireframe Mode'

    wireframeLabel.appendChild(wireframeCheckbox)
    wireframeLabel.appendChild(wireframeText)

    // Metalness slider
    const metalnessLabel = document.createElement('label')
    metalnessLabel.textContent = 'Metalness:'
    metalnessLabel.style.cssText = `
      display: block;
      margin-bottom: 5px;
      color: #bdc3c7;
      font-size: 14px;
      font-weight: bold;
    `

    const metalnessContainer = document.createElement('div')
    metalnessContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 15px;'

    const metalnessSlider = document.createElement('input')
    metalnessSlider.type = 'range'
    metalnessSlider.min = '0'
    metalnessSlider.max = '1'
    metalnessSlider.step = '0.01'
    metalnessSlider.value = safeConfig.defaults.metalness
    metalnessSlider.style.cssText = 'flex: 1;'

    const metalnessValue = document.createElement('span')
    metalnessValue.textContent = Math.round(safeConfig.defaults.metalness * 100) + '%'
    metalnessValue.style.cssText = 'color: #ecf0f1; font-weight: bold; min-width: 40px;'

    metalnessSlider.addEventListener('input', () => {
      metalnessValue.textContent = Math.round(metalnessSlider.value * 100) + '%'
    })

    metalnessContainer.appendChild(metalnessSlider)
    metalnessContainer.appendChild(metalnessValue)

    // Roughness slider
    const roughnessLabel = document.createElement('label')
    roughnessLabel.textContent = 'Roughness:'
    roughnessLabel.style.cssText = `
      display: block;
      margin-bottom: 5px;
      color: #bdc3c7;
      font-size: 14px;
      font-weight: bold;
    `

    const roughnessContainer = document.createElement('div')
    roughnessContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 15px;'

    const roughnessSlider = document.createElement('input')
    roughnessSlider.type = 'range'
    roughnessSlider.min = '0'
    roughnessSlider.max = '1'
    roughnessSlider.step = '0.01'
    roughnessSlider.value = safeConfig.defaults.roughness
    roughnessSlider.style.cssText = 'flex: 1;'

    const roughnessValue = document.createElement('span')
    roughnessValue.textContent = Math.round(safeConfig.defaults.roughness * 100) + '%'
    roughnessValue.style.cssText = 'color: #ecf0f1; font-weight: bold; min-width: 40px;'

    roughnessSlider.addEventListener('input', () => {
      roughnessValue.textContent = Math.round(roughnessSlider.value * 100) + '%'
    })

    roughnessContainer.appendChild(roughnessSlider)
    roughnessContainer.appendChild(roughnessValue)

    // Assemble material tab
    container.appendChild(colorLabel)
    container.appendChild(colorInput)
    container.appendChild(opacityLabel)
    container.appendChild(opacityContainer)
    container.appendChild(wireframeLabel)
    container.appendChild(metalnessLabel)
    container.appendChild(metalnessContainer)
    container.appendChild(roughnessLabel)
    container.appendChild(roughnessContainer)

    // Store inputs for later retrieval
    container._inputs = {
      color: colorInput,
      opacity: opacitySlider,
      wireframe: wireframeCheckbox,
      metalness: metalnessSlider,
      roughness: roughnessSlider
    }

    return container
  }

  /**
   * Get dimensions from dialog
   * @private
   */
  _getDimensionsFromDialog(dialog) {
    const dimensionsTab = dialog.querySelector('.tab-content')
    const inputs = dimensionsTab._inputs
    return {
      x: parseFloat(inputs.x.value) || 0,
      y: parseFloat(inputs.y.value) || 0,
      z: parseFloat(inputs.z.value) || 0
    }
  }

  /**
   * Get position from dialog
   * @private
   */
  _getPositionFromDialog(dialog) {
    const tabs = dialog.querySelectorAll('.tab-content')
    const positionTab = tabs[1] // Position is second tab
    const inputs = positionTab._inputs
    return {
      x: parseFloat(inputs.x.value) || 0,
      y: parseFloat(inputs.y.value) || 0,
      z: parseFloat(inputs.z.value) || 0
    }
  }

  /**
   * Get material from dialog
   * @private
   */
  _getMaterialFromDialog(dialog) {
    const tabs = dialog.querySelectorAll('.tab-content')
    const materialTab = tabs[2] // Material is third tab
    const inputs = materialTab._inputs
    return {
      color: inputs.color.value,
      opacity: parseFloat(inputs.opacity.value) || 1.0,
      wireframe: inputs.wireframe.checked,
      metalness: parseFloat(inputs.metalness.value) || 0.1,
      roughness: parseFloat(inputs.roughness.value) || 0.3
    }
  }
}
