<template>
  <div class="material-demo">
    <div class="demo-header">
      <h2>Material System Demo</h2>
      <p>Test preset materials and custom texture functionality</p>
    </div>

    <div class="demo-content">
      <!-- 3D Scene -->
      <div class="scene-container">
        <div ref="threeContainer" class="three-container"></div>
        <div class="scene-controls">
          <button @click="createBox" class="control-button">Create Box</button>
          <button @click="createSphere" class="control-button">Create Sphere</button>
          <button @click="clearScene" class="control-button">Clear Scene</button>
        </div>
      </div>

      <!-- Material Selector -->
      <div class="material-panel">
        <MaterialSelector
          :visual-object="selectedObject"
          @material-applied="onMaterialApplied"
        />
      </div>
    </div>

    <!-- Object List -->
    <div class="object-list">
      <h3>Scene Objects</h3>
      <div v-if="objects.length === 0" class="no-objects">
        No objects
      </div>
      <div v-else class="objects">
        <div
          v-for="obj in objects"
          :key="obj.id"
          class="object-item"
          :class="{ selected: selectedObject === obj }"
          @click="selectObject(obj)"
        >
          <div class="object-info">
            <span class="object-name">{{ obj.name }}</span>
            <span class="object-type">{{ obj.type }}</span>
            <span class="object-material">{{ obj.getCurrentMaterialId() }}</span>
          </div>
          <button @click.stop="removeObject(obj)" class="remove-button">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { BoxVisualObject, SphereVisualObject } from '../packages/cad-three/BasicShapes.js'
import MaterialSelector from '../packages/cad-ui/components/MaterialSelector.vue'

export default {
  name: 'MaterialDemo',
  components: {
    MaterialSelector
  },
  setup() {
    const threeContainer = ref(null)
    const objects = ref([])
    const selectedObject = ref(null)

    let scene, camera, renderer, controls
    let animationId

    onMounted(() => {
      initThreeJS()
      animate()
    })

    onUnmounted(() => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      if (renderer) {
        renderer.dispose()
      }
      // Remove event listener
      window.removeEventListener('resize', onWindowResize)
    })

    const initThreeJS = async () => {
      // Create scene
      scene = new THREE.Scene()
      scene.background = new THREE.Color(0x222222)

      // Create camera
      camera = new THREE.PerspectiveCamera(
        75,
        threeContainer.value.clientWidth / threeContainer.value.clientHeight,
        0.1,
        1000
      )
      camera.position.set(5, 5, 5)

      // Create renderer
      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      threeContainer.value.appendChild(renderer.domElement)

      // Add lights
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 10, 5)
      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 2048
      directionalLight.shadow.mapSize.height = 2048
      scene.add(directionalLight)

      // Add ground plane
      const groundGeometry = new THREE.PlaneGeometry(20, 20)
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 })
      const ground = new THREE.Mesh(groundGeometry, groundMaterial)
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground)

      // Add orbit controls
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05

      // Handle window resize
      window.addEventListener('resize', onWindowResize)
    }

    const onWindowResize = () => {
      if (!camera || !renderer) return

      camera.aspect = threeContainer.value.clientWidth / threeContainer.value.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
    }

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      if (controls) {
        controls.update()
      }

      // Rotate objects
      objects.value.forEach(obj => {
        if (obj.object3D) {
          obj.object3D.rotation.y += 0.01
        }
      })

      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }

    const createBox = async () => {
      const box = new BoxVisualObject()
      await box.create()

      // Random position
      box.position.set(
        (Math.random() - 0.5) * 10,
        1,
        (Math.random() - 0.5) * 10
      )

      scene.add(box.object3D)
      objects.value.push(box)

      if (!selectedObject.value) {
        selectObject(box)
      }
    }

    const createSphere = async () => {
      const sphere = new SphereVisualObject()
      await sphere.create()

      // Random position
      sphere.position.set(
        (Math.random() - 0.5) * 10,
        1,
        (Math.random() - 0.5) * 10
      )

      scene.add(sphere.object3D)
      objects.value.push(sphere)

      if (!selectedObject.value) {
        selectObject(sphere)
      }
    }

    const selectObject = (obj) => {
      // Deselect previous selection
      objects.value.forEach(o => {
        o.selected = false
      })

      // Select new object
      obj.selected = true
      selectedObject.value = obj
    }

    const removeObject = (obj) => {
      const index = objects.value.indexOf(obj)
      if (index > -1) {
        objects.value.splice(index, 1)
        scene.remove(obj.object3D)
        obj.dispose()

        if (selectedObject.value === obj) {
          selectedObject.value = objects.value.length > 0 ? objects.value[0] : null
          if (selectedObject.value) {
            selectObject(selectedObject.value)
          }
        }
      }
    }

    const clearScene = () => {
      objects.value.forEach(obj => {
        scene.remove(obj.object3D)
        obj.dispose()
      })
      objects.value = []
      selectedObject.value = null
    }

    const onMaterialApplied = (materialInfo) => {
      console.log('Material applied to object:', materialInfo)
    }

    return {
      threeContainer,
      objects,
      selectedObject,
      createBox,
      createSphere,
      clearScene,
      selectObject,
      removeObject,
      onMaterialApplied
    }
  }
}
</script>

<style scoped>
.material-demo {
  padding: 20px;
  background: var(--cad-bg-primary);
  min-height: 100vh;
}

.demo-header {
  margin-bottom: 20px;
  text-align: center;
}

.demo-header h2 {
  margin: 0 0 8px 0;
  color: var(--cad-text-primary);
  font-size: 24px;
}

.demo-header p {
  margin: 0;
  color: var(--cad-text-secondary);
  font-size: 14px;
}

.demo-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 20px;
  margin-bottom: 20px;
}

.scene-container {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.three-container {
  width: 100%;
  height: 400px;
  border: 1px solid var(--cad-border);
  border-radius: 4px;
  margin-bottom: 16px;
}

.scene-controls {
  display: flex;
  gap: 12px;
}

.control-button {
  flex: 1;
  padding: 8px 16px;
  background: var(--cad-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.control-button:hover {
  background: var(--cad-accent-dark);
}

.material-panel {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.object-list {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.object-list h3 {
  margin: 0 0 16px 0;
  color: var(--cad-text-primary);
  font-size: 16px;
}

.no-objects {
  text-align: center;
  color: var(--cad-text-secondary);
  font-style: italic;
  padding: 20px;
}

.objects {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.object-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--cad-bg-primary);
  border: 1px solid var(--cad-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.object-item:hover {
  background: var(--cad-bg-hover);
  border-color: var(--cad-accent);
}

.object-item.selected {
  background: var(--cad-accent-light);
  border-color: var(--cad-accent);
}

.object-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.object-name {
  font-weight: 600;
  color: var(--cad-text-primary);
  font-size: 14px;
}

.object-type,
.object-material {
  font-size: 12px;
  color: var(--cad-text-secondary);
}

.remove-button {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--cad-danger);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background 0.2s ease;
}

.remove-button:hover {
  background: var(--cad-danger-dark);
}
</style>
