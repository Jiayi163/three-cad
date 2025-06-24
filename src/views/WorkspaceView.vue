<template>
  <div class="workspace">
    <main class="workspace-main">
      <div class="viewport-container">
        <ThreeScene />
        <div class="viewport-overlay">
          <div class="controls-hint">
            <p><strong>Controls:</strong></p>
            <p>Left click + drag: Rotate view</p>
            <p>Right click + drag: Pan view</p>
            <p>Mouse wheel: Zoom in/out</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import ThreeScene from '../components/ThreeScene.vue'

export default {
  name: 'WorkspaceView',
  components: {
    ThreeScene
  }
}
</script>

<style scoped>
.workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.viewport-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.85rem;
  color: #ecf0f1;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  max-width: 250px;
}

.controls-hint p {
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.controls-hint p:last-child {
  margin-bottom: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .viewport-overlay {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.75rem;
    font-size: 0.8rem;
    max-width: 200px;
  }
}

@media (max-width: 480px) {
  .viewport-overlay {
    position: relative;
    top: auto;
    right: auto;
    margin: 0.5rem;
    max-width: none;
  }
}
</style> 