<template>
  <div class="toolbar" :class="{ vertical: orientation === 'vertical' }">
    <div v-for="group in toolGroups" :key="group.id" class="tool-group">
      <div v-if="group.label && showLabels" class="group-label">{{ group.label }}</div>
      <template v-for="tool in group.tools" :key="tool.id">
        <div v-if="tool.type === 'divider'" class="tool-divider"></div>
        <button
          v-else
          class="tool-button"
          :class="{
            active: activeTool === tool.id,
            disabled: tool.disabled,
            toggle: tool.toggle && tool.toggled
          }"
          :title="tool.tooltip"
          :disabled="tool.disabled"
          @click="handleToolClick(tool)"
        >
          <span v-if="tool.icon" class="tool-icon">{{ tool.icon }}</span>
          <span v-if="tool.text && showText" class="tool-text">{{ tool.text }}</span>
          <span v-if="tool.badge" class="tool-badge">{{ tool.badge }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'Toolbar',
  props: {
    tools: {
      type: Array,
      default: () => []
    },
    activeTool: {
      type: String,
      default: null
    },
    orientation: {
      type: String,
      default: 'horizontal', // 'horizontal' | 'vertical'
      validator: (value) => ['horizontal', 'vertical'].includes(value)
    },
    showLabels: {
      type: Boolean,
      default: false
    },
    showText: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      default: 'medium', // 'small' | 'medium' | 'large'
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    }
  },
  emits: ['tool-click', 'tool-toggle'],
  setup(props, { emit }) {
    // Organize tools by groups
    const toolGroups = computed(() => {
      if (!props.tools.length) {
        return getDefaultToolGroups()
      }

      // If tools are already grouped, use directly
      if (props.tools[0].tools) {
        return props.tools
      }

      // Otherwise, put all tools in a default group
      return [{
        id: 'default',
        label: '',
        tools: props.tools
      }]
    })

    const handleToolClick = (tool) => {
      if (tool.disabled) return

      if (tool.toggle) {
        tool.toggled = !tool.toggled
        emit('tool-toggle', tool.id, tool.toggled)
      } else {
        emit('tool-click', tool.id, tool)
      }
    }

    // Default tool group configuration
    const getDefaultToolGroups = () => [
      {
        id: 'file',
        label: 'File',
        tools: [
          { id: 'new', icon: '📄', text: 'New', tooltip: 'New Document' },
          { id: 'open', icon: '📁', text: 'Open', tooltip: 'Open Document' },
          { id: 'save', icon: '💾', text: 'Save', tooltip: 'Save Document' }
        ]
      },
      {
        id: 'edit',
        label: 'Edit',
        tools: [
          { id: 'undo', icon: '↶', text: 'Undo', tooltip: 'Undo' },
          { id: 'redo', icon: '↷', text: 'Redo', tooltip: 'Redo' }
        ]
      },
      {
        id: 'selection',
        label: 'Selection',
        tools: [
          { id: 'select', icon: '🔍', text: 'Select', tooltip: 'Select Tool' },
          { id: 'move', icon: '✋', text: 'Move', tooltip: 'Move Tool' },
          { id: 'rotate', icon: '🔄', text: 'Rotate', tooltip: 'Rotate Tool' },
          { id: 'scale', icon: '⚖️', text: 'Scale', tooltip: 'Scale Tool' }
        ]
      },
      {
        id: 'geometry',
        label: 'Geometry',
        tools: [
          { id: 'box', icon: '⬜', text: 'Box', tooltip: 'Create Box' },
          { id: 'sphere', icon: '⚪', text: 'Sphere', tooltip: 'Create Sphere' },
          { id: 'cylinder', icon: '🥫', text: 'Cylinder', tooltip: 'Create Cylinder' },
          { id: 'plane', icon: '▫️', text: 'Plane', tooltip: 'Create Plane' }
        ]
      }
    ]

    return {
      toolGroups,
      handleToolClick
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.toolbar.vertical {
  flex-direction: column;
  width: fit-content;
  height: 100%;
  border-bottom: none;
  border-right: 1px solid #3e3e42;
}

.tool-group {
  display: flex;
  gap: 2px;
  align-items: center;
  padding: 0 4px;
  position: relative;
}

.toolbar.vertical .tool-group {
  flex-direction: column;
  width: 100%;
  padding: 4px 0;
}

.group-label {
  font-size: 11px;
  color: #cccccc;
  margin-bottom: 4px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tool-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid transparent;
  color: #ffffff;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  font-size: 14px;
  position: relative;
  gap: 4px;
  min-width: 32px;
}

.tool-button:hover:not(.disabled) {
  background-color: #3e3e42;
  border-color: #007acc;
}

.tool-button.active {
  background-color: #007acc;
  border-color: #007acc;
}

.tool-button.toggle {
  background-color: #28a745;
  border-color: #28a745;
}

.tool-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 14px;
  line-height: 1;
}

.tool-text {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.tool-button:has(.tool-text) {
  width: auto;
  padding: 0 8px;
  min-width: 60px;
}

.tool-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #dc3545;
  color: white;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 8px;
  min-width: 12px;
  text-align: center;
  line-height: 12px;
}

.tool-divider {
  width: 1px;
  height: 24px;
  background-color: #3e3e42;
  margin: 0 4px;
}

.toolbar.vertical .tool-divider {
  width: 24px;
  height: 1px;
  margin: 4px 0;
}

/* Size variations */
.toolbar.small .tool-button {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.toolbar.small .tool-button:has(.tool-text) {
  min-width: 50px;
  padding: 0 6px;
}

.toolbar.large .tool-button {
  width: 40px;
  height: 40px;
  font-size: 16px;
}

.toolbar.large .tool-button:has(.tool-text) {
  min-width: 80px;
  padding: 0 12px;
}

/* Responsive behavior */
@media (max-width: 768px) {
  .tool-text {
    display: none;
  }

  .tool-button:has(.tool-text) {
    width: 32px;
    min-width: 32px;
    padding: 0;
  }
}

/* Focus styles for accessibility */
.tool-button:focus-visible {
  outline: 2px solid #007acc;
  outline-offset: 1px;
}

/* Animation for toggle state */
.tool-button.toggle {
  animation: togglePulse 0.3s ease-in-out;
}

@keyframes togglePulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>

