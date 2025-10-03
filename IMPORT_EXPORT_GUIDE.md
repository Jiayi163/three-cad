# 📦 Import/Export System Guide

## Overview

The Three-CAD application now includes a comprehensive import/export system that allows you to save and load entire projects, including geometry, materials, and textures.

---

## ✨ Features

### **Project Export**
- ✅ **Complete project serialization** - Save all objects, materials, and settings
- ✅ **Embedded textures** - All custom textures are embedded as base64 data URLs
- ✅ **Metadata preservation** - Document information and creation dates maintained
- ✅ **Optional history** - Include undo/redo history in export (optional)
- ✅ **JSON format** - Human-readable and easy to share

### **Project Import**
- ✅ **Full project restoration** - Load complete projects with all data
- ✅ **Texture restoration** - Custom textures are automatically restored
- ✅ **Validation** - Files are validated before import
- ✅ **Error handling** - Clear error messages for invalid files
- ✅ **Drag & drop support** - Simply drag .json files into the import dialog

### **Image Import for Materials**
- ✅ **Supported formats** - JPEG, PNG, WebP, GIF
- ✅ **Drag & drop** - Drag images directly into material selector
- ✅ **File validation** - Automatic format checking
- ✅ **Memory management** - Proper cleanup of blob URLs

---

## 🚀 How to Use

### **Export a Project**

#### **Method 1: Using the Toolbar**
1. Click the **Export button** (📤) in the main toolbar
2. The Export Dialog will open with the active document's information
3. Enter a filename (or use the auto-generated one)
4. Choose options:
   - ✅ **Embed textures in file** - Include custom textures (recommended)
   - ⬜ **Include history data** - Include undo/redo history (optional)
5. Click **"Export"** button
6. The file will download automatically as `.json`

#### **Method 2: Using the File Menu**
1. Click **"File"** in the menu bar
2. Select **"Export Project..."**
3. Follow the same steps as Method 1

#### **Export Settings**
```javascript
// Default export options
{
  embedTextures: true,     // Embed all textures as base64 data
  includeHistory: false    // Don't include undo/redo history
}
```

---

### **Import a Project**

#### **Method 1: Using the Toolbar**
1. Click the **Import button** (📥) in the main toolbar
2. The Import Dialog will open
3. Choose one of these options:
   - **Drag & drop** a `.json` file into the upload area
   - Click **"Select File"** to browse for a file
4. The file will be validated automatically
5. If valid, click **"Import"** to load the project
6. The imported document will become the active document

#### **Method 2: Using the File Menu**
1. Click **"File"** in the menu bar
2. Select **"Import Project..."**
3. Follow the same steps as Method 1

#### **Validation Results**
The import dialog shows:
- ✅ **Valid files**: Document name, object count, texture count
- ❌ **Invalid files**: Error messages explaining what's wrong
- ⚠️ **Warnings**: Non-critical issues that won't prevent import

---

### **Import Images for Materials**

#### **In the Material Selector**
1. Select an object in the 3D viewport
2. Open the **Properties Panel** (right side)
3. Scroll to the **"Material"** section
4. Click the **"Custom Texture"** tab
5. Either:
   - **Drag and drop** an image file onto the upload area
   - Click **"Select Image"** to browse for an image
6. Adjust texture settings:
   - **Fit Mode**: Stretch, Tile, or Keep Aspect Ratio
   - **Repeat**: X and Y repetition values
   - **Offset**: Texture position offset
   - **Rotation**: Rotate the texture
   - **Metalness**: Material metalness (0-1)
   - **Roughness**: Material roughness (0-1)
7. Click **"Apply Material"** to apply to the selected object

#### **Supported Image Formats**
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)
- GIF (`.gif`)

---

## 📁 File Format

### **Export File Structure**
```json
{
  "version": "1.0.0",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "application": "Three-CAD",
  "document": {
    "id": "doc-abc123",
    "name": "My Project",
    "created": "2024-01-15T09:00:00.000Z",
    "lastSaved": "2024-01-15T10:30:00.000Z",
    "nodes": [
      {
        "id": "node-1",
        "name": "Box",
        "type": "box",
        "position": { "x": 0, "y": 0, "z": 0 },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "scale": { "x": 1, "y": 1, "z": 1 },
        "materialId": "gold",
        "textureId": "texture_123_abc"
      }
    ]
  },
  "textures": {
    "texture_123_abc": {
      "dataUrl": "data:image/png;base64,iVBORw0KG...",
      "originalName": "wood-texture.png",
      "mimeType": "image/png"
    }
  },
  "materials": {}
}
```

### **File Size Considerations**
- Basic project (no textures): **~5-20 KB**
- With small textures (< 1MB each): **~100-500 KB**
- With large textures (> 1MB each): **~1-5 MB**
- **Recommendation**: Optimize texture images before importing

---

## 🔧 Programmatic Usage

### **Export Document Programmatically**
```javascript
import { useApplicationStore } from '@/stores/application'

const appStore = useApplicationStore()

// Export with default options
await appStore.exportDocument()

// Export with custom options
await appStore.exportDocument(
  null,              // Use active document (or pass specific document)
  'my-project.json', // Custom filename
  {
    embedTextures: true,
    includeHistory: false
  }
)
```

### **Import Document Programmatically**
```javascript
import { useApplicationStore } from '@/stores/application'

const appStore = useApplicationStore()

// Import from file input
const fileInput = document.getElementById('file-input')
const file = fileInput.files[0]

await appStore.importDocument(file)
```

### **Validate Import File**
```javascript
import { useApplicationStore } from '@/stores/application'

const appStore = useApplicationStore()

const file = /* ... get file ... */
const validation = await appStore.validateImportFile(file)

if (validation.valid) {
  console.log('File is valid!')
  console.log('Document:', validation.info.documentName)
  console.log('Objects:', validation.info.nodeCount)
  console.log('Textures:', validation.info.textureCount)
} else {
  console.error('File is invalid:', validation.errors)
}
```

### **Using Export/Import Classes Directly**
```javascript
import { ProjectExporter, ProjectImporter } from '@/packages/cad-core/io'

// Export
const exportData = await ProjectExporter.exportDocument(document, {
  embedTextures: true,
  includeHistory: false
})

// Get export size
const size = ProjectExporter.getExportSize(exportData)
console.log(`Export size: ${size.kilobytes} KB`)

// Import
const document = await ProjectImporter.importFromFile(file, application)

// Validate
const validation = await ProjectImporter.validateFile(file)
```

---

## 🧪 Testing

### **Run Unit Tests**
```bash
# Run all import/export tests
npm run test src/packages/cad-core/io/__tests__

# Run specific test file
npm run test ImageLoader.test.js
npm run test ProjectExporter.test.js
npm run test ProjectImporter.test.js
```

### **Manual Testing Checklist**

#### **Export Testing**
- [ ] Export empty document
- [ ] Export document with multiple objects
- [ ] Export document with custom textures
- [ ] Export document with materials
- [ ] Verify exported file can be opened in text editor
- [ ] Check file size is reasonable

#### **Import Testing**
- [ ] Import previously exported file
- [ ] Import with drag & drop
- [ ] Import with file browser
- [ ] Import invalid JSON file
- [ ] Import file with wrong format
- [ ] Verify textures are restored correctly
- [ ] Verify object positions are correct

#### **Material Image Import Testing**
- [ ] Import JPEG image
- [ ] Import PNG image
- [ ] Import WebP image
- [ ] Import GIF image
- [ ] Import with drag & drop
- [ ] Import with file browser
- [ ] Reject invalid file format
- [ ] Apply texture to object
- [ ] Verify texture tiling works

---

## ⚠️ Known Limitations

1. **Large Files**: Exporting projects with many large textures can create very large files (> 10 MB)
   - **Solution**: Optimize texture images before importing

2. **Browser Memory**: Very large import files may cause browser memory issues
   - **Recommendation**: Keep individual exports under 20 MB

3. **History Data**: Including history in exports increases file size significantly
   - **Recommendation**: Only include history when necessary

4. **Texture Formats**: Some browsers may not support all image formats
   - **Recommendation**: Use JPEG or PNG for maximum compatibility

---

## 🐛 Troubleshooting

### **Export Issues**

**Problem**: Export button is disabled
- **Solution**: Make sure you have an active document open

**Problem**: Export fails with error
- **Solution**: Check browser console for specific error message
- **Solution**: Try exporting without history data

**Problem**: Export file is too large
- **Solution**: Reduce texture sizes before importing
- **Solution**: Export without embedded textures (textures won't be included)

### **Import Issues**

**Problem**: Import validation fails
- **Solution**: Make sure the file is a valid .json export file
- **Solution**: Try opening the file in a text editor to check if it's valid JSON

**Problem**: Textures don't appear after import
- **Solution**: Make sure textures were embedded in the original export
- **Solution**: Check browser console for texture loading errors

**Problem**: Objects are in wrong positions
- **Solution**: Make sure the export was created with the same version
- **Solution**: Try re-exporting the original project

### **Material Image Import Issues**

**Problem**: Image file rejected
- **Solution**: Make sure the file is JPEG, PNG, WebP, or GIF format
- **Solution**: Check the file isn't corrupted

**Problem**: Texture doesn't appear on object
- **Solution**: Make sure to click "Apply Material" after uploading
- **Solution**: Check that the object is selected

**Problem**: Texture looks distorted
- **Solution**: Adjust the "Fit Mode" setting (try "Tile" or "Keep Aspect Ratio")
- **Solution**: Adjust the "Repeat X/Y" values

---

## 📊 Performance Tips

1. **Optimize Textures**: Resize images to reasonable dimensions (e.g., 1024x1024) before importing
2. **Use Compression**: Use compressed image formats like JPEG for photos
3. **Limit Texture Count**: Avoid using too many unique textures in a single project
4. **Regular Exports**: Export your work regularly to avoid data loss
5. **Test Import**: After export, test importing the file to ensure it works

---

## 🎯 Best Practices

1. **Naming Convention**: Use descriptive filenames with dates (e.g., `project-name-2024-01-15.json`)
2. **Version Control**: Keep multiple export versions for important projects
3. **Backup Textures**: Keep original texture files separate from exports
4. **Test Imports**: Always test that exported files can be imported successfully
5. **Document Metadata**: Add meaningful names and metadata to your documents
6. **Clean Projects**: Remove unused objects before exporting to reduce file size

---

## 🔗 Related Documentation

- [Material System Guide](./MATERIAL_USAGE_GUIDE.md)
- [Testing Requirements](./.cursor/rules/testing-requirements.mdc)
- [Project Architecture](./.cursor/rules/project-context.mdc)

---

## 📝 Notes

- All export files are in JSON format for human readability
- Textures are embedded as base64 data URLs
- File format version is included for future compatibility
- Import validation ensures data integrity before loading

