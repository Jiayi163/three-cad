<template>
  <div 
    class="resizable-panel" 
    :class="{ 
      collapsed: isCollapsed,
      floating: isFloating,
      [`side-${side}`]: true 
    }"
    :style="panelStyle"
  >
    <!-- Drag resize handle -->
    <div 
      v-if="resizable && !isCollapsed"
      class="resize-handle"
      :class="`resize-${side}`"
      @mousedown="startResize"
    ></div>

    <!-- Panel header -->
    <div class="panel-header" @dblclick="toggleCollapse">
      <div class="panel-title">
        <span v-if="icon" class="panel-icon">{{ icon }}</span>
        <span class="title-text">{{ title }}</span>
        <span v-if="badge" class="panel-badge">{{ badge }}</span>
      </div>
      
      <div class="panel-actions">
        <button
          v-if="collapsible"
          class="action-button"
          :title="isCollapsed ? 'Expand' : 'Collapse'"
          @click="toggleCollapse"
        >
          {{ isCollapsed ? '▶' : '▼' }}
        </button>
        
        <button
          v-if="floatable"
          class="action-button"
          :title="isFloating ? 'Dock' : 'Float'"
          @click="toggleFloat"
        >
          {{ isFloating ? '📌' : '🪟' }}
        </button>
        
        <button
          v-if="closable"
          class="action-button close-button"
          title="Close"
          @click="handleClose"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Panel content -->
    <div v-if="!isCollapsed" class="panel-content" :class="{ scrollable }">
      <slot></slot>
    </div>

    <!-- Panel footer (optional) -->
    <div v-if="!isCollapsed && $slots.footer" class="panel-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export default {
  name: 'ResizablePanel',
  props: {
    title: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: null
    },
    badge: {
      type: [String, Number],
      default: null
    },
    side: {
      type: String,
      default: 'left', // 'left' | 'right' | 'top' | 'bottom'
      validator: (value) => ['left', 'right', 'top', 'bottom'].includes(value)
    },
    width: {
      type: Number,
      default: 300
    },
    height: {
      type: Number,
      default: 200
    },
    minWidth: {
      type: Number,
      default: 150
    },
    maxWidth: {
      type: Number,
      default: 600
    },
    minHeight: {
      type: Number,
      default: 100
    },
    maxHeight: {
      type: Number,
      default: 800
    },
    resizable: {
      type: Boolean,
      default: true
    },
    collapsible: {
      type: Boolean,
      default: true
    },
    collapsed: {
      type: Boolean,
      default: false
    },
    closable: {
      type: Boolean,
      default: true
    },
    floatable: {
      type: Boolean,
      default: true
    },
    floating: {
      type: Boolean,
      default: false
    },
    scrollable: {
      type: Boolean,
      default: true
    }
  },
  emits: ['resize', 'collapse', 'expand', 'close', 'float', 'dock'],
  setup(props, { emit }) {
    const currentWidth = ref(props.width)
    const currentHeight = ref(props.height)
    const isCollapsed = ref(props.collapsed)
    const isFloating = ref(props.floating)
    const isResizing = ref(false)

    // Panel style calculation
    const panelStyle = computed(() => {
      const style = {}
      
      if (props.side === 'left' || props.side === 'right') {
        style.width = isCollapsed.value ? '32px' : `${currentWidth.value}px`
        if (isFloating.value) {
          style.height = `${currentHeight.value}px`
        }
      } else {
        style.height = isCollapsed.value ? '32px' : `${currentHeight.value}px`
        if (isFloating.value) {
          style.width = `${currentWidth.value}px`
        }
      }
      
      return style
    })

    // Start resizing
    const startResize = (event) => {
      if (!props.resizable || isCollapsed.value) return
      
      event.preventDefault()
      isResizing.value = true
      
      const startX = event.clientX
      const startY = event.clientY
      const startWidth = currentWidth.value
      const startHeight = currentHeight.value
      
      const handleMouseMove = (e) => {
        if (!isResizing.value) return
        
        const deltaX = e.clientX - startX
        const deltaY = e.clientY - startY
        
        if (props.side === 'left' || props.side === 'right') {
          const multiplier = props.side === 'left' ? 1 : -1
          let newWidth = startWidth + (deltaX * multiplier)
          newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth))
          currentWidth.value = newWidth
          emit('resize', { width: newWidth, height: currentHeight.value })
        } else {
          const multiplier = props.side === 'top' ? 1 : -1
          let newHeight = startHeight + (deltaY * multiplier)
          newHeight = Math.max(props.minHeight, Math.min(props.maxHeight, newHeight))
          currentHeight.value = newHeight
          emit('resize', { width: currentWidth.value, height: newHeight })
        }
      }
      
      const handleMouseUp = () => {
        isResizing.value = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = getResizeCursor()
      document.body.style.userSelect = 'none'
    }

    const getResizeCursor = () => {
      switch (props.side) {
        case 'left':
        case 'right':
          return 'col-resize'
        case 'top':
        case 'bottom':
          return 'row-resize'
        default:
          return 'default'
      }
    }

    // Toggle collapse state
    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value
      if (isCollapsed.value) {
        emit('collapse')
      } else {
        emit('expand')
      }
    }

    // Toggle floating state
    const toggleFloat = () => {
      isFloating.value = !isFloating.value
      if (isFloating.value) {
        emit('float')
      } else {
        emit('dock')
      }
    }

    // Close panel
    const handleClose = () => {
      emit('close')
    }

    // Watch property changes
    watch(() => props.collapsed, (newVal) => {
      isCollapsed.value = newVal
    })

    watch(() => props.floating, (newVal) => {
      isFloating.value = newVal
    })

    watch(() => props.width, (newVal) => {
      currentWidth.value = newVal
    })

    watch(() => props.height, (newVal) => {
      currentHeight.value = newVal
    })

    return {
      currentWidth,
      currentHeight,
      isCollapsed,
      isFloating,
      isResizing,
      panelStyle,
      startResize,
      toggleCollapse,
      toggleFloat,
      handleClose
    }
  }
}
</script>

<style scoped>
.resizable-panel {
  display: flex;
  flex-direction: column;
  background-color: #252526;
  border: 1px solid #3e3e42;
  position: relative;
  transition: all 0.2s ease;
  min-height: 32px;
}

.resizable-panel.collapsed {
  overflow: hidden;
}

.resizable-panel.floating {
  position: absolute;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.resizable-panel.side-left {
  border-left: none;
}

.resizable-panel.side-right {
  border-right: none;
}

.resizable-panel.side-top {
  border-top: none;
}

.resizable-panel.side-bottom {
  border-bottom: none;
}

.resize-handle {
  position: absolute;
  background-color: transparent;
  transition: background-color 0.2s;
  z-index: 10;
}

.resize-handle:hover {
  background-color: #007acc;
}

.resize-left {
  left: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
}

.resize-right {
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
}

.resize-top {
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  cursor: row-resize;
}

.resize-bottom {
  bottom: -2px;
  left: 0;
  right: 0;
  height: 4px;
  cursor: row-resize;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  cursor: default;
  user-select: none;
}

.collapsed .panel-header {
  border-bottom: none;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #cccccc;
  flex: 1;
  min-width: 0;
}

.panel-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-badge {
  background-color: #007acc;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.panel-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}

.action-button {
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #3e3e42;
  color: #ffffff;
}

.close-button:hover {
  background-color: #dc3545;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-content.scrollable {
  overflow-y: auto;
}

.panel-footer {
  border-top: 1px solid #3e3e42;
  padding: 8px 12px;
  background-color: #2d2d30;
  font-size: 12px;
}

/* Scrollbar styles */
.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #3e3e42;
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #007acc;
}

/* Animation effects */
.resizable-panel {
  transition: width 0.2s ease, height 0.2s ease;
}

.collapsed .panel-content {
  animation: collapseContent 0.2s ease-out forwards;
}

@keyframes collapseContent {
  from {
    opacity: 1;
    transform: scaleY(1);
  }
  to {
    opacity: 0;
    transform: scaleY(0);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .resizable-panel {
    min-width: 200px;
  }
  
  .panel-header {
    padding: 0 8px;
  }
  
  .title-text {
    font-size: 11px;
  }
}
</style>

