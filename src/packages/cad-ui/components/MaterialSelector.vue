<template>
  <div class="material-selector">
    <div class="material-selector-header">
      <h3>Material Selection</h3>
      <div class="material-tabs">
        <button
          :class="{ active: activeTab === 'presets' }"
          @click="activeTab = 'presets'"
        >
          Preset Materials
        </button>
        <button
          :class="{ active: activeTab === 'texture' }"
          @click="activeTab = 'texture'"
        >
          Custom Texture
        </button>
      </div>
    </div>

    <!-- Preset Materials Panel -->
    <div v-if="activeTab === 'presets'" class="preset-materials">
      <div class="material-categories">
        <div class="category">
          <h4>Basic Materials</h4>
          <div class="material-grid">
            <div
              v-for="material in basicMaterials"
              :key="material.id"
              class="material-item"
              :class="{ selected: selectedMaterialId === material.id }"
              @click="selectPresetMaterial(material.id)"
              :title="material.name"
            >
              <div
                class="material-preview"
                :style="{ backgroundColor: getMaterialColor(material.config.color) }"
              ></div>
              <span class="material-name">{{ material.name }}</span>
            </div>
          </div>
        </div>

        <div class="category">
          <h4>Metal Materials</h4>
          <div class="material-grid">
            <div
              v-for="material in metalMaterials"
              :key="material.id"
              class="material-item"
              :class="{ selected: selectedMaterialId === material.id }"
              @click="selectPresetMaterial(material.id)"
              :title="material.name"
            >
              <div
                class="material-preview"
                :style="{ backgroundColor: getMaterialColor(material.config.color) }"
              ></div>
              <span class="material-name">{{ material.name }}</span>
            </div>
          </div>
        </div>

        <div class="category">
          <h4>Color Materials</h4>
          <div class="material-grid">
            <div
              v-for="material in colorMaterials"
              :key="material.id"
              class="material-item"
              :class="{ selected: selectedMaterialId === material.id }"
              @click="selectPresetMaterial(material.id)"
              :title="material.name"
            >
              <div
                class="material-preview"
                :style="{ backgroundColor: getMaterialColor(material.config.color) }"
              ></div>
              <span class="material-name">{{ material.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Texture Panel -->
    <div v-if="activeTab === 'texture'" class="texture-panel">
      <div class="texture-upload">
        <div class="upload-area"
             :class="{ 'drag-over': isDragOver }"
             @dragover.prevent="isDragOver = true"
             @dragleave.prevent="isDragOver = false"
             @drop.prevent="handleFileDrop">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            style="display: none"
          >
          <div class="upload-content">
            <div class="upload-icon">📁</div>
            <p>Drag image here or click to select file</p>
            <button @click="$refs.fileInput.click()" class="upload-button">
              Select Image
            </button>
          </div>
        </div>
      </div>

      <div v-if="currentTexture" class="texture-preview">
        <h4>Current Texture</h4>
        <div class="texture-info">
          <img :src="texturePreviewUrl" alt="Texture preview" class="texture-image">
          <div class="texture-details">
            <p><strong>File name:</strong> {{ currentTexture.name }}</p>
            <p><strong>Size:</strong> {{ textureSize.width }} × {{ textureSize.height }}</p>
            <p><strong>File size:</strong> {{ formatFileSize(currentTexture.size) }}</p>
          </div>
        </div>
      </div>

      <div v-if="currentTexture" class="texture-settings">
        <h4>Texture Settings</h4>

        <div class="setting-group">
          <label>Repeat Mode:</label>
          <select v-model="textureSettings.fitMode">
            <option value="stretch">Stretch</option>
            <option value="tile">Tile</option>
            <option value="proportional">Keep Proportion</option>
          </select>
        </div>

        <div class="setting-group">
          <label>Repeat X:</label>
          <input
            type="number"
            v-model.number="textureSettings.repeatX"
            min="0.1"
            max="10"
            step="0.1"
          >
        </div>

        <div class="setting-group">
          <label>Repeat Y:</label>
          <input
            type="number"
            v-model.number="textureSettings.repeatY"
            min="0.1"
            max="10"
            step="0.1"
          >
        </div>

        <div class="setting-group">
          <label>Offset X:</label>
          <input
            type="number"
            v-model.number="textureSettings.offsetX"
            min="-1"
            max="1"
            step="0.01"
          >
        </div>

        <div class="setting-group">
          <label>Offset Y:</label>
          <input
            type="number"
            v-model.number="textureSettings.offsetY"
            min="-1"
            max="1"
            step="0.01"
          >
        </div>

        <div class="setting-group">
          <label>Rotation (degrees):</label>
          <input
            type="number"
            v-model.number="textureSettings.rotation"
            min="0"
            max="360"
            step="1"
          >
        </div>

        <div class="setting-group">
          <label>Metalness:</label>
          <input
            type="range"
            v-model.number="textureSettings.metalness"
            min="0"
            max="1"
            step="0.01"
          >
          <span>{{ textureSettings.metalness }}</span>
        </div>

        <div class="setting-group">
          <label>Roughness:</label>
          <input
            type="range"
            v-model.number="textureSettings.roughness"
            min="0"
            max="1"
            step="0.01"
          >
          <span>{{ textureSettings.roughness }}</span>
        </div>
      </div>
    </div>

    <div class="material-actions">
      <button
        type="button"
        @click.stop.prevent="applyMaterial"
        :disabled="!canApplyMaterial"
        class="apply-button"
        :title="canApplyMaterial ? 'Apply selected material to object' : (!hasVisualObject ? 'No object selected' : 'No material selected')"
      >
        Apply Material
      </button>
      <button type="button" @click.stop.prevent="resetMaterial" class="reset-button">
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import { materialManager } from '../../cad-three/MaterialManager.js';

export default {
  name: 'MaterialSelector',
  props: {
    visualObject: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      activeTab: 'presets',
      selectedMaterialId: null,
      currentTexture: null,
      texturePreviewUrl: null,
      textureSize: { width: 0, height: 0 },
      isDragOver: false,
      textureSettings: {
        fitMode: 'tile',
        repeatX: 1,
        repeatY: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        metalness: 0.1,
        roughness: 0.3
      }
    };
  },
  computed: {
    presetMaterials() {
      return materialManager.getPresetMaterials();
    },
    basicMaterials() {
      return this.presetMaterials.filter(m =>
        ['default', 'plastic', 'rubber', 'glass', 'wood', 'concrete'].includes(m.id)
      );
    },
    metalMaterials() {
      return this.presetMaterials.filter(m =>
        ['metal', 'gold', 'silver', 'copper'].includes(m.id)
      );
    },
    colorMaterials() {
      return this.presetMaterials.filter(m =>
        ['red', 'green', 'blue', 'yellow', 'white', 'black'].includes(m.id)
      );
    },
    hasSelection() {
      return !!(this.selectedMaterialId || this.currentTexture);
    },
    hasVisualObject() {
      return !!this.visualObject;
    },
    canApplyMaterial() {
      // Can apply when we have both a visual object AND a material/texture selected
      return this.hasVisualObject && this.hasSelection;
    }
  },
  watch: {
    visualObject: {
      handler(newObj) {
        if (newObj) {
          this.selectedMaterialId = newObj.getCurrentMaterialId();
        }
      },
      immediate: true
    }
  },
  methods: {
    selectPresetMaterial(materialId) {
      this.selectedMaterialId = materialId;
      this.currentTexture = null;
      this.texturePreviewUrl = null;
    },

    async handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        await this.loadTextureFile(file);
      }
    },

    async handleFileDrop(event) {
      this.isDragOver = false;
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        await this.loadTextureFile(files[0]);
      }
    },

    async loadTextureFile(file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      this.currentTexture = file;
      this.selectedMaterialId = null;

      // Create preview URL
      this.texturePreviewUrl = URL.createObjectURL(file);

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        this.textureSize = {
          width: img.width,
          height: img.height
        };
      };
      img.src = this.texturePreviewUrl;
    },

    async applyMaterial(event) {
      // Stop event propagation to prevent any interference
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      console.log('=== Apply Material Button Clicked ===');
      console.log('Visual Object:', this.visualObject);
      console.log('Selected Material ID:', this.selectedMaterialId);
      console.log('Current Texture:', this.currentTexture);
      console.log('Can Apply:', this.canApplyMaterial);

      if (!this.visualObject) {
        console.error('❌ No visual object selected');
        alert('Please select an object first');
        return;
      }

      if (!this.selectedMaterialId && !this.currentTexture) {
        console.error('❌ No material or texture selected');
        alert('Please select a material or upload a texture first');
        return;
      }

      try {
        // Save current transform before applying material
        const savedPosition = this.visualObject._object3D ? this.visualObject._object3D.position.clone() : null;
        const savedRotation = this.visualObject._object3D ? this.visualObject._object3D.rotation.clone() : null;
        const savedScale = this.visualObject._object3D ? this.visualObject._object3D.scale.clone() : null;

        console.log('💾 Saved transforms before material application:');
        console.log('  Position:', savedPosition);
        console.log('  Rotation:', savedRotation);
        console.log('  Scale:', savedScale);

        if (this.selectedMaterialId) {
          // Apply preset material
          console.log('✅ Applying preset material:', this.selectedMaterialId);
          await this.visualObject.setMaterial(this.selectedMaterialId);
          console.log('✅ Preset material applied successfully');
        } else if (this.currentTexture) {
          // Apply texture material
          console.log('✅ Applying texture material from file:', this.currentTexture.name);
          const options = {
            repeatX: this.textureSettings.repeatX,
            repeatY: this.textureSettings.repeatY,
            offsetX: this.textureSettings.offsetX,
            offsetY: this.textureSettings.offsetY,
            rotation: (this.textureSettings.rotation * Math.PI) / 180,
            metalness: this.textureSettings.metalness,
            roughness: this.textureSettings.roughness
          };

          await this.visualObject.setTextureFromFile(this.currentTexture, options);
          console.log('✅ Texture material applied successfully');
        }

        // Restore transforms after material application (in case they were affected)
        if (this.visualObject._object3D && savedPosition && savedRotation && savedScale) {
          this.visualObject._object3D.position.copy(savedPosition);
          this.visualObject._object3D.rotation.copy(savedRotation);
          this.visualObject._object3D.scale.copy(savedScale);

          console.log('🔄 Restored transforms after material application:');
          console.log('  Position:', this.visualObject._object3D.position);
          console.log('  Rotation:', this.visualObject._object3D.rotation);
          console.log('  Scale:', this.visualObject._object3D.scale);
        }

        // Force render update
        if (this.visualObject._object3D) {
          this.visualObject._object3D.needsUpdate = true;
        }

        console.log('✅ Material application complete');
        this.$emit('material-applied', {
          type: this.selectedMaterialId ? 'preset' : 'texture',
          materialId: this.selectedMaterialId,
          texture: this.currentTexture
        });

      } catch (error) {
        console.error('❌ Failed to apply material:', error);
        console.error('Error stack:', error.stack);
        alert('Failed to apply material: ' + error.message);
      }
    },

    resetMaterial() {
      this.selectedMaterialId = null;
      this.currentTexture = null;
      this.texturePreviewUrl = null;
      this.textureSize = { width: 0, height: 0 };

      // Reset texture settings
      this.textureSettings = {
        fitMode: 'tile',
        repeatX: 1,
        repeatY: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        metalness: 0.1,
        roughness: 0.3
      };
    },

    getMaterialColor(hexColor) {
      return `#${hexColor.toString(16).padStart(6, '0')}`;
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  },

  beforeUnmount() {
    // Clean up preview URL
    if (this.texturePreviewUrl) {
      URL.revokeObjectURL(this.texturePreviewUrl);
    }
  }
};
</script>

<style scoped>
.material-selector {
  padding: 16px;
  background: var(--cad-panel-bg);
  border-radius: 8px;
  max-height: 600px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  pointer-events: auto; /* Ensure all elements inside can receive clicks */
}

.material-selector-header {
  margin-bottom: 16px;
}

.material-selector-header h3 {
  margin: 0 0 12px 0;
  color: var(--cad-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.material-tabs {
  display: flex;
  gap: 4px;
  background: var(--cad-bg-secondary);
  border-radius: 6px;
  padding: 4px;
}

.material-tabs button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--cad-text-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.material-tabs button:hover {
  background: var(--cad-bg-hover);
  color: var(--cad-text-primary);
}

.material-tabs button.active {
  background: var(--cad-accent);
  color: white;
}

.material-categories {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category h4 {
  margin: 0 0 12px 0;
  color: var(--cad-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
}

.material-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--cad-bg-secondary);
}

.material-item:hover {
  border-color: var(--cad-accent);
  background: var(--cad-bg-hover);
}

.material-item.selected {
  border-color: var(--cad-accent);
  background: var(--cad-accent-light);
}

.material-preview {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  margin-bottom: 6px;
  border: 1px solid var(--cad-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.material-name {
  font-size: 12px;
  color: var(--cad-text-secondary);
  text-align: center;
  line-height: 1.2;
}

.texture-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.upload-area {
  border: 2px dashed var(--cad-border);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--cad-bg-secondary);
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: var(--cad-accent);
  background: var(--cad-accent-light);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 32px;
  opacity: 0.6;
}

.upload-content p {
  margin: 0;
  color: var(--cad-text-secondary);
  font-size: 14px;
}

.upload-button {
  padding: 8px 16px;
  background: var(--cad-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.upload-button:hover {
  background: var(--cad-accent-dark);
}

.texture-preview {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.texture-preview h4 {
  margin: 0 0 12px 0;
  color: var(--cad-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.texture-info {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.texture-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--cad-border);
}

.texture-details {
  flex: 1;
}

.texture-details p {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: var(--cad-text-secondary);
}

.texture-settings {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  padding: 16px;
}

.texture-settings h4 {
  margin: 0 0 16px 0;
  color: var(--cad-text-primary);
  font-size: 14px;
  font-weight: 600;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.setting-group label {
  min-width: 80px;
  font-size: 12px;
  color: var(--cad-text-secondary);
}

.setting-group input,
.setting-group select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--cad-border);
  border-radius: 4px;
  background: var(--cad-bg-primary);
  color: var(--cad-text-primary);
  font-size: 12px;
}

.setting-group input[type="range"] {
  flex: 2;
}

.setting-group span {
  min-width: 40px;
  font-size: 12px;
  color: var(--cad-text-secondary);
  text-align: right;
}

.material-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--cad-border);
}

.apply-button,
.reset-button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  pointer-events: auto; /* Ensure button receives clicks */
  position: relative;
  z-index: 10; /* Ensure button is above any overlays */
}

.apply-button {
  background: var(--cad-accent);
  color: white;
}

.apply-button:hover:not(:disabled) {
  background: var(--cad-accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.apply-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.apply-button:disabled {
  background: var(--cad-bg-disabled);
  color: var(--cad-text-disabled);
  cursor: not-allowed;
  opacity: 0.5;
}

.reset-button {
  background: var(--cad-bg-secondary);
  color: var(--cad-text-secondary);
  border: 1px solid var(--cad-border);
}

.reset-button:hover {
  background: var(--cad-bg-hover);
  color: var(--cad-text-primary);
}
</style>
