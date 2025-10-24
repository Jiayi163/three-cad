/**
 * AutoSaveSettings - Global settings for automatic scene persistence
 *
 * Controls when and how the scene is automatically saved/restored
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,           // Enable auto-save by default
  debounceMs: 500,        // Delay before saving after changes
  silentMode: true,       // Don't show notifications on save
  autoRestore: true,      // Auto-restore on page load
  saveOnChange: true,     // Save when scene changes
  saveOnMaterial: true,   // Save when materials change
  saveOnCamera: false,    // Save when camera moves (can be frequent)
  saveOnBackground: true  // Save when background/environment changes
}

// Storage key
const SETTINGS_KEY = 'cad:autosave:settings'

// In-memory settings
let currentSettings = { ...DEFAULT_SETTINGS }

/**
 * Load settings from localStorage
 */
function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load auto-save settings:', error)
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings))
  } catch (error) {
    console.warn('Failed to save auto-save settings:', error)
  }
}

// Load on module import
loadSettings()

/**
 * Get current auto-save settings
 */
export function getAutoSaveSettings() {
  return { ...currentSettings }
}

/**
 * Update auto-save settings
 */
export function setAutoSaveSettings(updates) {
  currentSettings = { ...currentSettings, ...updates }
  saveSettings()
  
  // Emit event for UI updates
  window.dispatchEvent(new CustomEvent('autosave:settings:changed', {
    detail: currentSettings
  }))
  
  console.log('Auto-save settings updated:', currentSettings)
}

/**
 * Check if auto-save is enabled
 */
export function isAutoSaveEnabled() {
  return currentSettings.enabled
}

/**
 * Check if auto-restore is enabled
 */
export function isAutoRestoreEnabled() {
  return currentSettings.autoRestore
}

/**
 * Get debounce delay in milliseconds
 */
export function getDebounceDelay() {
  return currentSettings.debounceMs
}

/**
 * Check if silent mode is enabled
 */
export function isSilentMode() {
  return currentSettings.silentMode
}

/**
 * Enable/disable auto-save
 */
export function setAutoSaveEnabled(enabled) {
  setAutoSaveSettings({ enabled })
}

/**
 * Enable/disable auto-restore
 */
export function setAutoRestoreEnabled(enabled) {
  setAutoSaveSettings({ autoRestore: enabled })
}

/**
 * Reset to default settings
 */
export function resetAutoSaveSettings() {
  currentSettings = { ...DEFAULT_SETTINGS }
  saveSettings()
  console.log('Auto-save settings reset to defaults')
}

