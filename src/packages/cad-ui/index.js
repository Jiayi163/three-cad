// CAD UI Package - Vue.js UI Components for CAD Application
// 
// This package provides UI components specifically designed for CAD applications,
// including toolbars, panels, property editors, and other specialized interfaces.

// Component exports
export { default as Toolbar } from './components/Toolbar.vue'
export { default as PropertyPanel } from './components/PropertyPanel.vue'
export { default as ObjectHierarchy } from './components/ObjectHierarchy.vue'
export { default as ToolPalette } from './components/ToolPalette.vue'
export { default as StatusBar } from './components/StatusBar.vue'

// Panel components
export { default as ResizablePanel } from './components/panels/ResizablePanel.vue'
export { default as PanelHeader } from './components/panels/PanelHeader.vue'
export { default as PanelContent } from './components/panels/PanelContent.vue'

// Form components for CAD properties
export { default as NumberInput } from './components/forms/NumberInput.vue'
export { default as VectorInput } from './components/forms/VectorInput.vue'
export { default as ColorPicker } from './components/forms/ColorPicker.vue'
export { default as MaterialSelector } from './components/forms/MaterialSelector.vue'

// Menu components
export { default as ContextMenu } from './components/menus/ContextMenu.vue'
export { default as DropdownMenu } from './components/menus/DropdownMenu.vue'
export { default as MenuButton } from './components/menus/MenuButton.vue'

// Viewport related components
export { default as ViewportControls } from './components/viewport/ViewportControls.vue'
export { default as ViewportTabs } from './components/viewport/ViewportTabs.vue'
export { default as ViewportOverlay } from './components/viewport/ViewportOverlay.vue'

// Utility functions
export * from './utils/layout'
export * from './utils/theme'
export * from './utils/keyboard'

// Constants and configurations
export { UI_CONSTANTS } from './constants/ui'
export { THEME_CONFIG } from './constants/theme'
export { KEYBOARD_SHORTCUTS } from './constants/keyboard'

// Composables
export { usePanel } from './composables/usePanel'
export { useToolbar } from './composables/useToolbar'
export { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
export { useContextMenu } from './composables/useContextMenu'

