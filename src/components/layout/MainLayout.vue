<template>
  <div
    class="main-layout"
    :class="[
      `layout-mode-${layoutMode}`,
      { 'is-mobile': isMobile, 'is-tablet': isTablet, 'is-desktop': isDesktop }
    ]"
  >
    <!-- Layout Mode Indicator (Development) -->
    <LayoutModeIndicator :show="showViewportControls" />

    <!-- Top menu bar -->
    <div class="menu-bar" :class="{ 'compact': isMobile || isTablet }">
      <div class="menu-bar-left">
        <!-- Mobile menu toggle -->
        <button
          v-if="isMobile || isTablet"
          class="mobile-menu-toggle"
          @click="activeMenu = activeMenu === 'mobile' ? null : 'mobile'"
          title="Menu"
        >
          <span class="hamburger-icon">☰</span>
        </button>

        <div class="app-logo">
          <span class="logo-icon">📐</span>
          <span class="app-name">CAD Studio</span>
        </div>

        <!-- Mobile dropdown menu -->
        <div v-if="(isMobile || isTablet) && activeMenu === 'mobile'" class="mobile-dropdown">
          <div class="menu-option" @click="handleMenuAction('new')">New Document</div>
          <div class="menu-option" @click="handleMenuAction('open')">Open...</div>
          <div class="menu-option" @click="handleMenuAction('save')">Save</div>
          <div class="menu-divider"></div>
          <div class="menu-option" @click="handleMenuAction('import')">Import...</div>
          <div class="menu-option" @click="handleMenuAction('export')">Export...</div>
          <div class="menu-divider"></div>
          <div class="menu-option" @click="handleMenuAction('undo')">Undo</div>
          <div class="menu-option" @click="handleMenuAction('redo')">Redo</div>
          <div class="menu-divider"></div>
          <div class="menu-option" @click="togglePanel('right')">Properties Panel</div>
        </div>

        <nav class="main-menu" v-if="!isMobile && !isTablet">
          <div class="menu-item" @click="activeMenu = activeMenu === 'file' ? null : 'file'">
            File
            <div v-if="activeMenu === 'file'" class="dropdown-menu">
              <div class="menu-option" @click="handleMenuAction('new')">New Document</div>
              <div class="menu-divider"></div>
              <div class="menu-option" @click="handleMenuAction('import')">Import Project...</div>
              <div class="menu-option" @click="handleMenuAction('export')">Export Project...</div>
              <div class="menu-divider"></div>
              <div class="menu-option" @click="handleMenuAction('open')">Open...</div>
              <div class="menu-option" @click="handleMenuAction('save')">Save</div>
              <div class="menu-option" @click="handleMenuAction('save-as')">Save As...</div>
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
        <PersistenceIndicator @menu-toggle="handlePersistenceMenuToggle" />
        <div class="status-info">
          <span class="status-indicator" :class="{ active: appStore.isInitialized && !appStore.isLoading }"></span>
          <span class="status-text">{{ appStore.isInitialized && !appStore.isLoading ? 'Ready' : 'Loading...' }}</span>
        </div>
      </div>
    </div>

    <!-- Main toolbar -->
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
          <Tooltip content="Import Project">
            <button class="cad-button tool-button" @click="openImportDialog">
              <i class="cad-icon">📥</i>
            </button>
          </Tooltip>
          <Tooltip content="Export Project">
            <button class="cad-button tool-button" @click="openExportDialog" :disabled="!appStore.activeDocument">
              <i class="cad-icon">📤</i>
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

        <!-- Selection Tools -->
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
          <Tooltip content="Select All" shortcut="Ctrl+A">
            <button
              class="cad-button tool-button"
              @click="handleMenuAction('select-all')"
            >
              <i class="cad-icon">☑️</i>
            </button>
          </Tooltip>
          <Tooltip content="Deselect All">
            <button
              class="cad-button tool-button"
              @click="handleMenuAction('deselect-all')"
            >
              <i class="cad-icon">⬜</i>
            </button>
          </Tooltip>
          <Tooltip content="Invert Selection">
            <button
              class="cad-button tool-button"
              @click="handleMenuAction('invert-selection')"
            >
              <i class="cad-icon">🔄</i>
            </button>
          </Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Modify Tools -->
        <div class="tool-group">
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

        <!-- Create Tools -->
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
          <Tooltip content="Create Cone">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'cone' }"
              @click="setActiveTool('cone')"
            >
              <i class="cad-icon">🔺</i>
            </button>
          </Tooltip>
          <Tooltip content="Create Torus">
            <button
              class="cad-button tool-button"
              :class="{ active: activeTool === 'torus' }"
              @click="setActiveTool('torus')"
            >
              <i class="cad-icon">⭕</i>
            </button>
          </Tooltip>
        </div>
      </div>

      <div class="toolbar-section toolbar-right">
        <div class="view-controls">
          <button
            ref="materialButtonRef"
            class="material-button"
            :class="{ active: showMaterialPanel }"
            @click="showMaterialPanel = !showMaterialPanel"
            title="Open Material Selection Panel"
            data-panel-id="material"
            aria-controls="material-panel"
          >
            <span class="button-icon">🎨</span>
            <span class="button-text">Materials</span>
          </button>

          <button
            ref="sceneButtonRef"
            class="material-button"
            :class="{ active: showScenePanel }"
            @click="showScenePanel = !showScenePanel"
            title="Open Scene Background Panel"
            data-panel-id="scene"
            aria-controls="scene-panel"
          >
            <span class="button-icon">🌄</span>
            <span class="button-text">Scene</span>
          </button>

          <Tooltip content="Toggle Properties Panel" shortcut="P">
            <button
              class="cad-button tool-button"
              :class="{ active: panels.right.visible }"
              @click="togglePanel('right')"
            >
              <i class="cad-icon">📋</i>
            </button>
          </Tooltip>

          <div class="toolbar-divider"></div>

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

    <!-- Main content area -->
    <div class="main-content">
      <!-- Left panel removed - tools are now in top toolbar -->
      <!-- <div
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
      </div> -->

      <!-- Central viewport area -->
      <div class="viewport-area">
        <!-- Material Panel (Floating) -->
        <div
          v-if="showMaterialPanel"
          ref="materialPanelRef"
          id="material-panel"
          class="floating-material-panel"
          :style="materialPanelStyle"
          data-panel="material"
        >
          <SimpleMaterialPanel @close="showMaterialPanel = false" />
        </div>

        <!-- Scene Background Panel (Floating) -->
        <div
          v-if="showScenePanel"
          ref="scenePanelRef"
          id="scene-panel"
          class="floating-scene-panel"
          :style="scenePanelStyle"
          data-panel="scene"
        >
          <SceneBackgroundPanel @close="showScenePanel = false" />
        </div>

        <div class="viewport-header">
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

      <!-- Right panel -->
      <div
        v-if="panels.right.visible"
        class="side-panel right-panel"
        :class="{
          'overlay-panel': shouldUseOverlay('rightPanel'),
          'docked-panel': !shouldUseOverlay('rightPanel')
        }"
        :style="{
          width: panels.right.width + 'px',
          maxWidth: isMobile ? '90vw' : '500px'
        }"
      >
        <div
          v-if="canResizePanel('right')"
          class="panel-resizer left"
          @mousedown="startResize('right', $event)"
        ></div>
        <div class="panel-header">
          <span class="panel-title">{{ panels.right.title }}</span>
          <button class="panel-close" @click="togglePanel('right')">×</button>
        </div>
        <div class="panel-content">
          <component :is="panels.right.component" v-if="panels.right.component" />
        </div>
      </div>

      <!-- Overlay backdrop for mobile/tablet -->
      <div
        v-if="panels.right.visible && shouldUseOverlay('rightPanel')"
        class="panel-backdrop"
        @click="togglePanel('right')"
      ></div>
    </div>

    <!-- Bottom status bar -->
    <StatusBar @show-dev-debug="$emit('show-dev-debug', $event)" />

    <!-- Right-click context menu -->
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

    <!-- Help button -->
    <Tooltip content="Keyboard Shortcuts" shortcut="Ctrl+?" position="left">
      <button
        class="help-button cad-button"
        @click="showKeyboardShortcuts = true"
        title="Show keyboard shortcuts (Ctrl+?)"
      >
        <i class="cad-icon cad-icon-help"></i>
      </button>
    </Tooltip>

    <!-- Keyboard shortcuts dialog -->
    <KeyboardShortcuts
      :visible="showKeyboardShortcuts"
      @close="showKeyboardShortcuts = false"
    />

    <!-- Import/Export Dialog -->
    <ImportExportDialog
      :is-open="showImportExportDialog"
      :mode="importExportMode"
      :document="appStore.activeDocument"
      :application="appStore.cadApplication"
      @close="showImportExportDialog = false"
      @export-complete="handleExportComplete"
      @import-complete="handleImportComplete"
      @error="handleImportExportError"
    />

    <!-- Click overlay - close dropdown menus and context menu -->
    <div
      v-if="activeMenu || contextMenu.visible"
      class="menu-overlay"
      @click="closeAllMenus"
    ></div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useApplicationStore } from '@/stores/application'
import { history } from '@/packages/cad-core/foundation/historyInstance.js'
import { usePanelState } from '@/composables/usePanelState'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'
import { usePanelPositioning } from '@/composables/usePanelPositioning'
import ToolPalette from '@/packages/cad-ui/components/ToolPalette.vue'
import PropertyPanel from '@/packages/cad-ui/components/PropertyPanel.vue'
import StatusBar from '@/packages/cad-ui/components/StatusBar.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import SimpleMaterialPanel from '@/components/SimpleMaterialPanel.vue'
import SceneBackgroundPanel from '@/components/ui/SceneBackgroundPanel.vue'
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts.vue'
import ImportExportDialog from '@/packages/cad-ui/components/ImportExportDialog.vue'
import LayoutModeIndicator from '@/components/ui/LayoutModeIndicator.vue'
import PersistenceIndicator from '@/components/ui/PersistenceIndicator.vue'

export default {
  name: 'MainLayout',
  components: {
    ToolPalette,
    PropertyPanel,
    StatusBar,
    Tooltip,
    SimpleMaterialPanel,
    SceneBackgroundPanel,
    KeyboardShortcuts,
    ImportExportDialog,
    LayoutModeIndicator,
    PersistenceIndicator
  },
  emits: [
    'menu-action',
    'tool-change',
    'panel-toggle',
    'viewport-action',
    'show-dev-debug'
  ],
  setup(props, { emit }) {
    const router = useRouter()
    const appStore = useApplicationStore()
    const {
      panelState,
      togglePanel: togglePanelState,
      setPanelWidth
    } = usePanelState()

    // Responsive layout
    const {
      layoutMode,
      isMobile,
      isTablet,
      isDesktop,
      isLarge,
      shouldUseOverlay,
      canResizePanel,
      getResponsivePanelWidth
    } = useResponsiveLayout()

    // Panel positioning
    const {
      registerPanel,
      unregisterPanel,
      getPanelPosition
    } = usePanelPositioning()

    // UI state
    const activeMenu = ref(null)
    const activeTool = ref('select')
    const currentOperation = ref('')
    const showKeyboardShortcuts = ref(false)
    const showViewportControls = ref(false)
    const showMaterialPanel = ref(false)
    const showScenePanel = ref(false)
    const showPersistenceMenu = ref(false)
    const showImportExportDialog = ref(false)
    const importExportMode = ref('export') // 'export' or 'import'

    // Refs for trigger buttons
    const materialButtonRef = ref(null)
    const sceneButtonRef = ref(null)

    // Refs for panel elements
    const materialPanelRef = ref(null)
    const scenePanelRef = ref(null)

    // Panel configuration
    const panels = computed(() => ({
      left: {
        ...panelState.value.left,
        visible: false, // Hide left panel - tools moved to top toolbar
        title: 'Tool Palette',
        component: 'ToolPalette'
      },
      right: {
        ...panelState.value.right,
        title: 'Properties',
        component: 'PropertyPanel'
      }
    }))

    // Context menu
    const contextMenu = ref({
      visible: false,
      x: 0,
      y: 0
    })

    // Viewport state
    const cursorPosition = ref('0, 0, 0')
    const zoomLevel = ref(100)

    // Computed properties
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

    // Reactive bridge to history's canUndo/canRedo
    const canUndo = ref(history.canUndo)
    const canRedo = ref(history.canRedo)

    // Methods
    const navigateTo = (path) => {
      router.push(path)
      closeAllMenus()
    }

    const handleMenuAction = (action) => {
      console.log('Menu action:', action)
      closeAllMenus()

      // Handle built-in operations
      switch (action) {
        case 'undo':
          try {
            history.undo()
            appStore.syncSelectionState()
            console.log('Undo operation completed')
          } catch (error) {
            console.error('Undo failed:', error)
          }
          break
        case 'redo':
          try {
            history.redo()
            appStore.syncSelectionState()
            console.log('Redo operation completed')
          } catch (error) {
            console.error('Redo failed:', error)
          }
          break
        case 'new':
          appStore.createNewDocument('Untitled')
          break
        case 'export':
          openExportDialog()
          break
        case 'import':
          openImportDialog()
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
        case 'create-cone':
          setActiveTool('cone')
          break
        case 'create-torus':
          setActiveTool('torus')
          break
        case 'select-all':
          if (appStore.activeDocument) {
            appStore.executeCommandLegacy('selectAll')
          }
          break
        case 'deselect-all':
          if (appStore.activeDocument) {
            appStore.executeCommandLegacy('deselectAll')
          }
          break
        case 'invert-selection':
          if (appStore.activeDocument) {
            appStore.executeCommandLegacy('invertSelection')
          }
          break
        case 'properties':
          // Open the property panel if it's closed
          if (!panelState.value.right.visible) {
            togglePanel('right')
          }
          console.log('Properties panel opened')
          break
        default:
          // Emit event for parent component to handle
          emit('menu-action', action)
          break
      }
    }

    const setActiveTool = (tool) => {
      console.log('MainLayout: setActiveTool called with:', tool)
      activeTool.value = tool
      currentOperation.value = `${tool} tool active`
      console.log('MainLayout: Emitting tool-change event:', tool)
      emit('tool-change', tool)
    }

    const handleBoxClick = async () => {
      console.log('MainLayout: Box button clicked directly!')
      setActiveTool('box')

      // The tool change will trigger interactive creation, no need for direct execution
      // Interactive creation is handled by WorkspaceView.handleToolChange
    }

    const togglePanel = (panel) => {
      togglePanelState(panel)
      emit('panel-toggle', panel)
    }

    // Import/Export Dialog handlers
    const openExportDialog = () => {
      if (!appStore.activeDocument) {
        console.warn('No active document to export')
        return
      }
      importExportMode.value = 'export'
      showImportExportDialog.value = true
    }

    const openImportDialog = () => {
      importExportMode.value = 'import'
      showImportExportDialog.value = true
    }

    const handleExportComplete = ({ filename }) => {
      console.log('Export completed:', filename)
      currentOperation.value = `Exported: ${filename}`
    }

    const handleImportComplete = ({ document }) => {
      console.log('Import completed:', document.name)
      currentOperation.value = `Imported: ${document.name}`
    }

    const handleImportExportError = (error) => {
      console.error('Import/Export error:', error)
      currentOperation.value = `Error: ${error.message}`
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

    // Camera control methods
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

    // Panel resizing
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

    // Right-click menu
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

    // Delete selected objects
    const handleDeleteSelected = () => {
      const selectedNodes = appStore.selectedNodes

      if (selectedNodes.length === 0) {
        console.log('No objects selected for deletion')
        return
      }

      // Confirm deletion
      const objectCount = selectedNodes.length
      const objectText = objectCount === 1 ? 'object' : 'objects'
      if (!confirm(`Are you sure you want to delete ${objectCount} ${objectText}?`)) {
        return
      }

      try {
        // Delete each selected node
        selectedNodes.forEach((node) => {
          appStore.deleteNode(node.id)
        })

        console.log(`Successfully deleted ${objectCount} ${objectText} via keyboard shortcut`)
      } catch (error) {
        console.error('Error deleting objects:', error)
        // You could show a user-friendly error message here
      }
    }

    // Keyboard shortcuts
    const handleKeydown = (event) => {
      // Ctrl+? or Ctrl+/ - Show keyboard shortcuts help (alternative to F1)
      if ((event.ctrlKey || event.metaKey) && (event.key === '?' || event.key === '/')) {
        event.preventDefault()
        showKeyboardShortcuts.value = true
        return
      }

      // ESC - Close all popup menus and dialogs
      if (event.key === 'Escape') {
        closeAllMenus()
        showKeyboardShortcuts.value = false
        return
      }

      // Delete key - Delete selected objects
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only handle if no input field is focused
        if (!event.target.matches('input, textarea, [contenteditable]')) {
          event.preventDefault()
          handleDeleteSelected()
          return
        }
      }

      // Ctrl/Cmd + key combinations
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
            // Ctrl+P for properties panel, not create plane
            togglePanel('properties')
            break
        }
        return
      }

      // Tool shortcuts (only when no input field is focused)
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

    // Computed panel positions
    const materialPanelStyle = computed(() => {
      return getPanelPosition('material')
    })

    const scenePanelStyle = computed(() => {
      return getPanelPosition('scene')
    })

    // Watch for material panel open/close and update position
    watch(showMaterialPanel, async (isOpen) => {
      if (isOpen) {
        await nextTick()
        await nextTick() // Extra tick to ensure panel is fully rendered
        if (materialButtonRef.value && materialPanelRef.value) {
          registerPanel('material', materialButtonRef.value, materialPanelRef.value, 'bottom-start')
        }
      } else {
        unregisterPanel('material')
      }
    })

    // Watch for scene panel open/close and update position
    watch(showScenePanel, async (isOpen) => {
      if (isOpen) {
        await nextTick()
        await nextTick() // Extra tick to ensure panel is fully rendered
        if (sceneButtonRef.value && scenePanelRef.value) {
          registerPanel('scene', sceneButtonRef.value, scenePanelRef.value, 'bottom-start')
        }
      } else {
        unregisterPanel('scene')
      }
    })

    // Watch for layout mode changes and adjust panels accordingly
    watch(layoutMode, (newMode) => {
      console.log('Layout mode changed to:', newMode)

      // On mobile/tablet, auto-hide panels when switching modes
      if (isMobile.value || isTablet.value) {
        // Close floating panels on small screens
        if (showMaterialPanel.value || showScenePanel.value) {
          showMaterialPanel.value = false
          showScenePanel.value = false
        }

        // Close menus
        closeAllMenus()
      }

      // Adjust panel widths to fit new screen size
      if (panelState.value.right.visible) {
        const newWidth = getResponsivePanelWidth('right', panelState.value.right.width)
        setPanelWidth('right', newWidth)
      }

      // Re-register panels on layout change
      if (showMaterialPanel.value && materialButtonRef.value && materialPanelRef.value) {
        nextTick(() => registerPanel('material', materialButtonRef.value, materialPanelRef.value, 'bottom-start'))
      }
      if (showScenePanel.value && sceneButtonRef.value && scenePanelRef.value) {
        nextTick(() => registerPanel('scene', sceneButtonRef.value, scenePanelRef.value, 'bottom-start'))
      }
    })

    /**
     * Handle persistence menu toggle event
     */
    const handlePersistenceMenuToggle = (isOpen) => {
      showPersistenceMenu.value = isOpen
    }

    /**
     * Update ViewCube legend pointer events based on panel visibility
     * Disable legend when any dropdown panel is open to prevent blocking interactions
     */
    const updateLegendPointerEvents = () => {
      const anyPanelOpen = showMaterialPanel.value || showScenePanel.value || showPersistenceMenu.value

      // Get ThreeView instance which has the ViewCube
      const threeView = appStore.activeDocument?.views?.get?.('default')
      if (threeView && threeView.viewCube && typeof threeView.viewCube.setPointerEventsDisabled === 'function') {
        threeView.viewCube.setPointerEventsDisabled(anyPanelOpen)
      }
    }

    // Watch for panel state changes and update legend accordingly
    watch([showMaterialPanel, showScenePanel, showPersistenceMenu], () => {
      updateLegendPointerEvents()
    })

    // Lifecycle
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
      document.addEventListener('contextmenu', showContextMenu)
      document.addEventListener('click', hideContextMenu)
      // Update legend pointer events on mount
      updateLegendPointerEvents()

      // Subscribe to history changes to keep toolbar buttons enabled state in sync
      const offUndo = history.onPropertyChanged('canUndo', (newValue) => {
        canUndo.value = !!newValue
      })
      const offRedo = history.onPropertyChanged('canRedo', (newValue) => {
        canRedo.value = !!newValue
      })

      // Store unsubscribers on instance for cleanup
      ;(window.__MAIN_LAYOUT_UNDO_OFF ||= []).push(offUndo)
      ;(window.__MAIN_LAYOUT_REDO_OFF ||= []).push(offRedo)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('contextmenu', showContextMenu)
      document.removeEventListener('click', hideContextMenu)

      // Cleanup history listeners
      if (window.__MAIN_LAYOUT_UNDO_OFF) {
        window.__MAIN_LAYOUT_UNDO_OFF.forEach(fn => { try { fn() } catch {} })
        window.__MAIN_LAYOUT_UNDO_OFF.length = 0
      }
      if (window.__MAIN_LAYOUT_REDO_OFF) {
        window.__MAIN_LAYOUT_REDO_OFF.forEach(fn => { try { fn() } catch {} })
        window.__MAIN_LAYOUT_REDO_OFF.length = 0
      }
    })

    return {
      // Store
      appStore,

      // UI state
      activeMenu,
      activeTool,
      currentOperation,
      showKeyboardShortcuts,
      showViewportControls,
      showMaterialPanel,
      showScenePanel,
      showImportExportDialog,
      importExportMode,
      panels,
      contextMenu,
      cursorPosition,
      zoomLevel,

      // Computed properties
      documentName,
      hasUnsavedChanges,
      objectCount,
      selectedCount,
      canUndo,
      canRedo,

      // Responsive layout
      layoutMode,
      isMobile,
      isTablet,
      isDesktop,
      isLarge,
      shouldUseOverlay,
      canResizePanel,

      // Panel positioning
      materialButtonRef,
      sceneButtonRef,
      materialPanelRef,
      scenePanelRef,
      materialPanelStyle,
      scenePanelStyle,

      // Methods
      navigateTo,
      handleMenuAction,
      setActiveTool,
      handleBoxClick,
      togglePanel,
      openExportDialog,
      openImportDialog,
      handleExportComplete,
      handleImportComplete,
      handleImportExportError,
      handlePersistenceMenuToggle,
      toggleWireframe,
      toggleGrid,
      toggleAxes,
      setCameraView,
      fitToView,
      updateRotateSpeed,
      updatePanSpeed,
      updateZoomSpeed,
      closeAllMenus,
      startResize,
      handleDeleteSelected
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

/* Menu bar styles */
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

/* Mobile menu toggle */
.mobile-menu-toggle {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 3px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 8px;
}

.mobile-menu-toggle:hover {
  background-color: #3e3e42;
}

.hamburger-icon {
  display: block;
  line-height: 1;
}

/* Mobile dropdown menu */
.mobile-dropdown {
  position: fixed;
  top: 32px;
  left: 0;
  right: 0;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  padding: 8px 0;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Toolbar styles */
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
  width: 36px;
  height: 36px;
  background: none;
  border: 1px solid transparent;
  color: #ffffff;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.tool-button:hover:not(:disabled) {
  background-color: #3e3e42;
  border-color: #007acc;
}

.tool-button.active {
  background-color: #3498db;
  border-color: #3498db;
}

.tool-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Material Button with Text */
.material-button {
  height: 36px;
  padding: 0 12px;
  background: none;
  border: 1px solid transparent;
  color: #ffffff;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.material-button:hover {
  background-color: #3e3e42;
  border-color: #007acc;
}

.material-button.active {
  background-color: #3498db;
  border-color: #3498db;
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.4);
}

.material-button .button-icon {
  font-size: 18px;
  line-height: 1;
}

.material-button .button-text {
  font-size: 13px;
  letter-spacing: 0.3px;
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

/* Main content area styles */
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

/* Viewport area styles */
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

/* Status bar styles */
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

/* Context menu styles */
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

/* Menu overlay */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* Help button */
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


/* ============================================
   RESPONSIVE DESIGN & ADAPTIVE LAYOUT
   ============================================ */

/* Panel Backdrop for Overlay Mode */
.panel-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Overlay Panel Styles */
.side-panel.overlay-panel {
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: 999;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  animation: slideInFromRight 0.3s ease-out;
}

.side-panel.overlay-panel.right-panel {
  right: 0;
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Docked Panel Styles */
.side-panel.docked-panel {
  position: relative;
  transition: width 0.2s ease;
}

/* Mobile Layout (< 768px) */
@media (max-width: 767px) {
  .main-layout.is-mobile {
    font-size: 13px;
  }

  /* Compact menu bar */
  .menu-bar.compact .main-menu {
    display: none;
  }

  .menu-bar.compact .app-name {
    font-size: 14px;
  }

  /* Compact toolbar */
  .main-toolbar {
    height: 48px;
    padding: 0 8px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .toolbar-section {
    gap: 4px;
  }

  .tool-group {
    gap: 2px;
    padding: 0 2px;
  }

  .tool-button {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }

  .toolbar-divider {
    margin: 0 2px;
  }

  /* Hide button text on mobile */
  .material-button .button-text {
    display: none;
  }

  .material-button {
    padding: 0 8px;
    min-width: 38px;
  }

  /* Force panels to overlay mode */
  .side-panel {
    position: fixed !important;
    z-index: 999;
    min-width: 280px;
    max-width: 90vw;
    top: 74px; /* menu bar + toolbar height */
    bottom: 24px; /* status bar height */
  }

  .side-panel.right-panel {
    right: 0;
  }

  /* Floating panels positioning on mobile */
  .floating-material-panel,
  .floating-scene-panel {
    position: fixed;
    max-width: calc(100vw - 20px);
    min-width: 280px;
    left: 10px !important;
    right: 10px !important;
    width: auto;
  }

  /* Viewport adjustments */
  .viewport-header {
    height: 36px;
  }

  .viewport-controls {
    gap: 2px;
  }

  .control-button {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
}

/* Tablet Layout (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .main-layout.is-tablet {
    font-size: 13px;
  }

  /* Compact menu */
  .menu-bar.compact .main-menu {
    gap: 0;
  }

  .menu-bar.compact .menu-item {
    padding: 6px 8px;
    font-size: 13px;
  }

  /* Toolbar adjustments */
  .main-toolbar {
    padding: 0 10px;
  }

  .tool-button {
    width: 34px;
    height: 34px;
  }

  /* Panels can be overlay or docked */
  .side-panel.overlay-panel {
    position: fixed;
    z-index: 999;
    top: 74px;
    bottom: 24px;
    max-width: 400px;
  }

  .side-panel.docked-panel {
    min-width: 200px;
    max-width: 350px;
  }

  /* Floating panels on tablet - use dynamic positioning */
  .floating-material-panel,
  .floating-scene-panel {
    max-width: 320px;
    min-width: 280px;
  }
}

/* Desktop Layout (1024px - 1439px) */
@media (min-width: 1024px) and (max-width: 1439px) {
  .main-layout.is-desktop {
    font-size: 14px;
  }

  .side-panel {
    min-width: 200px;
    max-width: 450px;
  }
}

/* Large Desktop Layout (1440px+) */
@media (min-width: 1440px) {
  .main-layout.layout-mode-large {
    font-size: 14px;
  }

  .side-panel {
    min-width: 250px;
    max-width: 600px;
  }

  /* Show more toolbar labels */
  .material-button .button-text {
    display: inline;
  }
}

/* Extra responsive adjustments */
@media (max-width: 480px) {
  /* Very small screens */
  .main-toolbar {
    height: 52px;
  }

  .tool-button {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .app-logo .app-name {
    display: none; /* Hide app name on very small screens */
  }

  .status-info {
    font-size: 11px;
  }
}

/* Landscape mode adjustments for mobile */
@media (max-height: 500px) and (orientation: landscape) {
  .main-toolbar {
    height: 38px;
  }

  .tool-button {
    width: 32px;
    height: 32px;
  }

  .menu-bar {
    height: 28px;
  }

  .viewport-header {
    height: 28px;
  }

  .side-panel {
    top: 66px;
  }
}

/* Touch-friendly hit areas */
@media (hover: none) and (pointer: coarse) {
  .tool-button,
  .control-button,
  .menu-item,
  .panel-close {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Print styles */
@media print {
  .menu-bar,
  .main-toolbar,
  .side-panel,
  .status-bar,
  .help-button {
    display: none !important;
  }

  .viewport-area {
    position: static;
    width: 100%;
    height: 100%;
  }
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

/* Floating panel styles */
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

/* Z-Index Elevation Scale:
 * --z-base: 0       (default)
 * --z-legend: 40    (ViewCube/legend in top-right)
 * --z-dropdown: 50  (Material/Scene/Persistence panels)
 * --z-modal: 80     (dialogs)
 * --z-toast: 100    (notifications)
 */

/* Material Panel Floating */
.floating-material-panel {
  position: fixed;
  z-index: 50; /* Above legend (40) */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  animation: slideInDown 0.3s ease-out;
  max-width: 340px;
  min-width: 300px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
}

/* Scene Background Panel Floating */
.floating-scene-panel {
  position: fixed;
  z-index: 50; /* Above legend (40) */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  animation: slideInDown 0.3s ease-out;
  max-width: 340px;
  min-width: 300px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
}

/* Animation for panels appearing below trigger */
@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Active state for tool button */
.tool-button.active {
  background: #3498db;
  color: white;
}
</style>

