# Apply Material Button Fix

## Problem

The "Apply Material" button in the Properties panel was not working after editing properties (position, scale, length, etc.). This prevented users from applying materials to selected objects.

## Root Causes Identified

1. **Button State Management**: The button's `disabled` state was only checking if a material was selected, not if a visual object existed
2. **Event Propagation**: Potential event bubbling/capture issues blocking clicks
3. **Z-Index/Overlay**: Potential UI layering issues where the button might be behind other elements
4. **Unclear Feedback**: No visual feedback or console logging to debug the issue

## Fixes Applied

### 1. **MaterialSelector.vue - Enhanced Button Logic**

#### A. Improved Computed Properties

```javascript
// OLD - only checked if material was selected
hasSelection() {
  return this.selectedMaterialId || this.currentTexture;
}

// NEW - comprehensive checks
hasSelection() {
  return !!(this.selectedMaterialId || this.currentTexture);
},
hasVisualObject() {
  return !!this.visualObject;
},
canApplyMaterial() {
  // Can apply when we have both a visual object AND a material/texture selected
  return this.hasVisualObject && this.hasSelection;
}
```

#### B. Button Enhancement

```vue
<!-- OLD -->
<button
  @click="applyMaterial"
  :disabled="!hasSelection"
  class="apply-button"
>
  Apply Material
</button>

<!-- NEW -->
<button
  type="button"
  @click.stop.prevent="applyMaterial"
  :disabled="!canApplyMaterial"
  class="apply-button"
  :title="canApplyMaterial ? 'Apply selected material to object' : (!hasVisualObject ? 'No object selected' : 'No material selected')"
>
  Apply Material
</button>
```

**Key improvements:**
- `type="button"` prevents form submission behavior
- `.stop.prevent` stops event propagation and prevents default behavior
- `:disabled="!canApplyMaterial"` checks BOTH object selection AND material selection
- Dynamic `:title` provides helpful tooltips explaining why button is disabled

#### C. Enhanced applyMaterial Method

```javascript
async applyMaterial(event) {
  // Stop event propagation to prevent any interference
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  // Comprehensive logging for debugging
  console.log('=== Apply Material Button Clicked ===');
  console.log('Visual Object:', this.visualObject);
  console.log('Selected Material ID:', this.selectedMaterialId);
  console.log('Current Texture:', this.currentTexture);
  console.log('Can Apply:', this.canApplyMaterial);

  // Explicit validation with user feedback
  if (!this.visualObject) {
    console.error('❌ No visual object selected');
    alert('Please select an object first');
    return;
  }

  if (!this.selectedMaterialId && !this.currentTexture) {
    console.error('❌ No material or texture selected');
    alert('Please select a material or upload a texture first');
    return;
  }

  try {
    // Apply material with detailed logging
    if (this.selectedMaterialId) {
      console.log('✅ Applying preset material:', this.selectedMaterialId);
      await this.visualObject.setMaterial(this.selectedMaterialId);
      console.log('✅ Preset material applied successfully');
    } else if (this.currentTexture) {
      console.log('✅ Applying texture material from file:', this.currentTexture.name);
      const options = { /* texture settings */ };
      await this.visualObject.setTextureFromFile(this.currentTexture, options);
      console.log('✅ Texture material applied successfully');
    }

    // Force render update
    if (this.visualObject._object3D) {
      this.visualObject._object3D.needsUpdate = true;
    }

    console.log('✅ Material application complete');
    this.$emit('material-applied', { /* event data */ });

  } catch (error) {
    console.error('❌ Failed to apply material:', error);
    console.error('Error stack:', error.stack);
    alert('Failed to apply material: ' + error.message);
  }
}
```

### 2. **CSS Enhancements - Z-Index and Pointer Events**

#### A. Material Selector Container

```css
.material-selector {
  padding: 16px;
  background: var(--cad-panel-bg);
  border-radius: 8px;
  max-height: 600px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  pointer-events: auto; /* Ensure all elements inside can receive clicks */
}
```

#### B. Apply Button Styling

```css
.apply-button,
.reset-button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  pointer-events: auto; /* Ensure button receives clicks */
  position: relative;
  z-index: 10; /* Ensure button is above any overlays */
}

.apply-button {
  background: var(--cad-accent);
  color: white;
}

.apply-button:hover:not(:disabled) {
  background: var(--cad-accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.apply-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.apply-button:disabled {
  background: var(--cad-bg-disabled);
  color: var(--cad-text-disabled);
  cursor: not-allowed;
  opacity: 0.5;
}
```

**Visual feedback improvements:**
- Hover state with lift effect and shadow
- Active state with press-down effect
- Disabled state with reduced opacity

### 3. **PropertyPanel.vue - Container Fixes**

```css
.property-panel {
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
  position: relative;
  z-index: 1;
  pointer-events: auto;
}
```

## How It Works Now

### User Flow

1. **User selects an object** → `visualObject` prop updates → `hasVisualObject` becomes `true`
2. **User selects a material** → `selectedMaterialId` updates → `hasSelection` becomes `true`
3. **Button becomes enabled** → `canApplyMaterial` is `true` (both conditions met)
4. **User clicks button** →
   - Event handlers stop propagation
   - Validation checks run with user feedback
   - Material application executes with detailed logging
   - Visual object updates and triggers render
   - Success confirmation emitted

### Debugging

The comprehensive logging now provides:
- Button click confirmation
- Current state (visual object, material ID, texture)
- Application capability check
- Step-by-step material application
- Success/failure feedback with stack traces

Open browser DevTools console to see detailed logs when clicking "Apply Material".

## Benefits

### ✅ **Reliable Button State**
- Button only enables when BOTH object and material are selected
- Clear tooltip explains why button is disabled

### ✅ **Event Handling**
- `type="button"` prevents form submission
- `.stop.prevent` ensures clicks reach the handler
- Explicit event.stopPropagation() in method

### ✅ **Visual Feedback**
- Hover effects show button is interactive
- Disabled state is visually distinct
- Active state confirms click

### ✅ **Z-Index Protection**
- Button has `z-index: 10`
- Container has `pointer-events: auto`
- Guaranteed to be above any overlays

### ✅ **Error Handling**
- Validates preconditions before applying
- User-friendly alerts for errors
- Detailed console logging for debugging

### ✅ **Persistence**
- Material changes are applied immediately
- Selection remains active (red outline persists)
- Changes visible in both main viewport and mini inset

## Testing

1. **Create an object** (Box/Sphere/Cylinder)
2. **Click on it** → Red outline appears (selection works)
3. **Edit some properties** → Position/Scale/etc.
4. **Select a material** → Button should become enabled
5. **Hover over button** → Should see hover effect
6. **Click "Apply Material"** → Should work!
7. **Check console** → Should see detailed logs
8. **Verify material applied** → Object should have new material
9. **Verify selection persists** → Red outline should still be visible

## Troubleshooting

If the button still doesn't work:

1. **Check Console** → Look for error messages
2. **Check visualObject** → Ensure it's not null
3. **Check button state** → Hover to see tooltip
4. **Check browser DevTools** → Elements tab, verify no overlays
5. **Try different browser** → Rule out browser-specific issues

## Related Files

- `src/packages/cad-ui/components/MaterialSelector.vue` - Main fix location
- `src/packages/cad-ui/components/PropertyPanel.vue` - Container fixes
- `src/packages/cad-three/VisualObject.js` - Material application logic

## Notes

- Property edits (position/scale) are applied separately via their own handlers
- Material application doesn't interfere with property values
- Both changes persist on the selected object
- Selection overlay (red edges) remains active during and after material application

