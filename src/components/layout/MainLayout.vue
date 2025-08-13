<template>
  <div class="main-layout">
    <!-- 顶部菜单栏 -->
    <div class="menu-bar">
      <div class="menu-bar-left">
        <div class="app-logo">
          <span class="logo-icon">📐</span>
          <span class="app-name">CAD Studio</span>
        </div>
        <nav class="main-menu">
          <div class="menu-item" @click="activeMenu = activeMenu === 'file' ? null : 'file'">
            File
            <div v-if="activeMenu === 'file'" class="dropdown-menu">
              <div class="menu-option" @click="handleMenuAction('new')">New Document</div>
              <div class="menu-option" @click="handleMenuAction('open')">Open...</div>
              <div class="menu-option" @click="handleMenuAction('save')">Save</div>
              <div class="menu-option" @click="handleMenuAction('save-as')">Save As...</div>
              <div class="menu-divider"></div>
              <div class="menu-option" @click="handleMenuAction('export')">Export...</div>
            </div>
          </div>
          <div class="menu-item" @click="activeMenu = activeMenu === 'edit' ? null : 'edit'">
            Edit
            <div v-if="activeMenu === 'edit'" class="dropdown-menu">
              <div class="menu-option" @click="handleMenuAction('undo')">Undo</div>
              <div class="menu-option" @click="handleMenuAction('redo')">Redo</div>
              <div class="menu-divider"></div>
              <div class="menu-option" @click="handleMenuAction('copy')">Copy</div>
              <div class="menu-option" @click="handleMenuAction('paste')">Paste</div>
              <div class="menu-option" @click="handleMenuAction('delete')">Delete</div>
            </div>
          </div>
          <div class="menu-item" @click="activeMenu = activeMenu === 'view' ? null : 'view'">
            View
            <div v-if="activeMenu === 'view'" class="dropdown-menu">
              <div class="menu-option" @click="handleMenuAction('zoom-fit')">Zoom to Fit</div>
              <div class="menu-option" @click="handleMenuAction('zoom-selection')">Zoom to Selection</div>
              <div class="menu-divider"></div>
              <div class="menu-option" @click="togglePanel('properties')">Properties Panel</div>
              <div class="menu-option" @click="togglePanel('hierarchy')">Object Hierarchy</div>
              <div class="menu-option" @click="togglePanel('tools')">Tool Palette</div>
            </div>
          </div>
          <div class="menu-item" @click="activeMenu = activeMenu === 'create' ? null : 'create'">
            Create
            <div v-if="activeMenu === 'create'" class="dropdown-menu">
              <div class="menu-option" @click="handleMenuAction('create-box')">Box</div>
              <div class="menu-option" @click="handleMenuAction('create-sphere')">Sphere</div>
              <div class="menu-option" @click="handleMenuAction('create-cylinder')">Cylinder</div>
              <div class="menu-option" @click="handleMenuAction('create-plane')">Plane</div>
            </div>
          </div>
        </nav>
      </div>
      <div class="menu-bar-right">
        <div class="status-info">
          <span class="status-indicator" :class="{ active: appStore.isReady }"></span>
          <span class="status-text">{{ appStore.isReady ? 'Ready' : 'Loading...' }}</span>
        </div>
      </div>
    </div>

    <!-- 主工具栏 -->
    <div class="main-toolbar">
      <div class="toolbar-section">
        <div class="tool-group">
          <button class="tool-button" @click="handleMenuAction('new')" title="New Document">
            📄
          </button>
          <button class="tool-button" @click="handleMenuAction('open')" title="Open Document">
            📁
          </button>
          <button class="tool-button" @click="handleMenuAction('save')" title="Save Document">
            💾
          </button>
        </div>
        
        <div class="toolbar-divider"></div>
        
        <div class="tool-group">
          <button 
            class="tool-button" 
            :disabled="!canUndo" 
            @click="handleMenuAction('undo')" 
            title="Undo"
          >
            ↶
          </button>
          <button 
            class="tool-button" 
            :disabled="!canRedo" 
            @click="handleMenuAction('redo')" 
            title="Redo"
          >
            ↷
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="tool-group">
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'select' }"
            @click="setActiveTool('select')" 
            title="Select Tool"
          >
            🔍
          </button>
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'move' }"
            @click="setActiveTool('move')" 
            title="Move Tool"
          >
            ✋
          </button>
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'rotate' }"
            @click="setActiveTool('rotate')" 
            title="Rotate Tool"
          >
            🔄
          </button>
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'scale' }"
            @click="setActiveTool('scale')" 
            title="Scale Tool"
          >
            ⚖️
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="tool-group">
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'box' }"
            @click="setActiveTool('box')" 
            title="Create Box"
          >
            ⬜
          </button>
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'sphere' }"
            @click="setActiveTool('sphere')" 
            title="Create Sphere"
          >
            ⚪
          </button>
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'cylinder' }"
            @click="setActiveTool('cylinder')" 
            title="Create Cylinder"
          >
            🥫
          </button>
          <button 
            class="tool-button" 
            :class="{ active: activeTool === 'plane' }"
            @click="setActiveTool('plane')" 
            title="Create Plane"
          >
            ▫️
          </button>
        </div>
      </div>

      <div class="toolbar-section toolbar-right">
        <div class="view-controls">
          <button class="tool-button" @click="handleMenuAction('zoom-fit')" title="Zoom to Fit">
            🔍
          </button>
          <button class="tool-button" @click="handleMenuAction('view-front')" title="Front View">
            F
          </button>
          <button class="tool-button" @click="handleMenuAction('view-top')" title="Top View">
            T
          </button>
          <button class="tool-button" @click="handleMenuAction('view-iso')" title="Isometric View">
            I
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧面板 -->
      <div 
        v-if="panels.left.visible" 
        class="side-panel left-panel"
        :style="{ width: panels.left.width + 'px' }"
      >
        <div class="panel-header">
          <span class="panel-title">{{ panels.left.title }}</span>
          <button class="panel-close" @click="panels.left.visible = false">×</button>
        </div>
        <div class="panel-content">
          <component :is="panels.left.component" v-if="panels.left.component" />
          <div v-else class="panel-placeholder">
            <p>{{ panels.left.title }} Panel</p>
            <p class="placeholder-text">Content will be implemented in Phase 4.2</p>
          </div>
        </div>
        <div 
          class="panel-resizer right" 
          @mousedown="startResize('left', $event)"
        ></div>
      </div>

      <!-- 中央视口区域 -->
      <div class="viewport-area">
        <div class="viewport-header">
          <div class="viewport-tabs">
            <div class="viewport-tab active">
              <span>3D View</span>
            </div>
          </div>
          <div class="viewport-controls">
            <button class="control-button" @click="toggleWireframe" title="Toggle Wireframe">
              🔲
            </button>
            <button class="control-button" @click="toggleGrid" title="Toggle Grid">
              ⚏
            </button>
            <button class="control-button" @click="toggleAxes" title="Toggle Axes">
              ⚹
            </button>
          </div>
        </div>
        <div class="viewport-content">
          <slot name="viewport">
            <!-- ThreeScene component will be placed here -->
          </slot>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div 
        v-if="panels.right.visible" 
        class="side-panel right-panel"
        :style="{ width: panels.right.width + 'px' }"
      >
        <div 
          class="panel-resizer left" 
          @mousedown="startResize('right', $event)"
        ></div>
        <div class="panel-header">
          <span class="panel-title">{{ panels.right.title }}</span>
          <button class="panel-close" @click="panels.right.visible = false">×</button>
        </div>
        <div class="panel-content">
          <component :is="panels.right.component" v-if="panels.right.component" />
          <div v-else class="panel-placeholder">
            <p>{{ panels.right.title }} Panel</p>
            <p class="placeholder-text">Content will be implemented in Phase 4.2</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span class="status-item">
          <strong>{{ documentName }}</strong>
          <span v-if="hasUnsavedChanges" class="unsaved-indicator">*</span>
        </span>
        <span class="status-item">
          Objects: {{ objectCount }}
        </span>
        <span class="status-item">
          Selected: {{ selectedCount }}
        </span>
      </div>
      <div class="status-center">
        <span class="status-item" v-if="activeTool">
          Tool: {{ activeTool.toUpperCase() }}
        </span>
        <span class="status-item" v-if="currentOperation">
          {{ currentOperation }}
        </span>
      </div>
      <div class="status-right">
        <span class="status-item">
          Cursor: {{ cursorPosition }}
        </span>
        <span class="status-item">
          Zoom: {{ zoomLevel }}%
        </span>
        <span class="status-item" :class="{ error: !appStore.isReady }">
          {{ appStore.isReady ? 'Ready' : 'Not Ready' }}
        </span>
      </div>
    </div>

    <!-- 右键上下文菜单 -->
    <div 
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ 
        left: contextMenu.x + 'px', 
        top: contextMenu.y + 'px' 
      }"
      @click.stop
    >
      <div class="menu-option" @click="handleMenuAction('copy')">Copy</div>
      <div class="menu-option" @click="handleMenuAction('paste')">Paste</div>
      <div class="menu-option" @click="handleMenuAction('delete')">Delete</div>
      <div class="menu-divider"></div>
      <div class="menu-option" @click="handleMenuAction('properties')">Properties</div>
    </div>

    <!-- 点击遮罩层 - 关闭下拉菜单和上下文菜单 -->
    <div 
      v-if="activeMenu || contextMenu.visible"
      class="menu-overlay"
      @click="closeAllMenus"
    ></div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApplicationStore } from '@/stores/application'

export default {
  name: 'MainLayout',
  emits: [
    'menu-action',
    'tool-change', 
    'panel-toggle',
    'viewport-action'
  ],
  setup(props, { emit }) {
    const appStore = useApplicationStore()

    // UI状态
    const activeMenu = ref(null)
    const activeTool = ref('select')
    const currentOperation = ref('')
    
    // 面板状态
    const panels = ref({
      left: {
        visible: true,
        width: 250,
        title: 'Tool Palette',
        component: null
      },
      right: {
        visible: true,
        width: 300,
        title: 'Properties',
        component: null
      }
    })

    // 上下文菜单
    const contextMenu = ref({
      visible: false,
      x: 0,
      y: 0
    })

    // 视口状态
    const cursorPosition = ref('0, 0, 0')
    const zoomLevel = ref(100)

    // 计算属性
    const documentName = computed(() => {
      return appStore.activeDocument?.name || 'Untitled'
    })

    const hasUnsavedChanges = computed(() => {
      return appStore.activeDocument?.hasUnsavedChanges || false
    })

    const objectCount = computed(() => {
      return appStore.activeDocument?.getAllNodes()?.filter(node => node.type !== 'root').length || 0
    })

    const selectedCount = computed(() => {
      return appStore.activeDocument?.selectedNodes?.length || 0
    })

    const canUndo = computed(() => {
      return appStore.activeDocument?.history?.canUndo || false
    })

    const canRedo = computed(() => {
      return appStore.activeDocument?.history?.canRedo || false
    })

    // 方法
    const handleMenuAction = (action) => {
      console.log('Menu action:', action)
      closeAllMenus()
      
      // 处理内置操作
      switch (action) {
        case 'undo':
          if (appStore.activeDocument?.history?.canUndo) {
            appStore.activeDocument.history.undo()
          }
          break
        case 'redo':
          if (appStore.activeDocument?.history?.canRedo) {
            appStore.activeDocument.history.redo()
          }
          break
        case 'new':
          appStore.createNewDocument('Untitled')
          break
        case 'create-box':
          setActiveTool('box')
          break
        case 'create-sphere':
          setActiveTool('sphere')
          break
        case 'create-cylinder':
          setActiveTool('cylinder')
          break
        case 'create-plane':
          setActiveTool('plane')
          break
        default:
          // 发射事件让父组件处理
          emit('menu-action', action)
          break
      }
    }

    const setActiveTool = (tool) => {
      activeTool.value = tool
      currentOperation.value = `${tool} tool active`
      emit('tool-change', tool)
    }

    const togglePanel = (panel) => {
      if (panel === 'properties') {
        panels.value.right.visible = !panels.value.right.visible
        panels.value.right.title = 'Properties'
      } else if (panel === 'hierarchy') {
        panels.value.right.visible = !panels.value.right.visible
        panels.value.right.title = 'Object Hierarchy'
      } else if (panel === 'tools') {
        panels.value.left.visible = !panels.value.left.visible
        panels.value.left.title = 'Tool Palette'
      }
      emit('panel-toggle', panel)
    }

    const toggleWireframe = () => {
      emit('viewport-action', 'toggle-wireframe')
    }

    const toggleGrid = () => {
      emit('viewport-action', 'toggle-grid')
    }

    const toggleAxes = () => {
      emit('viewport-action', 'toggle-axes')
    }

    const closeAllMenus = () => {
      activeMenu.value = null
      contextMenu.value.visible = false
    }

    // 面板调整大小
    const startResize = (panel, event) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = panels.value[panel].width

      const doResize = (e) => {
        const deltaX = e.clientX - startX
        let newWidth = startWidth + (panel === 'left' ? deltaX : -deltaX)
        newWidth = Math.max(200, Math.min(500, newWidth))
        panels.value[panel].width = newWidth
      }

      const stopResize = () => {
        document.removeEventListener('mousemove', doResize)
        document.removeEventListener('mouseup', stopResize)
      }

      document.addEventListener('mousemove', doResize)
      document.addEventListener('mouseup', stopResize)
    }

    // 右键菜单
    const showContextMenu = (event) => {
      event.preventDefault()
      contextMenu.value = {
        visible: true,
        x: event.clientX,
        y: event.clientY
      }
    }

    const hideContextMenu = () => {
      contextMenu.value.visible = false
    }

    // 键盘快捷键
    const handleKeydown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'n':
            event.preventDefault()
            handleMenuAction('new')
            break
          case 'o':
            event.preventDefault()
            handleMenuAction('open')
            break
          case 's':
            event.preventDefault()
            handleMenuAction('save')
            break
          case 'z':
            event.preventDefault()
            if (event.shiftKey) {
              handleMenuAction('redo')
            } else {
              handleMenuAction('undo')
            }
            break
          case 'c':
            event.preventDefault()
            handleMenuAction('copy')
            break
          case 'v':
            event.preventDefault()
            handleMenuAction('paste')
            break
        }
      }
      
      // ESC 键关闭菜单
      if (event.key === 'Escape') {
        closeAllMenus()
      }
    }

    // 生命周期
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
      document.addEventListener('contextmenu', showContextMenu)
      document.addEventListener('click', hideContextMenu)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('contextmenu', showContextMenu)
      document.removeEventListener('click', hideContextMenu)
    })

    return {
      // Store
      appStore,
      
      // UI状态
      activeMenu,
      activeTool,
      currentOperation,
      panels,
      contextMenu,
      cursorPosition,
      zoomLevel,
      
      // 计算属性
      documentName,
      hasUnsavedChanges,
      objectCount,
      selectedCount,
      canUndo,
      canRedo,
      
      // 方法
      handleMenuAction,
      setActiveTool,
      togglePanel,
      toggleWireframe,
      toggleGrid,
      toggleAxes,
      closeAllMenus,
      startResize
    }
  }
}
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1e1e1e;
  color: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 14px;
  overflow: hidden;
}

/* 菜单栏样式 */
.menu-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  padding: 0 12px;
}

.menu-bar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.logo-icon {
  font-size: 16px;
}

.app-name {
  color: #ffffff;
}

.main-menu {
  display: flex;
  gap: 0;
}

.menu-item {
  position: relative;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #3e3e42;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px;
  background-color: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  padding: 4px 0;
}

.menu-option {
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-option:hover {
  background-color: #3e3e42;
}

.menu-divider {
  height: 1px;
  background-color: #3e3e42;
  margin: 4px 0;
}

.menu-bar-right {
  display: flex;
  align-items: center;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #dc3545;
  transition: background-color 0.3s;
}

.status-indicator.active {
  background-color: #28a745;
}

/* 工具栏样式 */
.main-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 42px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  padding: 0 12px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  margin-left: auto;
}

.tool-group {
  display: flex;
  gap: 2px;
  padding: 0 4px;
}

.tool-button {
  width: 32px;
  height: 32px;
  background: none;
  border: 1px solid transparent;
  color: #ffffff;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.tool-button:hover:not(:disabled) {
  background-color: #3e3e42;
  border-color: #007acc;
}

.tool-button.active {
  background-color: #007acc;
  border-color: #007acc;
}

.tool-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #3e3e42;
  margin: 0 4px;
}

.view-controls {
  display: flex;
  gap: 2px;
}

/* 主内容区域样式 */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.side-panel {
  background-color: #252526;
  border-right: 1px solid #3e3e42;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 200px;
  max-width: 500px;
}

.right-panel {
  border-left: 1px solid #3e3e42;
  border-right: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  font-weight: 600;
  font-size: 12px;
}

.panel-title {
  color: #cccccc;
}

.panel-close {
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  font-size: 16px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.panel-close:hover {
  background-color: #3e3e42;
}

.panel-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.panel-placeholder {
  text-align: center;
  color: #cccccc;
  padding: 40px 20px;
}

.placeholder-text {
  color: #888888;
  font-size: 12px;
  margin-top: 8px;
}

.panel-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s;
}

.panel-resizer:hover {
  background-color: #007acc;
}

.panel-resizer.right {
  right: -2px;
}

.panel-resizer.left {
  left: -2px;
}

/* 视口区域样式 */
.viewport-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewport-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 32px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  padding: 0 12px;
}

.viewport-tabs {
  display: flex;
}

.viewport-tab {
  padding: 6px 12px;
  background-color: #3e3e42;
  border-radius: 3px 3px 0 0;
  font-size: 12px;
  cursor: pointer;
}

.viewport-tab.active {
  background-color: #1e1e1e;
  color: #ffffff;
}

.viewport-controls {
  display: flex;
  gap: 4px;
}

.control-button {
  width: 24px;
  height: 24px;
  background: none;
  border: 1px solid transparent;
  color: #cccccc;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.control-button:hover {
  background-color: #3e3e42;
  border-color: #007acc;
}

.viewport-content {
  flex: 1;
  background-color: #1e1e1e;
  position: relative;
  overflow: hidden;
}

/* 状态栏样式 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 24px;
  background-color: #007acc;
  color: #ffffff;
  padding: 0 12px;
  font-size: 12px;
}

.status-left,
.status-center,
.status-right {
  display: flex;
  gap: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-item.error {
  color: #ffcccc;
}

.unsaved-indicator {
  color: #ffd700;
  font-weight: bold;
}

/* 上下文菜单样式 */
.context-menu {
  position: fixed;
  background-color: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  z-index: 1001;
  padding: 4px 0;
  min-width: 120px;
}

/* 菜单遮罩层 */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-menu {
    display: none;
  }
  
  .side-panel {
    min-width: 150px;
    max-width: 250px;
  }
  
  .tool-group {
    flex-wrap: wrap;
  }
}

/* 滚动条样式 */
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
</style>

