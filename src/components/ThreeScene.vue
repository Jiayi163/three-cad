<template>
  <div ref="containerRef" class="three-container">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="threeView && showDebugInfo" class="debug-info">
      <div>Selection: {{ selectionCount }} objects</div>
      <div>Camera: {{ Math.round(cameraDistance) }} units</div>
      <div>FPS: {{ fps }}</div>
      <div class="sensitivity-controls">
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
import { ref, onMounted, onUnmounted, computed, watch, markRaw } from 'vue'
import { storeToRefs } from 'pinia'
import * as THREE from 'three'
import { ThreeView } from '../packages/cad-three/ThreeView.js'
import { createVisualObject } from '../packages/cad-three/BasicShapes.js'
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
        }
        
        // Add some demo objects for now
        addDemoObjects()
        
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
    
    const addDemoObjects = async () => {
      if (!threeView.value) return
      
      try {
        // Create a demo box using the new VisualObject system
        const boxVisualObject = createVisualObject('box', 'demo-box', {
          width: 2,
          height: 2,
          depth: 2
        })
        
        // Set custom material colors
        boxVisualObject.setMaterialConfig('default', {
          color: 0x4CAF50,
          metalness: 0.1,
          roughness: 0.3
        })
        
        // Set position and add to scene
        boxVisualObject.position = { x: 0, y: 1, z: 0 }
        const boxObject3D = await threeView.value.addVisualObjectInstance(boxVisualObject)
        
        // Add floating animation
        const animateBox = () => {
          if (boxObject3D && threeView.value && !boxVisualObject.disposed) {
            const time = Date.now() * 0.002
            boxVisualObject.rotation = {
              x: time * 0.5,
              y: time,
              z: 0
            }
            boxVisualObject.position = {
              x: 0,
              y: 1 + Math.sin(time) * 0.5,
              z: 0
            }
            threeView.value.requestRender()
          }
          requestAnimationFrame(animateBox)
        }
        animateBox()
        
        // Create a demo sphere
        const sphereVisualObject = createVisualObject('sphere', 'demo-sphere', {
          radius: 1,
          widthSegments: 32,
          heightSegments: 16
        })
        
        sphereVisualObject.setMaterialConfig('default', {
          color: 0x2196F3,
          metalness: 0.2,
          roughness: 0.4
        })
        
        sphereVisualObject.position = { x: -4, y: 1, z: 0 }
        await threeView.value.addVisualObjectInstance(sphereVisualObject)
        
        // Create a demo cylinder
        const cylinderVisualObject = createVisualObject('cylinder', 'demo-cylinder', {
          radiusTop: 1,
          radiusBottom: 1,
          height: 2,
          radialSegments: 16
        })
        
        cylinderVisualObject.setMaterialConfig('default', {
          color: 0xFF9800,
          metalness: 0.15,
          roughness: 0.35
        })
        
        cylinderVisualObject.position = { x: 4, y: 1, z: 0 }
        await threeView.value.addVisualObjectInstance(cylinderVisualObject)
        
        // Create ground plane using VisualObject
        const groundVisualObject = createVisualObject('plane', 'demo-ground', {
          width: 20,
          height: 20
        })
        
        groundVisualObject.setMaterialConfig('default', {
          color: 0x808080,
          metalness: 0.1,
          roughness: 0.8
        })
        
        groundVisualObject.rotation = { x: -Math.PI / 2, y: 0, z: 0 }
        groundVisualObject.position = { x: 0, y: -2, z: 0 }
        await threeView.value.addVisualObjectInstance(groundVisualObject)
        
        console.log('Demo VisualObjects created successfully')
        
      } catch (error) {
        console.error('Failed to create demo VisualObjects:', error)
        
        // Fallback to legacy objects if VisualObject system fails
        addLegacyDemoObjects()
      }
    }
    
    const addLegacyDemoObjects = () => {
      if (!threeView.value) return
      
      console.log('Using legacy demo objects as fallback')
      
      // Add a demo cube (similar to the original)
      const geometry = markRaw(new THREE.BoxGeometry(2, 2, 2))
      const material = markRaw(new THREE.MeshStandardMaterial({ 
        color: 0x4CAF50,
        metalness: 0.1,
        roughness: 0.3
      }))
      
      const cube = markRaw(new THREE.Mesh(geometry, material))
      cube.castShadow = true
      cube.receiveShadow = true
      cube.userData.nodeId = 'demo-cube'
      
      // Add floating animation
      const animate = () => {
        if (cube && threeView.value) {
          cube.rotation.x += 0.005
          cube.rotation.y += 0.01
          cube.position.y = Math.sin(Date.now() * 0.002) * 0.5
          threeView.value.requestRender()
        }
        requestAnimationFrame(animate)
      }
      animate()
      
      threeView.value.addVisualObject('demo-cube', cube)
      
      // Add a ground plane
      const planeGeometry = markRaw(new THREE.PlaneGeometry(20, 20))
      const planeMaterial = markRaw(new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        metalness: 0.1,
        roughness: 0.8
      }))
      const plane = markRaw(new THREE.Mesh(planeGeometry, planeMaterial))
      plane.rotation.x = -Math.PI / 2
      plane.position.y = -2
      plane.receiveShadow = true
      plane.userData.nodeId = 'demo-ground'
      
      threeView.value.addVisualObject('demo-ground', plane)
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
    }
    
    // Watch for document changes
    watch(activeDocument, (newDocument) => {
      if (threeView.value && newDocument) {
        // Update ThreeView's document reference
        threeView.value.document = newDocument
        console.log('ThreeView document updated')
      }
    })
    
    onMounted(() => {
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
    
    return {
      containerRef,
      error,
      threeView,
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
      updateZoomSpeed
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

.three-container canvas {
  display: block;
  outline: none;
}
</style> 