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
      // Strategy 1: Try to place to the right of the colliding panel
      const rightOfOther = collidingPanel.right + horizontalGap

      // Check if there's enough space on the right
      if (rightOfOther + panelWidth <= window.innerWidth - 20) {
        // Use this position
        left = rightOfOther
        right = 'auto'
      } else {
        // Strategy 2: Try bottom-end alignment (right-aligned to trigger)
        right = window.innerWidth - triggerRect.right
        left = 'auto'

        // Recalculate proposed rect with new position
        const newProposedLeft = window.innerWidth - right - panelWidth
        const newProposedRect = {
          left: newProposedLeft,
          top: top,
          right: newProposedLeft + panelWidth,
          bottom: top + panelHeight
        }

        // If still colliding with bottom-end, shift vertically below the other panel
        if (rectsOverlap(newProposedRect, collidingPanel)) {
          top = collidingPanel.bottom + gap
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
      // Try flipping to top
      top = triggerRect.top - panelHeight - gap
      // If still doesn't fit, place at bottom with max height
      if (top < 20) {
        top = 20
      }
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

    // Recalculate positions of other open panels to avoid new collision
    for (const { id: otherId, element: otherEl } of otherPanels) {
      const otherTrigger = document.querySelector(`[data-panel-id="${otherId}"]`)
      if (otherTrigger) {
        // Get all panels except the one we're updating
        const remainingPanels = Object.entries(panelElements.value)
          .filter(([id, el]) => id !== otherId && activePanels.value.has(id) && el)
          .map(([id, el]) => ({ id, element: el }))

        const otherPosition = calculatePosition(otherTrigger, otherEl, placement, remainingPanels)
        panelPositions.value[otherId] = otherPosition
      }
    }
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

