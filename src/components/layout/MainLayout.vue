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
              <div class="menu-option" @click="togglePanel('hierarchy')">Object Hierarchy</div>
              <div class="menu-option" @click="togglePanel('tools')">Tool Palette</div>
              <div class="menu-option" @click="togglePanel('properties')">Properties Panel</div>
              <div class="menu-divider"></div>
              <div class="menu-option" @click="handleMenuAction('toggle-debug')">Toggle Debug Info</div>
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
          <Tooltip content="New Document" shortcut="Ctrl+N">
            <button class="cad-button tool-button" @click="handleMenuAction('new')">
              <i class="cad-icon cad-icon-new"></i>
            </button>
          </Tooltip>
          <Tooltip content="Open Document" shortcut="Ctrl+O">
            <button class="cad-button tool-button" @click="handleMenuAction('open')">
              <i class="cad-icon cad-icon-open"></i>
            </button>
          </Tooltip>
          <Tooltip content="Save Document" shortcut="Ctrl+S">
            <button class="cad-button tool-button" @click="handleMenuAction('save')">
              <i class="cad-icon cad-icon-save"></i>
            </button>
          </Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <div class="tool-group">
          <Tooltip content="Undo" shortcut="Ctrl+Z">
            <button
              class="cad-button tool-button"
              :disabled="!canUndo"
              @click="handleMenuAction('undo')"
            >
              <i class="cad-icon cad-icon-undo"></i>
            </button>
          </Tooltip>
          <Tooltip content="Redo" shortcut="Ctrl+Y">
            <button
              class="cad-button tool-button"
              :disabled="!canRedo"
              @click="handleMenuAction('redo')"
            >
              <i class="cad-icon cad-icon-redo"></i>
            </button>
          </Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <div class="tool-group">
          <Tooltip content="Select Tool" shortcut="S">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'select' }"
              @click="setActiveTool('select')"
            >
              <i class="cad-icon cad-icon-select"></i>
            </button>
          </Tooltip>
          <Tooltip content="Move Tool" shortcut="M">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'move' }"
              @click="setActiveTool('move')"
            >
              <i class="cad-icon cad-icon-move"></i>
            </button>
          </Tooltip>
          <Tooltip content="Rotate Tool" shortcut="R">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'rotate' }"
              @click="setActiveTool('rotate')"
            >
              <i class="cad-icon cad-icon-rotate"></i>
            </button>
          </Tooltip>
          <Tooltip content="Scale Tool" shortcut="E">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'scale' }"
              @click="setActiveTool('scale')"
            >
              <i class="cad-icon cad-icon-scale"></i>
            </button>
          </Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <div class="tool-group">
          <Tooltip content="Create Box" shortcut="B">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'box' }"
              @click="handleBoxClick"
            >
              <i class="cad-icon cad-icon-box"></i>
            </button>
          </Tooltip>
          <Tooltip content="Create Sphere" shortcut="O">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'sphere' }"
              @click="setActiveTool('sphere')"
            >
              <i class="cad-icon cad-icon-sphere"></i>
            </button>
          </Tooltip>
          <Tooltip content="Create Cylinder" shortcut="C">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'cylinder' }"
              @click="setActiveTool('cylinder')"
            >
              <i class="cad-icon cad-icon-cylinder"></i>
            </button>
          </Tooltip>
          <Tooltip content="Create Plane" shortcut="P">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'plane' }"
              @click="setActiveTool('plane')"
            >
              <i class="cad-icon cad-icon-plane"></i>
            </button>
          </Tooltip>
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
              <span
                @mouseenter="showViewportControls = true"
                @mouseleave="showViewportControls = false"
                class="viewport-tab-text"
              >3D View</span>
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

          <!-- Debug Content Overlay -->
          <div
            v-if="showViewportControls"
            class="debug-content-overlay"
          >
            <div class="debug-info-content">
              <div>Selection: 0 objects</div>
              <div>Camera: 10 units</div>
              <div>FPS: 60</div>

              <!-- Camera Presets -->
              <div class="camera-presets">
                <h4>Camera Views</h4>
                <div class="preset-buttons">
                  <button @click="setCameraView('front')" title="Front View">Front</button>
                  <button @click="setCameraView('back')" title="Back View">Back</button>
                  <button @click="setCameraView('left')" title="Left View">Left</button>
                  <button @click="setCameraView('right')" title="Right View">Right</button>
                  <button @click="setCameraView('top')" title="Top View">Top</button>
                  <button @click="setCameraView('bottom')" title="Bottom View">Bottom</button>
                  <button @click="setCameraView('isometric')" title="Isometric View">ISO</button>
                  <button @click="fitToView()" title="Fit to View">Fit</button>
                </div>
              </div>

              <div class="sensitivity-controls">
                <h4>Camera Controls</h4>
                <div>
                  <label>Rotate: </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    :value="0.2"
                    @input="updateRotateSpeed($event.target.value)"
                  >
                  <span>0.2</span>
                </div>
                <div>
                  <label>Pan: </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    :value="0.5"
                    @input="updatePanSpeed($event.target.value)"
                  >
                  <span>0.5</span>
                </div>
                <div>
                  <label>Zoom: </label>
                  <input
                    type="range"
                    min="0.9"
                    max="0.99"
                    step="0.01"
                    :value="0.95"
                    @input="updateZoomSpeed($event.target.value)"
                  >
                  <span>0.95</span>
                </div>
              </div>
            </div>
          </div>
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
        </div>
      </div>
    </div>

    <!-- 层次结构面板 (浮动) -->
    <div
      v-if="panels.hierarchy.visible"
      class="floating-panel hierarchy-panel"
      :style="{
        right: '20px',
        top: '100px',
        width: panels.hierarchy.width + 'px',
        height: '400px'
      }"
    >
      <div class="panel-header">
        <span class="panel-title">{{ panels.hierarchy.title }}</span>
        <button class="panel-close" @click="panels.hierarchy.visible = false">×</button>
      </div>
      <div class="panel-content">
        <component :is="panels.hierarchy.component" v-if="panels.hierarchy.component" />
      </div>
    </div>

    <!-- 底部状态栏 -->
    <StatusBar @show-dev-debug="$emit('show-dev-debug', $event)" />

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

    <!-- 帮助按钮 -->
    <Tooltip content="Keyboard Shortcuts" shortcut="Ctrl+?" position="left">
      <button
        class="help-button cad-button"
        @click="showKeyboardShortcuts = true"
        title="Show keyboard shortcuts (Ctrl+?)"
      >
        <i class="cad-icon cad-icon-help"></i>
      </button>
    </Tooltip>

    <!-- 键盘快捷键对话框 -->
    <KeyboardShortcuts
      :visible="showKeyboardShortcuts"
      @close="showKeyboardShortcuts = false"
    />

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
import { usePanelState } from '@/composables/usePanelState'
import ToolPalette from '@/packages/cad-ui/components/ToolPalette.vue'
import ObjectHierarchy from '@/packages/cad-ui/components/ObjectHierarchy.vue'
import PropertyPanel from '@/packages/cad-ui/components/PropertyPanel.vue'
import StatusBar from '@/packages/cad-ui/components/StatusBar.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts.vue'

export default {
  name: 'MainLayout',
  components: {
    ToolPalette,
    ObjectHierarchy,
    PropertyPanel,
    StatusBar,
    Tooltip,
    KeyboardShortcuts
  },
  emits: [
    'menu-action',
    'tool-change',
    'panel-toggle',
    'viewport-action',
    'show-dev-debug'
  ],
  setup(props, { emit }) {
    const appStore = useApplicationStore()
    const {
      panelState,
      togglePanel: togglePanelState,
      setPanelWidth
    } = usePanelState()

    // UI状态
    const activeMenu = ref(null)
    const activeTool = ref('select')
    const currentOperation = ref('')
    const showKeyboardShortcuts = ref(false)
    const showViewportControls = ref(false)

    // 面板配置
    const panels = computed(() => ({
      left: {
        ...panelState.value.left,
        title: 'Tool Palette',
        component: 'ToolPalette'
      },
      right: {
        ...panelState.value.right,
        title: 'Properties',
        component: 'PropertyPanel'
      },
      hierarchy: {
        ...panelState.value.hierarchy,
        title: 'Object Hierarchy',
        component: 'ObjectHierarchy'
      }
    }))

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
      console.log('🔧 MainLayout: setActiveTool called with:', tool)
      activeTool.value = tool
      currentOperation.value = `${tool} tool active`
      console.log('🔧 MainLayout: Emitting tool-change event:', tool)
      emit('tool-change', tool)
    }

    const handleBoxClick = async () => {
      console.log('🔧 MainLayout: Box button clicked directly!')
      setActiveTool('box')

      // The tool change will trigger interactive creation, no need for direct execution
      // Interactive creation is handled by WorkspaceView.handleToolChange
    }

    const togglePanel = (panel) => {
      togglePanelState(panel)
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

    // 相机控制方法
    const setCameraView = (viewType) => {
      emit('viewport-action', `set-camera-${viewType}`)
    }

    const fitToView = () => {
      emit('viewport-action', 'fit-to-view')
    }

    const updateRotateSpeed = (value) => {
      emit('viewport-action', { type: 'update-rotate-speed', value: parseFloat(value) })
    }

    const updatePanSpeed = (value) => {
      emit('viewport-action', { type: 'update-pan-speed', value: parseFloat(value) })
    }

    const updateZoomSpeed = (value) => {
      emit('viewport-action', { type: 'update-zoom-speed', value: parseFloat(value) })
    }

    const closeAllMenus = () => {
      activeMenu.value = null
      contextMenu.value.visible = false
    }

    // 面板调整大小
    const startResize = (panel, event) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = panelState.value[panel].width

      const doResize = (e) => {
        const deltaX = e.clientX - startX
        let newWidth = startWidth + (panel === 'left' ? deltaX : -deltaX)
        newWidth = Math.max(150, Math.min(600, newWidth))
        setPanelWidth(panel, newWidth)
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
      // Ctrl+? 或 Ctrl+/ - 显示键盘快捷键帮助 (替代F1)
      if ((event.ctrlKey || event.metaKey) && (event.key === '?' || event.key === '/')) {
        event.preventDefault()
        showKeyboardShortcuts.value = true
        return
      }

      // ESC - 关闭所有弹出菜单和对话框
      if (event.key === 'Escape') {
        closeAllMenus()
        showKeyboardShortcuts.value = false
        return
      }

      // Ctrl/Cmd + 键的组合
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
          case 'y':
            event.preventDefault()
            handleMenuAction('redo')
            break
          case 'c':
            event.preventDefault()
            handleMenuAction('copy')
            break
          case 'v':
            event.preventDefault()
            handleMenuAction('paste')
            break
          case 'p':
            event.preventDefault()
            // Ctrl+P 用于属性面板，不是创建平面
            togglePanel('properties')
            break
        }
        return
      }

      // 工具快捷键（只在没有输入框焦点时）
      if (!event.target.matches('input, textarea, [contenteditable]')) {
        switch (event.key.toLowerCase()) {
          case 's':
            setActiveTool('select')
            event.preventDefault()
            break
          case 'm':
            setActiveTool('move')
            event.preventDefault()
            break
          case 'r':
            setActiveTool('rotate')
            event.preventDefault()
            break
          case 'e':
            setActiveTool('scale')
            event.preventDefault()
            break
          case 'b':
            setActiveTool('box')
            event.preventDefault()
            break
          case 'o':
            setActiveTool('sphere')
            event.preventDefault()
            break
          case 'c':
            setActiveTool('cylinder')
            event.preventDefault()
            break
          case 'p':
            setActiveTool('plane')
            event.preventDefault()
            break
          case 't':
            togglePanel('tools')
            event.preventDefault()
            break
          case 'h':
            togglePanel('hierarchy')
            event.preventDefault()
            break
          case 'f':
            handleMenuAction('zoom-fit')
            event.preventDefault()
            break
          case '1':
            handleMenuAction('view-front')
            event.preventDefault()
            break
          case '7':
            handleMenuAction('view-top')
            event.preventDefault()
            break
          case '0':
            handleMenuAction('view-iso')
            event.preventDefault()
            break
          case 'z':
            handleMenuAction('toggle-wireframe')
            event.preventDefault()
            break
        }
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
      showKeyboardShortcuts,
      showViewportControls,
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
      handleBoxClick,
      togglePanel,
      toggleWireframe,
      toggleGrid,
      toggleAxes,
      setCameraView,
      fitToView,
      updateRotateSpeed,
      updatePanSpeed,
      updateZoomSpeed,
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

/* 帮助按钮 */
.help-button {
  position: fixed;
  bottom: var(--cad-spacing-xl);
  right: var(--cad-spacing-xl);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--cad-primary);
  border: 1px solid var(--cad-primary-hover);
  color: white;
  box-shadow: var(--cad-shadow-lg);
  z-index: var(--cad-z-tooltip);
  transition: all var(--cad-transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-button:hover {
  background: var(--cad-primary-hover);
  transform: scale(1.05);
}

.help-button .cad-icon {
  font-size: 20px;
}

/* Debug Content Overlay */
.debug-content-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 15px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  min-width: 200px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  pointer-events: auto;
}

.debug-info-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-info-content > div {
  margin-bottom: 5px;
}

.camera-presets h4,
.sensitivity-controls h4 {
  margin: 10px 0 5px 0;
  font-size: 11px;
  color: #ffffff;
  font-weight: bold;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-bottom: 10px;
}

.preset-buttons button {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  padding: 4px 6px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-buttons button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.sensitivity-controls > div {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.sensitivity-controls label {
  font-size: 10px;
  min-width: 40px;
}

.sensitivity-controls input[type="range"] {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
}

.sensitivity-controls input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #007acc;
  cursor: pointer;
}

.sensitivity-controls span {
  font-size: 10px;
  min-width: 30px;
  text-align: right;
}

.viewport-tab-text {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.viewport-tab-text:hover {
  background-color: rgba(255, 255, 255, 0.1);
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

/* 浮动面板样式 */
.floating-panel {
  position: fixed;
  background: var(--panel-bg, #2d2d30);
  border: 1px solid var(--border-color, #3e3e42);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hierarchy-panel {
  min-width: 250px;
  max-width: 400px;
}

.floating-panel .panel-header {
  background: var(--header-bg, #3e3e42);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #3e3e42);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}

.floating-panel .panel-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary, #ffffff);
}

.floating-panel .panel-close {
  background: none;
  border: none;
  color: var(--text-secondary, #cccccc);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s;
}

.floating-panel .panel-close:hover {
  background: var(--hover-bg, #3e3e42);
  color: var(--text-primary, #ffffff);
}

.floating-panel .panel-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>

