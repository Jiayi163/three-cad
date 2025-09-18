<template>
  <div class="tool-palette">
    <div class="tool-palette-header">
      <h3>Tools</h3>
      <button
        class="collapse-btn"
        @click="toggleCollapsed"
        :title="isCollapsed ? 'Expand' : 'Collapse'"
      >
        <i :class="isCollapsed ? 'icon-expand' : 'icon-collapse'"></i>
      </button>
    </div>

    <!-- Command Status Bar -->
    <div v-if="appStore.isCommandExecuting" class="command-status">
      <div class="command-status-content">
        <i class="icon-spinner"></i>
        <span>{{ commandStatusMessage }}</span>
      </div>
    </div>

    <div v-show="!isCollapsed" class="tool-palette-content">
      <!-- Create Tools Group -->
      <div class="tool-group">
        <div class="tool-group-header" @click="toggleGroup('create')">
          <i class="icon-folder"></i>
          <span>Create</span>
          <i :class="expandedGroups.create ? 'icon-expand' : 'icon-collapse'"></i>
        </div>
        <div v-show="expandedGroups.create" class="tool-group-content">
          <div
            v-for="tool in createTools"
            :key="tool.id"
            class="tool-item"
            :class="{ active: activeTool === tool.id }"
            @click="selectTool(tool.id)"
            :title="tool.name"
          >
            <i :class="tool.icon"></i>
            <span>{{ tool.name }}</span>
          </div>
        </div>
      </div>

      <!-- Modify Tools Group -->
      <div class="tool-group">
        <div class="tool-group-header" @click="toggleGroup('modify')">
          <i class="icon-folder"></i>
          <span>Modify</span>
          <i :class="expandedGroups.modify ? 'icon-expand' : 'icon-collapse'"></i>
        </div>
        <div v-show="expandedGroups.modify" class="tool-group-content">
          <div
            v-for="tool in modifyTools"
            :key="tool.id"
            class="tool-item"
            :class="{ active: activeTool === tool.id }"
            @click="selectTool(tool.id)"
            :title="tool.name"
          >
            <i :class="tool.icon"></i>
            <span>{{ tool.name }}</span>
          </div>
        </div>
      </div>

      <!-- View Tools Group -->
      <div class="tool-group">
        <div class="tool-group-header" @click="toggleGroup('view')">
          <i class="icon-folder"></i>
          <span>View</span>
          <i :class="expandedGroups.view ? 'icon-expand' : 'icon-collapse'"></i>
        </div>
        <div v-show="expandedGroups.view" class="tool-group-content">
          <div
            v-for="tool in viewTools"
            :key="tool.id"
            class="tool-item"
            :class="{ active: activeTool === tool.id }"
            @click="selectTool(tool.id)"
            :title="tool.name"
          >
            <i :class="tool.icon"></i>
            <span>{{ tool.name }}</span>
          </div>
        </div>
      </div>

      <!-- Selection Tools Group -->
      <div class="tool-group">
        <div class="tool-group-header" @click="toggleGroup('selection')">
          <i class="icon-folder"></i>
          <span>Selection</span>
          <i :class="expandedGroups.selection ? 'icon-expand' : 'icon-collapse'"></i>
        </div>
        <div v-show="expandedGroups.selection" class="tool-group-content">
          <div
            v-for="tool in selectionTools"
            :key="tool.id"
            class="tool-item"
            :class="{ active: activeTool === tool.id }"
            @click="selectTool(tool.id)"
            :title="tool.name"
          >
            <i :class="tool.icon"></i>
            <span>{{ tool.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import { useApplicationStore } from '@/stores/application'

export default {
  name: 'ToolPalette',
  setup() {
    const appStore = useApplicationStore()

    // Component state
    const isCollapsed = ref(false)
    const activeTool = ref('select')
    const commandStatusMessage = ref('Executing command...')

    // Group expansion state
    const expandedGroups = reactive({
      create: true,
      modify: true,
      view: true,
      selection: true
    })

    // Tool definitions
    const createTools = [
      { id: 'box', name: 'Box', icon: 'icon-box', command: 'CreateBox' },
      { id: 'sphere', name: 'Sphere', icon: 'icon-sphere', command: 'CreateSphere' },
      { id: 'cylinder', name: 'Cylinder', icon: 'icon-cylinder', command: 'CreateCylinder' },
      { id: 'plane', name: 'Plane', icon: 'icon-plane', command: 'CreatePlane' },
      { id: 'cone', name: 'Cone', icon: 'icon-cone', command: 'CreateCone' },
      { id: 'torus', name: 'Torus', icon: 'icon-torus', command: 'CreateTorus' },
      { id: 'line', name: 'Line', icon: 'icon-line', command: 'CreateLine' },
      { id: 'circle', name: 'Circle', icon: 'icon-circle', command: 'CreateCircle' }
    ]

    const modifyTools = [
      { id: 'move', name: 'Move', icon: 'icon-move', command: 'moveObjects' },
      { id: 'rotate', name: 'Rotate', icon: 'icon-rotate', command: 'rotateObjects' },
      { id: 'scale', name: 'Scale', icon: 'icon-scale', command: 'scaleObjects' },
      { id: 'copy', name: 'Copy', icon: 'icon-copy', command: 'copyObjects' },
      { id: 'mirror', name: 'Mirror', icon: 'icon-mirror', command: 'mirrorObjects' },
      { id: 'array', name: 'Array', icon: 'icon-array', command: 'arrayObjects' }
    ]

    const viewTools = [
      { id: 'zoom-all', name: 'Zoom All', icon: 'icon-zoom-all', command: 'zoomAll' },
      { id: 'zoom-window', name: 'Zoom Window', icon: 'icon-zoom-window', command: 'zoomWindow' },
      { id: 'pan', name: 'Pan', icon: 'icon-pan', command: 'panView' },
      { id: 'orbit', name: 'Orbit', icon: 'icon-orbit', command: 'orbitView' },
      { id: 'front-view', name: 'Front View', icon: 'icon-front', command: 'setViewFront' },
      { id: 'top-view', name: 'Top View', icon: 'icon-top', command: 'setViewTop' },
      { id: 'side-view', name: 'Side View', icon: 'icon-side', command: 'setViewSide' },
      { id: 'isometric-view', name: 'Isometric', icon: 'icon-isometric', command: 'setViewIsometric' }
    ]

    const selectionTools = [
      { id: 'select', name: 'Select', icon: 'icon-select', command: 'selectMode' },
      { id: 'select-all', name: 'Select All', icon: 'icon-select-all', command: 'selectAll' },
      { id: 'deselect-all', name: 'Deselect All', icon: 'icon-deselect', command: 'deselectAll' },
      { id: 'invert-selection', name: 'Invert Selection', icon: 'icon-invert', command: 'invertSelection' }
    ]

    // Methods
    const toggleCollapsed = () => {
      isCollapsed.value = !isCollapsed.value
    }

    const toggleGroup = (groupName) => {
      expandedGroups[groupName] = !expandedGroups[groupName]
    }

    const selectTool = async (toolId) => {
      activeTool.value = toolId

      // Find the tool definition
      const allTools = [...createTools, ...modifyTools, ...viewTools, ...selectionTools]
      const tool = allTools.find(t => t.id === toolId)

      if (tool && tool.command) {
        console.log('Tool selected:', tool.name, '- Executing command:', tool.command)

        try {
          // Execute the command through the application store
          if (appStore.isInitialized) {
            // Update status message
            commandStatusMessage.value = `Creating ${tool.name}...`

            // For creation tools, use the new command system
            if (tool.command.startsWith('Create')) {
              const commandId = `create-${tool.id}` // e.g., 'create-box', 'create-sphere'
              const result = await appStore.executeCommand(commandId, {
                interactive: true // Enable interactive creation mode
              })

              if (result && result.success) {
                commandStatusMessage.value = `${tool.name} created successfully!`
                // Reset tool selection after successful creation
                setTimeout(() => {
                  activeTool.value = 'select'
                }, 1500)
              }
            } else {
              // For other commands, use legacy system for now
              commandStatusMessage.value = `Executing ${tool.name}...`
              await appStore.executeCommandLegacy(tool.command)
            }
          } else {
            console.warn('Application not initialized, cannot execute command')
          }
        } catch (error) {
          console.error('Failed to execute command:', tool.command, error)
          commandStatusMessage.value = `Failed to execute ${tool.name}`
          // Reset tool selection after error
          setTimeout(() => {
            activeTool.value = 'select'
          }, 2000)
        }
      }
    }

    // Computed properties
    const toolCount = computed(() => {
      return createTools.length + modifyTools.length + viewTools.length + selectionTools.length
    })

    return {
      appStore,
      isCollapsed,
      activeTool,
      expandedGroups,
      createTools,
      modifyTools,
      viewTools,
      selectionTools,
      toolCount,
      commandStatusMessage,
      toggleCollapsed,
      toggleGroup,
      selectTool
    }
  }
}
</script>

<style scoped>
.tool-palette {
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-palette-header {
  background: var(--header-bg);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}

.tool-palette-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.collapse-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.collapse-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.tool-palette-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.tool-group {
  margin-bottom: 4px;
}

.tool-group-header {
  background: var(--group-header-bg);
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  transition: background-color 0.2s;
  user-select: none;
}

.tool-group-header:hover {
  background: var(--hover-bg);
}

.tool-group-header i {
  font-size: 12px;
  width: 12px;
  text-align: center;
}

.tool-group-content {
  background: var(--group-content-bg);
}

.tool-item {
  padding: 6px 12px 6px 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
  user-select: none;
  position: relative;
}

.tool-item:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.tool-item.active {
  background: var(--active-bg);
  color: var(--active-text);
  font-weight: 500;
}

.tool-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-color);
}

.tool-item i {
  font-size: 14px;
  width: 14px;
  text-align: center;
}

/* Command Status Bar */
.command-status {
  background: var(--active-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 8px 12px;
  animation: pulse 2s infinite;
}

.command-status-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--active-text);
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Icon styles - using Unicode symbols for simplicity */
.icon-folder::before { content: '📁'; }
.icon-expand::before { content: '▶'; }
.icon-collapse::before { content: '▼'; }
.icon-spinner::before {
  content: '⟳';
  animation: spin 1s linear infinite;
  display: inline-block;
}
.icon-box::before { content: '📦'; }
.icon-sphere::before { content: '⚪'; }
.icon-cylinder::before { content: '🥫'; }
.icon-plane::before { content: '⬜'; }
.icon-line::before { content: '📏'; }
.icon-circle::before { content: '⭕'; }
.icon-move::before { content: '↔'; }
.icon-rotate::before { content: '🔄'; }
.icon-scale::before { content: '↔'; }
.icon-copy::before { content: '📋'; }
.icon-mirror::before { content: '🪞'; }
.icon-array::before { content: '📊'; }
.icon-zoom-all::before { content: '🔍'; }
.icon-zoom-window::before { content: '🔍'; }
.icon-pan::before { content: '✋'; }
.icon-orbit::before { content: '🌐'; }
.icon-front::before { content: '⬆'; }
.icon-top::before { content: '⬆'; }
.icon-side::before { content: '➡'; }
.icon-isometric::before { content: '📐'; }
.icon-select::before { content: '👆'; }
.icon-select-all::before { content: '☑'; }
.icon-deselect::before { content: '☐'; }
.icon-invert::before { content: '🔄'; }

/* Scrollbar styling */
.tool-palette-content::-webkit-scrollbar {
  width: 6px;
}

.tool-palette-content::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

.tool-palette-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.tool-palette-content::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>
