import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { clearPersistedState } from '@/packages/cad-core/io/ScenePersistence.js'
import { clearDocumentState } from '@/packages/cad-core/io/DocumentPersistence.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Expose helper functions and history to console for debugging
import { history } from '@/packages/cad-core/foundation/historyInstance.js'

if (typeof window !== 'undefined') {
  // Expose history instance for debugging
  window.__HISTORY__ = history
  console.log('[MAIN] History instance exposed as window.__HISTORY__')

  window.clearCADState = async () => {
    console.log('🧹 Clearing all CAD persistence data...')

    // Clear both ScenePersistence and DocumentPersistence
    const sceneCleared = await clearPersistedState()
    const docCleared = await clearDocumentState()

    if (sceneCleared && docCleared) {
      console.log('All CAD state cleared! (Scene + Document)')
      console.log('   Refresh the page to start fresh.')
      return 'All state cleared. Please refresh the page.'
    } else {
      console.warn('Partial clear:', {
        scene: sceneCleared ? 'OK' : 'FAILED',
        document: docCleared ? 'OK' : 'FAILED'
      })
      return `Partial clear: scene=${sceneCleared}, document=${docCleared}`
    }
  }

  // Debug helper to check scene references and layers
  window.debugSceneRefs = () => {
    const threeView = window.__THREESCENE_INSTANCE__
    if (!threeView) {
      console.warn('No ThreeView instance found')
      return
    }

    console.log('🔍 Scene Reference Debug:')
    console.log('  threeView.scene.id:', threeView.scene?.id)
    console.log('  threeView.scene.children.length:', threeView.scene?.children.length)
    console.log('  window.__lastSceneId:', window.__lastSceneId)
    console.log('  Camera layers mask:', threeView.camera?.layers.mask)

    if (threeView.scene) {
      console.log('  Scene children:')
      threeView.scene.children.forEach((child, i) => {
        console.log(`    [${i}] ${child.type} "${child.name || 'unnamed'}" (id:${child.id}, layer:${child.layers.mask}, visible:${child.visible})`)
      })

      // Check for helpers specifically
      const grid = threeView.scene.getObjectByName('AppGrid')
      const axes = threeView.scene.getObjectByName('AppAxes')

      console.log('  Helpers status:')
      console.log(`    Grid: ${grid ? `found (layer:${grid.layers.mask}, visible:${grid.visible}, parent:${grid.parent?.id})` : 'NOT FOUND'}`)
      console.log(`    Axes: ${axes ? `found (layer:${axes.layers.mask}, visible:${axes.visible}, parent:${axes.parent?.id})` : 'NOT FOUND'}`)
    }

    return {
      sceneId: threeView.scene?.id,
      childCount: threeView.scene?.children.length,
      lastRenderedSceneId: window.__lastSceneId,
      scenesMatch: threeView.scene?.id === window.__lastSceneId,
      cameraLayers: threeView.camera?.layers.mask,
      gridFound: !!threeView.scene?.getObjectByName('AppGrid'),
      axesFound: !!threeView.scene?.getObjectByName('AppAxes')
    }
  }

  console.log('💡 Tips:')
  console.log('  - clearCADState() - Clear saved scene and start fresh')
  console.log('  - debugSceneRefs() - Debug scene reference issues')
}
