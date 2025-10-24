<template>
  <div class="scene-background-panel">
    <div class="panel-header">
      <h3>Scene Background</h3>
      <button class="close-button" @click="closePanel" title="Close panel">×</button>
    </div>

    <div class="panel-content">
      <!-- Background Colors -->
      <div class="background-section">
        <h4>Background Color</h4>
        <div class="background-grid">
          <div
            v-for="bg in backgroundColors"
            :key="bg.id"
            class="background-card"
            :class="{ active: selectedBackground === bg.id && !selectedBackgroundImage }"
            @click="selectBackground(bg)"
            :title="bg.name"
          >
            <div class="background-preview" :style="{ background: bg.color }"></div>
            <span class="background-name">{{ bg.name }}</span>
          </div>
        </div>
      </div>

      <!-- Background Image Import -->
      <div class="background-image-section">
        <h4>Background Image</h4>
        <div class="import-area"
             :class="{ 'drag-over': isDragOver, 'active': selectedBackgroundImage }"
             @click="handleImportClick"
             @dragover.prevent="isDragOver = true"
             @dragleave.prevent="isDragOver = false"
             @drop.prevent="handleFileDrop">
          <input
            ref="imageFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.exr,.hdr"
            @change="handleFileSelect"
            style="display: none"
          >
          <div v-if="!selectedBackgroundImage" class="import-placeholder">
            <i class="import-icon">🖼️</i>
            <p>Import Background Image</p>
            <span class="import-hint">Click or drag image to upload</span>
            <span class="import-hint format-hint">Supports: JPG, PNG, WebP, GIF, EXR, HDR</span>
          </div>
          <div v-else class="image-preview-small">
            <img :src="backgroundImagePreview" alt="Background preview" class="preview-image">
            <div class="image-info-small">
              <p class="image-name">{{ selectedBackgroundImage.name }}</p>
              <button @click.stop="clearBackgroundImage" class="clear-btn">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid Settings -->
      <div class="grid-section">
        <h4>Grid Display</h4>
        <div class="grid-controls">
          <label class="checkbox-label">
            <input type="checkbox" v-model="showGrid" @change="toggleGrid">
            <span>Show Grid</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="showAxes" @change="toggleAxes">
            <span>Show Axes</span>
          </label>
        </div>
      </div>

      <!-- Lighting Settings -->
      <div class="lighting-section">
        <h4>Lighting</h4>
        <div class="lighting-controls">
          <div class="slider-control">
            <label>Ambient Light</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              v-model.number="ambientIntensity"
            >
            <span class="value">{{ ambientIntensity.toFixed(1) }}</span>
          </div>
          <div class="slider-control">
            <label>Directional Light</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              v-model.number="directionalIntensity"
            >
            <span class="value">{{ directionalIntensity.toFixed(1) }}</span>
          </div>
        </div>
      </div>

      <!-- Apply Button -->
      <div class="action-section">
        <button class="apply-button" @click="applyAllSettings">
          Apply Scene Settings
        </button>
        <p v-if="hasChanges" class="hint-text">Settings ready to apply</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { ImageLoader } from '@/packages/cad-core/io/ImageLoader.js'

// Create PMREM generator (reused across EXR loads)
let pmremGenerator = null

export default {
  name: 'SceneBackgroundPanel',
  emits: ['close'],
  setup(props, { emit }) {
    const selectedBackground = ref('dark-gray')
    const selectedBackgroundImage = ref(null)
    const backgroundImagePreview = ref(null)
    const imageFileInput = ref(null)
    const isDragOver = ref(false)
    const showGrid = ref(true)
    const showAxes = ref(true)
    const ambientIntensity = ref(0.6)
    const directionalIntensity = ref(0.8)
    const hasChanges = ref(false)

    // Background color presets
    const backgroundColors = [
      { id: 'dark-gray', name: 'Dark Gray', color: '#222222', hexColor: 0x222222 },
      { id: 'black', name: 'Black', color: '#000000', hexColor: 0x000000 },
      { id: 'light-gray', name: 'Light Gray', color: '#CCCCCC', hexColor: 0xCCCCCC },
      { id: 'white', name: 'White', color: '#FFFFFF', hexColor: 0xFFFFFF },
      { id: 'blue', name: 'Sky Blue', color: '#87CEEB', hexColor: 0x87CEEB },
      { id: 'navy', name: 'Navy', color: '#1a1a2e', hexColor: 0x1a1a2e },
    ]

    const selectBackground = (bgConfig) => {
      selectedBackground.value = bgConfig.id
      // Clear image when selecting a color
      selectedBackgroundImage.value = null
      backgroundImagePreview.value = null
      hasChanges.value = true
      console.log('Background selected:', bgConfig.name)
    }

    const handleImportClick = () => {
      if (imageFileInput.value) {
        imageFileInput.value.click()
      }
    }

    const handleFileSelect = async (event) => {
      const file = event.target.files?.[0]
      if (file) {
        await loadBackgroundImage(file)
      }
    }

    const handleFileDrop = async (event) => {
      isDragOver.value = false
      const file = event.dataTransfer.files?.[0]
      if (file) {
        await loadBackgroundImage(file)
      }
    }

    const loadBackgroundImage = async (file) => {
      try {
        // Validate file format
        if (!ImageLoader.isValidImageFile(file)) {
          alert('Invalid image format. Please use JPEG, PNG, WebP, GIF, EXR, or HDR.')
          return
        }

        // For HDR/EXR files, create a special marker since we can't preview them
        if (ImageLoader.isHDRFile(file)) {
          selectedBackgroundImage.value = file
          // Use a placeholder for HDR preview (can't display HDR in regular img tag)
          backgroundImagePreview.value = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzQ0NDQiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkhEUi9FWFI8L3RleHQ+PC9zdmc+'
          hasChanges.value = true
          console.log('HDR/EXR background image loaded:', file.name)
        } else {
          // Load regular image as data URL for preview
          const dataUrl = await ImageLoader.loadImageAsDataURL(file)
          selectedBackgroundImage.value = file
          backgroundImagePreview.value = dataUrl
          hasChanges.value = true
          console.log('Background image loaded:', file.name)
        }
      } catch (error) {
        console.error('Failed to load background image:', error)
        alert('Failed to load background image: ' + error.message)
      }
    }

    const clearBackgroundImage = () => {
      selectedBackgroundImage.value = null
      backgroundImagePreview.value = null
      hasChanges.value = true
      if (imageFileInput.value) {
        imageFileInput.value.value = ''
      }
    }

    const applyAllSettings = async () => {
      try {
        console.log('🎨 Applying all scene settings...')

        // Get ThreeView from global reference
        const threeView = window.__THREESCENE_INSTANCE__
        if (!threeView || !threeView.scene) {
          console.warn('ThreeView not available')
          alert('Please wait for the 3D scene to fully load')
          return
        }

        // Apply background image or color
        if (selectedBackgroundImage.value && backgroundImagePreview.value) {
          console.log('🖼️ Loading background image:', selectedBackgroundImage.value.name)

          try {
            let texture;

            // Check if it's an HDR/EXR file
            if (ImageLoader.isHDRFile(selectedBackgroundImage.value)) {
              console.log('📸 Loading HDR/EXR file...')

              try {
                // Load EXR file as ArrayBuffer
                const arrayBuffer = await ImageLoader.loadHDRAsArrayBuffer(selectedBackgroundImage.value)
                console.log(`📦 ArrayBuffer loaded: ${arrayBuffer.byteLength} bytes`)

                // Use EXRLoader for .exr files
                const exrLoader = new EXRLoader()

                // Parse the EXR data (gets raw data, not a real Texture)
                const exrData = exrLoader.parse(arrayBuffer)

                if (!exrData) {
                  throw new Error('EXRLoader.parse() returned null or undefined')
                }

                console.log('✅ EXR data parsed successfully')
                console.log('📊 Raw EXR data:', {
                  width: exrData.width,
                  height: exrData.height,
                  dataLength: exrData.data?.length,
                  dataType: exrData.data?.constructor?.name
                })

                // CRITICAL FIX: Explicitly construct a REAL Three.js DataTexture
                // EXRLoader returns raw data, NOT a proper Texture instance!
                console.log('🔨 Creating proper DataTexture from EXR data...')

                texture = new THREE.DataTexture(
                  exrData.data,              // Uint16Array
                  exrData.width,
                  exrData.height,
                  THREE.RGBAFormat,          // format: 1023
                  THREE.HalfFloatType        // type: 1016
                )

                // CRITICAL: Configure DataTexture for equirectangular HDR
                texture.mapping = THREE.EquirectangularReflectionMapping
                texture.colorSpace = THREE.LinearSRGBColorSpace  // EXR is linear
                texture.flipY = false
                texture.minFilter = THREE.LinearFilter
                texture.magFilter = THREE.LinearFilter
                texture.generateMipmaps = false
                texture.unpackAlignment = 1  // Important for half-float data
                texture.needsUpdate = true

                console.log('✅ DataTexture created:', {
                  uuid: texture.uuid,
                  isDataTexture: texture.isDataTexture,
                  format: texture.format,
                  type: texture.type,
                  width: texture.image.width,
                  height: texture.image.height
                })

                // Sanity check: verify it's a real texture now
                if (!texture.uuid || texture.isDataTexture !== true) {
                  console.error('❌ DataTexture construction failed!')
                  throw new Error('Failed to create valid DataTexture')
                }

                console.log('✅ Valid DataTexture confirmed!')

                // Inspect texture data to ensure it's valid
                if (texture.image && texture.image.data) {
                  const data = texture.image.data
                  const sampleSize = Math.min(100, data.length)
                  let hasData = false
                  let hasFiniteData = false

                  for (let i = 0; i < sampleSize; i++) {
                    if (data[i] !== 0) hasData = true
                    if (isFinite(data[i])) hasFiniteData = true
                  }

                  console.log('📊 Texture data check:', {
                    dataLength: data.length,
                    hasNonZeroData: hasData,
                    hasFiniteData: hasFiniteData,
                    firstValues: Array.from(data.slice(0, 10)),
                    dataType: data.constructor.name
                  })
                }

                console.log('✅ Texture configured:', {
                  mapping: 'EquirectangularReflection',
                  colorSpace: 'LinearSRGB',
                  flipY: false,
                  minFilter: 'Linear',
                  magFilter: 'Linear'
                })

                // CRITICAL: Check if renderer has alpha:true and force recreation if needed
                if (threeView.renderer) {
                  const gl = threeView.renderer.getContext()
                  const glAttribs = gl.getContextAttributes()

                  console.log('🔍 DEBUG: Current WebGL Context Attributes:')
                  console.log('  - alpha:', glAttribs.alpha)
                  console.log('  - premultipliedAlpha:', glAttribs.premultipliedAlpha)
                  console.log('  - antialias:', glAttribs.antialias)

                  // CRITICAL: If alpha is true, FORCE renderer recreation
                  if (glAttribs.alpha === true) {
                    console.warn('❌ DETECTED alpha:true renderer - FORCING RECREATION!')
                    console.warn('🔄 This will create a new renderer with alpha:false')

                    // Force complete renderer recreation
                    threeView.recreateRenderer()

                    // Verify the new renderer
                    const newGl = threeView.renderer.getContext()
                    const newAttribs = newGl.getContextAttributes()

                    console.log('🔍 NEW Renderer Context Attributes:')
                    console.log('  - alpha:', newAttribs.alpha)
                    console.log('  - premultipliedAlpha:', newAttribs.premultipliedAlpha)

                    if (newAttribs.alpha === false) {
                      console.log('✅ SUCCESS: Renderer now has alpha:false!')
                    } else {
                      console.error('❌ FAILED: Renderer still has alpha:true after recreation!')
                    }
                  }

                  console.log('🔍 Renderer capabilities:', {
                    isWebGL2: threeView.renderer.capabilities.isWebGL2,
                    maxTextureSize: threeView.renderer.capabilities.maxTextureSize,
                    alpha: glAttribs.alpha
                  })

                  console.log('🔍 Texture details:', {
                    isDataTexture: texture.isDataTexture,
                    type: texture.type,
                    format: texture.format,
                    colorSpace: texture.colorSpace,
                    mapping: texture.mapping,
                    flipY: texture.flipY,
                    minFilter: texture.minFilter,
                    magFilter: texture.magFilter,
                    generateMipmaps: texture.generateMipmaps,
                    width: texture.image?.width,
                    height: texture.image?.height
                  })

                  // Configure tone mapping and color space
                  threeView.renderer.toneMapping = THREE.ACESFilmicToneMapping
                  threeView.renderer.toneMappingExposure = 1.0
                  threeView.renderer.outputColorSpace = THREE.SRGBColorSpace
                  threeView.renderer.autoClear = true
                  threeView.renderer.autoClearColor = true

                  console.log('✅ Renderer configured:', {
                    toneMapping: 'ACESFilmic',
                    exposure: 1.0,
                    outputColorSpace: 'SRGB',
                    autoClear: threeView.renderer.autoClear,
                    clearColor: threeView.renderer.getClearColor(new THREE.Color()),
                    clearAlpha: threeView.renderer.getClearAlpha()
                  })
                }

                console.log('✅ EXR texture fully configured for HDR rendering')

              } catch (parseError) {
                console.error('❌ EXR parse failed:', parseError)
                throw new Error(`Failed to parse EXR file: ${parseError.message}`)
              }
            } else {
              // Load regular image using TextureLoader
              const textureLoader = new THREE.TextureLoader()
              texture = await new Promise((resolve, reject) => {
                textureLoader.load(
                  backgroundImagePreview.value,
                  (tex) => {
                    console.log('✅ Background texture loaded successfully')
                    resolve(tex)
                  },
                  undefined,
                  (err) => {
                    console.error('❌ Background texture load failed:', err)
                    reject(err)
                  }
                )
              })
            }

            // Apply texture with PMREM conversion
            console.log('🎬 Applying EXR with PMREM conversion...')

            // Remove any previous skydome (from earlier attempts)
            const prevSkydome = threeView.scene.getObjectByName('SkydomeEXR')
            if (prevSkydome) {
              console.log('🗑️ Removing previous skydome')
              threeView.scene.remove(prevSkydome)
              prevSkydome.geometry?.dispose()
              prevSkydome.material?.dispose()
            }

            // Apply EXR with PMREM immediately
            try {
                // Create PMREM generator if not exists
                if (!pmremGenerator) {
                  pmremGenerator = new THREE.PMREMGenerator(threeView.renderer)
                  pmremGenerator.compileEquirectangularShader()
                  console.log('✅ PMREMGenerator created and compiled')
                }

                // CRITICAL: Convert equirectangular EXR to cube environment map
                console.log('🔄 Converting EXR to environment map with PMREM...')
                const renderTarget = pmremGenerator.fromEquirectangular(texture)
                const envMap = renderTarget.texture

                console.log('✅ Environment map generated:', {
                  type: envMap.type,
                  format: envMap.format,
                  mapping: envMap.mapping,
                  isCubeTexture: envMap.isCubeTexture,
                  isRenderTargetTexture: !!renderTarget,
                  hasImage: !!envMap.image
                })

                // SKIP PMREM - use original texture with proper tone mapping
                console.log('🎬 Using ORIGINAL texture (skipping PMREM)')

                // Configure renderer for HDR
                threeView.renderer.toneMapping = THREE.ACESFilmicToneMapping
                threeView.renderer.toneMappingExposure = 1.0
                threeView.renderer.outputColorSpace = THREE.SRGBColorSpace

                console.log('⚙️ Renderer: ACES tone mapping, exposure=1.0')

                // Apply DataTexture as background
                threeView.scene.background = texture
                threeView.scene.environment = null

                console.log('✅ Scene.background set to DataTexture')
                threeView.requestRender()

                console.log('🎉 EXR background should now be visible!')

                // Don't dispose original texture - we're using it!
                console.log('ℹ️ Original texture kept (not using PMREM)')

                console.log('📊 Final configuration:', {
                  toneMapping: 'ACESFilmic',
                  exposure: 1.0,
                  outputColorSpace: 'SRGB',
                  hasEnvironment: !!threeView.scene.environment,
                  hasBackground: !!threeView.scene.background
                })

                threeView.requestRender()

                console.log(`✅ Background image applied with PMREM: ${selectedBackgroundImage.value.name}`)
            } catch (pmremError) {
              console.error('❌ PMREM conversion failed:', pmremError)

              // Fallback: try direct assignment
              console.log('🔄 Fallback: trying direct scene.background assignment...')
              threeView.scene.background = texture
              threeView.requestRender()
            }
          } catch (error) {
            console.error('❌ Failed to load background texture:', error)
            alert(`Failed to load background image: ${error.message}`)
            return
          }
        } else {
          // Apply background color
          const bgConfig = backgroundColors.find(bg => bg.id === selectedBackground.value)
          if (bgConfig) {
            // Remove skydome if present
            const skydome = threeView.scene.getObjectByName('SkydomeEXR')
            if (skydome) {
              console.log('🗑️ Removing skydome for color background')
              threeView.scene.remove(skydome)
              skydome.geometry?.dispose()
              skydome.material?.dispose()
            }

            threeView.scene.background = new THREE.Color(bgConfig.hexColor)
            threeView.settings.backgroundColor = new THREE.Color(bgConfig.hexColor)
            console.log(`✅ Background changed to ${bgConfig.name}`)
          }
        }

        // Apply grid visibility
        threeView.settings.showGrid = showGrid.value
        if (threeView.helpers) {
          threeView.helpers.traverse((child) => {
            if (child.type === 'GridHelper') {
              child.visible = showGrid.value
            }
          })
        }
        console.log(`✅ Grid ${showGrid.value ? 'shown' : 'hidden'}`)

        // Apply axes visibility
        threeView.settings.showAxes = showAxes.value
        if (threeView.helpers) {
          threeView.helpers.traverse((child) => {
            if (child.type === 'AxesHelper') {
              child.visible = showAxes.value
            }
          })
        }
        console.log(`✅ Axes ${showAxes.value ? 'shown' : 'hidden'}`)

        // Apply lighting
        threeView.scene.traverse((child) => {
          if (child.type === 'AmbientLight') {
            child.intensity = ambientIntensity.value
          }
          if (child.type === 'DirectionalLight') {
            child.intensity = directionalIntensity.value
          }
        })
        console.log(`✅ Lighting updated: ambient=${ambientIntensity.value}, directional=${directionalIntensity.value}`)

        // CRITICAL: Force render to update the scene immediately
        if (threeView.requestRender) {
          threeView.requestRender()
        }

        // Also force immediate render if available
        if (typeof threeView._render === 'function') {
          threeView._render()
        }

        console.log('🎬 Forced scene render update')

        // Register environment settings for persistence
        const envData = {
          kind: selectedBackgroundImage.value ? 'exr' : 'color',
          color: selectedBackground.value ? backgroundColors.find(bg => bg.id === selectedBackground.value)?.hexColor : null,
          imageName: selectedBackgroundImage.value?.name,
          imageType: selectedBackgroundImage.value?.type,
          settings: {
            showGrid: showGrid.value,
            showAxes: showAxes.value,
            ambientIntensity: ambientIntensity.value,
            directionalIntensity: directionalIntensity.value
          }
        }

        if (typeof threeView.registerEnvironment === 'function') {
          threeView.registerEnvironment(envData)
        }

        // Auto-save scene state after environment changes
        if (typeof threeView.saveSceneState === 'function') {
          threeView.saveSceneState()
        }

        hasChanges.value = false
        console.log('✅ All scene settings applied successfully!')

      } catch (error) {
        console.error('❌ Failed to apply scene settings:', error)
        alert('Failed to apply scene settings: ' + error.message)
      }
    }

    /**
     * Close the panel
     */
    const closePanel = () => {
      emit('close')
    }

    return {
      backgroundColors,
      selectedBackground,
      selectedBackgroundImage,
      backgroundImagePreview,
      imageFileInput,
      isDragOver,
      showGrid,
      showAxes,
      ambientIntensity,
      directionalIntensity,
      hasChanges,
      selectBackground,
      handleImportClick,
      handleFileSelect,
      handleFileDrop,
      clearBackgroundImage,
      applyAllSettings,
      closePanel
    }
  }
}
</script>

<style scoped>
.scene-background-panel {
  background: #2c2c2c;
  border-radius: 8px;
  padding: 16px;
  color: #ffffff;
  min-width: 280px;
  max-width: 320px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #9b59b6;
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
}

/* Background Section */
.background-section h4,
.background-image-section h4,
.grid-section h4,
.lighting-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #bdc3c7;
  font-weight: 500;
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.background-card {
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

.background-card:hover {
  background: #333333;
  border-color: #9b59b6;
}

.background-card.active {
  background: #2c3e50;
  border-color: #9b59b6;
  box-shadow: 0 0 8px rgba(155, 89, 182, 0.4);
}

.background-preview {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.background-name {
  font-size: 10px;
  color: #bdc3c7;
  text-align: center;
}

.background-card.active .background-name {
  color: #9b59b6;
  font-weight: 600;
}

/* Background Image Section */
.background-image-section {
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
  border-color: #9b59b6;
}

.import-area.drag-over {
  background: #2c3e50;
  border-color: #9b59b6;
  border-style: solid;
}

.import-area.active {
  border-color: #9b59b6;
  border-style: solid;
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
  font-size: 13px;
  color: #ecf0f1;
  font-weight: 500;
}

.import-hint {
  font-size: 11px;
  color: #7f8c8d;
}

.format-hint {
  font-size: 10px;
  color: #95a5a6;
  margin-top: 4px;
  display: block;
}

.image-preview-small {
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

.image-info-small {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.image-name {
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

/* Grid Section */
.grid-section {
  border-top: 1px solid #3a3a3a;
  padding-top: 16px;
}

.grid-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  background: #1a1a1a;
  border-radius: 4px;
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: #252525;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label span {
  font-size: 13px;
  color: #ecf0f1;
}

/* Lighting Section */
.lighting-section {
  border-top: 1px solid #3a3a3a;
  padding-top: 16px;
}

.lighting-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-control label {
  font-size: 12px;
  color: #bdc3c7;
}

.slider-control input[type="range"] {
  width: 100%;
  height: 4px;
  background: #1a1a1a;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider-control input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #9b59b6;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.slider-control input[type="range"]::-webkit-slider-thumb:hover {
  background: #8e44ad;
  transform: scale(1.1);
}

.slider-control .value {
  font-size: 11px;
  color: #9b59b6;
  font-weight: 600;
  text-align: right;
}

/* Action Section */
.action-section {
  border-top: 1px solid #3a3a3a;
  padding-top: 16px;
  margin-top: 8px;
}

.apply-button {
  width: 100%;
  padding: 12px;
  background: #9b59b6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-button:hover {
  background: #8e44ad;
  box-shadow: 0 2px 8px rgba(155, 89, 182, 0.4);
}

.apply-button:active {
  transform: translateY(1px);
}

.hint-text {
  margin: 8px 0 0 0;
  font-size: 11px;
  color: #9b59b6;
  text-align: center;
  font-weight: 500;
}
</style>

