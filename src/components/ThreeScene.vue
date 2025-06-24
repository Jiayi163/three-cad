<template>
  <div ref="containerRef" class="three-container">
    <div v-if="error" class="error-message">
      WebGL Error: {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default {
  name: 'ThreeScene',
  setup() {
    const containerRef = ref(null)
    const error = ref(null)
    
    let scene, camera, renderer, cube, controls, animationId
    
    const checkWebGLSupport = () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    }
    
    const initThree = () => {
      try {
        // Check WebGL support
        if (!checkWebGLSupport()) {
          throw new Error('WebGL is not supported in this browser')
        }
        
        // Create scene
        scene = new THREE.Scene()
        scene.background = new THREE.Color(0x222222)
        
        // Create camera
        const container = containerRef.value
        const width = container.clientWidth
        const height = container.clientHeight
        
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
        camera.position.set(5, 5, 5)
        camera.lookAt(0, 0, 0)
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        
        // Add renderer to container
        container.appendChild(renderer.domElement)
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
        scene.add(ambientLight)
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(10, 10, 5)
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.width = 1024
        directionalLight.shadow.mapSize.height = 1024
        scene.add(directionalLight)
        
        // Create cube geometry and material
        const geometry = new THREE.BoxGeometry(2, 2, 2)
        const material = new THREE.MeshLambertMaterial({ 
          color: 0x00ff00,
          transparent: true,
          opacity: 0.8
        })
        
        cube = new THREE.Mesh(geometry, material)
        cube.castShadow = true
        cube.receiveShadow = true
        scene.add(cube)
        
        // Add ground plane
        const planeGeometry = new THREE.PlaneGeometry(20, 20)
        const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 })
        const plane = new THREE.Mesh(planeGeometry, planeMaterial)
        plane.rotation.x = -Math.PI / 2
        plane.position.y = -2
        plane.receiveShadow = true
        scene.add(plane)
        
        // Add orbit controls
        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.screenSpacePanning = false
        controls.minDistance = 3
        controls.maxDistance = 20
        controls.maxPolarAngle = Math.PI / 2
        
        console.log('Three.js scene initialized successfully')
        
      } catch (err) {
        console.error('Three.js initialization failed:', err)
        error.value = err.message
      }
    }
    
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      
      if (cube) {
        // Rotate cube
        cube.rotation.x += 0.005
        cube.rotation.y += 0.01
        
        // Add slight floating motion
        cube.position.y = Math.sin(Date.now() * 0.002) * 0.5
      }
      
      if (controls) {
        controls.update()
      }
      
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }
    
    const handleResize = () => {
      if (!camera || !renderer || !containerRef.value) return
      
      const container = containerRef.value
      const width = container.clientWidth
      const height = container.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    
    const cleanup = () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      
      window.removeEventListener('resize', handleResize)
      
      if (controls) {
        controls.dispose()
      }
      
      if (renderer) {
        renderer.dispose()
        if (containerRef.value && renderer.domElement) {
          containerRef.value.removeChild(renderer.domElement)
        }
      }
      
      // Clean up geometries and materials
      scene?.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose()
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
    
    onMounted(() => {
      initThree()
      if (!error.value) {
        animate()
        window.addEventListener('resize', handleResize)
      }
    })
    
    onUnmounted(() => {
      cleanup()
    })
    
    return {
      containerRef,
      error
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

.three-container canvas {
  display: block;
  outline: none;
}
</style> 