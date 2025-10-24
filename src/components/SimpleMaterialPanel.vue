<template>
  <div class="simple-material-panel">
    <div class="panel-header">
      <h3>Material Selection</h3>
      <button class="close-button" @click="closePanel" title="Close panel">×</button>
    </div>

    <div class="panel-content">
      <!-- Basic Materials -->
      <div class="material-section">
        <h4>Basic Materials</h4>
        <div class="material-grid">
          <div
            v-for="material in basicMaterials"
            :key="material.id"
            class="material-card"
            :class="{ active: selectedMaterial === material.id }"
            @click="selectMaterial(material.id)"
          >
            <div class="material-preview" :style="{ background: material.color }"></div>
            <span class="material-name">{{ material.name }}</span>
          </div>
        </div>
      </div>

      <!-- Texture Import Section -->
      <div class="texture-section">
        <h4>Custom Texture</h4>
        <div class="import-area"
             :class="{ 'drag-over': isDragOver }"
             @click="handleImportClick"
             @dragover.prevent="isDragOver = true"
             @dragleave.prevent="isDragOver = false"
             @drop.prevent="handleFileDrop">
          <input
            ref="textureFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            @change="handleFileSelect"
            style="display: none"
          >
          <div v-if="!selectedTexture" class="import-placeholder">
            <i class="import-icon">📁</i>
            <p>Import Image</p>
            <span class="import-hint">Click or drag image to upload texture</span>
          </div>
          <div v-else class="texture-preview-small">
            <img :src="texturePreviewUrl" alt="Texture preview" class="preview-image">
            <div class="texture-info-small">
              <p class="texture-name">{{ selectedTexture.name }}</p>
              <button @click.stop="clearTexture" class="clear-btn">×</button>
            </div>
          </div>
        </div>

        <!-- Texture Repeat Controls -->
        <div v-if="selectedTexture" class="texture-controls">
          <h5>Texture Repeat</h5>

          <div class="control-group">
            <label for="repeat-x">Horizontal (U):</label>
            <div class="control-input-group">
              <input
                id="repeat-x"
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                v-model.number="textureRepeatX"
                @input="updateTextureRepeat"
                class="slider"
              >
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                v-model.number="textureRepeatX"
                @input="updateTextureRepeat"
                class="number-input"
              >
            </div>
          </div>

          <div class="control-group">
            <label for="repeat-y">Vertical (V):</label>
            <div class="control-input-group">
              <input
                id="repeat-y"
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                v-model.number="textureRepeatY"
                @input="updateTextureRepeat"
                class="slider"
              >
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                v-model.number="textureRepeatY"
                @input="updateTextureRepeat"
                class="number-input"
              >
            </div>
          </div>

          <button @click="resetTextureRepeat" class="reset-btn">
            Reset to 1×1
          </button>
        </div>
      </div>

      <!-- Apply Button -->
      <div class="action-section">
        <button
          class="apply-button"
          :disabled="!hasSelection || (!selectedMaterial && !selectedTexture)"
          @click="applyMaterial"
        >
          {{ selectedTexture ? 'Apply Texture' : 'Apply Material' }}
        </button>
        <p v-if="!hasSelection" class="hint-text">Select an object to apply material</p>
        <p v-else-if="selectedTexture" class="hint-text success">Texture ready to apply: {{ selectedTexture.name }}</p>
        <p v-else-if="selectedMaterial" class="hint-text success">Material selected: {{ getMaterialName(selectedMaterial) }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useApplicationStore } from '@/stores/application'
import { ImageLoader } from '@/packages/cad-core/io/ImageLoader.js'
import * as THREE from 'three'

export default {
  name: 'SimpleMaterialPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const appStore = useApplicationStore()
    const selectedMaterial = ref('standard')
    const selectedTexture = ref(null)
    const texturePreviewUrl = ref(null)
    const textureFileInput = ref(null)
    const isDragOver = ref(false)

    // Texture repeat controls
    const textureRepeatX = ref(1)
    const textureRepeatY = ref(1)
    const currentTextureRef = ref(null) // Store reference to currently applied texture

    // Basic materials similar to Three.js defaults
    const basicMaterials = [
      { id: 'standard', name: 'Standard', color: '#808080', hexColor: 0x808080 },
      { id: 'metal', name: 'Metal', color: '#B0B0B0', hexColor: 0xB0B0B0 },
      { id: 'plastic', name: 'Plastic', color: '#4A90E2', hexColor: 0x4A90E2 },
      { id: 'glass', name: 'Glass', color: '#A0D8F8', hexColor: 0xA0D8F8 },
      { id: 'wood', name: 'Wood', color: '#8B6F47', hexColor: 0x8B6F47 },
      { id: 'rubber', name: 'Rubber', color: '#2C2C2C', hexColor: 0x2C2C2C },
    ]

    const hasSelection = computed(() => {
      return appStore.activeDocument?.selectedNodes?.length > 0
    })

    const selectMaterial = (materialId) => {
      selectedMaterial.value = materialId
      // Clear texture when selecting a preset material
      selectedTexture.value = null
      texturePreviewUrl.value = null
      console.log('Selected material:', materialId)
    }

    const getMaterialName = (materialId) => {
      const material = basicMaterials.find(m => m.id === materialId)
      return material ? material.name : materialId
    }

    const handleImportClick = () => {
      if (textureFileInput.value) {
        textureFileInput.value.click()
      }
    }

    const handleFileSelect = async (event) => {
      const file = event.target.files?.[0]
      if (file) {
        await loadTexture(file)
      }
    }

    const handleFileDrop = async (event) => {
      isDragOver.value = false
      const file = event.dataTransfer.files?.[0]
      if (file) {
        await loadTexture(file)
      }
    }

    const loadTexture = async (file) => {
      try {
        // Validate file format
        if (!ImageLoader.isValidImageFile(file)) {
          alert('Invalid image format. Please use JPEG, PNG, WebP, or GIF.')
          return
        }

        // Load image as data URL for preview
        const dataUrl = await ImageLoader.loadImageAsDataURL(file)

        selectedTexture.value = file
        texturePreviewUrl.value = dataUrl
        selectedMaterial.value = 'custom-texture'

        console.log('Texture loaded:', file.name)
      } catch (error) {
        console.error('Failed to load texture:', error)
        alert('Failed to load texture: ' + error.message)
      }
    }

    const clearTexture = () => {
      selectedTexture.value = null
      texturePreviewUrl.value = null
      selectedMaterial.value = 'standard'
      currentTextureRef.value = null
      textureRepeatX.value = 1
      textureRepeatY.value = 1
      if (textureFileInput.value) {
        textureFileInput.value.value = ''
      }
    }

    /**
     * Update texture repeat on currently applied materials
     * This is called when sliders/inputs change
     */
    const updateTextureRepeat = () => {
      if (!hasSelection.value) return

      const selectedNodes = appStore.activeDocument.selectedNodes

      for (const node of selectedNodes) {
        const visualObject = node.visualObject
        if (visualObject && visualObject.object3D && visualObject.object3D.material) {
          const material = visualObject.object3D.material

          // Check if material has a texture map
          if (material.map) {
            material.map.wrapS = THREE.RepeatWrapping
            material.map.wrapT = THREE.RepeatWrapping
            material.map.repeat.set(textureRepeatX.value, textureRepeatY.value)
            material.map.needsUpdate = true
            material.needsUpdate = true
          }
        }
      }

      console.log(`Updated texture repeat to ${textureRepeatX.value} × ${textureRepeatY.value}`)

      // Auto-save scene state after texture repeat changes (debounced)
      const threeView = appStore.activeDocument?.views?.get?.('default')
      if (threeView && typeof threeView.saveSceneState === 'function') {
        threeView.saveSceneState()
      }
    }

    /**
     * Reset texture repeat to default 1×1
     */
    const resetTextureRepeat = () => {
      textureRepeatX.value = 1
      textureRepeatY.value = 1
      updateTextureRepeat()
    }

    const applyMaterial = async () => {
      if (!hasSelection.value) {
        alert('Please select an object first!')
        return
      }

      if (!selectedMaterial.value && !selectedTexture.value) {
        console.warn('No material or texture selected')
        alert('Please select a material or upload a texture first!')
        return
      }

      try {
        // Get selected nodes
        const selectedNodes = appStore.activeDocument.selectedNodes

        console.log('🎨 Starting material application...')
        console.log('Selected nodes:', selectedNodes.length)
        console.log('Selected material:', selectedMaterial.value)
        console.log('Selected texture:', selectedTexture.value?.name)

        // Apply to each selected object
        for (const node of selectedNodes) {
          const visualObject = node.visualObject

          console.log('Processing node:', node.name)
          console.log('Visual object exists:', !!visualObject)
          console.log('Object3D exists:', !!visualObject?.object3D)

          if (visualObject && visualObject.object3D) {
            let material

            // Handle custom texture
            if (selectedTexture.value && texturePreviewUrl.value) {
              console.log('🖼️ Loading custom texture:', selectedTexture.value.name)

              try {
                const textureLoader = new THREE.TextureLoader()
                const texture = await new Promise((resolve, reject) => {
                  textureLoader.load(
                    texturePreviewUrl.value,
                    (tex) => {
                      console.log('✅ Texture loaded successfully')
                      resolve(tex)
                    },
                    undefined,
                    (err) => {
                      console.error('❌ Texture load failed:', err)
                      reject(err)
                    }
                  )
                })

                texture.wrapS = THREE.RepeatWrapping
                texture.wrapT = THREE.RepeatWrapping
                texture.repeat.set(textureRepeatX.value, textureRepeatY.value)

                // Store texture reference for real-time updates
                currentTextureRef.value = texture

                material = new THREE.MeshStandardMaterial({
                  map: texture,
                  metalness: 0.2,
                  roughness: 0.6
                })

                // Register texture for persistence (if ThreeView available)
                const threeView = appStore.activeDocument?.views?.get?.('default')
                if (threeView && typeof threeView.registerTexture === 'function') {
                  threeView.registerTexture(texture, {
                    name: selectedTexture.value.name,
                    blob: selectedTexture.value, // Store the original File/Blob
                    url: texturePreviewUrl.value
                  })
                }

                console.log(`✅ Applied texture ${selectedTexture.value.name} to ${node.name}`)
              } catch (error) {
                console.error('❌ Failed to load texture:', error)
                alert(`Failed to load texture: ${error.message}`)
                continue
              }
            } else if (selectedMaterial.value) {
              // Get material configuration
              const materialConfig = basicMaterials.find(m => m.id === selectedMaterial.value)
              if (!materialConfig) {
                console.error('Material configuration not found:', selectedMaterial.value)
                continue
              }

              // Create Three.js material based on material type
              switch (materialConfig.id) {
                case 'metal':
                  material = new THREE.MeshStandardMaterial({
                    color: materialConfig.hexColor,
                    metalness: 0.8,
                    roughness: 0.2
                  })
                  break

                case 'plastic':
                  material = new THREE.MeshStandardMaterial({
                    color: materialConfig.hexColor,
                    metalness: 0.1,
                    roughness: 0.5
                  })
                  break

                case 'glass':
                  material = new THREE.MeshPhysicalMaterial({
                    color: materialConfig.hexColor,
                    metalness: 0,
                    roughness: 0.1,
                    transmission: 0.9,
                    transparent: true,
                    opacity: 0.5
                  })
                  break

                case 'wood':
                  material = new THREE.MeshStandardMaterial({
                    color: materialConfig.hexColor,
                    metalness: 0,
                    roughness: 0.8
                  })
                  break

                case 'rubber':
                  material = new THREE.MeshStandardMaterial({
                    color: materialConfig.hexColor,
                    metalness: 0,
                    roughness: 0.9
                  })
                  break

                default: // standard
                  material = new THREE.MeshStandardMaterial({
                    color: materialConfig.hexColor,
                    metalness: 0.3,
                    roughness: 0.4
                  })
              }

              console.log(`Applied ${materialConfig.name} material to ${node.name}`)
            }

            // IMPORTANT: Save as custom material to prevent reset on selection change
            if (visualObject._customMaterial) {
              visualObject._customMaterial.dispose() // Clean up old material
            }
            visualObject._customMaterial = material

            // Clear material cache to force recreation with new custom material
            visualObject._materials.clear()

            // Apply material to the mesh
            if (visualObject.object3D.material) {
              visualObject.object3D.material.dispose() // Clean up old material
            }

            visualObject.object3D.material = material
            visualObject.object3D.material.needsUpdate = true
            visualObject._material = material

            console.log('✅ Material applied to mesh and saved as custom material')

            // Update node properties
            if (!node.properties) {
              node.properties = {}
            }
            node.properties.material = {
              type: selectedTexture.value ? 'custom-texture' : selectedMaterial.value,
              texture: selectedTexture.value?.name,
              color: selectedTexture.value ? null : basicMaterials.find(m => m.id === selectedMaterial.value)?.hexColor
            }
          } else {
            console.warn('⚠️ No visual object found for node:', node.name)
          }
        }

        console.log('✅ Material/Texture applied successfully to all selected objects!')
        // Success notification removed - silent success

        // Auto-save scene state after material changes
        const threeView = appStore.activeDocument?.views?.get?.('default')
        if (threeView && typeof threeView.saveSceneState === 'function') {
          threeView.saveSceneState()
        }

      } catch (error) {
        console.error('❌ Failed to apply material:', error)
        alert('Failed to apply material: ' + error.message)
      }
    }

    /**
     * Close the panel
     */
    const closePanel = () => {
      emit('close')
    }

    return {
      basicMaterials,
      selectedMaterial,
      selectedTexture,
      texturePreviewUrl,
      textureFileInput,
      isDragOver,
      hasSelection,
      textureRepeatX,
      textureRepeatY,
      selectMaterial,
      getMaterialName,
      handleImportClick,
      handleFileSelect,
      handleFileDrop,
      clearTexture,
      updateTextureRepeat,
      resetTextureRepeat,
      applyMaterial,
      closePanel
    }
  }
}
</script>

<style scoped>
.simple-material-panel {
  background: #2c2c2c;
  border-radius: 8px;
  padding: 16px;
  color: #ffffff;
  min-width: 280px;
  max-width: 320px;
  max-height: 70vh;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #3498db;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ecf0f1;
}

.close-button {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #bdc3c7;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.close-button:hover {
  background: rgba(231, 76, 60, 0.2);
  border-color: #e74c3c;
  color: #e74c3c;
}

.close-button:active {
  transform: scale(0.95);
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  padding-right: 4px;
}

/* Custom Scrollbar */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #555555;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #666666;
}

/* Material Section */
.material-section h4,
.texture-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #bdc3c7;
  font-weight: 500;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.material-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #1a1a1a;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.material-card:hover {
  background: #333333;
  border-color: #3498db;
}

.material-card.active {
  background: #2c3e50;
  border-color: #3498db;
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.4);
}

.material-preview {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.material-name {
  font-size: 11px;
  color: #bdc3c7;
  text-align: center;
}

.material-card.active .material-name {
  color: #3498db;
  font-weight: 600;
}

/* Texture Import Section */
.texture-section {
  border-top: 1px solid #3a3a3a;
  padding-top: 16px;
}

.import-area {
  background: #1a1a1a;
  border: 2px dashed #555555;
  border-radius: 6px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.import-area:hover {
  background: #252525;
  border-color: #3498db;
}

.import-area.drag-over {
  background: #2c3e50;
  border-color: #3498db;
  border-style: solid;
}

.texture-preview-small {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.texture-info-small {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.texture-name {
  margin: 0;
  font-size: 12px;
  color: #ecf0f1;
  word-break: break-word;
}

.clear-btn {
  width: 24px;
  height: 24px;
  background: #e74c3c;
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn:hover {
  background: #c0392b;
  transform: scale(1.1);
}

.import-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.import-icon {
  font-size: 32px;
  opacity: 0.6;
}

.import-placeholder p {
  margin: 0;
  font-size: 14px;
  color: #ecf0f1;
  font-weight: 500;
}

.import-hint {
  font-size: 11px;
  color: #7f8c8d;
}

/* Action Section */
.action-section {
  border-top: 1px solid #3a3a3a;
  padding-top: 16px;
}

.apply-button {
  width: 100%;
  padding: 10px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-button:hover:not(:disabled) {
  background: #2980b9;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.4);
}

.apply-button:disabled {
  background: #555555;
  color: #888888;
  cursor: not-allowed;
}

.apply-button:active:not(:disabled) {
  transform: translateY(1px);
}

.hint-text {
  margin: 8px 0 0 0;
  font-size: 11px;
  color: #7f8c8d;
  text-align: center;
}

.hint-text.success {
  color: #2ecc71;
  font-weight: 500;
}

/* Texture Controls */
.texture-controls {
  margin-top: 16px;
  padding: 12px;
  background: #1a1a1a;
  border-radius: 6px;
  border: 1px solid #3a3a3a;
}

.texture-controls h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #ecf0f1;
  font-weight: 500;
}

.control-group {
  margin-bottom: 12px;
}

.control-group:last-of-type {
  margin-bottom: 16px;
}

.control-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #bdc3c7;
}

.control-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #3a3a3a;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  transition: all 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: #5dade2;
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.slider::-moz-range-thumb:hover {
  background: #5dade2;
  transform: scale(1.1);
}

.number-input {
  width: 60px;
  padding: 4px 8px;
  background: #2c2c2c;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  color: #ecf0f1;
  font-size: 12px;
  text-align: center;
  outline: none;
  transition: border-color 0.2s ease;
}

.number-input:focus {
  border-color: #3498db;
}

.number-input::-webkit-inner-spin-button,
.number-input::-webkit-outer-spin-button {
  opacity: 1;
}

.reset-btn {
  width: 100%;
  padding: 6px;
  background: #34495e;
  color: #ecf0f1;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #465a6d;
}

.reset-btn:active {
  transform: translateY(1px);
}

</style>

