<template>
  <div v-if="show" class="layout-mode-indicator" :class="`mode-${layoutMode}`">
    <div class="indicator-badge">
      <span class="icon">{{ modeIcon }}</span>
      <div class="mode-info">
        <div class="mode-name">{{ modeName }}</div>
        <div class="screen-size">{{ screenWidth }}px</div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'

export default {
  name: 'LayoutModeIndicator',
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const { layoutMode, windowWidth } = useResponsiveLayout()

    const modeIcon = computed(() => {
      switch (layoutMode.value) {
        case 'mobile':
          return '📱'
        case 'tablet':
          return '📱'
        case 'desktop':
          return '💻'
        case 'large':
          return '🖥️'
        default:
          return '💻'
      }
    })

    const modeName = computed(() => {
      switch (layoutMode.value) {
        case 'mobile':
          return 'Mobile'
        case 'tablet':
          return 'Tablet'
        case 'desktop':
          return 'Desktop'
        case 'large':
          return 'Large Desktop'
        default:
          return 'Unknown'
      }
    })

    const screenWidth = computed(() => windowWidth.value)

    return {
      layoutMode,
      modeIcon,
      modeName,
      screenWidth
    }
  }
}
</script>

<style scoped>
.layout-mode-indicator {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
  animation: slideDown 0.3s ease-out;
}

.indicator-badge {
  background: rgba(0, 122, 204, 0.95);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.icon {
  font-size: 20px;
  line-height: 1;
}

.mode-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode-name {
  font-weight: 600;
  font-size: 13px;
}

.screen-size {
  font-size: 11px;
  opacity: 0.9;
}

/* Mode-specific colors */
.mode-mobile .indicator-badge {
  background: rgba(220, 53, 69, 0.95);
}

.mode-tablet .indicator-badge {
  background: rgba(255, 193, 7, 0.95);
  color: #000;
}

.mode-desktop .indicator-badge {
  background: rgba(40, 167, 69, 0.95);
}

.mode-large .indicator-badge {
  background: rgba(0, 123, 255, 0.95);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* Hide on very small screens to not obstruct content */
@media (max-width: 480px) {
  .layout-mode-indicator {
    top: 5px;
    left: 5px;
    transform: none;
  }

  .indicator-badge {
    padding: 4px 8px;
    font-size: 11px;
  }

  .icon {
    font-size: 16px;
  }

  .screen-size {
    display: none;
  }
}
</style>

