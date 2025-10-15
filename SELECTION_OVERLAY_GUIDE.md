# Selection Overlay System

## Overview

The selection overlay system has been completely redesigned to use **outline-based selection** instead of material color changes.

## Changes Made

### 1. **Layer-Based Interaction System** (`ThreeView.js`)

Implemented a two-layer system to separate interactive and non-interactive objects:

- **LAYER_INTERACTIVE (0)**: Real selectable objects (boxes, spheres, cylinders, etc.)
- **LAYER_NON_INTERACTIVE (1)**: Helpers (grid, axes, gizmos) that should never be selectable

```javascript
// Helpers are placed on non-interactive layer
gridHelper.layers.set(this.LAYER_NON_INTERACTIVE)
axesHelper.layers.set(this.LAYER_NON_INTERACTIVE)

// Raycaster only checks interactive layer
this.raycaster.layers.set(this.LAYER_INTERACTIVE)

// Camera renders both layers (so helpers are visible)
camera.layers.enableAll()
```

### 2. **Disabled Hover Effects**

- **Removed all hover highlighting** - no blue outlines on mouseover
- **Selection is click-based only** - red outlines appear on click and persist
- `_onMouseMove()` no longer updates hover state
- `_setObjectHover()` is now a no-op

### 3. **New SelectionOverlay Class** (`src/packages/cad-three/SelectionOverlay.js`)

A new utility class that creates smart outline overlays for different geometry types:

- **Box/Cube**: Shows all 12 edges using `EdgesGeometry`
- **Sphere**: Shows guide lines (equator + 2 meridians) - not a dense wireframe
- **Cylinder**: Shows top and bottom circle rims + 4 vertical guides
- **Torus**: Shows outer/inner rings + 4 cross-section circles
- **Generic**: Fallback to `EdgesGeometry` for unknown shapes

### 4. **Selection Colors**
- **Selected**: Red outline (`0xff0000`) - **PERSISTENT** until deselected
- **Hover**: ~~Blue outline (`0x4444ff`)~~ - **DISABLED** (no hover effects)

### 5. **Fixed Issues**

✅ **Grid/Axes no longer highlight**: Helpers are on non-interactive layer and have `raycast = () => {}` to completely disable picking

✅ **No blue connecting lines**: Removed all hover-driven line generation logic

✅ **Selection is persistent**: Red outlines appear on click and stay until deselection (not just on hover)

✅ **Only real objects are selectable**: Raycaster filters to only meshes on interactive layer, excluding overlays themselves

### 6. **Z-Fighting Prevention**
The overlay is scaled by 1.001 to avoid z-fighting with the original geometry.

### 7. **Transform Inheritance**
The overlay is added as a child of the selected mesh, so it automatically inherits all transforms (position, rotation, scale).

## Updated Files

### `ThreeView.js`
- Imported `SelectionOverlay`
- Updated `_setObjectSelected()` to use `SelectionOverlay.applySelection()` / `clearSelection()`
- Updated `_setObjectHover()` to use overlay instead of material changes

### `VisualObject.js`
- Updated `_updateMaterialState()` to always use 'default' material
- Selection/highlighting no longer change the base material
- Added comment explaining that overlays handle visual feedback

### `GeometryFactory.js`
- Added `userData.type` to all created geometries:
  - Box → `geometry.userData.type = 'box'`
  - Sphere → `geometry.userData.type = 'sphere'`
  - Cylinder → `geometry.userData.type = 'cylinder'`
  - Torus → `geometry.userData.type = 'torus'`

## API

### Selection Overlay API

```javascript
import { SelectionOverlay } from './packages/cad-three/SelectionOverlay.js'

// Apply red selection overlay
SelectionOverlay.applySelection(object3D, false)

// Apply blue hover overlay
SelectionOverlay.applySelection(object3D, true)

// Remove overlay
SelectionOverlay.clearSelection(object3D)

// Dispose of static materials (cleanup)
SelectionOverlay.dispose()
```

## How It Works

1. **Geometry Detection**: 
   - First checks `geometry.userData.type`
   - Falls back to `geometry.parameters` analysis
   - Returns 'box', 'sphere', 'cylinder', 'torus', or 'generic'

2. **Overlay Creation**:
   - Creates appropriate line geometry for the detected type
   - Uses `THREE.Line` or `THREE.LineSegments`
   - Applies red (selection) or blue (hover) material
   - Scales to 1.001 to avoid z-fighting

3. **Overlay Management**:
   - Overlay is added as child of the selected object
   - Marked with `userData.isSelectionOverlay = true`
   - Automatically inherits transforms from parent
   - Disposed when selection is cleared

## Testing

To test the new selection system:

1. **Start the application**: `npm run dev`
2. **Create different shapes**: Box, Sphere, Cylinder, Torus
3. **Click on objects**: They should show red outlines (not change color) and **PERSIST**
4. **Hover over objects**: **NO EFFECT** (hover highlighting disabled)
5. **Hover over grid/axes**: **NO EFFECT** (helpers are non-selectable)
6. **Deselect (click empty space)**: Outlines should disappear completely
7. **Selection persists**: Red outlines stay until you click elsewhere

## Benefits

### ✅ Preserves Original Appearance
- Objects maintain their original materials, colors, and textures
- No more "red fill" on selection

### ✅ Clean Visual Feedback
- Crisp, clear outline indicates selection
- Different colors for selection (red) vs hover (blue)

### ✅ Geometry-Aware
- Each shape type gets appropriate guide lines
- Spheres show 3 circles (not dense wireframe)
- Cylinders show rims and guides (not full mesh edges)

### ✅ Performance
- Lightweight line geometry
- Minimal overdraw
- Efficient reuse of materials

### ✅ No Material Conflicts
- Works with any material (standard, textured, custom)
- No interference with material properties
- Easy to add/remove

## Future Enhancements

Possible improvements:
- Configurable outline colors
- Thickness control (currently limited by WebGL)
- Dashed lines for different states
- Animated outlines
- Multiple selection color schemes

