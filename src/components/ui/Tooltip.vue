<template>
  <div
    class="tooltip-wrapper"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focus="showTooltip"
    @blur="hideTooltip"
  >
    <!-- Slot for the element that triggers the tooltip -->
    <slot />

    <!-- Tooltip content -->
    <div
      v-if="visible"
      ref="tooltipRef"
      class="cad-tooltip visible"
      :class="[
        `tooltip-${position}`,
        { 'tooltip-multiline': multiline }
      ]"
      :style="tooltipStyle"
      role="tooltip"
      :aria-describedby="tooltipId"
    >
      <div class="tooltip-content">
        <!-- Custom content slot -->
        <slot name="content">
          {{ content }}
        </slot>
      </div>

      <!-- Keyboard shortcut display -->
      <div v-if="shortcut" class="tooltip-shortcut">
        <kbd class="tooltip-kbd">{{ shortcut }}</kbd>
      </div>

      <!-- Tooltip arrow -->
      <div class="tooltip-arrow" :class="`arrow-${position}`"></div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

export default {
  name: 'Tooltip',
  props: {
    content: {
      type: String,
      default: ''
    },
    position: {
      type: String,
      default: 'top',
      validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
    },
    delay: {
      type: Number,
      default: 500
    },
    shortcut: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    multiline: {
      type: Boolean,
      default: false
    },
    maxWidth: {
      type: String,
      default: '200px'
    }
  },
  setup(props) {
    const visible = ref(false)
    const tooltipRef = ref(null)
    const showTimer = ref(null)
    const hideTimer = ref(null)
    const tooltipId = ref(`tooltip-${Math.random().toString(36).substr(2, 9)}`)

    const tooltipStyle = computed(() => ({
      maxWidth: props.maxWidth,
      zIndex: 'var(--cad-z-tooltip)'
    }))

    const showTooltip = () => {
      if (props.disabled || !props.content) return

      clearTimeout(hideTimer.value)

      showTimer.value = setTimeout(() => {
        visible.value = true
        nextTick(() => {
          positionTooltip()
        })
      }, props.delay)
    }

    const hideTooltip = () => {
      clearTimeout(showTimer.value)

      hideTimer.value = setTimeout(() => {
        visible.value = false
      }, 100)
    }

    const positionTooltip = () => {
      if (!tooltipRef.value) return

      const tooltip = tooltipRef.value
      const wrapper = tooltip.parentElement

      if (!wrapper) return

      const wrapperRect = wrapper.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = 0
      let top = 0

      switch (props.position) {
        case 'top':
          left = wrapperRect.left + (wrapperRect.width - tooltipRect.width) / 2
          top = wrapperRect.top - tooltipRect.height - 8
          break
        case 'bottom':
          left = wrapperRect.left + (wrapperRect.width - tooltipRect.width) / 2
          top = wrapperRect.bottom + 8
          break
        case 'left':
          left = wrapperRect.left - tooltipRect.width - 8
          top = wrapperRect.top + (wrapperRect.height - tooltipRect.height) / 2
          break
        case 'right':
          left = wrapperRect.right + 8
          top = wrapperRect.top + (wrapperRect.height - tooltipRect.height) / 2
          break
      }

      // Viewport boundary adjustments
      if (left < 8) left = 8
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8
      }
      if (top < 8) top = 8
      if (top + tooltipRect.height > viewportHeight - 8) {
        top = viewportHeight - tooltipRect.height - 8
      }

      tooltip.style.left = `${left}px`
      tooltip.style.top = `${top}px`
    }

    onMounted(() => {
      window.addEventListener('scroll', hideTooltip, true)
      window.addEventListener('resize', hideTooltip)
    })

    onUnmounted(() => {
      clearTimeout(showTimer.value)
      clearTimeout(hideTimer.value)
      window.removeEventListener('scroll', hideTooltip, true)
      window.removeEventListener('resize', hideTooltip)
    })

    return {
      visible,
      tooltipRef,
      tooltipId,
      tooltipStyle,
      showTooltip,
      hideTooltip
    }
  }
}
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.cad-tooltip {
  position: fixed;
  z-index: var(--cad-z-tooltip);
  max-width: 300px;
  padding: var(--cad-spacing-sm) var(--cad-spacing-md);
  background: var(--cad-surface-dark);
  color: var(--cad-text-primary);
  border: 1px solid var(--cad-border-primary);
  border-radius: var(--cad-radius-md);
  font-size: var(--cad-font-size-xs);
  line-height: 1.4;
  box-shadow: var(--cad-shadow-md);
  pointer-events: none;
  word-wrap: break-word;
}

.tooltip-multiline {
  white-space: normal;
  max-width: 250px;
}

.tooltip-content {
  margin-bottom: 0;
}

.tooltip-shortcut {
  margin-top: var(--cad-spacing-xs);
  padding-top: var(--cad-spacing-xs);
  border-top: 1px solid var(--cad-border-secondary);
  text-align: right;
}

.tooltip-kbd {
  display: inline-block;
  padding: 2px 6px;
  background: var(--cad-surface-light);
  border: 1px solid var(--cad-border-primary);
  border-radius: var(--cad-radius-sm);
  font-family: var(--cad-font-mono);
  font-size: 10px;
  font-weight: bold;
  color: var(--cad-text-secondary);
}

/* Tooltip Arrow */
.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--cad-surface-dark);
  border: 1px solid var(--cad-border-primary);
  transform: rotate(45deg);
}

.arrow-top {
  bottom: -5px;
  left: 50%;
  margin-left: -4px;
  border-top: none;
  border-left: none;
}

.arrow-bottom {
  top: -5px;
  left: 50%;
  margin-left: -4px;
  border-bottom: none;
  border-right: none;
}

.arrow-left {
  right: -5px;
  top: 50%;
  margin-top: -4px;
  border-left: none;
  border-bottom: none;
}

.arrow-right {
  left: -5px;
  top: 50%;
  margin-top: -4px;
  border-right: none;
  border-top: none;
}

/* Animation */
.cad-tooltip {
  opacity: 0;
  transform: translateY(-4px);
  transition: all var(--cad-transition-normal);
}

.cad-tooltip.visible {
  opacity: 1;
  transform: translateY(0);
}
</style>
