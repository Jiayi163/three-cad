import { ref, watch } from 'vue'

const PANEL_STATE_KEY = 'cad-panel-state'

// Default panel state
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

// Load panel state from localStorage
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

// Save panel state to localStorage
const savePanelState = (state) => {
  try {
    localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save panel state to localStorage:', error)
  }
}

export function usePanelState() {
  const panelState = ref(loadPanelState())

  // Watch panel state changes and auto-save
  watch(
    panelState,
    (newState) => {
      savePanelState(newState)
    },
    { deep: true }
  )

  // Methods to update panel state
  const updatePanel = (panelName, updates) => {
    if (panelState.value[panelName]) {
      Object.assign(panelState.value[panelName], updates)
    }
  }

  // Toggle panel visibility
  const togglePanel = (panelName) => {
    if (panelState.value[panelName]) {
      panelState.value[panelName].visible = !panelState.value[panelName].visible
    }
  }

  // Toggle panel collapse state
  const togglePanelCollapse = (panelName) => {
    if (panelState.value[panelName]) {
      panelState.value[panelName].collapsed = !panelState.value[panelName].collapsed
    }
  }

  // Set panel width
  const setPanelWidth = (panelName, width) => {
    if (panelState.value[panelName]) {
      panelState.value[panelName].width = Math.max(150, Math.min(600, width))
    }
  }

  // Reset all panels to default state
  const resetPanels = () => {
    panelState.value = { ...defaultPanelState }
  }

  // Get panel state
  const getPanelState = (panelName) => {
    return panelState.value[panelName] || null
  }

  // Check if panel is visible
  const isPanelVisible = (panelName) => {
    return panelState.value[panelName]?.visible || false
  }

  // Check if panel is collapsed
  const isPanelCollapsed = (panelName) => {
    return panelState.value[panelName]?.collapsed || false
  }

  // Get panel width
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
