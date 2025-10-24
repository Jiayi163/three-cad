# Silent Auto-Save/Auto-Restore Implementation

## Overview

The CAD application now features **silent auto-save and auto-restore** functionality that automatically persists your work and restores it on page refresh (Ctrl+R/F5).

## Key Features

### ✅ Silent Auto-Save
- **Automatically saves** scene state to IndexedDB on every change
- **Debounced** (500ms) to avoid excessive writes
- **Silent mode** by default - no intrusive notifications
- **Triggers on**:
  - Object creation/deletion
  - Material/texture changes
  - Texture repeat adjustments
  - Background/environment changes
  - Any document modification

### ✅ Auto-Restore
- **Automatically restores** saved state on page load
- Works with **browser refresh** (Ctrl+R / F5)
- Works when **closing/reopening tab**
- **Preserves**:
  - All 3D geometry and objects
  - Materials and textures (stored as Blobs)
  - Texture repeat settings
  - Background/environment (including EXR)
  - Camera position and settings
  - Renderer configuration

### ✅ User Control
- **Toggle** in Persistence menu (💾 icon in top-right)
- **Enabled by default**
- Settings persisted in localStorage
- Can be disabled if needed

## How It Works

### Auto-Save Flow

```
User creates object
  ↓
Document.addNode() called
  ↓
Document._markModified() sets isModified flag
  ↓
ThreeView listens for isModified change
  ↓
ThreeView._triggerAutoSave() called
  ↓
ThreeView.saveSceneState() saves to IndexedDB (debounced 500ms)
  ↓
State saved silently in background
```

### Auto-Restore Flow

```
User opens page / presses Ctrl+R
  ↓
ThreeView.setDom() attaches to DOM
  ↓
ThreeView._tryAutoRestore() checks for saved state
  ↓
If saved state exists → loadState() from IndexedDB
  ↓
restoreScene() reconstructs:
  - Three.js scene from JSON
  - Textures from Blob storage
  - Camera from saved position
  - Environment/background
  ↓
Scene fully restored
  ↓
User sees exactly what they had before refresh
```

## Architecture

### New Files

1. **`src/packages/cad-core/io/AutoSaveSettings.js`**
   - Global settings for auto-save/restore
   - localStorage persistence
   - Configurable debounce delay, silent mode, etc.

### Modified Files

2. **`src/packages/cad-three/ThreeView.js`**
   - Added `_tryAutoRestore()` - runs on DOM attachment
   - Added `_triggerAutoSave()` - debounced save trigger
   - Added `_setupDocumentListeners()` - listens for document changes
   - Modified `saveSceneState()` - respects auto-save settings
   - Modified `registerTexture()` - triggers auto-save
   - Modified `registerEnvironment()` - triggers auto-save

3. **`src/packages/cad-core/io/ScenePersistence.js`**
   - Added silent mode support
   - Reduced console logging when silent

4. **`src/components/ui/PersistenceIndicator.vue`**
   - Added auto-save toggle checkbox
   - Updated UI to show auto-save status
   - Shows "Auto-saved X minutes ago" tooltip

## Settings API

```javascript
import {
  isAutoSaveEnabled,
  setAutoSaveEnabled,
  isAutoRestoreEnabled,
  setAutoRestoreEnabled,
  getAutoSaveSettings,
  setAutoSaveSettings
} from '@/packages/cad-core/io/AutoSaveSettings.js'

// Check if auto-save is enabled
const enabled = isAutoSaveEnabled() // true by default

// Enable/disable auto-save
setAutoSaveEnabled(false) // Disables auto-save

// Get all settings
const settings = getAutoSaveSettings()
// {
//   enabled: true,
//   debounceMs: 500,
//   silentMode: true,
//   autoRestore: true,
//   saveOnChange: true,
//   saveOnMaterial: true,
//   saveOnCamera: false,
//   saveOnBackground: true
// }

// Update settings
setAutoSaveSettings({
  debounceMs: 1000, // Increase debounce delay
  silentMode: false // Show console logs
})
```

## Testing

### Test Auto-Save
1. Create a box (press B, click twice)
2. Open DevTools console
3. Look for: `💾 Scene state auto-saved` (if silent mode off)
4. Press Ctrl+R to refresh page
5. ✅ Box should still be there!

### Test with Materials
1. Create a sphere
2. Apply a material (click Materials button)
3. Upload a custom texture
4. Adjust texture repeat to 2×2
5. Press Ctrl+R
6. ✅ Sphere with custom texture and repeat settings restored!

### Test with Background
1. Click Scene button
2. Upload an EXR background
3. Apply it
4. Press Ctrl+R
5. ✅ EXR background restored!

### Test Toggle
1. Click 💾 icon in top-right
2. Uncheck "Auto-Save: Enabled"
3. Create objects
4. Press Ctrl+R
5. ✅ Objects gone (auto-save was disabled)
6. Re-enable auto-save
7. Create objects again
8. Press Ctrl+R
9. ✅ Objects restored!

## Acceptance Criteria ✅

✅ **Create objects/materials, adjust texture repeat, set EXR background → press Ctrl+R → page reloads with everything restored exactly**

✅ **Close/reopen the tab → state still restored**

✅ **Large textures work (stored as Blob in IndexedDB, not base64)**

✅ **No "white" background regressions on restore** (renderer created with alpha:false)

✅ **Provide a single toggle in Settings: "Enable Auto-Save" (on by default)**

## Performance

- **Debounced saves**: Only saves 500ms after last change (prevents excessive writes)
- **Efficient storage**: Textures stored as Blobs, not base64
- **Lazy restore**: Only restores when needed (on page load)
- **Silent by default**: No UI disruption

## Browser Compatibility

- **IndexedDB required**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **localStorage required**: For settings persistence
- **Blob support required**: For texture storage

## Future Improvements

- [ ] Add camera auto-save option (currently disabled to avoid excessive saves)
- [ ] Add versioned state history (keep last N versions)
- [ ] Add cloud sync option
- [ ] Add import/export state to file
- [ ] Add compression for scene JSON

---

**Status**: ✅ Complete and Production-Ready
**Tested**: All acceptance criteria met
**Performance**: Optimized with debouncing
**User Experience**: Silent and seamless

