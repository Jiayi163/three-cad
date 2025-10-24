# 📱 Responsive Layout System Guide

## Overview

The CAD Studio application now features a comprehensive **responsive layout system** that automatically adapts to different screen sizes and devices. This guide explains how the system works and how to use it effectively.

---

## ✨ Key Features

### 🎯 Automatic Layout Adaptation
- **Smart panel behavior**: Panels automatically switch between docked and overlay modes based on screen size
- **Flexible resizing**: All panels respect screen size constraints and adjust accordingly
- **Touch-friendly**: Enhanced hit areas for touch devices
- **Performance optimized**: Debounced resize handlers prevent performance issues

### 📐 Responsive Breakpoints

The system uses the following breakpoints:

| Breakpoint | Screen Width | Layout Mode | Description |
|------------|-------------|-------------|-------------|
| **Mobile** | < 768px | `mobile` | Single-column, overlay panels |
| **Tablet** | 768px - 1023px | `tablet` | Flexible panels, some overlays |
| **Desktop** | 1024px - 1439px | `desktop` | Standard docked panels |
| **Large** | ≥ 1440px | `large` | Full-featured layout |

---

## 🚀 Layout Modes

### 📱 Mobile Mode (< 768px)

**Behavior:**
- All panels become **overlay panels** (slide in from the side)
- Menu bar shows **hamburger menu** instead of full navigation
- Toolbar becomes **horizontally scrollable**
- Button labels are **hidden** to save space
- Floating panels (materials, scene) appear **full-width** at top

**User Experience:**
```
┌─────────────────┐
│ ☰ CAD Studio   │  ← Hamburger menu
├─────────────────┤
│  📦 🎨 ⚡ 🔧    │  ← Compact toolbar (scrollable)
├─────────────────┤
│                 │
│   3D Viewport   │  ← Main viewport (full width)
│                 │
└─────────────────┘
```

When Properties panel is opened:
```
┌─────────────────┐
│ [Backdrop]      │
│  ┌───────────┐  │
│  │Properties │  │  ← Overlay panel
│  │           │  │
│  │ [Content] │  │
│  │           │  │
│  └───────────┘  │
└─────────────────┘
```

### 📱 Tablet Mode (768px - 1023px)

**Behavior:**
- Right panel can be **docked or overlay**
- Compact menu bar with **abbreviated items**
- Toolbar shows **most tools** without labels
- Floating panels have **reduced width**

**User Experience:**
```
┌──────────────────────────┐
│ ☰ File Edit View Create │  ← Compact menu
├──────────────────────────┤
│ 📦 🎨 ⚡ 🔧 ✏️ 📐 🔲    │  ← Full toolbar
├──────────────────────────┤
│                          │
│      3D Viewport         │  ← Viewport
│                          │
└──────────────────────────┘
```

### 💻 Desktop Mode (1024px - 1439px)

**Behavior:**
- All panels are **docked** by default
- **Resizable panels** with drag handles
- Full menu bar and toolbar
- Standard panel widths (200px - 450px)

**User Experience:**
```
┌────────────────────────────────────┐
│ CAD Studio  File Edit View Create │  ← Full menu
├────────────────────────────────────┤
│ 📦 🎨 Materials ⚡ 🔧 ✏️ 📐 🔲    │  ← Full toolbar
├────────────────────────────────────┤
│                  │  Properties     │
│   3D Viewport    │  ┌───────────┐  │
│                  │║│ [Content]  │  │  ← Resizable
│                  │  └───────────┘  │
└────────────────────────────────────┘
```

### 🖥️ Large Desktop Mode (≥ 1440px)

**Behavior:**
- **All panels visible** by default
- **Maximum panel widths** (up to 600px)
- Button labels shown
- Optimal spacing and layout

---

## 🎨 Panel Behavior

### Overlay Panels

**When active:**
- Mobile and Tablet modes
- Panel slides in from the side
- Semi-transparent **backdrop** appears behind
- Click backdrop to close panel
- Panel has **shadow** for depth

**Features:**
- Smooth slide-in animation
- Touch-friendly close button
- Auto-closes when switching to smaller screen

### Docked Panels

**When active:**
- Desktop and Large modes
- Panel is part of the main layout
- **Resizable** with drag handles
- Persists across sessions (localStorage)

**Features:**
- Smooth width transitions
- Min/max width constraints
- Visual resize handles
- State persistence

---

## 🛠️ Using the Responsive Layout

### In Your Components

Import and use the responsive layout composable:

```vue
<script>
import { useResponsiveLayout } from '@/composables/useResponsiveLayout'

export default {
  setup() {
    const {
      layoutMode,      // Current mode: 'mobile' | 'tablet' | 'desktop' | 'large'
      isMobile,        // Boolean: true if mobile
      isTablet,        // Boolean: true if tablet
      isDesktop,       // Boolean: true if desktop
      isLarge,         // Boolean: true if large
      
      // Panel utilities
      shouldUseOverlay,        // Check if panel should be overlay
      canResizePanel,          // Check if panel can be resized
      getResponsivePanelWidth  // Get constrained panel width
    } = useResponsiveLayout()
    
    return {
      layoutMode,
      isMobile,
      // ...
    }
  }
}
</script>
```

### Conditional Rendering Based on Screen Size

```vue
<template>
  <div>
    <!-- Show different content based on layout mode -->
    <div v-if="isMobile">
      <MobileView />
    </div>
    
    <div v-else-if="isTablet">
      <TabletView />
    </div>
    
    <div v-else>
      <DesktopView />
    </div>
    
    <!-- Conditional classes -->
    <div :class="{ 'compact': isMobile || isTablet }">
      Content
    </div>
  </div>
</template>
```

### Creating Responsive Panels

```vue
<template>
  <div
    class="my-panel"
    :class="{ 
      'overlay-panel': shouldUseOverlay('myPanel'),
      'docked-panel': !shouldUseOverlay('myPanel')
    }"
    :style="{ 
      width: myWidth + 'px',
      maxWidth: isMobile ? '90vw' : '500px'
    }"
  >
    <!-- Panel content -->
  </div>
  
  <!-- Backdrop for overlay mode -->
  <div 
    v-if="isPanelVisible && shouldUseOverlay('myPanel')"
    class="panel-backdrop"
    @click="closePanel"
  />
</template>
```

---

## 📏 CSS Classes

### Layout Mode Classes

Applied to the main layout container:

```css
.layout-mode-mobile { /* Mobile styles */ }
.layout-mode-tablet { /* Tablet styles */ }
.layout-mode-desktop { /* Desktop styles */ }
.layout-mode-large { /* Large desktop styles */ }

.is-mobile { /* Mobile-specific styles */ }
.is-tablet { /* Tablet-specific styles */ }
.is-desktop { /* Desktop-specific styles */ }
```

### Panel Classes

```css
.overlay-panel {
  position: fixed;
  z-index: 999;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  animation: slideInFromRight 0.3s ease-out;
}

.docked-panel {
  position: relative;
  transition: width 0.2s ease;
}

.panel-backdrop {
  position: fixed;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 998;
}
```

---

## 🎛️ Configuration

### Customizing Breakpoints

Edit `src/composables/useResponsiveLayout.js`:

```javascript
const BREAKPOINTS = {
  mobile: 480,      // Adjust as needed
  tablet: 768,      // Adjust as needed
  desktop: 1024,    // Adjust as needed
  large: 1440,      // Adjust as needed
  xlarge: 1920      // Adjust as needed
}
```

### Panel Width Constraints

The system automatically constrains panel widths:

```javascript
// Maximum panel width: 40% of screen width
const maxPanelWidth = Math.floor(windowWidth * 0.4)

// Minimum panel width
const minPanelWidth = isMobile ? 280 : 200
```

---

## 🐛 Development Tools

### Layout Mode Indicator

A visual indicator shows the current layout mode during development:

```vue
<LayoutModeIndicator :show="showDebugMode" />
```

**Shows:**
- 📱 Mobile (red badge)
- 📱 Tablet (yellow badge)
- 💻 Desktop (green badge)
- 🖥️ Large Desktop (blue badge)
- Current screen width

**Toggle:**
Press `Ctrl+?` to show/hide debug information

---

## ✅ Best Practices

### 1. **Always Test on Multiple Devices**
- Use browser DevTools device emulation
- Test on real devices when possible
- Check both portrait and landscape orientations

### 2. **Use Responsive Utilities**
```vue
// ✅ Good
<div :class="{ 'compact': isMobile || isTablet }">

// ❌ Avoid
<div :class="{ 'compact': windowWidth < 768 }">
```

### 3. **Respect Touch Targets**
- Minimum button size: 44x44px on touch devices
- Adequate spacing between interactive elements
- Test with finger, not just mouse

### 4. **Handle Panel State**
```javascript
// Watch for layout changes and adjust panels
watch(layoutMode, (newMode) => {
  if (isMobile.value) {
    // Close non-essential panels
    closeSidePanels()
  }
})
```

### 5. **Optimize Performance**
- The resize handler is automatically debounced
- Avoid complex calculations on every resize
- Use CSS transitions for smooth animations

---

## 🔧 Troubleshooting

### Problem: Panels not showing correctly on mobile

**Solution:**
- Ensure panel has `.overlay-panel` class
- Check `shouldUseOverlay()` is called correctly
- Verify backdrop is rendered

### Problem: Resizing doesn't work smoothly

**Solution:**
- Check if `canResizePanel()` returns true
- Ensure resize handler is not blocked
- Verify width constraints are reasonable

### Problem: Layout jumps when switching modes

**Solution:**
- Add CSS transitions to affected elements
- Use `getResponsivePanelWidth()` for smooth width changes
- Test debounce timing (currently 100ms)

---

## 📊 Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |
| Mobile Safari | iOS 14+ | Touch optimized |
| Chrome Mobile | Android 5+ | Touch optimized |

---

## 🎯 Future Enhancements

Potential improvements for future versions:

- [ ] **Multi-panel layouts** - Side-by-side panels on ultra-wide screens
- [ ] **Custom breakpoints** - User-defined breakpoints via settings
- [ ] **Panel animations** - More sophisticated transitions
- [ ] **Saved layouts** - User-specific layout preferences
- [ ] **Accessibility** - Enhanced keyboard navigation
- [ ] **RTL support** - Right-to-left language support

---

## 📚 Additional Resources

- [CSS Media Queries (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries)
- [Responsive Web Design Basics (Google)](https://web.dev/responsive-web-design-basics/)
- [Touch Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

---

## 🤝 Contributing

Found a bug or have a suggestion? Please:

1. Check existing issues
2. Create a detailed bug report or feature request
3. Include screenshots/videos if possible
4. Specify device/browser information

---

**Last Updated:** October 2025  
**Version:** 1.0.0

