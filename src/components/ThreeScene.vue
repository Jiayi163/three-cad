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

      // Process existing nodes in the document
      console.log('Processing existing nodes in document...')
      for (const node of document.nodes) {
        handleNodeAdded(node)
      }

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
    watch(activeDocument, (newDocument) => {
      if (threeView.value && newDocument) {
        // Update ThreeView's document reference
        threeView.value.document = newDocument
        console.log('ThreeView document updated')
      }
    })

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
    })

    onUnmounted(() => {
      cleanup()
    })

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
  outline: none;
}
</style>
