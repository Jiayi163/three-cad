/**
 * ProjectExporter - Export CAD projects to files
 *
 * Features:
 * - Export document in Three-CAD project format (for import/export)
 * - Export to 3CAD scene format (for external scene importers)
 * - Map boxes to standardized object format
 * - Handle texture and color materials
 * - Apply unit scaling (mm → m)
 * - Generate downloadable JSON files
 * - Export as ZIP package with assets folder
 */

import JSZip from 'jszip';
import { PathResolver } from './PathResolver.js';

export class ProjectExporter {
  // Project export version
  static VERSION = '1.0.0';
  static APPLICATION = 'Three-CAD';

  /**
   * Export document to Three-CAD project format (for import/export)
   * This format is compatible with ProjectImporter
   * 
   * @param {Document} document - Document to export
   * @param {Object} options - Export options
   * @param {boolean} options.embedTextures - Embed textures as data URLs (default: false)
   * @param {boolean} options.includeHistory - Include history data (default: false)
   * @returns {Promise<Object>} Exported project data with version, application, document, textures
   */
  static async exportDocument(document, options = {}) {
    if (!document) {
      throw new Error('No document provided for export');
    }

    console.log(`Exporting document: ${document.name}`);

    // Serialize document using its built-in method
    const documentData = await document.saveToData();

    // Collect textures if embedding is requested
    const textures = options.embedTextures 
      ? await this._collectTextures(document)
      : {};

    // Build project export format
    const exportData = {
      version: this.VERSION,
      application: this.APPLICATION,
      document: documentData,
      textures: textures,
      exportDate: new Date().toISOString()
    };

    console.log(`Document export completed: ${documentData.nodes?.length || 0} nodes`);
    return exportData;
  }

  /**
   * Export document to simple object array format (for 3CAD scene conversion)
   * This is a simplified format with just name, description, and objects array
   * 
   * @param {Document} document - Document to export
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Simple export data with objects array
   */
  static async exportToSimpleFormat(document, options = {}) {
    if (!document) {
      throw new Error('No document provided for export');
    }

    console.log(`Exporting document to simple format: ${document.name}`);

    // Determine unit scale (mm → m conversion)
    const units = document.metadata?.units || 'mm';
    const unitScale = units === 'mm' ? 0.001 : 1;

    // Build simple schema
    const exportData = {
      name: document.name || 'Untitled',
      description: '',
      objects: []
    };

    // Get all nodes
    const nodes = document.nodes?.items || [];

    // Map Box nodes to objects
    for (const node of nodes) {
      if (node.type === 'Box') {
        const obj = this._mapBoxToObject(node, unitScale);
        exportData.objects.push(obj);
      }
    }

    console.log(`Simple export completed: ${exportData.objects.length} objects`);
    return exportData;
  }

  /**
   * Collect textures from document nodes and convert to data URLs
   * @private
   */
  static async _collectTextures(document) {
    const textures = {};
    const nodes = document.nodes?.items || [];

    for (const node of nodes) {
      const visualObject = node.visualObject;
      if (!visualObject) continue;

      const textureFile = visualObject.getProperty('textureFile');
      const textureUrl = visualObject.getProperty('textureUrl');

      if (textureFile && textureFile instanceof File) {
        try {
          const textureId = `texture_${node.id}`;
          const dataUrl = await this._fileToDataURL(textureFile);
          
          textures[textureId] = {
            dataUrl: dataUrl,
            originalName: textureFile.name,
            mimeType: textureFile.type
          };

          // Store texture ID in node data for import reference
          if (!node.properties) node.properties = {};
          node.properties.textureId = textureId;
        } catch (error) {
          console.warn(`Failed to embed texture for node ${node.name}:`, error);
        }
      } else if (textureUrl && typeof textureUrl === 'string') {
        // If it's already a data URL, we can use it directly
        if (textureUrl.startsWith('data:')) {
          const textureId = `texture_${node.id}`;
          textures[textureId] = {
            dataUrl: textureUrl,
            originalName: node.name + '.texture',
            mimeType: textureUrl.match(/data:([^;]+);/)?.[1] || 'image/png'
          };
        }
      }
    }

    return textures;
  }

  /**
   * Convert File to data URL
   * @private
   */
  static _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Map a Box node to the Interactive Hallway object schema
   * @private
   */
  static _mapBoxToObject(node, unitScale) {
    const props = node.properties || {};

    // Geometry with unit scaling
    const geometry = {
      type: 'box',
      width: (props.width ?? 1) * unitScale,
      height: (props.height ?? 1) * unitScale,
      depth: (props.depth ?? 1) * unitScale
    };

    // Position with unit scaling
    const position = {
      x: (props.position?.x ?? 0) * unitScale,
      y: (props.position?.y ?? 0) * unitScale,
      z: (props.position?.z ?? 0) * unitScale
    };

    // Rotation (no scaling)
    const rotation = {
      x: props.rotation?.x ?? 0,
      y: props.rotation?.y ?? 0,
      z: props.rotation?.z ?? 0
    };

    // Material mapping
    const material = this._mapMaterial(props);

    return {
      name: node.name || node.id,
      geometry,
      material,
      position,
      rotation,
      receiveShadow: true,
      castShadow: false
    };
  }

  /**
   * Map node properties to material schema
   * @private
   */
  static _mapMaterial(props) {
    const roughness = props.roughness ?? 0.8;
    const metalness = props.metalness ?? 0;

    // Check for texture material
    const materialType = props.material?.type;
    const textureFile = props.material?.texture;
    const textureUrl = props.textureUrl;

    if ((materialType === 'custom-texture' && textureFile && textureFile.trim() !== '') || textureUrl) {
      const texturePath = textureFile || textureUrl;
      
      // Normalize texture path for export (use relative path)
      const normalizedPath = PathResolver.normalizePath(texturePath);
      
      // Build material with texture
      const material = {
        map: normalizedPath,
        roughness,
        metalness
      };
      
      // Add texture repeat if available
      if (props.textureRepeatX !== undefined || props.textureRepeatY !== undefined) {
        material.repeat = {
          x: props.textureRepeatX ?? 1,
          y: props.textureRepeatY ?? 1
        };
      }
      
      return material;
    }

    // Flat color material - convert hex to integer
    const color = props.color || '#4caf50';
    const colorInt = this._hexToInt(color);

    return {
      color: colorInt,
      roughness,
      metalness
    };
  }

  /**
   * Convert hex color string to integer
   * @private
   */
  static _hexToInt(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    return parseInt(hex, 16);
  }


  /**
   * Export document and download as file
   * @param {Document} cadDocument - Document to export
   * @param {string} filename - Filename for download
   * @param {Object} options - Export options
   */
  static async exportAndDownload(cadDocument, filename = null, options = {}) {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof window.document === 'undefined') {
      throw new Error('exportAndDownload can only be used in browser environment');
    }

    // Generate filename if not provided
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `${cadDocument.name}_${timestamp}.json`;
    }

    // Ensure .json extension
    if (!filename.toLowerCase().endsWith('.json')) {
      filename += '.json';
    }

    // Export document data
    const exportData = await this.exportDocument(cadDocument, options);

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Use window.document to avoid naming conflict
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);

    console.log(`Document downloaded as: ${filename}`);
    return filename;
  }

  /**
   * Get export file size estimate
   * @param {Object} exportData - Export data
   * @returns {Object} Size information
   */
  static getExportSize(exportData) {
    const jsonString = JSON.stringify(exportData);
    const bytes = new Blob([jsonString]).size;

    return {
      bytes,
      kilobytes: (bytes / 1024).toFixed(2),
      megabytes: (bytes / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Convert basic export JSON to full 3CAD scene format
   * 
   * Takes a simple export (with only name, description, objects) and wraps it
   * in a complete 3CAD scene structure with camera, renderer, lights, player, and controls.
   * 
   * @param {Object} userExport - Current export JSON with structure: { name, description, objects }
   * @param {Object} options - Conversion options
   * @param {Object} options.camera - Optional camera overrides
   * @param {Object} options.renderer - Optional renderer overrides
   * @param {Array} options.lights - Optional lights array (if not provided, uses default ambient light)
   * @param {Object} options.player - Optional player overrides
   * @param {Object} options.controls - Optional controls overrides
   * @param {boolean} options.addPhysicsToObjects - If true, adds physics: { enabled: false } to each object (default: false)
   * @returns {Object} Complete 3CAD scene JSON
   * 
   * @example
   * const basicExport = {
   *   name: "My Scene",
   *   description: "",
   *   objects: [{ geometry: {...}, position: {...} }]
   * };
   * 
   * const threeCADScene = ProjectExporter.convertToThreeCADScene(basicExport, {
   *   addPhysicsToObjects: true
   * });
   */
  static convertToThreeCADScene(userExport, options = {}) {
    if (!userExport || typeof userExport !== 'object') {
      throw new Error('userExport must be a valid object');
    }

    // Extract user data
    const {
      name = 'Untitled',
      description = '',
      objects = []
    } = userExport;

    // Default camera configuration
    const defaultCamera = {
      position: { x: 0, y: 2.0, z: 0 },
      fov: 75,
      near: 0.1,
      far: 1000
    };

    // Default renderer configuration
    const defaultRenderer = {
      shadows: true,
      physicallyCorrectLights: true
    };

    // Default lights (ambient light)
    const defaultLights = [
      {
        type: 'ambient',
        color: 16777215, // White color as integer
        intensity: 0.5
      }
    ];

    // Default player configuration
    const defaultPlayer = {
      type: 'sphere',
      radius: 0.5,
      position: { x: 0, y: 0.5, z: 0 },
      physics: {
        enabled: true,
        type: 'dynamic',
        mass: 1,
        linearDamping: 0.9,
        angularDamping: 0.9,
        restitution: 0,
        friction: 1
      }
    };

    // Default controls configuration
    const defaultControls = {
      type: 'firstPerson',
      speed: 35,
      jumpForce: 10,
      mouseSensitivity: 0.002
    };

    // Process objects - optionally add physics defaults
    const processedObjects = options.addPhysicsToObjects
      ? objects.map(obj => ({
          ...obj,
          physics: obj.physics || { enabled: false }
        }))
      : objects;

    // Build complete 3CAD scene
    const threeCADScene = {
      name: name,
      description: description,
      camera: { ...defaultCamera, ...(options.camera || {}) },
      renderer: { ...defaultRenderer, ...(options.renderer || {}) },
      lights: options.lights || defaultLights,
      objects: processedObjects,
      player: { ...defaultPlayer, ...(options.player || {}) },
      controls: { ...defaultControls, ...(options.controls || {}) }
    };

    // Add skybox if provided
    if (options.skybox) {
      threeCADScene.skybox = options.skybox;
    }

    return threeCADScene;
  }

  /**
   * Export document directly in 3CAD scene format
   * 
   * Convenience method that exports the document and converts it to 3CAD format in one step.
   * 
   * @param {Document} document - Document to export
   * @param {Object} options - Export and conversion options
   * @param {boolean} options.addPhysicsToObjects - Add physics defaults to objects (default: false)
   * @param {Object} options.camera - Camera configuration overrides
   * @param {Object} options.renderer - Renderer configuration overrides
   * @param {Array} options.lights - Lights array (if not provided, uses default)
   * @param {Object} options.player - Player configuration overrides
   * @param {Object} options.controls - Controls configuration overrides
   * @returns {Promise<Object>} Complete 3CAD scene JSON
   */
  static async exportToThreeCADScene(document, options = {}) {
    // First export the document in simple format (for 3CAD conversion)
    const basicExport = await this.exportToSimpleFormat(document, options);

    // Extract conversion options (separate from export options)
    const {
      addPhysicsToObjects,
      camera,
      renderer,
      lights,
      player,
      controls
    } = options;

    // Convert to 3CAD format
    return this.convertToThreeCADScene(basicExport, {
      addPhysicsToObjects,
      camera,
      renderer,
      lights,
      player,
      controls
    });
  }

  /**
   * Export document in 3CAD format and download as file
   * 
   * @param {Document} cadDocument - Document to export
   * @param {string} filename - Filename for download
   * @param {Object} options - Export and conversion options
   * @param {boolean} options.packageAsZip - Export as ZIP package with assets folder (default: true)
   * @param {string} options.assetsFolderName - Name for assets folder (default: 'assets')
   * @param {ThreeView} options.threeView - ThreeView instance to get skybox/environment info
   */
  static async exportThreeCADAndDownload(cadDocument, filename = null, options = {}) {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof window.document === 'undefined') {
      throw new Error('exportThreeCADAndDownload can only be used in browser environment');
    }

    // Generate filename if not provided
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `${cadDocument.name}_3cad_${timestamp}`;
    }

    // Remove extension if present (we'll add .json or .zip)
    filename = filename.replace(/\.(json|zip)$/i, '');

    // Determine assets folder name (default: 'assets', or can use '<basename>_assets')
    const assetsFolderName = options.assetsFolderName || 'assets';

    // Export in 3CAD format
    const threeCADScene = await this.exportToThreeCADScene(cadDocument, options);

    // Get skybox from ThreeView if available
    if (options.threeView && options.threeView._environmentData) {
      const envData = options.threeView._environmentData;
      if (envData.kind === 'exr' && envData.imageName) {
        // Normalize and use relative path to assets folder
        const skyboxPath = `./${assetsFolderName}/${envData.imageName}`;
        threeCADScene.skybox = PathResolver.normalizePath(skyboxPath);
      }
    } else if (options.threeView && options.threeView.scene && options.threeView.scene.background) {
      // Try to get skybox from scene background if environment data not available
      const background = options.threeView.scene.background;
      if (background && background.image && background.image.name) {
        const skyboxPath = `./${assetsFolderName}/${background.image.name}`;
        threeCADScene.skybox = PathResolver.normalizePath(skyboxPath);
      }
    }

    // Default to ZIP package (browser can't create folders directly)
    // If packageAsZip is explicitly false, export as single JSON (but paths will be broken)
    const packageAsZip = options.packageAsZip !== false; // Default to true

    if (packageAsZip) {
      return await this._exportAsZipPackage(threeCADScene, filename, cadDocument, options, assetsFolderName);
    }

    // Otherwise, export as single JSON file (warning: external assets won't be included)
    console.warn('⚠️ Exporting as single JSON file. External assets will not be included. Consider using ZIP package.');
    const jsonString = JSON.stringify(threeCADScene, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();

    URL.revokeObjectURL(url);

    console.log(`3CAD scene downloaded as: ${filename}.json`);
    return `${filename}.json`;
  }

  /**
   * Export as ZIP package with assets folder
   * 
   * Folder structure:
   *   scene.json
   *   assets/
   *     textures/
   *       image1.png
   *       image2.jpg
   *     evening_road_01_puresky_1k.exr
   * 
   * All paths in JSON use relative paths: ./assets/...
   * 
   * @private
   */
  static async _exportAsZipPackage(sceneData, baseFilename, document, options, assetsFolderName = 'assets') {
    const zip = new JSZip();
    
    // Create assets folder structure
    const assetsFolder = zip.folder(assetsFolderName);
    const texturesFolder = assetsFolder.folder('textures');
    
    // Track all assets for path updates
    const assetMap = new Map(); // Map: original path/name -> { blob, finalPath, type }
    const nodes = document.nodes?.items || [];
    
    console.log(`📦 Collecting assets for export (${nodes.length} nodes)...`);
    
    // Collect texture files from nodes
    for (const node of nodes) {
      const visualObject = node.visualObject;
      if (!visualObject) continue;
      
      const textureFile = visualObject.getProperty('textureFile');
      const textureUrl = visualObject.getProperty('textureUrl');
      const material = node.properties?.material;
      
      // Get texture file or URL
      let textureSource = null;
      let textureName = null;
      let originalPath = null;
      
      if (textureFile && textureFile instanceof File) {
        textureSource = textureFile;
        textureName = textureFile.name;
        originalPath = textureFile.name;
      } else if (textureUrl && typeof textureUrl === 'string') {
        originalPath = textureUrl;
        // Try to fetch from URL
        try {
          const response = await fetch(textureUrl);
          const blob = await response.blob();
          textureSource = blob;
          textureName = textureUrl.split('/').pop() || `texture_${node.id}.png`;
        } catch (error) {
          console.warn(`⚠️ Failed to fetch texture from ${textureUrl}:`, error);
        }
      } else if (material?.texture) {
        // Texture path from material
        const texturePath = material.texture;
        originalPath = texturePath;
        textureName = texturePath.split('/').pop() || `texture_${node.id}.png`;
        
        // Try to fetch if it's a URL
        if (texturePath.startsWith('http://') || texturePath.startsWith('https://')) {
          try {
            const response = await fetch(texturePath);
            const blob = await response.blob();
            textureSource = blob;
          } catch (error) {
            console.warn(`⚠️ Failed to fetch texture from ${texturePath}:`, error);
          }
        } else if (texturePath.startsWith('data:')) {
          // Data URL - convert to blob
          try {
            const response = await fetch(texturePath);
            textureSource = await response.blob();
          } catch (error) {
            console.warn(`⚠️ Failed to convert data URL to blob:`, error);
          }
        }
      }
      
      // Add texture to ZIP if we have it
      if (textureSource && textureName) {
        // Use unique filename if duplicate
        let finalName = textureName;
        let counter = 1;
        while (assetMap.has(`textures/${finalName}`)) {
          const ext = textureName.split('.').pop();
          const base = textureName.replace(`.${ext}`, '');
          finalName = `${base}_${counter}.${ext}`;
          counter++;
        }
        
        const finalPath = `textures/${finalName}`;
        assetMap.set(finalPath, {
          blob: textureSource,
          finalPath: finalPath,
          type: 'texture',
          originalPath: originalPath
        });
        
        await texturesFolder.file(finalName, textureSource);
        console.log(`   ✓ Added texture: ${finalPath}`);
        
          // Update scene data to use relative path (normalized)
          if (material) {
            const relativePath = `./${assetsFolderName}/${finalPath}`;
            material.map = PathResolver.normalizePath(relativePath);
          }
          
          // Also update the object's material in the scene data
          // Find the object in sceneData.objects and update its material
          const nodeId = node.id;
          const sceneObject = sceneData.objects.find(obj => obj.name === node.name || obj.name === nodeId);
          if (sceneObject && sceneObject.material) {
            const relativePath = `./${assetsFolderName}/${finalPath}`;
            sceneObject.material.map = PathResolver.normalizePath(relativePath);
          }
      }
    }
    
    // Collect skybox/background file if available
    if (options.threeView && options.threeView._environmentData) {
      const envData = options.threeView._environmentData;
      if (envData.kind === 'exr' && envData.imageName) {
        // Try to get the EXR file
        // Check if we have the file in the environment data
        let skyboxBlob = null;
        let skyboxName = envData.imageName;
        
        // Try to fetch from the stored path/URL if available
        if (envData.imageUrl) {
          try {
            const response = await fetch(envData.imageUrl);
            skyboxBlob = await response.blob();
            console.log(`   ✓ Found skybox file: ${skyboxName}`);
          } catch (error) {
            console.warn(`⚠️ Failed to fetch skybox from ${envData.imageUrl}:`, error);
          }
        }
        
        // If we have the blob, add it to assets
        if (skyboxBlob) {
          const finalPath = skyboxName; // Skybox goes directly in assets folder
          assetMap.set(finalPath, {
            blob: skyboxBlob,
            finalPath: finalPath,
            type: 'skybox',
            originalPath: envData.imageUrl || skyboxName
          });
          
          await assetsFolder.file(skyboxName, skyboxBlob);
          console.log(`   ✓ Added skybox: ${finalPath}`);
          
          // Update scene data skybox path (normalized)
          const skyboxPath = `./${assetsFolderName}/${skyboxName}`;
          sceneData.skybox = PathResolver.normalizePath(skyboxPath);
        } else {
          // If we can't get the file, at least update the path reference (normalized)
          const skyboxPath = `./${assetsFolderName}/${skyboxName}`;
          sceneData.skybox = PathResolver.normalizePath(skyboxPath);
          console.log(`   ℹ️ Skybox path updated (file not available): ${sceneData.skybox}`);
        }
      }
    }
    
    // Add scene JSON file (with updated relative paths)
    zip.file(`${baseFilename}.json`, JSON.stringify(sceneData, null, 2));
    
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${baseFilename}.zip`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    console.log(`✅ 3CAD scene package downloaded: ${baseFilename}.zip`);
    console.log(`   📁 Structure: ${baseFilename}.json + ${assetsFolderName}/ folder`);
    console.log(`   📦 Assets: ${assetMap.size} files (${Array.from(assetMap.values()).filter(a => a.type === 'texture').length} textures, ${Array.from(assetMap.values()).filter(a => a.type === 'skybox').length} skybox)`);
    return `${baseFilename}.zip`;
  }
}

