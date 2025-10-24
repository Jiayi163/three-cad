import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * Responsive Layout Composable
 * Manages responsive behavior for CAD application layout
 */

// Breakpoint definitions
const BREAKPOINTS = {
  mobile: 480,      // Small phones
  tablet: 768,      // Tablets and large phones
  desktop: 1024,    // Small desktops
  large: 1440,      // Large desktops
  xlarge: 1920      // Extra large screens
}

// Layout mode definitions
const LAYOUT_MODES = {
  MOBILE: 'mobile',       // Single panel, all overlays
  TABLET: 'tablet',       // Collapsible panels, some overlays
  DESKTOP: 'desktop',     // Standard layout with resizable panels
  LARGE: 'large'          // Wide layout with all panels visible
}

export function useResponsiveLayout() {
  // Window dimensions
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)

  // Current layout mode
  const layoutMode = computed(() => {
    const w = windowWidth.value

    if (w < BREAKPOINTS.mobile) {
      return LAYOUT_MODES.MOBILE
    } else if (w < BREAKPOINTS.tablet) {
      return LAYOUT_MODES.MOBILE
    } else if (w < BREAKPOINTS.desktop) {
      return LAYOUT_MODES.TABLET
    } else if (w < BREAKPOINTS.large) {
      return LAYOUT_MODES.DESKTOP
    } else {
      return LAYOUT_MODES.LARGE
    }
  })

  // Computed layout properties
  const isMobile = computed(() => layoutMode.value === LAYOUT_MODES.MOBILE)
  const isTablet = computed(() => layoutMode.value === LAYOUT_MODES.TABLET)
  const isDesktop = computed(() => layoutMode.value === LAYOUT_MODES.DESKTOP)
  const isLarge = computed(() => layoutMode.value === LAYOUT_MODES.LARGE)

  // Panel behavior based on layout mode
  const panelBehavior = computed(() => {
    switch (layoutMode.value) {
      case LAYOUT_MODES.MOBILE:
        return {
          leftPanel: { mode: 'overlay', defaultVisible: false, collapsible: true },
          rightPanel: { mode: 'overlay', defaultVisible: false, collapsible: true },
          toolbar: { mode: 'compact', showLabels: false },
          menuBar: { mode: 'hamburger' }
        }

      case LAYOUT_MODES.TABLET:
        return {
          leftPanel: { mode: 'overlay', defaultVisible: false, collapsible: true },
          rightPanel: { mode: 'docked', defaultVisible: false, collapsible: true },
          toolbar: { mode: 'compact', showLabels: false },
          menuBar: { mode: 'compact' }
        }

      case LAYOUT_MODES.DESKTOP:
        return {
          leftPanel: { mode: 'docked', defaultVisible: false, collapsible: true },
          rightPanel: { mode: 'docked', defaultVisible: true, collapsible: true },
          toolbar: { mode: 'standard', showLabels: true },
          menuBar: { mode: 'full' }
        }

      case LAYOUT_MODES.LARGE:
        return {
          leftPanel: { mode: 'docked', defaultVisible: true, collapsible: false },
          rightPanel: { mode: 'docked', defaultVisible: true, collapsible: false },
          toolbar: { mode: 'full', showLabels: true },
          menuBar: { mode: 'full' }
        }

      default:
        return {
          leftPanel: { mode: 'docked', defaultVisible: true, collapsible: true },
          rightPanel: { mode: 'docked', defaultVisible: true, collapsible: true },
          toolbar: { mode: 'standard', showLabels: true },
          menuBar: { mode: 'full' }
        }
    }
  })

  // Responsive panel widths
  const getResponsivePanelWidth = (panel, requestedWidth) => {
    const w = windowWidth.value

    // Maximum panel width based on screen size
    const maxPanelWidth = Math.floor(w * 0.4) // Max 40% of screen width
    const minPanelWidth = isMobile.value ? 280 : 200

    // Clamp the width
    return Math.max(minPanelWidth, Math.min(maxPanelWidth, requestedWidth))
  }

  // Check if panels should be overlay mode
  const shouldUseOverlay = (panelName) => {
    const behavior = panelBehavior.value[panelName]
    return behavior?.mode === 'overlay'
  }

  // Check if panel can be resized
  const canResizePanel = (panelName) => {
    return !isMobile.value && !isTablet.value
  }

  // Get toolbar configuration
  const toolbarConfig = computed(() => {
    return panelBehavior.value.toolbar
  })

  // Get menu bar configuration
  const menuBarConfig = computed(() => {
    return panelBehavior.value.menuBar
  })

  // Handle window resize
  const handleResize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  // Debounced resize handler
  let resizeTimeout = null
  const debouncedResize = () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
    resizeTimeout = setTimeout(handleResize, 100)
  }

  // Lifecycle hooks
  onMounted(() => {
    window.addEventListener('resize', debouncedResize)
    handleResize()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', debouncedResize)
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
  })

  return {
    // Window dimensions
    windowWidth,
    windowHeight,

    // Layout mode
    layoutMode,
    isMobile,
    isTablet,
    isDesktop,
    isLarge,

    // Panel behavior
    panelBehavior,
    shouldUseOverlay,
    canResizePanel,
    getResponsivePanelWidth,

    // Toolbar and menu
    toolbarConfig,
    menuBarConfig,

    // Breakpoints (for external use)
    BREAKPOINTS,
    LAYOUT_MODES
  }
}

