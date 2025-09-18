<template>
  <div class="object-tree-node">
    <div
      class="node-content"
      :class="{
        selected: isSelected,
        expanded: isExpanded,
        hidden: !node.visible
      }"
      :style="{ paddingLeft: (level * 16 + 8) + 'px' }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <!-- Expand/collapse button -->
      <button
        v-if="hasChildren"
        class="expand-btn"
        @click.stop="toggleExpand"
        :title="isExpanded ? 'Collapse' : 'Expand'"
      >
        <i :class="isExpanded ? 'icon-collapse' : 'icon-expand'"></i>
      </button>
      <div v-else class="expand-spacer"></div>

      <!-- Node icon -->
      <div class="node-icon">
        <i :class="nodeIcon"></i>
      </div>

      <!-- Node name -->
      <span class="node-name" :title="node.name">{{ node.name }}</span>

      <!-- Node type badge -->
      <span class="node-type">{{ node.type }}</span>

      <!-- Visibility indicator -->
      <button
        class="visibility-btn"
        @click.stop="toggleVisibility"
        :title="node.visible ? 'Hide' : 'Show'"
      >
        <i :class="node.visible ? 'icon-visible' : 'icon-hidden'"></i>
      </button>
    </div>

    <!-- Children -->
    <div v-if="hasChildren && isExpanded" class="node-children">
      <ObjectTreeNode
        v-for="child in childNodes"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :selected-nodes="selectedNodes"
        :expanded-nodes="expandedNodes"
        @select="$emit('select', $event, $event)"
        @toggle-expand="$emit('toggleExpand', $event)"
        @context-menu="$emit('contextMenu', $event, $event)"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'ObjectTreeNode',
  props: {
    node: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    },
    selectedNodes: {
      type: Set,
      required: true
    },
    expandedNodes: {
      type: Set,
      required: true
    }
  },
  emits: ['select', 'toggleExpand', 'contextMenu'],
  setup(props, { emit }) {
    // Computed properties
    const isSelected = computed(() => {
      return props.selectedNodes.has(props.node.id)
    })

    const isExpanded = computed(() => {
      return props.expandedNodes.has(props.node.id)
    })

    const hasChildren = computed(() => {
      return props.node.children && props.node.children.length > 0
    })

    const childNodes = computed(() => {
      return props.node.children || []
    })

    const nodeIcon = computed(() => {
      // Map node types to icons
      const iconMap = {
        'box': 'icon-box',
        'sphere': 'icon-sphere',
        'cylinder': 'icon-cylinder',
        'plane': 'icon-plane',
        'line': 'icon-line',
        'circle': 'icon-circle',
        'group': 'icon-group',
        'assembly': 'icon-assembly',
        'part': 'icon-part',
        'sketch': 'icon-sketch',
        'constraint': 'icon-constraint',
        'dimension': 'icon-dimension'
      }
      return iconMap[props.node.type] || 'icon-object'
    })

    // Methods
    const handleClick = (event) => {
      const multiSelect = event.ctrlKey || event.metaKey
      emit('select', props.node.id, multiSelect)
    }

    const handleContextMenu = (event) => {
      emit('contextMenu', event, props.node.id)
    }

    const toggleExpand = () => {
      emit('toggleExpand', props.node.id)
    }

    const toggleVisibility = () => {
      // This would be handled by the parent component
      // For now, we'll emit an event
      emit('toggleVisibility', props.node.id)
    }

    return {
      isSelected,
      isExpanded,
      hasChildren,
      childNodes,
      nodeIcon,
      handleClick,
      handleContextMenu,
      toggleExpand,
      toggleVisibility
    }
  }
}
</script>

<style scoped>
.object-tree-node {
  user-select: none;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-height: 24px;
}

.node-content:hover {
  background: var(--hover-bg);
}

.node-content.selected {
  background: var(--active-bg);
  color: var(--active-text);
}

.node-content.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-color);
}

.node-content.hidden {
  opacity: 0.5;
}

.expand-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.expand-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.expand-spacer {
  width: 16px;
  margin-right: 4px;
}

.node-icon {
  margin-right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.node-icon i {
  font-size: 14px;
  color: var(--text-secondary);
}

.node-content.selected .node-icon i {
  color: var(--active-text);
}

.node-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.node-content.selected .node-name {
  color: var(--active-text);
  font-weight: 500;
}

.node-type {
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--badge-bg);
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 6px;
}

.visibility-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  opacity: 0;
}

.node-content:hover .visibility-btn {
  opacity: 1;
}

.visibility-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.node-children {
  border-left: 1px solid var(--border-light);
  margin-left: 8px;
}

/* Icon styles */
.icon-expand::before { content: '▶'; }
.icon-collapse::before { content: '▼'; }
.icon-box::before { content: '📦'; }
.icon-sphere::before { content: '⚪'; }
.icon-cylinder::before { content: '🥫'; }
.icon-plane::before { content: '⬜'; }
.icon-line::before { content: '📏'; }
.icon-circle::before { content: '⭕'; }
.icon-group::before { content: '📁'; }
.icon-assembly::before { content: '🔧'; }
.icon-part::before { content: '⚙️'; }
.icon-sketch::before { content: '✏️'; }
.icon-constraint::before { content: '🔗'; }
.icon-dimension::before { content: '📐'; }
.icon-object::before { content: '📄'; }
.icon-visible::before { content: '👁️'; }
.icon-hidden::before { content: '🙈'; }
</style>
