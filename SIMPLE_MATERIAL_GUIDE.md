# 🎨 Simple Material Selection Guide

## 📋 Overview

A simplified material selection panel has been added to the main interface, following Three.js simple design principles.

---

## 🚀 How to Use

### **Step 1: Open Material Panel**

Look at the **toolbar** at the top of the screen. On the right side, you'll see a **🎨 (palette) button**.

Click this button to **open/close** the Material Selection panel.

---

### **Step 2: Select a Material**

The floating panel will appear on the right side of the viewport with:

#### **Basic Materials (6 options)**:
1. **Standard** - Gray standard material (default)
2. **Metal** - Silver metallic appearance
3. **Plastic** - Blue plastic-like finish
4. **Glass** - Light blue glass effect
5. **Wood** - Brown wooden texture
6. **Rubber** - Dark rubber material

Click on any material card to select it (it will highlight with a blue border).

---

### **Step 3: Import Custom Texture (Placeholder)**

Below the material grid, you'll find the **"Import Image"** section:
- 📁 Icon with "Click to upload texture" text
- This is a **placeholder** for future texture import functionality
- Currently shows an alert: "Texture import functionality will be implemented in the future"

---

### **Step 4: Apply Material**

After selecting a material, click the **"Apply Material"** button at the bottom.

**Current Behavior** (Demo Mode):
- Shows an alert confirming which material was selected
- Console logs the action
- Full integration with 3D objects will be implemented in the next phase

---

## 🎯 UI Features

### **Simple & Clean Design**
- ✅ Minimal interface (no complex hierarchy)
- ✅ Quick material preview with color swatches
- ✅ Easy toggle on/off from toolbar
- ✅ Floating panel doesn't block the viewport
- ✅ Smooth animations

### **Material Preview**
- Each material shows a colored square preview
- Material name displayed below
- Selected material has blue highlight
- Hover effect for better interaction

### **Responsive Positioning**
- Panel floats at top-right of viewport
- Stays out of the way during modeling
- Slides in smoothly when opened
- Can be closed by clicking the 🎨 button again

---

## 📐 Technical Details

### **Component Structure**

```
SimpleMaterialPanel.vue
├── Material Section (6 basic materials)
├── Texture Import Section (placeholder)
└── Apply Button
```

### **Integration Points**

The panel is integrated into `MainLayout.vue`:
- **Toolbar Button**: 🎨 icon in top-right toolbar
- **Floating Position**: Absolute positioned in viewport area
- **Toggle State**: `showMaterialPanel` controls visibility

---

## 🔮 Future Implementation

### **Texture Import (To Be Implemented)**

When clicked, the Import Image area will:
1. Open file browser dialog
2. Accept image files (PNG, JPG, etc.)
3. Load texture onto selected 3D object
4. Apply texture with proper UV mapping

### **Material Application (To Be Implemented)**

The Apply Material button will:
1. Get currently selected 3D object
2. Create Three.js material based on selection
3. Apply material to object's mesh
4. Update viewport to show changes

---

## 🎨 Material Properties (Reference)

Based on Three.js material types:

- **Standard**: `MeshStandardMaterial` - General purpose PBR material
- **Metal**: High metalness, low roughness
- **Plastic**: Medium metalness, medium roughness  
- **Glass**: Transparent, high transmission
- **Wood**: Textured, natural color
- **Rubber**: Matte finish, high roughness

---

## 💡 Usage Tips

1. **Quick Access**: Use the 🎨 button for fast material changes
2. **Stay Focused**: Panel doesn't interfere with modeling workflow
3. **Visual Feedback**: Color previews help quick selection
4. **Simple Workflow**: Select → Apply → Done

---

## 📝 Summary

✅ **Implemented**:
- Simple material selection panel
- 6 basic preset materials
- Toggle button in toolbar
- Floating UI design
- Import Image placeholder

⏳ **To Be Implemented**:
- Actual texture file import
- Material application to 3D objects
- Advanced material properties
- Texture parameter controls

---

## 🔧 For Developers

### **To Connect Material Application**:

```javascript
// In SimpleMaterialPanel.vue - applyMaterial method
const applyMaterial = () => {
  // 1. Get selected object from scene
  const selectedObject = getSelectedObject()
  
  // 2. Create Three.js material
  const material = createThreeMaterial(selectedMaterial.value)
  
  // 3. Apply to object
  selectedObject.material = material
  
  // 4. Update viewport
  updateViewport()
}
```

### **To Implement Texture Import**:

```javascript
// In SimpleMaterialPanel.vue - handleImportClick method  
const handleImportClick = () => {
  // 1. Open file dialog
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  
  input.onchange = (e) => {
    const file = e.target.files[0]
    // 2. Load texture
    const loader = new THREE.TextureLoader()
    loader.load(URL.createObjectURL(file), (texture) => {
      // 3. Apply to selected object
      applyTextureToObject(texture)
    })
  }
  
  input.click()
}
```

---

**Simple. Fast. Effective.** 🎨

