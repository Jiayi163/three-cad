/**
 * PersistenceDB - IndexedDB database for persisting application state
 *
 * Stores:
 * - Scene graph (geometry, meshes, hierarchy)
 * - Materials & textures (including blobs)
 * - Environment/background settings
 * - Camera state
 * - Renderer configuration
 * - UI layout
 */

import Dexie from 'dexie'

/**
 * Database schema
 */
class CADPersistenceDB extends Dexie {
  constructor() {
    super('cad-persistence')

    this.version(2).stores({
      // Application state (single record with id='latest')
      state: 'id',

      // Document state (the single source of truth)
      document: 'id',

      // Binary blobs for user-imported images/textures
      blobs: 'key, type, savedAt',

      // Metadata for quick queries
      metadata: 'key, value'
    }).upgrade(trans => {
      // Migration from version 1 to 2
      // Just adds the document store, no data migration needed
    })
  }
}

// Create singleton instance
export const db = new CADPersistenceDB()

/**
 * Check if IndexedDB is available
 * @returns {boolean}
 */
export function isIndexedDBAvailable() {
  try {
    return 'indexedDB' in window && window.indexedDB !== null
  } catch (e) {
    return false
  }
}

/**
 * Clear all persisted data
 */
export async function clearAllData() {
  await db.state.clear()
  await db.blobs.clear()
  await db.metadata.clear()
  console.log('All persisted data cleared')
}

/**
 * Get database statistics
 */
export async function getDBStats() {
  const stateCount = await db.state.count()
  const blobCount = await db.blobs.count()
  const metadataCount = await db.metadata.count()

  // Estimate size (rough)
  let totalSize = 0
  const blobs = await db.blobs.toArray()
  for (const blob of blobs) {
    if (blob.blob) {
      totalSize += blob.blob.size
    }
  }

  return {
    stateRecords: stateCount,
    blobRecords: blobCount,
    metadataRecords: metadataCount,
    estimatedSize: totalSize,
    estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2)
  }
}

export default db


