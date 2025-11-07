/**
 * DocumentPersistence - Document state persistence (Single Source of Truth)
 *
 * Handles:
 * - Document state (nodes, hierarchy, metadata) - the canonical source of truth
 * - Save/load document from IndexedDB
 * - Auto-save on document changes
 * - Version management
 */

import { db, isIndexedDBAvailable } from './PersistenceDB.js'

const DOCUMENT_KEY = 'active-document'
const SCHEMA_VERSION = 1

/**
 * Debounce utility
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Save document state to IndexedDB
 * This is the single source of truth for the application state
 *
 * @param {Document} document - Document instance
 * @returns {Promise<boolean>} Success status
 */
export async function saveDocumentState(document) {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available, document will not persist')
    return false
  }

  if (!document) {
    console.warn('No document provided to saveDocumentState')
    return false
  }

  try {
    // Serialize document to plain object
    const documentData = await document.saveToData()

    // Create persisted state with schema version
    const persistedState = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      document: documentData
    }

    // Test if the data is serializable (for debugging)
    try {
      JSON.stringify(persistedState)
    } catch (jsonError) {
      console.error('Document data contains non-serializable objects:', jsonError)
      console.log('Document data:', documentData)
      throw new Error('Document contains non-serializable data: ' + jsonError.message)
    }

    // Save to IndexedDB
    await db.document.put({
      id: DOCUMENT_KEY,
      ...persistedState
    })

    console.log('Document state saved:', document.name, `(${document.nodes.length} nodes)`)
    return true

  } catch (error) {
    console.error('Failed to save document state:', error)

    // Provide more specific error information
    if (error.name === 'DataCloneError') {
      console.error('Hint: Document contains non-serializable objects (Three.js objects, functions, etc.)')
      console.error('   Check node properties for visualObject, geometry, material references')
    }

    return false
  }
}

/**
 * Debounced version of saveDocumentState (250ms delay)
 * Use this for auto-save on document changes
 */
export const saveDocumentStateDebounced = debounce(saveDocumentState, 250)

/**
 * Load document state from IndexedDB
 *
 * @returns {Promise<Object|null>} Document data or null
 */
export async function loadDocumentState() {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available')
    return null
  }

  try {
    const record = await db.document.get(DOCUMENT_KEY)

    if (!record || !record.document) {
      console.log('No saved document found')
      return null
    }

    // Version check
    if (record.schemaVersion !== SCHEMA_VERSION) {
      console.warn(`Document schema version mismatch: ${record.schemaVersion} vs ${SCHEMA_VERSION}`)
      // Could implement migration here if needed
    }

    console.log(`Loaded document state from ${record.savedAt}`)
    console.log(`   Document: ${record.document.name}, Nodes: ${record.document.nodes?.length || 0}`)
    return record.document

  } catch (error) {
    console.error('Failed to load document state:', error)
    return null
  }
}

/**
 * Check if persisted document state exists
 *
 * @returns {Promise<boolean>}
 */
export async function hasPersistedDocumentState() {
  if (!isIndexedDBAvailable()) {
    return false
  }

  try {
    const record = await db.document.get(DOCUMENT_KEY)
    return !!record?.document
  } catch (error) {
    return false
  }
}

/**
 * Clear persisted document state
 *
 * @returns {Promise<boolean>}
 */
export async function clearDocumentState() {
  if (!isIndexedDBAvailable()) {
    return false
  }

  try {
    await db.document.delete(DOCUMENT_KEY)
    console.log('Document state cleared')
    return true
  } catch (error) {
    console.error('Failed to clear document state:', error)
    return false
  }
}

/**
 * Get last saved timestamp
 *
 * @returns {Promise<string|null>}
 */
export async function getLastSavedDocumentTime() {
  if (!isIndexedDBAvailable()) {
    return null
  }

  try {
    const record = await db.document.get(DOCUMENT_KEY)
    return record?.savedAt || null
  } catch (error) {
    return null
  }
}

