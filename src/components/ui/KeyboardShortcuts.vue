<template>
  <div class="keyboard-shortcuts-modal" v-if="visible" @click="closeModal">
    <div class="shortcuts-dialog" @click.stop>
      <div class="dialog-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="close-button" @click="closeModal">
          <i class="cad-icon cad-icon-close"></i>
        </button>
      </div>

      <div class="dialog-content">
        <div class="shortcuts-grid">
          <!-- File Operations -->
          <div class="shortcut-section">
            <h3>File Operations</h3>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <span class="action">New Document</span>
                <kbd class="shortcut">Ctrl+N</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Open Document</span>
                <kbd class="shortcut">Ctrl+O</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Save Document</span>
                <kbd class="shortcut">Ctrl+S</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Save As</span>
                <kbd class="shortcut">Ctrl+Shift+S</kbd>
              </div>
            </div>
          </div>

          <!-- Edit Operations -->
          <div class="shortcut-section">
            <h3>Edit Operations</h3>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <span class="action">Undo</span>
                <kbd class="shortcut">Ctrl+Z</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Redo</span>
                <kbd class="shortcut">Ctrl+Y</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Copy</span>
                <kbd class="shortcut">Ctrl+C</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Paste</span>
                <kbd class="shortcut">Ctrl+V</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Delete</span>
                <kbd class="shortcut">Del</kbd>
              </div>
            </div>
          </div>

          <!-- Tools -->
          <div class="shortcut-section">
            <h3>Tools</h3>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <span class="action">Select Tool</span>
                <kbd class="shortcut">S</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Move Tool</span>
                <kbd class="shortcut">M</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Rotate Tool</span>
                <kbd class="shortcut">R</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Scale Tool</span>
                <kbd class="shortcut">E</kbd>
              </div>
            </div>
          </div>

          <!-- Create Objects -->
          <div class="shortcut-section">
            <h3>Create Objects</h3>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <span class="action">Create Box</span>
                <kbd class="shortcut">B</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Create Sphere</span>
                <kbd class="shortcut">O</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Create Cylinder</span>
                <kbd class="shortcut">C</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Create Plane</span>
                <kbd class="shortcut">P</kbd>
              </div>
            </div>
          </div>

          <!-- View Controls -->
          <div class="shortcut-section">
            <h3>View Controls</h3>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <span class="action">Zoom to Fit</span>
                <kbd class="shortcut">F</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Front View</span>
                <kbd class="shortcut">1</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Top View</span>
                <kbd class="shortcut">7</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Isometric View</span>
                <kbd class="shortcut">0</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Toggle Wireframe</span>
                <kbd class="shortcut">Z</kbd>
              </div>
            </div>
          </div>

          <!-- Interface -->
          <div class="shortcut-section">
            <h3>Interface</h3>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <span class="action">Toggle Tool Palette</span>
                <kbd class="shortcut">T</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Toggle Object Hierarchy</span>
                <kbd class="shortcut">H</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Toggle Properties</span>
                <kbd class="shortcut">Ctrl+P</kbd>
              </div>
              <div class="shortcut-item">
                <span class="action">Show Help</span>
                <kbd class="shortcut">Ctrl+?</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <p class="tip">Tip: Hover over any tool button to see its keyboard shortcut</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'KeyboardShortcuts',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const closeModal = () => {
      emit('close')
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape' && props.visible) {
        closeModal()
      }
    }

    onMounted(() => {
      document.addEventListener('keydown', handleEscape)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleEscape)
    })

    return {
      closeModal
    }
  }
}
</script>

<style scoped>
.keyboard-shortcuts-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--cad-z-modal);
  padding: var(--cad-spacing-lg);
}

.shortcuts-dialog {
  background: var(--cad-surface-medium);
  border: 1px solid var(--cad-border-primary);
  border-radius: var(--cad-radius-lg);
  box-shadow: var(--cad-shadow-lg);
  max-width: 800px;
  max-height: 80vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--cad-spacing-lg) var(--cad-spacing-xl);
  background: var(--cad-surface-light);
  border-bottom: 1px solid var(--cad-border-primary);
}

.dialog-header h2 {
  margin: 0;
  color: var(--cad-text-primary);
  font-size: var(--cad-font-size-xl);
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: var(--cad-text-secondary);
  cursor: pointer;
  padding: var(--cad-spacing-sm);
  border-radius: var(--cad-radius-md);
  transition: all var(--cad-transition-fast);
}

.close-button:hover {
  background: var(--cad-surface-hover);
  color: var(--cad-text-primary);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--cad-spacing-xl);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--cad-spacing-xl);
}

.shortcut-section h3 {
  margin: 0 0 var(--cad-spacing-md) 0;
  color: var(--cad-primary);
  font-size: var(--cad-font-size-lg);
  font-weight: 600;
  border-bottom: 1px solid var(--cad-border-secondary);
  padding-bottom: var(--cad-spacing-sm);
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: var(--cad-spacing-sm);
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--cad-spacing-sm) 0;
}

.action {
  color: var(--cad-text-primary);
  font-size: var(--cad-font-size-sm);
}

.shortcut {
  display: inline-block;
  padding: 4px 8px;
  background: var(--cad-surface-dark);
  color: var(--cad-text-secondary);
  border: 1px solid var(--cad-border-primary);
  border-radius: var(--cad-radius-sm);
  font-family: var(--cad-font-mono);
  font-size: var(--cad-font-size-xs);
  font-weight: bold;
  min-width: 32px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.dialog-footer {
  padding: var(--cad-spacing-lg) var(--cad-spacing-xl);
  background: var(--cad-surface-light);
  border-top: 1px solid var(--cad-border-primary);
}

.tip {
  margin: 0;
  color: var(--cad-text-secondary);
  font-size: var(--cad-font-size-xs);
  text-align: center;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .keyboard-shortcuts-modal {
    padding: var(--cad-spacing-md);
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
    gap: var(--cad-spacing-lg);
  }

  .dialog-content {
    padding: var(--cad-spacing-lg);
  }

  .shortcut-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--cad-spacing-xs);
  }

  .shortcut {
    align-self: flex-end;
  }
}

/* Animation */
.keyboard-shortcuts-modal {
  animation: modal-fade-in 0.2s ease-out;
}

.shortcuts-dialog {
  animation: modal-slide-in 0.3s ease-out;
}

@keyframes modal-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modal-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
