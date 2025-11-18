<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="close">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>{{ mode === 'export' ? 'Export Project' : 'Import Project' }}</h3>
        <button class="close-button" @click="close">&times;</button>
      </div>

      <div class="dialog-content">
        <!-- Export Mode -->
        <div v-if="mode === 'export'" class="export-section">
          <div class="form-group">
            <label for="filename">Filename</label>
            <input
              id="filename"
              v-model="exportFilename"
              type="text"
              placeholder="my-project.json"
              @keypress.enter="handleExport"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="exportOptions.embedTextures"
                type="checkbox"
              />
              <span>Embed textures in file</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="exportOptions.includeHistory"
                type="checkbox"
              />
              <span>Include history data</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="exportOptions.packageAsZip"
                type="checkbox"
              />
              <span>Export as ZIP package (with assets folder)</span>
            </label>
            <p class="help-text">
              Creates a ZIP file with JSON and assets folder. Structure:<br>
              <code>scene.json</code><br>
              <code>assets/textures/</code> (texture files)<br>
              <code>assets/</code> (skybox/background files)
            </p>
            <p class="help-text" style="margin-top: 0.5rem; font-size: 0.85em; color: #666;">
              All paths in JSON use relative paths (e.g., <code>./assets/textures/image.png</code>)
            </p>
          </div>

          <div v-if="documentInfo" class="info-box">
            <h4>Document Information</h4>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">{{ documentInfo.name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Objects:</span>
              <span class="info-value">{{ documentInfo.nodeCount }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Created:</span>
              <span class="info-value">{{ formatDate(documentInfo.created) }}</span>
            </div>
          </div>
        </div>

        <!-- Import Mode -->
        <div v-else class="import-section">
          <div class="upload-area" :class="{ 'drag-over': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleFileDrop"
          >
            <div class="upload-icon">📁</div>
            <p class="upload-text">
              Drag and drop a .json or .zip file here<br>
              or
            </p>
            <p class="help-text" style="margin-top: 0.5rem; font-size: 0.85em; color: #666;">
              💡 <strong>Tip:</strong> Use ZIP package to include assets (textures, skybox).<br>
              Single JSON files may not load external assets due to browser security.
            </p>
            <button class="upload-button" @click="$refs.fileInput.click()">
              Select File
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json,.zip"
              style="display: none"
              @change="handleFileSelect"
            />
          </div>

          <div v-if="selectedFile" class="file-info">
            <div class="file-name">
              <strong>Selected:</strong> {{ selectedFile.name }}
            </div>
            <div class="file-size">
              <strong>Size:</strong> {{ formatFileSize(selectedFile.size) }}
            </div>
          </div>

          <div v-if="validationResult" class="validation-result">
            <div v-if="validationResult.valid" class="validation-success">
              <div class="validation-icon">✓</div>
              <div class="validation-details">
                <h4>Valid Project File</h4>
                <div class="info-row" v-if="validationResult.info.isZipPackage !== undefined">
                  <span class="info-label">Format:</span>
                  <span class="info-value">
                    {{ validationResult.info.isZipPackage ? 'ZIP Package' : 'JSON File' }}
                    <span v-if="validationResult.info.hasAssets" style="color: #4caf50;">
                      ({{ validationResult.info.assetsCount }} assets)
                    </span>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Document:</span>
                  <span class="info-value">{{ validationResult.info.documentName }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Objects:</span>
                  <span class="info-value">{{ validationResult.info.nodeCount }}</span>
                </div>
                <div class="info-row" v-if="validationResult.info.textureCount !== undefined">
                  <span class="info-label">Textures:</span>
                  <span class="info-value">{{ validationResult.info.textureCount }}</span>
                </div>
              </div>
            </div>

            <div v-else class="validation-error">
              <div class="validation-icon">✗</div>
              <div class="validation-details">
                <h4>Invalid Project File</h4>
                <ul class="error-list">
                  <li v-for="(error, index) in validationResult.errors" :key="index">
                    {{ error }}
                  </li>
                </ul>
              </div>
            </div>

            <div v-if="validationResult.warnings.length > 0" class="validation-warnings">
              <h5>Warnings:</h5>
              <ul class="warning-list">
                <li v-for="(warning, index) in validationResult.warnings" :key="index">
                  {{ warning }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- Loading State -->
        <div v-if="isProcessing" class="loading-overlay">
          <div class="spinner"></div>
          <p>{{ mode === 'export' ? 'Exporting...' : 'Importing...' }}</p>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="secondary-button" @click="close">Cancel</button>
        <button
          v-if="mode === 'export'"
          class="primary-button"
          :disabled="!canExport || isProcessing"
          @click="handleExport"
        >
          Export
        </button>
        <button
          v-else
          class="primary-button"
          :disabled="!canImport || isProcessing"
          @click="handleImport"
        >
          Import
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { ProjectExporter } from '../../cad-core/io/ProjectExporter.js';
import { ProjectImporter } from '../../cad-core/io/ProjectImporter.js';

export default {
  name: 'ImportExportDialog',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'export', // 'export' or 'import'
      validator: (value) => ['export', 'import'].includes(value)
    },
    document: {
      type: Object,
      default: null
    },
    application: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'export-complete', 'import-complete', 'error'],
  setup(props, { emit }) {
    // Export state
    const exportFilename = ref('');
    const exportOptions = ref({
      embedTextures: true,
      includeHistory: false,
      packageAsZip: true,  // Default to ZIP package (includes assets folder)
      assetsFolderName: 'assets'  // Folder name for assets
    });

    // Import state
    const selectedFile = ref(null);
    const validationResult = ref(null);
    const isDragOver = ref(false);

    // Common state
    const isProcessing = ref(false);
    const errorMessage = ref('');

    // Computed properties
    const documentInfo = computed(() => {
      if (!props.document) return null;

      return {
        name: props.document.name || 'Untitled',
        nodeCount: props.document.nodes?.count || 0,
        created: props.document._created
      };
    });

    const canExport = computed(() => {
      return props.document && exportFilename.value.trim().length > 0;
    });

    const canImport = computed(() => {
      return selectedFile.value && validationResult.value?.valid;
    });

    // Methods
    const close = () => {
      resetState();
      emit('close');
    };

    const resetState = () => {
      exportFilename.value = '';
      selectedFile.value = null;
      validationResult.value = null;
      isDragOver.value = false;
      isProcessing.value = false;
      errorMessage.value = '';
    };

    const handleExport = async () => {
      if (!canExport.value) return;

      try {
        isProcessing.value = true;
        errorMessage.value = '';

        // Get ThreeView instance if available (for skybox export)
        const threeView = window.__THREESCENE_INSTANCE__ || null;

        // Use exportThreeCADAndDownload for 3CAD scene format
        const filename = await ProjectExporter.exportThreeCADAndDownload(
          props.document,
          exportFilename.value,
          {
            ...exportOptions.value,
            threeView
          }
        );

        emit('export-complete', { filename });
        close();
      } catch (error) {
        errorMessage.value = error.message;
        emit('error', error);
      } finally {
        isProcessing.value = false;
      }
    };

    const handleFileSelect = async (event) => {
      const file = event.target.files?.[0];
      if (file) {
        await validateAndSetFile(file);
      }
    };

    const handleFileDrop = async (event) => {
      isDragOver.value = false;
      const file = event.dataTransfer.files?.[0];
      if (file) {
        await validateAndSetFile(file);
      }
    };

    const validateAndSetFile = async (file) => {
      try {
        selectedFile.value = file;
        errorMessage.value = '';
        isProcessing.value = true;

        const result = await ProjectImporter.validateFile(file);
        validationResult.value = result;

        if (!result.valid) {
          if (file.name.toLowerCase().endsWith('.zip')) {
            errorMessage.value = 'Invalid ZIP package. Please select a valid .zip export file.';
          } else {
            errorMessage.value = 'Invalid project file. Please select a valid .json or .zip export file.';
          }
        }
      } catch (error) {
        errorMessage.value = error.message;
        validationResult.value = null;
      } finally {
        isProcessing.value = false;
      }
    };

    const handleImport = async () => {
      if (!canImport.value) return;

      try {
        isProcessing.value = true;
        errorMessage.value = '';

        // Get ThreeView instance if available (for skybox application)
        const threeView = window.__THREESCENE_INSTANCE__ || null;

        const document = await ProjectImporter.importFromFile(
          selectedFile.value,
          props.application,
          { threeView }
        );

        emit('import-complete', { document });
        close();
      } catch (error) {
        errorMessage.value = error.message;
        emit('error', error);
      } finally {
        isProcessing.value = false;
      }
    };

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString();
    };

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return {
      exportFilename,
      exportOptions,
      selectedFile,
      validationResult,
      isDragOver,
      isProcessing,
      errorMessage,
      documentInfo,
      canExport,
      canImport,
      close,
      handleExport,
      handleImport,
      handleFileSelect,
      handleFileDrop,
      formatDate,
      formatFileSize
    };
  }
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background: var(--cad-bg-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--cad-border);
}

.dialog-header h3 {
  margin: 0;
  color: var(--cad-text-primary);
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--cad-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--cad-bg-hover);
  color: var(--cad-text-primary);
}

.dialog-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  position: relative;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--cad-text-primary);
  font-size: 14px;
  font-weight: 500;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 8px 12px;
  background: var(--cad-bg-primary);
  border: 1px solid var(--cad-border);
  border-radius: 4px;
  color: var(--cad-text-primary);
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.checkbox-label span {
  font-weight: normal;
}

.upload-area {
  border: 2px dashed var(--cad-border);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  background: var(--cad-bg-primary);
}

.upload-area.drag-over {
  border-color: var(--cad-accent);
  background: var(--cad-accent-light);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  color: var(--cad-text-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}

.upload-button {
  padding: 10px 20px;
  background: var(--cad-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s ease;
}

.upload-button:hover {
  background: var(--cad-accent-dark);
}

.info-box,
.file-info {
  background: var(--cad-bg-primary);
  border: 1px solid var(--cad-border);
  border-radius: 4px;
  padding: 16px;
  margin-top: 16px;
}

.info-box h4 {
  margin: 0 0 12px 0;
  color: var(--cad-text-primary);
  font-size: 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--cad-text-secondary);
}

.info-value {
  color: var(--cad-text-primary);
  font-weight: 500;
}

.file-name,
.file-size {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--cad-text-secondary);
}

.validation-result {
  margin-top: 16px;
}

.validation-success,
.validation-error {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.validation-success {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.validation-error {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.validation-icon {
  font-size: 24px;
  font-weight: bold;
}

.validation-success .validation-icon {
  color: #4caf50;
}

.validation-error .validation-icon {
  color: #f44336;
}

.validation-details {
  flex: 1;
}

.validation-details h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--cad-text-primary);
}

.error-list,
.warning-list {
  margin: 8px 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--cad-text-secondary);
}

.error-message {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 4px;
  padding: 12px;
  margin-top: 16px;
  color: #f44336;
  font-size: 13px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--cad-border);
}

.primary-button,
.secondary-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.primary-button {
  background: var(--cad-accent);
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: var(--cad-accent-dark);
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary-button {
  background: transparent;
  color: var(--cad-text-primary);
  border: 1px solid var(--cad-border);
}

.secondary-button:hover {
  background: var(--cad-bg-hover);
}
</style>

