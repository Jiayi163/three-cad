import { ref, watch } from 'vue'

const PANEL_STATE_KEY = 'cad-panel-state'

// 默认面板状态
const defaultPanelState = {
  left: {
    visible: true,
    width: 250,
    collapsed: false
  },
  right: {
    visible: true,
    width: 300,
    collapsed: false
  },
  hierarchy: {
    visible: false,
    width: 250,
    collapsed: false
  }
}

// 从 localStorage 加载面板状态
const loadPanelState = () => {
  try {
    const saved = localStorage.getItem(PANEL_STATE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...defaultPanelState, ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load panel state from localStorage:', error)
  }
  return defaultPanelState
}

// 保存面板状态到 localStorage
const savePanelState = (state) => {
  try {
    localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save panel state to localStorage:', error)
  }
}

export function usePanelState() {
  const panelState = ref(loadPanelState())

  // 监听面板状态变化并自动保存
  watch(
    panelState,
    (newState) => {
      savePanelState(newState)
    },
    { deep: true }
  )

  // 更新面板状态的方法
  const updatePanel = (panelName, updates) => {
    if (panelState.value[panelName]) {
      Object.assign(panelState.value[panelName], updates)
    }
  }

  // 切换面板可见性
  const togglePanel = (panelName) => {
    if (panelState.value[panelName]) {
      panelState.value[panelName].visible = !panelState.value[panelName].visible
    }
  }

  // 切换面板折叠状态
  const togglePanelCollapse = (panelName) => {
    if (panelState.value[panelName]) {
      panelState.value[panelName].collapsed = !panelState.value[panelName].collapsed
    }
  }

  // 设置面板宽度
  const setPanelWidth = (panelName, width) => {
    if (panelState.value[panelName]) {
      panelState.value[panelName].width = Math.max(150, Math.min(600, width))
    }
  }

  // 重置所有面板到默认状态
  const resetPanels = () => {
    panelState.value = { ...defaultPanelState }
  }

  // 获取面板状态
  const getPanelState = (panelName) => {
    return panelState.value[panelName] || null
  }

  // 检查面板是否可见
  const isPanelVisible = (panelName) => {
    return panelState.value[panelName]?.visible || false
  }

  // 检查面板是否折叠
  const isPanelCollapsed = (panelName) => {
    return panelState.value[panelName]?.collapsed || false
  }

  // 获取面板宽度
  const getPanelWidth = (panelName) => {
    return panelState.value[panelName]?.width || 250
  }

  return {
    panelState,
    updatePanel,
    togglePanel,
    togglePanelCollapse,
    setPanelWidth,
    resetPanels,
    getPanelState,
    isPanelVisible,
    isPanelCollapsed,
    getPanelWidth
  }
}
