<template>
  <div ref="containerRef" class="three-container">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div
      v-if="threeView && showDebugInfo && isHovering"
      class="debug-content-overlay"
    >
        <div>Selection: {{ selectionCount }} objects</div>
        <div>Camera: {{ Math.round(cameraDistance) }} units</div>
        <div>FPS: {{ fps }}</div>

      <!-- Camera Presets -->
      <div class="camera-presets">
        <h4>Camera Views</h4>
        <div class="preset-buttons">
          <button @click="setCameraView('front')" title="Front View">Front</button>
          <button @click="setCameraView('back')" title="Back View">Back</button>
          <button @click="setCameraView('left')" title="Left View">Left</button>
          <button @click="setCameraView('right')" title="Right View">Right</button>
          <button @click="setCameraView('top')" title="Top View">Top</button>
          <button @click="setCameraView('bottom')" title="Bottom View">Bottom</button>
          <button @click="setCameraView('isometric')" title="Isometric View">ISO</button>
          <button @click="fitToView()" title="Fit to View">Fit</button>
        </div>
      </div>

      <div class="sensitivity-controls">
        <h4>Camera Controls</h4>
        <div>
          <label>Rotate: </label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            :value="rotateSpeed"
            @input="updateRotateSpeed($event.target.value)"
            @mousedown.stop
            @mousemove.stop
            @mouseup.stop
            @click.stop
          >
          <span>{{ rotateSpeed.toFixed(1) }}</span>
        </div>
        <div>
          <label>Pan: </label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            :value="panSpeed"
            @input="updatePanSpeed($event.target.value)"
            @mousedown.stop
            @mousemove.stop
            @mouseup.stop
            @click.stop
          >
          <span>{{ panSpeed.toFixed(1) }}</span>
        </div>
        <div>
          <label>Zoom: </label>
          <input
            type="range"
            min="0.8"
            max="0.99"
            step="0.01"
            :value="zoomSpeed"
            @input="updateZoomSpeed($event.target.value)"
            @mousedown.stop
            @mousemove.stop
            @mouseup.stop
            @click.stop
          >
          <span>{{ zoomSpeed.toFixed(2) }}</span>
      </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, markRaw } from 'vue'
import { storeToRefs } from 'pinia'
import * as THREE from 'three'
import { ThreeView } from '../packages/cad-three/ThreeView.js'
// import { createVisualObject } from '../packages/cad-three/BasicShapes.js' // Unused for now
import { useApplicationStore } from '../stores/application.js'
import { PathResolver } from '../packages/cad-core/io/PathResolver.js'

export default {
  name: 'ThreeScene',
  props: {
    showDebugInfo: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const containerRef = ref(null)
    const error = ref(null)
    const threeView = ref(null)
    const isHovering = ref(false)

    // Application store
    const applicationStore = useApplicationStore()
    const { activeDocument } = storeToRefs(applicationStore)

    // Debug info
    const selectionCount = ref(0)
    const cameraDistance = ref(0)
    const fps = ref(0)

    // Sensitivity controls
    const rotateSpeed = ref(0.2)
    const panSpeed = ref(0.5)
    const zoomSpeed = ref(0.95)

    let fpsCounter = 0
    let lastFpsTime = 0

    const checkWebGLSupport = () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    }

    const initThreeView = () => {
      try {
        // Check WebGL support
        if (!checkWebGLSupport()) {
          throw new Error('WebGL is not supported in this browser')
        }

        // Create ThreeView with active document
        const document = activeDocument.value
        threeView.value = new ThreeView(document, 'main')

        // Set up property listeners for debug info
        threeView.value.onPropertyChanged('selectionCount', (count) => {
          selectionCount.value = count || 0
        })

        if (threeView.value.cameraController) {
          threeView.value.cameraController.onPropertyChanged('distance', (distance) => {
            cameraDistance.value = distance || 0
          })
        }

        // Attach to DOM
        if (containerRef.value) {
          threeView.value.setDom(containerRef.value)

          // Expose ThreeView instance globally for InteractiveInput
          containerRef.value.__threeView__ = threeView.value
          window.__THREESCENE_INSTANCE__ = threeView.value
        }

        // Clean initialization

        // Set up document node listeners
        setupDocumentListeners()

        // Set up FPS monitoring
        if (props.showDebugInfo) {
          startFpsMonitoring()
        }

        console.log('ThreeView initialized successfully')

      } catch (err) {
        console.error('ThreeView initialization failed:', err)
        error.value = err.message
      }
    }

    // Phase 5.3 - Node to Visual Object mapping system
    const nodeToVisualObjectMap = new Map()

    /**
     * Idempotent scene rehydration from document store
     * Syncs three.js scene with document nodes (single source of truth)
     */
    const rehydrateSceneFromStore = async () => {
      const document = activeDocument.value
      if (!document || !threeView.value) {
        console.warn('Cannot rehydrate scene: missing document or threeView')
        return
      }

      console.log('🔄 Rehydrating scene from store...')

      // Step 1: Build index of existing meshes by nodeId
      const existingMeshes = new Map()
      if (threeView.value.scene) {
        threeView.value.scene.traverse((obj) => {
          if (obj.userData?.nodeId && obj.isMesh) {
            existingMeshes.set(obj.userData.nodeId, obj)
          }
        })
      }

      console.log(`  Found ${existingMeshes.size} existing meshes in scene`)
      console.log(`  Document has ${document.nodes.length} nodes`)

      // Step 2: For each document node, create or update mesh
      const processedNodeIds = new Set()
      for (const node of document.nodes) {
        if (!node || !node.id) continue

        processedNodeIds.add(node.id)

        // Check if node has visualObject
        if (node.visualObject && typeof node.visualObject.create === 'function') {
          if (existingMeshes.has(node.id)) {
            // Mesh already exists, update properties if needed
            const mesh = existingMeshes.get(node.id)
            console.log(`  ✓ Mesh exists for ${node.name}, updating properties`)

            // Update transform from visualObject
            if (node.visualObject.position) {
              mesh.position.copy(node.visualObject.position)
            }
            if (node.visualObject.rotation) {
              mesh.rotation.copy(node.visualObject.rotation)
            }
            if (node.visualObject.scale) {
              mesh.scale.copy(node.visualObject.scale)
            }
          } else {
            // Mesh doesn't exist, create it
            console.log(`  + Creating mesh for ${node.name}`)
            await handleNodeAdded(node)
          }
        }
      }

      // Step 3: Remove orphan meshes (meshes without corresponding nodes)
      for (const [nodeId, mesh] of existingMeshes) {
        if (!processedNodeIds.has(nodeId)) {
          console.log(`  - Removing orphan mesh with nodeId: ${nodeId}`)
          threeView.value.removeVisualObject(nodeId)
          nodeToVisualObjectMap.delete(nodeId)
        }
      }

      console.log('✅ Scene rehydration complete')
      
      // Log all objects in Three.js scene
      if (threeView.value.scene) {
        const allObjects = []
        threeView.value.scene.traverse((obj) => {
          if (obj.isMesh && obj.userData?.nodeId) {
            allObjects.push({
              name: obj.name || obj.userData.nodeId,
              nodeId: obj.userData.nodeId,
              position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
              visible: obj.visible,
              type: obj.type
            })
          }
        })
        console.log(`📦 Objects in Three.js scene: ${allObjects.length}`)
        allObjects.forEach((obj, idx) => {
          console.log(`   [${idx}] ${obj.name} at (${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)})`)
        })
      }

      // Frame camera on imported objects if bounding box is available
      if (document._importBoundingBox && threeView.value.cameraController) {
        console.log('🎯 Framing camera on imported objects...')
        const bbox = document._importBoundingBox
        
        // Create THREE.Box3 from stored bounding box (already scaled)
        const min = new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z)
        const max = new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z)
        const boundingBox = new THREE.Box3(min, max)
        
        // Frame camera on bounding box
        threeView.value.cameraController.focusOn(boundingBox, true)
        console.log(`   Framed on bounds: center (${bbox.center.x.toFixed(3)}, ${bbox.center.y.toFixed(3)}, ${bbox.center.z.toFixed(3)}), size (${bbox.size.x.toFixed(3)}, ${bbox.size.y.toFixed(3)}, ${bbox.size.z.toFixed(3)})`)
        
        // Clear the bounding box flag after use
        delete document._importBoundingBox
      } else if (processedNodeIds.size > 0 && threeView.value.cameraController) {
        // If no bounding box but we have objects, try to fit all
        console.log('🎯 Fitting camera to all objects...')
        threeView.value.cameraController.fitAll(true)
      }
      
      // Apply skybox/background if available
      if (document._importSkybox && threeView.value) {
        console.log(`🌄 Applying skybox: ${document._importSkybox}`)
        try {
          const skyboxPath = document._importSkybox
          const skyboxOptions = document._importSkyboxOptions || {}
          const jsonFilePath = skyboxOptions.jsonFilePath || null
          
          // Use PathResolver to resolve skybox path
          const pathInfo = PathResolver.resolveAssetPath(skyboxPath, jsonFilePath, {})
          const skyboxFileName = pathInfo.fileName
          
          let skyboxBlob = null
          let skyboxFile = null
          
          // Try to load from resolved paths
          let loadedFromPath = false
          for (const path of pathInfo.paths) {
            try {
              console.log(`   Trying to load skybox from: ${path}`)
              const response = await fetch(path)
              if (response.ok) {
                skyboxBlob = await response.blob()
                skyboxFile = new File([skyboxBlob], skyboxFileName, { type: 'image/x-exr' })
                console.log(`   ✅ Skybox loaded from: ${path}`)
                loadedFromPath = true
                break
              }
            } catch (e) {
              // Try next path
              console.log(`   ❌ Failed to load from ${path}:`, e.message)
            }
          }
          
          if (!loadedFromPath) {
            console.warn(`   ⚠️ Could not load skybox from any path.`)
            console.warn(`   💡 Tip: Place skybox file in public/assets/ folder or use absolute URL.`)
            console.warn(`   📁 Tried paths: ${pathInfo.paths.join(', ')}`)
          }
          
          if (skyboxFile) {
            // Load EXR using EXRLoader
            const { EXRLoader } = await import('three/examples/jsm/loaders/EXRLoader.js')
            const { ImageLoader } = await import('@/packages/cad-core/io/ImageLoader.js')
            
            if (ImageLoader.isHDRFile(skyboxFile)) {
              console.log(`   📸 Loading EXR file: ${skyboxFileName}`)
              
              // Load as ArrayBuffer
              const arrayBuffer = await ImageLoader.loadHDRAsArrayBuffer(skyboxFile)
              console.log(`   📦 ArrayBuffer loaded: ${arrayBuffer.byteLength} bytes`)
              
              // Parse EXR
              const exrLoader = new EXRLoader()
              const exrData = exrLoader.parse(arrayBuffer)
              
              if (!exrData) {
                throw new Error('EXRLoader.parse() returned null')
              }
              
              console.log(`   ✅ EXR data parsed: ${exrData.width}x${exrData.height}`)
              
              // Create DataTexture
              const texture = new THREE.DataTexture(
                exrData.data,
                exrData.width,
                exrData.height,
                THREE.RGBAFormat,
                THREE.HalfFloatType
              )
              
              texture.mapping = THREE.EquirectangularReflectionMapping
              texture.colorSpace = THREE.LinearSRGBColorSpace
              texture.flipY = false
              texture.minFilter = THREE.LinearFilter
              texture.magFilter = THREE.LinearFilter
              texture.generateMipmaps = false
              texture.unpackAlignment = 1
              
              // Apply to scene
              threeView.value.scene.background = texture
              threeView.value.scene.environment = texture // Also set as environment for reflections
              threeView.value.renderer.toneMapping = THREE.ACESFilmicToneMapping
              threeView.value.renderer.toneMappingExposure = 1.0
              threeView.value.renderer.outputColorSpace = THREE.SRGBColorSpace
              
              console.log(`   ✅ Skybox applied to scene background and environment`)
              threeView.value.requestRender()
            } else {
              console.warn(`   ⚠️ File is not HDR/EXR format: ${skyboxFileName}`)
            }
          } else {
            console.warn(`   ⚠️ Could not load skybox from "${skyboxPath}"`)
          }
        } catch (error) {
          console.error(`   ❌ Failed to apply skybox:`, error)
        }
        
        // Clear skybox flags after use
        delete document._importSkybox
        delete document._importSkyboxOriginal
        delete document._importSkyboxOptions
      }
      
      threeView.value.requestRender()
    }

    const setupDocumentListeners = () => {
      const document = activeDocument.value
      if (!document) {
        console.warn('No active document found for 3D visualization setup')
        return
      }

      console.log('Setting up document listeners for 3D visualization')
      console.log('Current document nodes:', document.nodes.length)

      // Listen for node additions (when commands create new objects)
      document.nodes.onItemAdded((items, index) => {
        console.log('New nodes added to document:', items.length, 'items at index', index)
        // Handle each added item
        items.forEach(node => {
          console.log('Processing added node:', node.name, node)
          handleNodeAdded(node)
        })
      })

      // Listen for node removals (when objects are deleted)
      document.nodes.onItemRemoved((items, index) => {
        console.log('Nodes removed from document:', items.length, 'items at index', index)
        // Handle each removed item
        items.forEach(node => {
          console.log('Processing removed node:', node.name)
          handleNodeRemoved(node)
        })
      })

      // Listen for general collection changes
      document.nodes.onCollectionChanged((changeArgs) => {
        console.log('Document nodes collection changed:', changeArgs.action, changeArgs.items.length, 'items')

        // Handle different types of collection changes
        switch (changeArgs.action) {
          case 'add':
            changeArgs.items.forEach(node => handleNodeAdded(node))
            break
          case 'remove':
          case 'clear':
            changeArgs.items.forEach(node => handleNodeRemoved(node))
            break
          case 'replace':
            // Handle replace as remove old + add new
            if (changeArgs.oldItems) {
              changeArgs.oldItems.forEach(node => handleNodeRemoved(node))
            }
            changeArgs.items.forEach(node => handleNodeAdded(node))
            break
        }
      })

      // IMPORTANT: Don't process existing nodes immediately here
      // The rehydrateSceneFromStore function will be called after document restoration
      // to ensure proper order: load → restore → rehydrate → render

      console.log('Document listeners setup complete')


    }

    // Phase 5.3 - Document Node to 3D Object Handler Functions

    /**
     * Handle when a new node is added to the document
     * This converts document nodes (VisualObjects) to actual 3D objects in the scene
     */
    const handleNodeAdded = async (node) => {
      try {
        console.log('Processing new node for 3D visualization:', node.name, node.type || node._type)

        // Check if this node is a VisualObject and create its 3D representation
        if (node && threeView.value) {

          // Check if the node has a visualObject property (the actual VisualObject instance)
          console.log('node.visualObject:', node.visualObject)
          console.log('node.visualObject type:', typeof node.visualObject)
          console.log('node.visualObject constructor:', node.visualObject?.constructor?.name)

          const visualObject = node.visualObject || node
          console.log('Final visualObject:', visualObject)
          console.log('Final visualObject constructor:', visualObject?.constructor?.name)
          console.log('Checking visualObject.create method:', typeof visualObject.create, visualObject.create)

          if (typeof visualObject.create === 'function') {
            console.log('Creating 3D object for VisualObject:', node.name)

            try {
              // Call create() method to generate the Three.js object
              const object3D = await visualObject.create()

              if (object3D) {
                // CRITICAL: Apply pending material AFTER object is created
                if (visualObject._pendingMaterial) {
                  const material = visualObject._pendingMaterial
                  console.log(`📦 Applying pending material to ${node.name}:`, material)
                  
                  try {
                    if (material.type === 'custom-texture' && material.texture) {
                      // Custom texture material
                      const texturePath = material.texture
                      console.log(`   Loading texture: ${texturePath}`)
                      
                      // Get texture repeat if available
                      const repeatX = visualObject.getProperty('textureRepeatX') || 1
                      const repeatY = visualObject.getProperty('textureRepeatY') || 1
                      
                      // Try to load texture from path
                      if (texturePath.startsWith('http://') || texturePath.startsWith('https://') || texturePath.startsWith('data:')) {
                        await visualObject.setTextureFromUrl(texturePath, {
                          repeatX,
                          repeatY
                        })
                      } else {
                        // Try common paths
                        const possiblePaths = [
                          texturePath,
                          `/textures/${texturePath}`,
                          `/assets/${texturePath}`,
                          `./assets/textures/${texturePath.replace(/^\.\/assets\/textures\//, '')}`,
                          `./${texturePath}`
                        ]
                        
                        let loaded = false
                        for (const path of possiblePaths) {
                          try {
                            await visualObject.setTextureFromUrl(path, {
                              repeatX,
                              repeatY
                            })
                            console.log(`   ✅ Texture loaded from: ${path} (repeat: ${repeatX}x${repeatY})`)
                            loaded = true
                            break
                          } catch (e) {
                            // Try next path
                          }
                        }
                        
                        if (!loaded) {
                          console.warn(`   ⚠️ Could not load texture "${texturePath}", using default material`)
                        }
                      }
                    } else if (material.type && material.color !== undefined) {
                      // Preset material type (plastic, metal, etc.)
                      console.log(`   Applying preset material: ${material.type}`)
                      await visualObject.setMaterial(material.type)
                      
                      // Apply color if provided
                      if (material.color) {
                        const colorHex = typeof material.color === 'number' 
                          ? '#' + material.color.toString(16).padStart(6, '0')
                          : material.color
                        visualObject.setProperty('color', colorHex)
                      }
                    }
                  } catch (error) {
                    console.error(`   ❌ Failed to apply material:`, error)
                  }
                  
                  // Clear pending material
                  delete visualObject._pendingMaterial
                }
                
                // Add to the 3D scene
                threeView.value.addVisualObject(node.id, object3D)

                // Store the mapping for later reference
                nodeToVisualObjectMap.set(node.id, {
                  node: node,
                  object3D: object3D,
                  isVisible: true
                })

                // Set up property change listeners for this specific node
                setupNodePropertyListeners(visualObject)

                console.log('Successfully added 3D object to scene:', node.name)

                // Request a render update
                threeView.value.requestRender()
              } else {
                console.warn('VisualObject.create() returned null:', node.name)
              }
            } catch (error) {
              console.error('Failed to create 3D object from VisualObject:', error)
            }
          }
          // Fallback: Check if it already has geometry and material (for manual creation)
          else if (node.geometry && node.material) {
            console.log('Creating 3D object from existing geometry/material:', node.name)

            const object3D = await createThreeObjectFromNode(node)

            if (object3D) {
              threeView.value.addVisualObject(node.id, object3D)

              nodeToVisualObjectMap.set(node.id, {
                node: node,
                object3D: object3D,
                isVisible: true
              })

              setupNodePropertyListeners(node)

              console.log('Successfully added 3D object to scene:', node.name)
              threeView.value.requestRender()
            }
          } else {
            console.log('Node is not a visual object, skipping 3D creation:', node.name)
          }
        }

      } catch (error) {
        console.error('Failed to create 3D object from node:', error)
      }
    }

    /**
     * Handle when a node is removed from the document
     */
    const handleNodeRemoved = (node) => {
      try {
        const mapping = nodeToVisualObjectMap.get(node.id)

        if (mapping && threeView.value) {
          // Remove from 3D scene - use the same ID that was used when adding
          threeView.value.removeVisualObject(node.id)

          // Clean up the mapping
          nodeToVisualObjectMap.delete(node.id)

          console.log('Removed 3D object from scene:', node.name)

          // Request a render update
          threeView.value.requestRender()
        }

      } catch (error) {
        console.error('Failed to remove 3D object for node:', error)
      }
    }

    /**
     * Handle when a node property changes (for live updates)
     */
    const handleNodePropertyChanged = (node, propertyName, newValue) => {
      try {
        console.log('Updating 3D object for property change:', node.name, propertyName)

        const mapping = nodeToVisualObjectMap.get(node.id)
        if (mapping && mapping.object3D && threeView.value) {

          // Update specific properties that affect 3D visualization
          switch (propertyName) {
            case 'position':
              if (newValue && mapping.object3D.position) {
                mapping.object3D.position.set(newValue.x || 0, newValue.y || 0, newValue.z || 0)
                // Force render update
                if (threeView.value && threeView.value.render) {
                  threeView.value.render()
                }
              }
              break

            case 'rotation':
              if (newValue && mapping.object3D.rotation) {
                mapping.object3D.rotation.set(newValue.x || 0, newValue.y || 0, newValue.z || 0)
                console.log(`Applied rotation to ${node.name}:`, {
                  x: newValue.x || 0,
                  y: newValue.y || 0,
                  z: newValue.z || 0,
                  yDegrees: ((newValue.y || 0) * 180 / Math.PI).toFixed(1) + '°'
                })
                // Force render update
                if (threeView.value && threeView.value.render) {
                  threeView.value.render()
                }
              }
              break

            case 'scale':
              if (newValue && mapping.object3D.scale) {
                const scaleX = newValue.x || 1
                const scaleY = newValue.y || 1
                const scaleZ = newValue.z || 1

                // Direct scale application - Three.js handles negative scales correctly
                mapping.object3D.scale.set(scaleX, scaleY, scaleZ)

                // For negative scales (mirroring), ensure materials show both sides
                if (scaleX < 0 || scaleY < 0 || scaleZ < 0) {
                  if (mapping.object3D.material) {
                    if (Array.isArray(mapping.object3D.material)) {
                      mapping.object3D.material.forEach(mat => {
                        mat.side = THREE.DoubleSide
                        mat.needsUpdate = true
                      })
                    } else {
                      mapping.object3D.material.side = THREE.DoubleSide
                      mapping.object3D.material.needsUpdate = true
                    }
                  }

                  console.log(`Applied mirror scale to ${node.name}:`, {
                    scale: { x: scaleX, y: scaleY, z: scaleZ },
                    isMirrored: true
                  })
                } else {
                  console.log(`Applied normal scale to ${node.name}:`, {
                    scale: { x: scaleX, y: scaleY, z: scaleZ },
                    isMirrored: false
                  })
                }

                // Force render update
                if (threeView.value && threeView.value.render) {
                  threeView.value.render()
                }
              }
              break

            case 'color':
              if (newValue && mapping.object3D.material && mapping.object3D.material.color) {
                mapping.object3D.material.color.setHex(newValue)
              }
              break

            case 'opacity':
              if (newValue !== undefined && mapping.object3D.material) {
                mapping.object3D.material.opacity = newValue
                mapping.object3D.material.transparent = newValue < 1.0
              }
              break

            case 'wireframe':
              if (newValue !== undefined && mapping.object3D.material) {
                mapping.object3D.material.wireframe = newValue
              }
              break
          }

          // Request a render update
          threeView.value.requestRender()
        }

      } catch (error) {
        console.error('Failed to update 3D object property:', error)
      }
    }

    /**
     * Set up property change listeners for a specific node
     */
    const setupNodePropertyListeners = (node) => {
      try {
        // Listen for property changes on this node
        // Since VisualObject extends Observable, we can listen to property changes
        if (node.onPropertyChanged) {
          const propertiesToWatch = ['position', 'rotation', 'scale', 'color', 'opacity', 'wireframe']

          propertiesToWatch.forEach(propertyName => {
            node.onPropertyChanged(propertyName, (newValue) => {
              console.log('Node property changed:', node.name, propertyName, newValue)
              handleNodePropertyChanged(node, propertyName, newValue)
            })
          })

          console.log('Property listeners set up for node:', node.name)
        } else {
          console.log('Node does not support property change events:', node.name)
        }
      } catch (error) {
        console.error('Failed to set up property listeners for node:', error)
      }
    }

    /**
     * Create a Three.js object from a document node (VisualObject)
     */
    const createThreeObjectFromNode = async (node) => {
      try {
        // Get the geometry and material from the VisualObject
        const geometry = node.geometry
        const material = node.material

        if (!geometry || !material) {
          console.warn('Node missing geometry or material:', node.name)
          return null
        }

        // Create the Three.js mesh
        const mesh = markRaw(new THREE.Mesh(geometry, material))

        // Apply transform properties from the VisualObject
        if (node.position) {
          mesh.position.set(
            node.position.x || 0,
            node.position.y || 0,
            node.position.z || 0
          )
        }

        if (node.rotation) {
          mesh.rotation.set(
            node.rotation.x || 0,
            node.rotation.y || 0,
            node.rotation.z || 0
          )
        }

        if (node.scale) {
          mesh.scale.set(
            node.scale.x || 1,
            node.scale.y || 1,
            node.scale.z || 1
          )
        }

        // Set up shadow casting/receiving
        mesh.castShadow = true
        mesh.receiveShadow = true

        // Store reference to the original node
        mesh.userData.nodeId = node.id
        mesh.userData.nodeName = node.name

        console.log('Created Three.js mesh from node:', node.name, mesh)
        return mesh

      } catch (error) {
        console.error('Failed to create Three.js object from node:', error)
        return null
      }
    }



    const startFpsMonitoring = () => {
      const updateFps = () => {
        fpsCounter++
        const now = performance.now()

        if (now - lastFpsTime >= 1000) {
          fps.value = Math.round((fpsCounter * 1000) / (now - lastFpsTime))
          fpsCounter = 0
          lastFpsTime = now
        }

        requestAnimationFrame(updateFps)
      }
      updateFps()
    }

    const cleanup = () => {
      if (threeView.value) {
        threeView.value.dispose()
        threeView.value = null
      }

      // Clean up global references
      if (containerRef.value) {
        containerRef.value.__threeView__ = null
      }
      if (window.__THREESCENE_INSTANCE__) {
        window.__THREESCENE_INSTANCE__ = null
      }
    }

    // Watch for document changes
    watch(activeDocument, async (newDocument, oldDocument) => {
      if (threeView.value && newDocument) {
        // Update ThreeView's document reference
        threeView.value.document = newDocument
        console.log('ThreeView document updated:', newDocument.name)
        
        // Rehydrate scene when document changes OR when nodes change
        // This ensures imported documents are properly displayed
        const isDifferentDocument = !oldDocument || oldDocument.id !== newDocument.id
        const nodeCountChanged = oldDocument && oldDocument.nodes.length !== newDocument.nodes.length
        
        if (isDifferentDocument || nodeCountChanged) {
          console.log(`Document changed (different: ${isDifferentDocument}, nodes changed: ${nodeCountChanged}), rehydrating scene...`)
          await rehydrateSceneFromStore()
        }
      }
    }, { immediate: false })

    // Also watch for node count changes in the same document (for imports)
    watch(() => activeDocument.value?.nodes.length, async (newCount, oldCount) => {
      if (threeView.value && activeDocument.value && newCount !== oldCount && oldCount !== undefined) {
        console.log(`📊 Node count changed: ${oldCount} → ${newCount}, forcing scene rehydration...`)
        await rehydrateSceneFromStore()
      }
    }, { immediate: false })

    // Watch for nodes collection changes (more reliable than just count)
    watch(() => activeDocument.value?.nodes, async (newNodes, oldNodes) => {
      if (threeView.value && activeDocument.value && newNodes && oldNodes && newNodes.length !== oldNodes.length) {
        console.log(`📊 Nodes collection changed: ${oldNodes.length} → ${newNodes.length}, forcing scene rehydration...`)
        // Small delay to ensure all nodes are fully loaded
        await new Promise(resolve => setTimeout(resolve, 50))
        await rehydrateSceneFromStore()
      }
    }, { deep: false })

    onMounted(async () => {
      console.log('🚀 ThreeScene component mounted')

      // Wait for application store to be initialized
      if (!applicationStore.isInitialized) {
        console.log('⏳ Waiting for application store to initialize...')
        await new Promise(resolve => {
          const unwatch = watch(() => applicationStore.isInitialized, (initialized) => {
            if (initialized) {
              console.log('✅ Application store initialized')
              unwatch()
              resolve()
            }
          })
        })
      }

      // Also wait for active document to be available
      if (!activeDocument.value) {
        console.log('⏳ Waiting for active document...')
        await new Promise(resolve => {
          const unwatch = watch(activeDocument, (doc) => {
            if (doc) {
              console.log('✅ Active document available:', doc.name)
              unwatch()
              resolve()
            }
          })
        })
      }

      console.log('🎯 Initializing ThreeView...')
      initThreeView()

      // After ThreeView is initialized, rehydrate scene from document store
      // This ensures proper bootstrap order: load → restore → rehydrate → render
      console.log('🔄 Rehydrating scene from document store...')
      await rehydrateSceneFromStore()
      console.log('✅ Scene rehydration complete')
    })

    onUnmounted(() => {
      cleanup()
    })

    // Expose rehydration method for external triggers (e.g., after import)
    const forceRehydrate = async () => {
      console.log('🔄 Force rehydration triggered externally...')
      await rehydrateSceneFromStore()
    }
    
    // Expose globally for import handler
    if (typeof window !== 'undefined') {
      window.__THREESCENE_FORCE_REHYDRATE__ = forceRehydrate
      // Expose ThreeView instance for export/import operations
      watch(threeView, (newView) => {
        if (newView) {
          window.__THREESCENE_INSTANCE__ = newView
        }
      }, { immediate: true })
    }

    // Expose methods for external use
    const getThreeView = () => threeView.value

    // Enhanced methods for VisualObject support
    const addVisualObjectInstance = async (visualObject) => {
      if (threeView.value) {
        return await threeView.value.addVisualObjectInstance(visualObject)
      }
    }

    const removeVisualObjectInstance = (nodeId) => {
      if (threeView.value) {
        threeView.value.removeVisualObjectInstance(nodeId)
      }
    }

    const getVisualObjectInstance = (nodeId) => {
      if (threeView.value) {
        return threeView.value.getVisualObjectInstance(nodeId)
      }
      return null
    }

    // Legacy methods for Three.js objects
    const addObject = (nodeId, object3D) => {
      if (threeView.value) {
        threeView.value.addVisualObject(nodeId, object3D)
      }
    }
    const removeObject = (nodeId) => {
      if (threeView.value) {
        threeView.value.removeVisualObject(nodeId)
      }
    }
    const fitAll = () => {
      if (threeView.value && threeView.value.cameraController) {
        threeView.value.cameraController.fitAll()
      }
    }
    const setView = (viewName) => {
      if (threeView.value && threeView.value.cameraController) {
        threeView.value.cameraController.setView(viewName)
      }
    }

    // Sensitivity control methods
    const updateRotateSpeed = (value) => {
      const speed = parseFloat(value)
      rotateSpeed.value = speed
      if (threeView.value && threeView.value.cameraController) {
        threeView.value.cameraController.setRotateSpeed(speed)
      }
    }

    const updatePanSpeed = (value) => {
      const speed = parseFloat(value)
      panSpeed.value = speed
      if (threeView.value && threeView.value.cameraController) {
        threeView.value.cameraController.setPanSpeed(speed)
      }
    }

    const updateZoomSpeed = (value) => {
      const speed = parseFloat(value)
      zoomSpeed.value = speed
      if (threeView.value && threeView.value.cameraController) {
        threeView.value.cameraController.setZoomSpeed(speed)
      }
    }

    // Camera preset methods
    const setCameraView = (viewType) => {
      if (threeView.value && threeView.value.cameraController) {
        threeView.value.cameraController.setView(viewType)
        console.log(`Camera set to ${viewType} view`)
      }
    }

    const fitToView = () => {
      if (threeView.value && threeView.value.cameraController) {
        threeView.value.cameraController.fitToScene()
        console.log('Camera fitted to scene')
      }
    }

    return {
      containerRef,
      error,
      threeView,
      isHovering,
      selectionCount,
      cameraDistance,
      fps,
      rotateSpeed,
      panSpeed,
      zoomSpeed,
      getThreeView,
      addVisualObjectInstance,
      removeVisualObjectInstance,
      getVisualObjectInstance,
      addObject,
      removeObject,
      fitAll,
      setView,
      updateRotateSpeed,
      updatePanSpeed,
      updateZoomSpeed,
      setCameraView,
      fitToView
    }
  }
}
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #1a1a1a;
  /* Ensure container can shrink/grow with flex/grid */
  min-width: 0;
  min-height: 0;
  /* Allow pointer events to pass through to canvas by default */
  pointer-events: auto;
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  font-family: Arial, sans-serif;
  z-index: 1000;
}

/* Debug content overlay (simplified version) */
.debug-content-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 15px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  min-width: 200px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  pointer-events: auto;
}

.debug-info {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  z-index: 1000;
  min-width: 150px;
  pointer-events: auto;
}

.debug-info div {
  margin: 2px 0;
}

.sensitivity-controls {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;
  user-select: none;
}

.sensitivity-controls div {
  display: flex;
  align-items: center;
  margin: 4px 0;
}

.sensitivity-controls label {
  width: 50px;
  font-size: 10px;
}

.sensitivity-controls input[type="range"] {
  flex: 1;
  margin: 0 8px;
  height: 4px;
  cursor: pointer;
  pointer-events: auto;
}

.sensitivity-controls input[type="range"]::-webkit-slider-thumb {
  pointer-events: auto;
  cursor: grab;
}

.sensitivity-controls input[type="range"]::-webkit-slider-thumb:active {
  cursor: grabbing;
}

.sensitivity-controls span {
  width: 30px;
  text-align: right;
  font-size: 10px;
}

/* Camera presets styling */
.camera-presets {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: auto;
  user-select: none;
}

.camera-presets h4 {
  margin: 0 0 8px 0;
  font-size: 11px;
  color: #ffffff;
  font-weight: 600;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.preset-buttons button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  pointer-events: auto;
}

.preset-buttons button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.preset-buttons button:active {
  background: rgba(0, 122, 204, 0.3);
  border-color: #007acc;
}

.three-container canvas {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}
</style>
