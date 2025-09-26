<template>
  <div class="selection-tools">
    <div class="selection-tools-header">
      <h3>Selection</h3>
      <div class="header-actions">
        <button
          class="action-btn"
          @click="toggleCollapsed"
          :title="isCollapsed ? 'Expand' : 'Collapse'"
        >
          <i :class="isCollapsed ? 'icon-expand' : 'icon-collapse'"></i>
        </button>
      </div>
    </div>

    <div v-show="!isCollapsed" class="selection-tools-content">
      <!-- Selection Mode -->
      <div class="tool-section">
        <div class="section-header">
          <h4>Mode</h4>
        </div>
        <div class="selection-modes">
          <button
            v-for="mode in selectionModes"
            :key="mode.id"
            class="mode-btn"
            :class="{ active: currentMode === mode.id }"
            @click="setSelectionMode(mode.id)"
            :title="mode.description"
          >
            <i :class="mode.icon"></i>
            <span>{{ mode.name }}</span>
          </button>
        </div>
      </div>

      <!-- Selection Actions -->
      <div class="tool-section">
        <div class="section-header">
          <h4>Actions</h4>
        </div>
        <div class="selection-actions">
          <button
            class="action-btn"
            @click="selectAll"
            :disabled="!hasObjects"
            title="Select All (Ctrl+A)"
          >
            <i class="icon-select-all"></i>
            <span>All</span>
          </button>

          <button
            class="action-btn"
            @click="clearSelection"
            :disabled="!hasSelection"
            title="Clear Selection (Ctrl+D)"
          >
            <i class="icon-deselect"></i>
            <span>Clear</span>
          </button>

          <button
            class="action-btn"
            @click="invertSelection"
            :disabled="!hasObjects"
            title="Invert Selection (Ctrl+I)"
          >
            <i class="icon-invert"></i>
            <span>Invert</span>
          </button>
        </div>
      </div>

      <!-- Selection by Type -->
      <div class="tool-section">
        <div class="section-header">
          <h4>By Type</h4>
        </div>
        <div class="type-selection">
          <button
            v-for="type in availableTypes"
            :key="type.id"
            class="type-btn"
            @click="selectByType(type.id)"
            :title="`Select all ${type.name}`"
          >
            <i :class="type.icon"></i>
            <span>{{ type.name }}</span>
          </button>
        </div>
      </div>

      <!-- Selection Filters -->
      <div class="tool-section">
        <div class="section-header">
          <h4>Filters</h4>
        </div>
        <div class="selection-filters">
          <label
            v-for="filter in availableFilters"
            :key="filter.id"
            class="filter-checkbox"
          >
            <input
              type="checkbox"
              :checked="filter.enabled"
              @change="toggleFilter(filter.id, $event.target.checked)"
            >
            <span class="checkmark"></span>
            <span class="filter-label">{{ filter.name }}</span>
          </label>
        </div>
      </div>

      <!-- Selection Info -->
      <div class="tool-section">
        <div class="section-header">
          <h4>Selection Info</h4>
        </div>
        <div class="selection-info">
          <div class="info-item">
            <span class="info-label">Count:</span>
            <span class="info-value">{{ selectionCount }}</span>
          </div>
          <div v-if="selectedTypes.length > 0" class="info-item">
            <span class="info-label">Types:</span>
            <span class="info-value">{{ selectedTypes.join(', ') }}</span>
          </div>
          <div v-if="selectionBounds" class="info-item">
            <span class="info-label">Bounds:</span>
            <span class="info-value">{{ formatBounds(selectionBounds) }}</span>
          </div>
        </div>
      </div>

      <!-- Selection History -->
      <div class="tool-section">
        <div class="section-header">
          <h4>History</h4>
        </div>
        <div class="selection-history">
          <button
            class="action-btn"
            @click="undoSelection"
            :disabled="!canUndoSelection"
            title="Undo Selection"
          >
            <i class="icon-undo"></i>
            <span>Undo</span>
          </button>

          <button
            class="action-btn"
            @click="redoSelection"
            :disabled="!canRedoSelection"
            title="Redo Selection"
          >
            <i class="icon-redo"></i>
            <span>Redo</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApplicationStore } from '@/stores/application'

export default {
  name: 'SelectionTools',
  setup() {
    const appStore = useApplicationStore()

    // Component state
    const isCollapsed = ref(false)
    const currentMode = ref('single')

    // Selection modes
    const selectionModes = [
      {
        id: 'single',
        name: 'Single',
        icon: 'icon-select',
        description: 'Select one object at a time'
      },
      {
        id: 'multi',
        name: 'Multi',
        icon: 'icon-select-multi',
        description: 'Select multiple objects with Ctrl+click'
      },
      {
        id: 'box',
        name: 'Box',
        icon: 'icon-select-box',
        description: 'Drag to select multiple objects'
      }
    ]

    // Available object types for selection
    const availableTypes = [
      { id: 'box', name: 'Box', icon: 'icon-box' },
      { id: 'sphere', name: 'Sphere', icon: 'icon-sphere' },
      { id: 'cylinder', name: 'Cylinder', icon: 'icon-cylinder' },
      { id: 'plane', name: 'Plane', icon: 'icon-plane' },
      { id: 'cone', name: 'Cone', icon: 'icon-cone' },
      { id: 'torus', name: 'Torus', icon: 'icon-torus' },
      { id: 'line', name: 'Line', icon: 'icon-line' },
      { id: 'circle', name: 'Circle', icon: 'icon-circle' }
    ]

    // Available filters
    const availableFilters = ref([
      { id: 'visible', name: 'Visible Only', enabled: true },
      { id: 'unlocked', name: 'Unlocked Only', enabled: true },
      { id: 'geometry', name: 'Has Geometry', enabled: true },
      { id: 'activeLayer', name: 'Active Layer', enabled: false }
    ])

    // Computed properties
    const hasObjects = computed(() => {
      return appStore.activeDocument?.nodes?.length > 0
    })

    const hasSelection = computed(() => {
      return appStore.selectedCount > 0
    })

    const selectionCount = computed(() => {
      return appStore.selectedCount || 0
    })

    const selectedTypes = computed(() => {
      const selection = appStore.selection
      if (!selection) return []

      const info = selection.getInfo()
      return info ? info.types : []
    })

    const selectionBounds = computed(() => {
      const selection = appStore.selection
      if (!selection) return null

      const info = selection.getInfo()
      return info ? info.bounds : null
    })

    const canUndoSelection = computed(() => {
      const selection = appStore.selection
      return selection && selection.manager && selection.manager.historyIndex > 0
    })

    const canRedoSelection = computed(() => {
      const selection = appStore.selection
      if (!selection || !selection.manager) return false

      const manager = selection.manager
      return manager.historyIndex < manager.selectionHistory.length - 1
    })

    // Methods
    const toggleCollapsed = () => {
      isCollapsed.value = !isCollapsed.value
    }

    const setSelectionMode = (mode) => {
      currentMode.value = mode

      // Update selection manager mode if available
      const selection = appStore.selection
      if (selection && selection.manager) {
        selection.manager.selectionMode = mode
      }
    }

    const selectAll = () => {
      if (appStore.selection) {
        appStore.selection.selectAll()
      }
    }

    const clearSelection = () => {
      if (appStore.selection) {
        appStore.selection.clear()
      }
    }

    const invertSelection = () => {
      if (appStore.selection) {
        appStore.selection.invert()
      }
    }

    const selectByType = (type) => {
      if (appStore.selection) {
        appStore.selection.selectByType(type)
      }
    }

    const toggleFilter = (filterId, enabled) => {
      const filter = availableFilters.value.find(f => f.id === filterId)
      if (filter) {
        filter.enabled = enabled

        // Update selection manager filter
        const selection = appStore.selection
        if (selection && selection.manager) {
          if (enabled) {
            selection.manager.enableFilter(filterId)
          } else {
            selection.manager.disableFilter(filterId)
          }
        }
      }
    }

    const undoSelection = () => {
      const selection = appStore.selection
      if (selection && selection.undo) {
        selection.undo()
      }
    }

    const redoSelection = () => {
      const selection = appStore.selection
      if (selection && selection.redo) {
        selection.redo()
      }
    }

    const formatBounds = (bounds) => {
      if (!bounds) return 'None'

      const size = bounds.getSize(new THREE.Vector3())
      return `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)}`
    }

    // Keyboard shortcuts
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'a':
            event.preventDefault()
            selectAll()
            break
          case 'd':
            event.preventDefault()
            clearSelection()
            break
          case 'i':
            event.preventDefault()
            invertSelection()
            break
        }
      }
    }

    // Lifecycle
    onMounted(() => {
      document.addEventListener('keydown', handleKeyDown)

      // Initialize filters in selection manager
      const selection = appStore.selection
      if (selection && selection.manager) {
        availableFilters.value.forEach(filter => {
          if (filter.enabled) {
            selection.manager.enableFilter(filter.id)
          }
        })
      }
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown)
    })

    return {
      isCollapsed,
      currentMode,
      selectionModes,
      availableTypes,
      availableFilters,
      hasObjects,
      hasSelection,
      selectionCount,
      selectedTypes,
      selectionBounds,
      canUndoSelection,
      canRedoSelection,
      toggleCollapsed,
      setSelectionMode,
      selectAll,
      clearSelection,
      invertSelection,
      selectByType,
      toggleFilter,
      undoSelection,
      redoSelection,
      formatBounds
    }
  }
}
</script>

<style scoped>
.selection-tools {
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.selection-tools-header {
  background: var(--header-bg);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}

.selection-tools-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 2px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.action-btn:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selection-tools-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tool-section {
  margin-bottom: 16px;
}

.tool-section:last-child {
  margin-bottom: 0;
}

.section-header {
  margin-bottom: 8px;
}

.section-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selection-modes {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-btn {
  background: var(--surface-light);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  text-align: left;
}

.mode-btn:hover {
  background: var(--hover-bg);
  border-color: var(--primary);
}

.mode-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.selection-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
}

.type-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.type-btn {
  background: var(--surface-light);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.type-btn:hover {
  background: var(--hover-bg);
  border-color: var(--primary);
}

.selection-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary);
}

.filter-checkbox input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-radius: 2px;
  position: relative;
  transition: all 0.2s;
}

.filter-checkbox input[type="checkbox"]:checked + .checkmark {
  background: var(--primary);
  border-color: var(--primary);
}

.filter-checkbox input[type="checkbox"]:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: -2px;
  left: 2px;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.selection-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.info-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.info-value {
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.selection-history {
  display: flex;
  gap: 4px;
}

.selection-history .action-btn {
  flex: 1;
  justify-content: center;
}

/* Icon styles */
.icon-select::before { content: '👆'; }
.icon-select-multi::before { content: '👆'; }
.icon-select-box::before { content: '⬚'; }
.icon-select-all::before { content: '☑'; }
.icon-deselect::before { content: '☐'; }
.icon-invert::before { content: '🔄'; }
.icon-undo::before { content: '↶'; }
.icon-redo::before { content: '↷'; }
.icon-expand::before { content: '▶'; }
.icon-collapse::before { content: '▼'; }

/* Scrollbar styling */
.selection-tools-content::-webkit-scrollbar {
  width: 6px;
}

.selection-tools-content::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

.selection-tools-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.selection-tools-content::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>

