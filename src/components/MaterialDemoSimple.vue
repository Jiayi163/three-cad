<template>
  <div class="material-demo-simple">
    <div class="demo-header">
      <h2>Material System Demo</h2>
      <p>Test preset materials and custom texture functionality</p>
    </div>

    <div class="demo-content">
      <div class="info-panel">
        <h3>Features</h3>
        <ul>
          <li>✅ Preset material library - includes metal, plastic, glass, etc.</li>
          <li>✅ Custom textures - support uploading images as textures</li>
          <li>✅ Texture tiling - automatically adjust texture repetition to fill surfaces</li>
          <li>✅ Performance optimization - material caching and memory management</li>
        </ul>

        <h3>Usage</h3>
        <ol>
          <li>Select a 3D object in the main interface</li>
          <li>Find the "Material" section in the right properties panel</li>
          <li>Choose a preset material or upload a custom texture</li>
          <li>Adjust texture settings and apply</li>
        </ol>
      </div>

      <div class="material-panel">
        <MaterialSelector
          :visual-object="null"
          @material-applied="onMaterialApplied"
        />
      </div>
    </div>

    <div class="demo-actions">
      <button @click="goBack" class="back-button">Back to Main</button>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import MaterialSelector from '../packages/cad-ui/components/MaterialSelector.vue'

export default {
  name: 'MaterialDemoSimple',
  components: {
    MaterialSelector
  },
  setup() {
    const router = useRouter()

    const onMaterialApplied = (materialInfo) => {
      console.log('Material applied:', materialInfo)
    }

    const goBack = () => {
      router.push('/')
    }

    return {
      onMaterialApplied,
      goBack
    }
  }
}
</script>

<style scoped>
.material-demo-simple {
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

.info-panel {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  padding: 20px;
}

.info-panel h3 {
  margin: 0 0 16px 0;
  color: var(--cad-text-primary);
  font-size: 16px;
}

.info-panel ul,
.info-panel ol {
  margin: 0 0 16px 0;
  padding-left: 20px;
  color: var(--cad-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.info-panel li {
  margin-bottom: 8px;
}

.material-panel {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.demo-actions {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--cad-border);
}

.back-button {
  padding: 12px 24px;
  background: var(--cad-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s ease;
}

.back-button:hover {
  background: var(--cad-accent-dark);
}
</style>
