import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Panel Positioning Composable
 * Dynamically positions floating panels beneath their trigger buttons
 * with collision detection and avoidance
 */

export function usePanelPositioning() {
  const panelPositions = ref({})
  const panelElements = ref({}) // Store panel element references
  const activePanels = ref(new Set()) // Track which panels are currently open

  /**
   * Check if two rectangles overlap
   * @param {DOMRect} rect1
   * @param {DOMRect} rect2
   * @returns {boolean}
   */
  const rectsOverlap = (rect1, rect2) => {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    )
  }

  /**
   * Calculate position for a panel based on its trigger button
   * @param {HTMLElement} triggerEl - The button that triggers the panel
   * @param {HTMLElement} panelEl - The panel element (for width calculation)
   * @param {string} placement - Placement preference (default: 'bottom-start')
   * @param {Array} otherPanels - Array of other open panel data for collision detection
   * @returns {Object} Position styles { top, left, right }
   */
  const calculatePosition = (triggerEl, panelEl, placement = 'bottom-start', otherPanels = []) => {
    if (!triggerEl) {
      return { top: '60px', right: '20px' }
    }

    const triggerRect = triggerEl.getBoundingClientRect()
    const gap = 8 // Gap between trigger and panel
    const horizontalGap = 12 // Gap between side-by-side panels

    // Get panel dimensions (default if not yet rendered)
    const panelWidth = panelEl ? panelEl.offsetWidth || 340 : 340
    const panelHeight = panelEl ? panelEl.offsetHeight || 200 : 200

    // Calculate initial top position (beneath the trigger)
    let top = triggerRect.bottom + gap

    // Calculate initial horizontal position based on placement
    let left, right

    if (placement === 'bottom-start') {
      // Align to left edge of trigger
      left = triggerRect.left
      right = 'auto'
    } else if (placement === 'bottom-end') {
      // Align to right edge of trigger
      right = window.innerWidth - triggerRect.right
      left = 'auto'
    } else {
      // Center under trigger
      left = triggerRect.left + (triggerRect.width / 2) - (panelWidth / 2)
      right = 'auto'
    }

    // Create proposed rectangle for this panel
    const proposedRect = {
      left: left !== 'auto' ? left : window.innerWidth - right - panelWidth,
      top: top,
      right: left !== 'auto' ? left + panelWidth : window.innerWidth - right,
      bottom: top + panelHeight
    }

    // Check for collisions with other open panels
    let hasCollision = false
    let collidingPanel = null

    for (const otherPanel of otherPanels) {
      if (otherPanel.element) {
        const otherRect = otherPanel.element.getBoundingClientRect()
        if (rectsOverlap(proposedRect, otherRect)) {
          hasCollision = true
          collidingPanel = otherRect
          break
        }
      }
    }

    // If collision detected, try alternative placements
    if (hasCollision && collidingPanel) {
      // Strategy 1: Try to place to the right of the colliding panel (side by side)
      const rightOfOther = collidingPanel.right + horizontalGap

      // Check if there's enough space on the right
      if (rightOfOther + panelWidth <= window.innerWidth - 20) {
        // Place to the right of the other panel (side by side)
        left = rightOfOther
        right = 'auto'
        // Keep the same top position (aligned horizontally)
      } else {
        // Strategy 2: Try to place to the left of the colliding panel
        const leftOfOther = collidingPanel.left - panelWidth - horizontalGap

        if (leftOfOther >= 20) {
          // Place to the left of the other panel
          left = leftOfOther
          right = 'auto'
          // Keep the same top position (aligned horizontally)
        } else {
          // Strategy 3: Only as last resort, shift down below the other panel
          // But keep alignment to the original trigger button horizontally
          top = collidingPanel.bottom + gap

          // Recalculate horizontal position to align with trigger
          if (placement === 'bottom-start') {
            left = triggerRect.left
            right = 'auto'
          } else if (placement === 'bottom-end') {
            right = window.innerWidth - triggerRect.right
            left = 'auto'
          }
        }
      }
    }

    // Ensure panel stays within viewport bounds
    if (left !== 'auto') {
      // Check right boundary
      if (left + panelWidth > window.innerWidth - 20) {
        left = window.innerWidth - panelWidth - 20
      }
      // Check left boundary
      if (left < 20) {
        left = 20
      }
    }

    // Check bottom boundary
    if (top + panelHeight > window.innerHeight - 20) {
      // Don't flip to top - instead, constrain the panel height
      // Keep it below the trigger but limit the bottom
      const availableHeight = window.innerHeight - top - 20

      // If there's not enough space even below the trigger,
      // keep it below but let CSS max-height handle scrolling
      if (availableHeight < 200) {
        // As a last resort if very little space, position it at a reasonable spot
        // but still below the trigger
        const minTop = triggerRect.bottom + gap
        top = Math.max(minTop, 20)
      }
      // Otherwise keep the calculated top position and let max-height in CSS handle overflow
    }

    return {
      top: `${top}px`,
      left: left !== 'auto' ? `${left}px` : 'auto',
      right: right !== 'auto' ? `${right}px` : 'auto'
    }
  }

  /**
   * Register a panel with its trigger button
   * @param {string} panelId - Unique identifier for the panel
   * @param {HTMLElement} triggerEl - The button element
   * @param {HTMLElement} panelEl - The panel element
   * @param {string} placement - Placement preference
   */
  const registerPanel = (panelId, triggerEl, panelEl, placement = 'bottom-start') => {
    if (!triggerEl || !panelEl) return

    // Store panel element reference
    panelElements.value[panelId] = panelEl
    activePanels.value.add(panelId)

    // Get other open panels for collision detection
    const otherPanels = []
    for (const [otherId, otherEl] of Object.entries(panelElements.value)) {
      if (otherId !== panelId && activePanels.value.has(otherId) && otherEl) {
        otherPanels.push({ id: otherId, element: otherEl })
      }
    }

    // Calculate position with collision avoidance
    const position = calculatePosition(triggerEl, panelEl, placement, otherPanels)
    panelPositions.value[panelId] = position

    // Don't automatically reposition other panels when a new one opens
    // The collision avoidance logic in calculatePosition handles this by
    // positioning the NEW panel to avoid existing panels, not the other way around
    // This prevents existing panels from jumping around when new panels open
  }

  /**
   * Unregister a panel when it closes
   * @param {string} panelId - Panel identifier
   */
  const unregisterPanel = (panelId) => {
    activePanels.value.delete(panelId)
    delete panelElements.value[panelId]
    delete panelPositions.value[panelId]
  }

  /**
   * Update position for a specific panel
   * @param {string} panelId - Panel identifier
   * @param {HTMLElement} triggerEl - The trigger button
   * @param {HTMLElement} panelEl - The panel element
   * @param {string} placement - Placement preference
   */
  const updatePanelPosition = (panelId, triggerEl, panelEl, placement = 'bottom-start') => {
    if (!triggerEl || !panelEl) return

    // Same as registerPanel but doesn't add to active set
    panelElements.value[panelId] = panelEl

    const otherPanels = []
    for (const [otherId, otherEl] of Object.entries(panelElements.value)) {
      if (otherId !== panelId && activePanels.value.has(otherId) && otherEl) {
        otherPanels.push({ id: otherId, element: otherEl })
      }
    }

    const position = calculatePosition(triggerEl, panelEl, placement, otherPanels)
    panelPositions.value[panelId] = position
  }

  /**
   * Get position for a panel
   * @param {string} panelId - Panel identifier
   * @returns {Object} Position styles
   */
  const getPanelPosition = (panelId) => {
    return panelPositions.value[panelId] || {}
  }

  /**
   * Update all registered panel positions (for resize/scroll)
   */
  const updateAllPositions = () => {
    // Panels will be updated when they re-register on next render
    // This is handled by the component lifecycle
  }

  // Handle window resize
  const handleResize = () => {
    // Debounce resize events
    updateAllPositions()
  }

  // Handle scroll
  const handleScroll = () => {
    updateAllPositions()
  }

  // Lifecycle
  onMounted(() => {
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', handleScroll, true)
  })

  return {
    panelPositions,
    registerPanel,
    unregisterPanel,
    updatePanelPosition,
    getPanelPosition,
    calculatePosition
  }
}

