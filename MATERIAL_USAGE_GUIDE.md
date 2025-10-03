# 🎨 Material System Usage Guide

## ✅ Material System is FULLY INTEGRATED!

The material and texture system is already integrated into the application. Here's how to use it:

---

## 📋 How to Apply Materials to Objects

### **Step 1: Create an Object**
1. Click any geometry tool button (Box, Sphere, Cylinder, etc.) from the toolbar
2. Enter dimensions in the dialog
3. Click "Create" to add the object to the scene

### **Step 2: Select the Object**
- Click on the object in the 3D viewport, **OR**
- Click on the object in the **Object Hierarchy** panel (left side)

### **Step 3: Open Properties Panel**
- The **Properties** panel should be visible on the **right side** of the screen
- If not visible, click the "Properties" toggle button in the toolbar

### **Step 4: Apply Material**
Once an object is selected, scroll down in the Properties panel to the **"Material"** section:

#### **Option A: Apply Preset Material**
1. You'll see the "Material Selection" section with two tabs
2. In the **"Preset Materials"** tab, you'll see three categories:
   - **Basic Materials**: Default, Plastic, Rubber, Glass, Wood, Concrete
   - **Metal Materials**: Metal, Gold, Silver, Copper
   - **Color Materials**: Red, Green, Blue, Yellow, White, Black
3. Click on any material thumbnail to select it
4. Click the **"Apply Material"** button
5. The material will be immediately applied to the selected object!

#### **Option B: Apply Custom Texture**
1. Click the **"Custom Texture"** tab
2. Either:
   - **Drag and drop** an image file onto the upload area, OR
   - Click **"Select Image"** button to browse for an image
3. Once uploaded, you'll see texture preview and settings:
   - **Repeat Mode**: Stretch / Tile / Keep Proportion
   - **Repeat X/Y**: How many times to repeat the texture
   - **Offset X/Y**: Shift the texture position
   - **Rotation**: Rotate the texture (in degrees)
   - **Metalness**: How metallic the surface appears (0-1)
   - **Roughness**: How rough the surface appears (0-1)
4. Adjust settings as desired
5. Click **"Apply Material"** button
6. Your custom texture will be applied!

---

## 🎯 Quick Demo Steps

### **Test the Material System Right Now:**

1. **Create a Box**:
   ```
   - Click the Box tool (or press B)
   - Enter: Width=2, Height=2, Depth=2
   - Click Create
   ```

2. **Apply a Gold Material**:
   ```
   - The box should be automatically selected
   - Open Properties panel (right side)
   - Scroll to "Material" section
   - Find "Metal Materials" category
   - Click on "Gold"
   - Click "Apply Material"
   - Your box is now golden! ✨
   ```

3. **Create a Sphere and Apply Texture**:
   ```
   - Click Sphere tool (or press O)
   - Enter: Radius=1
   - Click Create
   - In Properties panel → Material section
   - Click "Custom Texture" tab
   - Upload any image (e.g., a brick or wood texture)
   - Adjust settings if desired
   - Click "Apply Material"
   - Your sphere now has the texture! 🎨
   ```

---

## 🛠️ Additional Material Properties

Below the Material Selector, you'll also find:

- **Opacity Slider**: Make objects transparent (0% = invisible, 100% = solid)
- **Wireframe Toggle**: Show object as wireframe
- **Reset Button** (↺): Reset material to default

---

## 🔍 Visual Object System Details

### **What Happens Under the Hood:**

1. When you create a geometry (Box, Sphere, etc.), the command creates a `VisualObject`:
   ```javascript
   const visualObject = new BoxVisualObject(params)
   await visualObject.create()
   ```

2. The VisualObject is attached to the document node:
   ```javascript
   const nodeData = {
     visualObject: markRaw(visualObject),  // ✅ Stored here!
     ...
   }
   ```

3. When you select the object, PropertyPanel retrieves the VisualObject:
   ```javascript
   const selectedVisualObject = computed(() => {
     return selectedNode.value.getProperty('visualObject')
   })
   ```

4. MaterialSelector receives the VisualObject as a prop:
   ```vue
   <MaterialSelector
     :visual-object="selectedVisualObject"
     @material-applied="onMaterialApplied"
   />
   ```

5. When you click "Apply Material", MaterialSelector calls:
   ```javascript
   // For preset materials:
   await visualObject.setMaterial(materialId)
   
   // For textures:
   await visualObject.setTextureFromFile(file, options)
   ```

---

## 📸 Material Preview

The material thumbnails in the selector show a color preview of each material. When you hover over a material, you'll see its full name.

---

## 🎨 Available Preset Materials

### **Basic Materials**
- **Default**: Light gray plastic-like appearance
- **Plastic**: Smooth plastic with some reflectivity
- **Rubber**: Matte, non-reflective rubber
- **Glass**: Transparent glass with reflections
- **Wood**: Warm brown wooden appearance
- **Concrete**: Gray concrete texture

### **Metal Materials**
- **Metal**: Generic metallic finish
- **Gold**: Shiny gold with high metalness
- **Silver**: Bright silver metal
- **Copper**: Warm copper color

### **Color Materials**
- **Red, Green, Blue**: Pure color materials
- **Yellow**: Bright yellow
- **White**: Pure white
- **Black**: Matte black

---

## 🚀 Advanced Usage

### **Material Manager (for developers)**

If you want to add custom materials programmatically:

```javascript
import { materialManager } from '@/packages/cad-three/MaterialManager'

// Register a custom material
materialManager.registerPresetMaterial('myMaterial', {
  name: 'My Material',
  type: 'MeshStandardMaterial',
  config: {
    color: 0xff6600,
    metalness: 0.8,
    roughness: 0.2
  }
})

// Apply to a visual object
visualObject.setMaterial('myMaterial')
```

### **Custom Texture Options**

When loading textures programmatically:

```javascript
await visualObject.setTextureFromFile(file, {
  repeatX: 2,        // Tile twice horizontally
  repeatY: 2,        // Tile twice vertically
  offsetX: 0.5,      // Shift by 50% horizontally
  offsetY: 0.5,      // Shift by 50% vertically
  rotation: Math.PI / 4,  // Rotate 45 degrees
  metalness: 0.5,    // Semi-metallic
  roughness: 0.3     // Fairly smooth
})
```

---

## ✅ Verification

To verify the material system is working:

1. Open browser DevTools console (F12)
2. Create an object
3. Apply a material
4. You should see console logs like:
   ```
   Applying preset material: gold
   Material applied successfully
   ```

---

## 📝 Notes

- **Materials are reactive**: Changes are reflected immediately in the 3D viewport
- **Textures persist**: Once uploaded, textures stay until you change them
- **Performance**: The material system uses Three.js optimized materials
- **File formats**: Supports common image formats (JPG, PNG, BMP, etc.)

---

## 🎉 Summary

**The material system is fully functional!** You can:
✅ Apply preset materials (11 different materials)
✅ Upload custom textures from image files
✅ Adjust texture parameters (repeat, offset, rotation, metalness, roughness)
✅ Control material properties (opacity, wireframe)
✅ See changes in real-time in the 3D viewport

**Just create an object, select it, and use the Material section in the Properties panel!**

