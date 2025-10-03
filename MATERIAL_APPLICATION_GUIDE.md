# 🎨 Material Application - Quick Guide

## ✅ Feature Complete!

Material application is now fully functional - colors and properties will change immediately when you apply materials.

---

## 🚀 How to Use

### **Step 1: Create an Object**
1. Click any geometry tool (Box, Sphere, Cylinder, Plane)
2. Enter dimensions in the dialog
3. Click "Create"

### **Step 2: Select the Object**
- Click on the object in the 3D viewport
- You'll see it highlighted/selected

### **Step 3: Open Material Panel**
- Click the **🎨** button in the top-right toolbar
- The Material Selection panel will appear

### **Step 4: Choose a Material**
- Click on any material card (Standard, Metal, Plastic, Glass, Wood, Rubber)
- The selected material will have a blue border

### **Step 5: Apply Material**
- Click the **"Apply Material"** button
- **The object's color will change immediately!** ✨

---

## 🎨 Material Types & Effects

### **1. Standard (Gray)**
- **Color**: Gray (#808080)
- **Properties**: Balanced metalness (0.3) and roughness (0.4)
- **Use**: General purpose, neutral appearance

### **2. Metal (Silver)**
- **Color**: Silver (#B0B0B0)
- **Properties**: High metalness (0.8), low roughness (0.2)
- **Effect**: Shiny, reflective metallic look

### **3. Plastic (Blue)**
- **Color**: Blue (#4A90E2)
- **Properties**: Low metalness (0.1), medium roughness (0.5)
- **Effect**: Smooth plastic finish with slight shine

### **4. Glass (Light Blue)**
- **Color**: Light Blue (#A0D8F8)
- **Properties**: Transparent (0.5 opacity), high transmission (0.9)
- **Effect**: See-through glass appearance

### **5. Wood (Brown)**
- **Color**: Brown (#8B6F47)
- **Properties**: No metalness (0), high roughness (0.8)
- **Effect**: Matte wooden texture

### **6. Rubber (Dark Gray)**
- **Color**: Dark Gray (#2C2C2C)
- **Properties**: No metalness (0), very high roughness (0.9)
- **Effect**: Matte, non-reflective rubber

---

## 💡 Tips & Tricks

### **Multiple Objects**
- Select multiple objects (hold Ctrl/Cmd while clicking)
- Apply material once - all selected objects change!

### **Visual Feedback**
- Selected materials show blue highlight in panel
- Button is disabled if no object is selected
- Hint text appears: "Select an object to apply material"

### **Real-time Changes**
- Materials apply instantly (no need to refresh)
- Colors change immediately in the 3D viewport
- Physical properties (metalness, roughness) also update

---

## 🔍 Behind the Scenes

### **Three.js Materials Used**

```javascript
// Standard, Metal, Plastic, Wood, Rubber
THREE.MeshStandardMaterial({
  color: materialColor,
  metalness: 0.0 - 0.8,
  roughness: 0.2 - 0.9
})

// Glass (special)
THREE.MeshPhysicalMaterial({
  color: materialColor,
  transmission: 0.9,
  transparent: true,
  opacity: 0.5
})
```

### **Application Process**

1. **Get Selection**: Retrieve selected nodes from application store
2. **Find Visual Object**: Access the Three.js mesh from node
3. **Create Material**: Build Three.js material based on type
4. **Apply to Mesh**: Set `object3D.material = newMaterial`
5. **Update Properties**: Store material info in node properties

---

## 🎯 Example Workflow

```
1. Create Box (width: 2, height: 2, depth: 2)
   → Box appears in gray

2. Click box to select it
   → Box highlights

3. Click 🎨 button
   → Material panel opens

4. Click "Wood" material card
   → Wood card highlights in blue

5. Click "Apply Material"
   → Box turns brown instantly! 🪵

6. Try "Metal" next
   → Box becomes shiny silver! ✨
```

---

## 🐛 Troubleshooting

### **Button is Disabled**
- ✅ Make sure you've selected an object first
- ✅ Click on the object in the 3D viewport

### **Nothing Happens**
- ✅ Check browser console for errors (F12)
- ✅ Ensure object was created successfully
- ✅ Try refreshing the page

### **Color Doesn't Match Preview**
- ✅ Lighting affects how colors appear
- ✅ Materials have metalness/roughness which changes appearance
- ✅ Glass is transparent, so background shows through

---

## 🔮 Coming Soon

- **Custom Textures**: Import your own images
- **Material Properties Editor**: Adjust metalness, roughness, etc.
- **Material Library**: Save and reuse custom materials
- **UV Mapping Controls**: Position textures precisely

---

## ✅ Summary

**Material application is fully working!**

- ✅ 6 different material types
- ✅ Real-time color changes
- ✅ Physical material properties (PBR)
- ✅ Multi-object support
- ✅ Simple, intuitive UI

**Just select → choose material → apply → done!** 🎨✨

