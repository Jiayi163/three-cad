<template>
  <div class="object-hierarchy">
    <div class="object-hierarchy-header">
      <h3>Objects</h3>
      <div class="header-actions">
        <button
          class="action-btn"
          @click="refreshHierarchy"
          title="Refresh"
        >
          <i class="icon-refresh"></i>
        </button>
        <button
          class="action-btn"
          @click="toggleCollapsed"
          :title="isCollapsed ? 'Expand' : 'Collapse'"
        >
          <i :class="isCollapsed ? 'icon-expand' : 'icon-collapse'"></i>
        </button>
      </div>
    </div>

    <div v-show="!isCollapsed" class="object-hierarchy-content">
      <!-- Search bar -->
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search objects..."
          class="search-input"
        >
        <i class="icon-search"></i>
      </div>

      <!-- Object tree -->
      <div class="object-tree">
        <div v-if="filteredNodes.length === 0" class="empty-state">
          <i class="icon-empty"></i>
          <p>{{ searchQuery ? 'No objects found' : 'No objects in document' }}</p>
        </div>

        <ObjectTreeNode
          v-for="node in filteredNodes"
          :key="node.id"
          :node="node"
          :level="0"
          :selected-nodes="selectedNodes"
          :expanded-nodes="expandedNodes"
          @select="handleNodeSelect"
          @toggle-expand="handleToggleExpand"
          @context-menu="handleContextMenu"
        />
      </div>
    </div>

    <!-- Context menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="renameObject">
        <i class="icon-rename"></i>
        <span>Rename</span>
      </div>
      <div class="context-menu-item" @click="deleteObject">
        <i class="icon-delete"></i>
        <span>Delete</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="duplicateObject">
        <i class="icon-copy"></i>
        <span>Duplicate</span>
      </div>
      <div class="context-menu-item" @click="hideObject">
        <i class="icon-hide"></i>
        <span>{{ isObjectHidden ? 'Show' : 'Hide' }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useApplicationStore } from '@/stores/application'
import ObjectTreeNode from './ObjectTreeNode.vue'

export default {
  name: 'ObjectHierarchy',
  components: {
    ObjectTreeNode
  },
  setup() {
    const appStore = useApplicationStore()

    // Component state
    const isCollapsed = ref(false)
    const searchQuery = ref('')
    const expandedNodes = reactive(new Set())
    const selectedNodes = reactive(new Set())
    const contextMenu = reactive({
      visible: false,
      x: 0,
      y: 0,
      nodeId: null
    })

    // Computed properties
    const documentNodes = computed(() => {
      return appStore.activeDocument?.nodes || []
    })

    const filteredNodes = computed(() => {
      if (!searchQuery.value) {
        return documentNodes.value.filter(node => !node.parentId)
      }

      const query = searchQuery.value.toLowerCase()
      return documentNodes.value.filter(node =>
        node.name.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query)
      )
    })

    const isObjectHidden = computed(() => {
      if (!contextMenu.nodeId) return false
      const node = documentNodes.value.find(n => n.id === contextMenu.nodeId)
      return node?.visible === false
    })

    // Methods
    const toggleCollapsed = () => {
      isCollapsed.value = !isCollapsed.value
    }

    const refreshHierarchy = () => {
      // Force reactivity update
      appStore.refreshDocument()
    }

    const handleNodeSelect = (nodeId, multiSelect = false) => {
      try {
        const document = appStore.activeDocument
        if (!document) {
          console.warn('No active document')
          return
        }

        // Find the node by ID
        const node = document.findNodeById(nodeId)
        if (!node) {
          console.warn('Node not found:', nodeId)
          return
        }

        if (multiSelect) {
          // Multi-select: toggle selection
          if (selectedNodes.has(nodeId)) {
            selectedNodes.delete(nodeId)
            appStore.deselectNode(node)
          } else {
            selectedNodes.add(nodeId)
            appStore.selectNode(node, true) // true = addToSelection
          }
        } else {
          // Single select: clear and select
          selectedNodes.clear()
          selectedNodes.add(nodeId)
          appStore.clearSelection()
          appStore.selectNode(node, false)
        }
      } catch (error) {
        console.error('Error selecting node:', error)
      }
    }

    const handleToggleExpand = (nodeId) => {
      if (expandedNodes.has(nodeId)) {
        expandedNodes.delete(nodeId)
      } else {
        expandedNodes.add(nodeId)
      }
    }

    const handleContextMenu = (event, nodeId) => {
      event.preventDefault()
      contextMenu.visible = true
      contextMenu.x = event.clientX
      contextMenu.y = event.clientY
      contextMenu.nodeId = nodeId
    }

    const hideContextMenu = () => {
      contextMenu.visible = false
      contextMenu.nodeId = null
    }

    const renameObject = () => {
      if (contextMenu.nodeId) {
        const newName = prompt('Enter new name:',
          documentNodes.value.find(n => n.id === contextMenu.nodeId)?.name || ''
        )
        if (newName && newName.trim()) {
          appStore.renameNode(contextMenu.nodeId, newName.trim())
        }
      }
      hideContextMenu()
    }

    const deleteObject = () => {
      if (contextMenu.nodeId && confirm('Are you sure you want to delete this object?')) {
        appStore.deleteNode(contextMenu.nodeId)
        selectedNodes.delete(contextMenu.nodeId)
      }
      hideContextMenu()
    }

    const duplicateObject = () => {
      if (contextMenu.nodeId) {
        appStore.duplicateNode(contextMenu.nodeId)
      }
      hideContextMenu()
    }

    const hideObject = () => {
      if (contextMenu.nodeId) {
        const node = documentNodes.value.find(n => n.id === contextMenu.nodeId)
        if (node) {
          appStore.setNodeVisibility(contextMenu.nodeId, !node.visible)
        }
      }
      hideContextMenu()
    }

    // Watch for document changes
    watch(documentNodes, (newNodes) => {
      // Auto-expand new nodes
      newNodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          expandedNodes.add(node.id)
        }
      })
    }, { deep: true })

    // Watch for selection changes from outside
    watch(() => appStore.selectedNodes, (newSelection) => {
      selectedNodes.clear()
      newSelection.forEach(id => selectedNodes.add(id))
    }, { deep: true })

    // Event listeners
    const handleClickOutside = (event) => {
      if (!event.target.closest('.context-menu')) {
        hideContextMenu()
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      isCollapsed,
      searchQuery,
      expandedNodes,
      selectedNodes,
      contextMenu,
      documentNodes,
      filteredNodes,
      isObjectHidden,
      toggleCollapsed,
      refreshHierarchy,
      handleNodeSelect,
      handleToggleExpand,
      handleContextMenu,
      renameObject,
      deleteObject,
      duplicateObject,
      hideObject
    }
  }
}
</script>

<style scoped>
.object-hierarchy {
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.object-hierarchy-header {
  background: var(--header-bg);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 32px;
}

.object-hierarchy-header h3 {
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
  padding: 4px;
  border-radius: 2px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.object-hierarchy-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-bar {
  position: relative;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 6px 24px 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--accent-color);
}

.search-bar i {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 12px;
}

.object-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--text-secondary);
  text-align: center;
}

.empty-state i {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

.context-menu {
  position: fixed;
  background: var(--context-menu-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background: var(--hover-bg);
}

.context-menu-item i {
  font-size: 12px;
  width: 12px;
  text-align: center;
}

.context-menu-separator {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

/* Icon styles */
.icon-refresh::before { content: '🔄'; }
.icon-expand::before { content: '▶'; }
.icon-collapse::before { content: '▼'; }
.icon-search::before { content: '🔍'; }
.icon-empty::before { content: '📁'; }
.icon-rename::before { content: '✏️'; }
.icon-delete::before { content: '🗑️'; }
.icon-copy::before { content: '📋'; }
.icon-hide::before { content: '👁️'; }

/* Scrollbar styling */
.object-tree::-webkit-scrollbar {
  width: 6px;
}

.object-tree::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

.object-tree::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.object-tree::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>
