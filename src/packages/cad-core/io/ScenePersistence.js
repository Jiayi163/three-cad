/**
 * ScenePersistence - Save and restore complete application state
 *
 * Handles:
 * - Scene serialization/deserialization
 * - Texture and material persistence
 * - Environment/background restoration
 * - Camera state
 * - Renderer configuration
 */

import * as THREE from 'three'
import { markRaw } from 'vue'
import { db, isIndexedDBAvailable } from './PersistenceDB.js'
import { isSilentMode } from './AutoSaveSettings.js'

const STATE_VERSION = 1
const STATE_KEY = 'latest'

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
 * Serialize view settings only (camera, renderer) - no scene objects
 * Used when DocumentPersistence is active to avoid duplicate meshes
 */
export function serializeViewSettings(threeView) {
  const { camera, renderer } = threeView;
  const controls = threeView.controls || threeView.cameraController;
  const size = threeView._lastSize || { width: 0, height: 0 };

  return {
    camera: {
      position: camera.position.toArray(),
      target: controls?.target?.toArray?.() ?? [0, 0, 0],
      rotation: camera.rotation.toArray(),
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom || 1
    },
    renderer: {
      alpha: renderer.getContextAttributes()?.alpha ?? false,
      pixelRatio: renderer.getPixelRatio(),
      size: {
        width: size.width || 0,
        height: size.height || 0
      },
      toneMapping: renderer.toneMapping,
      toneMappingExposure: renderer.toneMappingExposure,
      outputColorSpace: renderer.outputColorSpace,
      shadowMapEnabled: renderer.shadowMap?.enabled || false
    }
  };
}

/**
 * Restore view settings only (camera, renderer) - no scene objects
 */
export function restoreViewSettings(threeView, state) {
  if (!state || !state.camera || !state.renderer) {
    return false;
  }

  const { camera, renderer } = threeView;
  const controls = threeView.controls || threeView.cameraController;
  const { camera: camState, renderer: renState } = state;

  // Restore camera
  if (camState.position) {
    camera.position.fromArray(camState.position);
  }
  if (camState.rotation) {
    camera.rotation.fromArray(camState.rotation);
  }
  if (camState.fov !== undefined) {
    camera.fov = camState.fov;
  }
  if (camState.near !== undefined) {
    camera.near = camState.near;
  }
  if (camState.far !== undefined) {
    camera.far = camState.far;
  }
  if (camState.zoom !== undefined) {
    camera.zoom = camState.zoom;
  }
  camera.updateProjectionMatrix();

  // Restore camera target (controls)
  if (controls && camState.target) {
    if (controls.target && typeof controls.target.fromArray === 'function') {
      controls.target.fromArray(camState.target);
    }
    if (typeof controls.update === 'function') {
      controls.update();
    }
  }

  // Restore renderer
  if (renState.size && renState.size.width && renState.size.height) {
    threeView.setSize(renState.size.width, renState.size.height);
  }
  if (renState.pixelRatio !== undefined) {
    renderer.setPixelRatio(renState.pixelRatio);
  }
  if (renState.toneMapping !== undefined) {
    renderer.toneMapping = renState.toneMapping;
  }
  if (renState.toneMappingExposure !== undefined) {
    renderer.toneMappingExposure = renState.toneMappingExposure;
  }
  if (renState.outputColorSpace !== undefined) {
    renderer.outputColorSpace = renState.outputColorSpace;
  }
  if (renState.shadowMapEnabled !== undefined && renderer.shadowMap) {
    renderer.shadowMap.enabled = renState.shadowMapEnabled;
  }

  return true;
}

/**
 * Save view settings only (camera, renderer) to IndexedDB
 * Used when DocumentPersistence is active
 */
export async function saveViewSettingsOnly(threeView) {
  if (!isIndexedDBAvailable()) {
    return false;
  }

  try {
    const viewSettings = serializeViewSettings(threeView);

    const payload = {
      version: STATE_VERSION,
      savedAt: Date.now(),
      viewSettings,
      // Mark as view-only (no scene objects)
      viewOnly: true
    };

    await db.state.put({
      id: STATE_KEY,
      payload
    });

    if (!isSilentMode()) {
      console.log('💾 Saved view settings only (DocumentPersistence active)');
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to save view settings:', error);
    return false;
  }
}

/**
 * Save complete application state to IndexedDB
 *
 * @param {Object} options
 * @param {THREE.Scene} options.scene - Three.js scene
 * @param {THREE.Camera} options.camera - Camera
 * @param {THREE.WebGLRenderer} options.renderer - Renderer
 * @param {Object} options.environment - Environment settings
 * @param {Array} options.textures - Texture metadata
 * @param {Object} options.ui - UI state
 */
export async function saveState({
  scene,
  camera,
  renderer,
  environment = {},
  textures = [],
  ui = {}
}) {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available, state will not persist')
    return false
  }

  try {
    if (!isSilentMode()) {
      console.log('💾 Saving application state...')
    }

    // Store texture blobs
    for (const textureInfo of textures) {
      if (textureInfo.blob) {
        await db.blobs.put({
          key: textureInfo.id,
          blob: textureInfo.blob,
          type: textureInfo.blob.type,
          savedAt: Date.now()
        })
        if (!isSilentMode()) {
          console.log(`  📦 Saved texture blob: ${textureInfo.id}`)
        }
      }
    }

    // Serialize scene
    const sceneJSON = scene.toJSON()

    // Build state payload
    const payload = {
      version: STATE_VERSION,
      savedAt: Date.now(),

      // Scene data
      sceneJSON,

      // Camera state
      camera: {
        position: camera.position.toArray(),
        rotation: camera.rotation.toArray(),
        fov: camera.fov || 75,
        zoom: camera.zoom || 1
      },

      // Renderer configuration
      renderer: {
        toneMapping: renderer.toneMapping,
        toneMappingExposure: renderer.toneMappingExposure,
        outputColorSpace: renderer.outputColorSpace,
        shadowMapEnabled: renderer.shadowMap?.enabled || false
      },

      // Environment/background
      environment: {
        kind: environment.kind || 'none', // 'color' | 'exr' | 'hdr' | 'none'
        color: environment.color,
        imageName: environment.imageName,
        imageType: environment.imageType,
        settings: environment.settings || {}
      },

      // Texture metadata
      textures: textures.map(t => ({
        id: t.id,
        name: t.name,
        blobKey: t.blob ? t.id : undefined,
        url: t.url,
        props: {
          wrapS: t.props?.wrapS || THREE.RepeatWrapping,
          wrapT: t.props?.wrapT || THREE.RepeatWrapping,
          repeat: t.props?.repeat || [1, 1],
          offset: t.props?.offset || [0, 0],
          rotation: t.props?.rotation || 0,
          colorSpace: t.props?.colorSpace || 'SRGBColorSpace',
          flipY: t.props?.flipY !== false,
          generateMipmaps: t.props?.generateMipmaps !== false
        }
      })),

      // UI state
      ui: {
        panels: ui.panels || {},
        layout: ui.layout || 'default',
        theme: ui.theme || 'dark'
      }
    }

    // Save to IndexedDB
    await db.state.put({
      id: STATE_KEY,
      payload
    })

    // Save metadata
    await db.metadata.put({
      key: 'lastSaved',
      value: new Date().toISOString()
    })

    if (!isSilentMode()) {
      console.log('✅ Application state saved successfully')
    }
    return true

  } catch (error) {
    console.error('❌ Failed to save application state:', error)
    return false
  }
}

/**
 * Debounced version of saveState (500ms delay)
 */
export const saveStateDebounced = debounce(saveState, 500)

/**
 * Load application state from IndexedDB
 *
 * @returns {Promise<Object|null>} Persisted state or null
 */
export async function loadState() {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available')
    return null
  }

  try {
    const record = await db.state.get(STATE_KEY)

    if (!record || !record.payload) {
      console.log('📭 No saved state found')
      return null
    }

    const payload = record.payload

    // Version check
    if (payload.version !== STATE_VERSION) {
      console.warn(`⚠️ State version mismatch: ${payload.version} vs ${STATE_VERSION}`)
      // Could implement migration here
    }

    console.log(`📂 Loaded state from ${new Date(payload.savedAt).toLocaleString()}`)
    return payload

  } catch (error) {
    console.error('❌ Failed to load application state:', error)
    return null
  }
}

/**
 * Restore Three.js scene from persisted state
 *
 * @param {Object} savedState - State from loadState()
 * @param {THREE.WebGLRenderer|Object} rendererOrThreeView - Renderer instance or ThreeView instance
 * @param {Object} opts - Options
 * @returns {Promise<Object>} Restored scene, camera, and metadata
 */
export async function restoreScene(savedState, rendererOrThreeView, opts = {}) {
  if (!savedState) {
    return null
  }

  // ---- DOUBLE INSURANCE: Check document mode even if called directly ----
  const threeView = rendererOrThreeView?.scene ? rendererOrThreeView : null;
  const renderer = threeView?.renderer || rendererOrThreeView;

  const docMode =
    threeView?.options?.useDocumentPersistence === true ||
    window.__CAD_USING_DOCUMENT_PERSISTENCE__ === true;

  const viewOnly = docMode || opts.viewOnly === true || savedState.viewOnly;

  if (viewOnly) {
    console.log('[RESTORE] View-only mode → restoring view settings only, no scene objects');
    if (threeView) {
      // Restore view settings directly
      const viewState = savedState.viewSettings || {
        camera: savedState.camera,
        renderer: savedState.renderer
      };
      if (viewState.camera && viewState.renderer) {
        restoreViewSettings(threeView, viewState);
      }
    }
    return {
      scene: null, // Signal that scene should not be replaced
      camera: null, // Camera will be restored separately via restoreViewSettings
      environment: savedState.environment || {},
      ui: savedState.ui || {},
      textureMap: new Map(),
      viewOnly: true
    }
  }

  try {
    console.log('🔄 Restoring scene from saved state...')

    // 1. Restore textures first
    const textureMap = new Map()

    for (const textureInfo of savedState.textures || []) {
      try {
        let texture

        // Load from blob or URL
        if (textureInfo.blobKey) {
          const blobRecord = await db.blobs.get(textureInfo.blobKey)
          if (blobRecord?.blob) {
            const objectURL = URL.createObjectURL(blobRecord.blob)
            texture = await loadTextureFromURL(objectURL)
            console.log(`  🖼️ Restored texture from blob: ${textureInfo.name}`)
          }
        } else if (textureInfo.url) {
          texture = await loadTextureFromURL(textureInfo.url)
          console.log(`  🖼️ Restored texture from URL: ${textureInfo.name}`)
        }

        if (texture) {
          // Apply texture properties
          texture.wrapS = textureInfo.props.wrapS
          texture.wrapT = textureInfo.props.wrapT
          texture.repeat.set(...textureInfo.props.repeat)
          texture.offset.set(...textureInfo.props.offset)
          texture.rotation = textureInfo.props.rotation
          texture.colorSpace = THREE[textureInfo.props.colorSpace] || THREE.SRGBColorSpace
          texture.flipY = textureInfo.props.flipY
          texture.generateMipmaps = textureInfo.props.generateMipmaps
          texture.needsUpdate = true

          // Mark texture as raw to prevent Vue reactivity
          textureMap.set(textureInfo.id, markRaw(texture))
        }
      } catch (err) {
        console.warn(`⚠️ Failed to restore texture ${textureInfo.name}:`, err)
      }
    }

    // 2. Restore scene from JSON
    const loader = new THREE.ObjectLoader()
    const scene = loader.parse(savedState.sceneJSON)
    console.log('  🎭 Scene restored from JSON')

    // CRITICAL: Mark all Three.js objects as raw to prevent Vue reactivity
    // This prevents proxy errors with read-only properties
    scene.traverse((object) => {
      // Helper function to safely mark properties as raw
      const markPropertyRaw = (obj, propName) => {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(obj, propName)
          // Only mark if property exists and is writable
          if (obj[propName] && (!descriptor || descriptor.writable !== false)) {
            obj[propName] = markRaw(obj[propName])
          }
        } catch (e) {
          // Skip read-only properties silently
        }
      }

      // Mark matrices (skip if read-only)
      markPropertyRaw(object, 'matrix')
      markPropertyRaw(object, 'matrixWorld')
      markPropertyRaw(object, 'matrixWorldInverse')
      markPropertyRaw(object, 'normalMatrix')

      // Mark geometry and material
      markPropertyRaw(object, 'geometry')

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material = object.material.map(m => markRaw(m))
        } else {
          markPropertyRaw(object, 'material')
        }
      }
    })

    // 3. Rebind textures to materials
    scene.traverse((object) => {
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]

        for (const material of materials) {
          // Check if material has stored texture IDs in userData
          if (material.userData?.textureId) {
            const texture = textureMap.get(material.userData.textureId)
            if (texture) {
              material.map = texture
              material.needsUpdate = true
              console.log(`  🔗 Rebound texture to material: ${material.name || 'unnamed'}`)
            }
          }
        }
      }
    })

    // 4. Restore camera
    const camera = new THREE.PerspectiveCamera(
      savedState.camera.fov,
      1, // aspect ratio will be set by container
      0.1,
      1000
    )
    camera.position.fromArray(savedState.camera.position)
    camera.rotation.fromArray(savedState.camera.rotation)
    camera.zoom = savedState.camera.zoom

    // Mark camera matrices as raw to prevent Vue reactivity (safely)
    const markPropertyRaw = (obj, propName) => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(obj, propName)
        if (obj[propName] && (!descriptor || descriptor.writable !== false)) {
          obj[propName] = markRaw(obj[propName])
        }
      } catch (e) {
        // Skip read-only properties silently
      }
    }

    markPropertyRaw(camera, 'matrix')
    markPropertyRaw(camera, 'matrixWorld')
    markPropertyRaw(camera, 'matrixWorldInverse')
    markPropertyRaw(camera, 'projectionMatrix')
    markPropertyRaw(camera, 'projectionMatrixInverse')

    console.log('  📷 Camera restored')

    // 5. Restore renderer settings
    if (renderer && savedState.renderer) {
      renderer.toneMapping = savedState.renderer.toneMapping
      renderer.toneMappingExposure = savedState.renderer.toneMappingExposure
      renderer.outputColorSpace = savedState.renderer.outputColorSpace
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = savedState.renderer.shadowMapEnabled
      }
      console.log('  🎨 Renderer settings restored')
    }

    console.log('✅ Scene restoration complete')

    return {
      scene,
      camera,
      environment: savedState.environment,
      ui: savedState.ui,
      textureMap
    }

  } catch (error) {
    console.error('❌ Failed to restore scene:', error)
    throw error
  }
}

/**
 * Load texture from URL (promise-based)
 */
function loadTextureFromURL(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (texture) => resolve(texture),
      undefined,
      (error) => reject(error)
    )
  })
}

/**
 * Check if persisted state exists
 */
export async function hasPersistedState() {
  if (!isIndexedDBAvailable()) {
    return false
  }

  try {
    const record = await db.state.get(STATE_KEY)
    return !!record?.payload
  } catch (error) {
    return false
  }
}

/**
 * Get last saved timestamp
 */
export async function getLastSavedTime() {
  if (!isIndexedDBAvailable()) {
    return null
  }

  try {
    const metadata = await db.metadata.get('lastSaved')
    return metadata?.value || null
  } catch (error) {
    return null
  }
}

/**
 * Clear all persisted state
 */
export async function clearPersistedState() {
  if (!isIndexedDBAvailable()) {
    return false
  }

  try {
    await db.state.delete(STATE_KEY)
    await db.blobs.clear()
    await db.metadata.delete('lastSaved')
    console.log('✅ Persisted state cleared')
    return true
  } catch (error) {
    console.error('❌ Failed to clear state:', error)
    return false
  }
}

/**
 * Export state as JSON file (for backup/sharing)
 */
export async function exportStateToFile() {
  const state = await loadState()
  if (!state) {
    throw new Error('No state to export')
  }

  // Create downloadable JSON
  const json = JSON.stringify(state, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  // Trigger download
  const a = document.createElement('a')
  a.href = url
  a.download = `cad-scene-${Date.now()}.json`
  a.click()

  URL.revokeObjectURL(url)
}

