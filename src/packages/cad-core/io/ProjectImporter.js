/**
 * ProjectImporter - Import CAD projects from files
 *
 * Features:
 * - Import entire document with all objects
 * - Restore textures from embedded data
 * - Validate import data format
 * - Support for different versions
 * - Error handling and recovery
 */

import { ImageLoader } from './ImageLoader.js';
import { PathResolver } from './PathResolver.js';
import * as THREE from 'three';

export class ProjectImporter {
  /**
   * Import document from JSON data
   * @param {Object} importData - Import data
   * @param {CADApplication} application - Application instance
   * @returns {Promise<Document>} Imported document
   */
  static async importDocument(importData, application) {
    if (!importData) {
      throw new Error('No import data provided');
    }

    if (!application) {
      throw new Error('No application instance provided');
    }

    // Validate import data
    this._validateImportData(importData);

    console.log(`Importing document: ${importData.document.name}`);

    // Restore textures first
    const textureMap = await this._restoreTextures(importData);

    // Create new document
    const cadDocument = await application.openDocument(importData.document);

    // Update texture references in visual objects
    await this._updateTextureReferences(cadDocument, importData, textureMap);

    console.log('Document import completed');
    return cadDocument;
  }

  /**
   * Validate import data format
   * @private
   */
  static _validateImportData(importData) {
    if (!importData.version) {
      throw new Error('Invalid import data: missing version');
    }

    if (!importData.document) {
      throw new Error('Invalid import data: missing document');
    }

    if (!importData.application || importData.application !== 'Three-CAD') {
      console.warn('Import data may be from different application');
    }

    // Version compatibility check
    const importVersion = importData.version.split('.')[0];
    const currentVersion = '1';

    if (importVersion !== currentVersion) {
      console.warn(`Import data version (${importData.version}) may not be fully compatible with current version (${currentVersion}.x)`);
    }
  }

  /**
   * Restore textures from embedded data
   * @private
   */
  static async _restoreTextures(importData) {
    const textureMap = new Map();

    if (!importData.textures) {
      return textureMap;
    }

    for (const [textureId, textureData] of Object.entries(importData.textures)) {
      try {
        // Convert data URL to blob URL
        const response = await fetch(textureData.dataUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Create File object from blob
        const file = new File([blob], textureData.originalName, {
          type: textureData.mimeType
        });

        textureMap.set(textureId, {
          url: blobUrl,
          file: file,
          originalName: textureData.originalName
        });

        console.log(`Restored texture: ${textureData.originalName}`);
      } catch (error) {
        console.error(`Failed to restore texture ${textureId}: ${error.message}`);
      }
    }

    return textureMap;
  }

  /**
   * Update texture references in visual objects
   * @private
   */
  static async _updateTextureReferences(cadDocument, importData, textureMap) {
    if (!cadDocument.nodes) {
      return;
    }

    const nodes = cadDocument.nodes.items || [];

    for (const node of nodes) {
      const visualObject = node.visualObject;
      if (!visualObject) continue;

      // Find corresponding node data
      const nodeData = importData.document.nodes?.find(n => n.name === node.name);
      if (!nodeData) continue;

      // Method 1: Try to restore from textureId (if textures were embedded)
      if (nodeData.properties?.textureId && textureMap.size > 0) {
        const textureInfo = textureMap.get(nodeData.properties.textureId);
        if (textureInfo) {
          try {
            // Restore texture to visual object
            visualObject.setProperty('textureUrl', textureInfo.url);
            visualObject.setProperty('textureFile', textureInfo.file);

            // If visual object has texture restoration method, call it
            if (typeof visualObject.setTextureFromUrl === 'function') {
              await visualObject.setTextureFromUrl(textureInfo.url);
            }

            console.log(`✅ Restored texture from embedded data for node: ${node.name}`);
            continue;
          } catch (error) {
            console.error(`Failed to restore texture from embedded data: ${error.message}`);
          }
        }
      }

      // Method 2: Try to restore from material.texture path (if it's a filename)
      const material = nodeData.properties?.material;
      if (material?.type === 'custom-texture' && material.texture) {
        const texturePath = material.texture;
        
        // If it's just a filename (not a full URL), try to resolve it
        if (!texturePath.startsWith('http://') && !texturePath.startsWith('https://') && !texturePath.startsWith('data:')) {
          // Try common paths for texture files
          const possiblePaths = [
            texturePath, // Try as-is first
            `/textures/${texturePath}`, // Try in textures folder
            `/assets/${texturePath}`, // Try in assets folder
            `./${texturePath}`, // Try relative path
            `../${texturePath}` // Try parent directory
          ];

          let textureLoaded = false;
          for (const path of possiblePaths) {
            try {
              console.log(`🔍 Trying to load texture from: ${path}`);
              await visualObject.setTextureFromUrl(path);
              console.log(`✅ Successfully loaded texture from: ${path}`);
              textureLoaded = true;
              break;
            } catch (error) {
              // Try next path
              continue;
            }
          }

          if (!textureLoaded) {
            console.warn(`⚠️ Could not load texture "${texturePath}" from any common path. Texture not restored.`);
          }
        }
      }
    }
  }

  /**
   * Import from file
   * @param {File} file - JSON file to import
   * @param {CADApplication} application - Application instance
   * @param {Object} options - Import options
   * @param {ThreeView} options.threeView - ThreeView instance to apply skybox/background
   * @returns {Promise<Document>} Imported document
   */
  static async importFromFile(file, application, options = {}) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Invalid file format. Expected .json file');
    }

    // Handle JSON files
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const jsonString = event.target.result;
          const importData = JSON.parse(jsonString);
          
          // Debug: Log what we detected
          console.log('🔍 Analyzing import data structure...');
          console.log('   Has version:', !!importData.version);
          console.log('   Has document:', !!importData.document);
          console.log('   Has objects array:', Array.isArray(importData.objects));
          console.log('   Objects count:', importData.objects?.length || 0);
          
          // Check if this is a 3CAD scene format (has objects array)
          if (this._isThreeCADSceneFormat(importData)) {
            console.log('📦 Detected 3CAD scene format, converting to document...');
            
            // Warn if importing JSON with external assets
            if (importData.skybox || (importData.objects && importData.objects.some(obj => obj.material?.map))) {
              console.warn('⚠️ Importing JSON file with external assets (skybox/textures).');
              console.warn('   Assets will be loaded from paths specified in JSON.');
            }
            
            const cadDocument = await this.importThreeCADScene(importData, application, {
              ...options,
              jsonFilePath: file.name // Pass JSON file path for relative path resolution
            });
            resolve(cadDocument);
          } else {
            // Standard Three-CAD project format
            console.log('📦 Detected Three-CAD project format...');
            const cadDocument = await this.importDocument(importData, application);
            resolve(cadDocument);
          }
        } catch (error) {
          reject(new Error(`Failed to import file: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Check if import data is in 3CAD scene format
   * @private
   */
  static _isThreeCADSceneFormat(data) {
    // 3CAD scene format has: name, description, objects array, camera, renderer, lights, etc.
    // Three-CAD project format has: version, application, document, textures
    return (
      Array.isArray(data.objects) &&
      !data.version &&
      !data.document
    );
  }

  /**
   * Import 3CAD scene format (with objects array)
   * @param {Object} sceneData - 3CAD scene data with objects array
   * @param {CADApplication} application - Application instance
   * @param {Object} options - Import options
   * @param {ThreeView} options.threeView - ThreeView instance to apply skybox/background
   * @returns {Promise<Document>} Imported document
   */
  static async importThreeCADScene(sceneData, application, options = {}) {
    if (!sceneData || !Array.isArray(sceneData.objects)) {
      throw new Error('Invalid 3CAD scene format: missing objects array');
    }

    if (!application) {
      throw new Error('No application instance provided');
    }

    console.log(`📥 Importing 3CAD scene: ${sceneData.name || 'Untitled'}`);
    console.log(`   Objects to import: ${sceneData.objects.length}`);

    // Create a new document
    const documentName = sceneData.name || 'Imported Scene';
    const cadDocument = await application.createNewDocument(documentName);
    
    console.log(`📄 Created document: ${cadDocument.name} (ID: ${cadDocument.id})`);
    console.log(`   Active document: ${application.activeDocument?.name} (ID: ${application.activeDocument?.id})`);
    console.log(`   Document nodes before import: ${cadDocument.nodes.length}`);
    
    // Store skybox info for later application (with path resolution info)
    if (sceneData.skybox) {
      const normalizedSkyboxPath = PathResolver.normalizePath(sceneData.skybox);
      cadDocument._importSkybox = normalizedSkyboxPath;
      cadDocument._importSkyboxOriginal = sceneData.skybox; // Keep original for reference
      cadDocument._importSkyboxOptions = {
        jsonFilePath: options.jsonFilePath || null
      };
      console.log(`🌄 Skybox found: ${sceneData.skybox} (normalized: ${normalizedSkyboxPath})`);
    }

    // Track imported objects for logging and bounding box calculation
    const importedNodes = [];
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let hasValidBounds = false;

    // Convert each object to a document node
    for (const obj of sceneData.objects) {
      try {
        const node = await this._convertThreeCADObjectToNode(obj, cadDocument, {
          jsonFilePath: options.jsonFilePath
        });
        if (node && node.visualObject) {
          importedNodes.push(node);
          
          // Calculate bounding box from the actual scaled visual object
          const visualObject = node.visualObject;
          const pos = visualObject.position || { x: 0, y: 0, z: 0 };
          const width = visualObject.getProperty('width') || 1;
          const height = visualObject.getProperty('height') || 1;
          const depth = visualObject.getProperty('depth') || 1;
          
          // Estimate object bounds (rough approximation using scaled dimensions)
          const halfWidth = width / 2;
          const halfHeight = height / 2;
          const halfDepth = depth / 2;
          
          minX = Math.min(minX, pos.x - halfWidth);
          minY = Math.min(minY, pos.y - halfHeight);
          minZ = Math.min(minZ, pos.z - halfDepth);
          maxX = Math.max(maxX, pos.x + halfWidth);
          maxY = Math.max(maxY, pos.y + halfHeight);
          maxZ = Math.max(maxZ, pos.z + halfDepth);
          hasValidBounds = true;
          
          console.log(`   ✓ Imported: ${node.name} (${obj.geometry?.type || 'unknown'}) at (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}) size (${width.toFixed(3)}, ${height.toFixed(3)}, ${depth.toFixed(3)})`);
        }
      } catch (error) {
        console.error(`   ✗ Failed to import object ${obj.name || 'unnamed'}:`, error.message);
      }
    }

    console.log(`✅ Import complete: ${importedNodes.length} objects imported`);
    console.log(`   Document nodes after import: ${cadDocument.nodes.length}`);
    
    // Ensure the imported document is the active document
    // (createNewDocument should have set it, but double-check)
    if (application.activeDocument !== cadDocument) {
      console.warn(`⚠️ Imported document is not active, setting as active...`);
      application.setActiveDocument(cadDocument);
    }
    
    console.log(`   Active document: ${application.activeDocument?.name} (ID: ${application.activeDocument?.id})`);
    console.log(`   Document match: ${application.activeDocument === cadDocument ? 'YES ✅' : 'NO ❌'}`);

    // Log scene statistics
    if (hasValidBounds) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;
      
      console.log(`📊 Scene bounds (after scaling):`, {
        center: { x: centerX.toFixed(3), y: centerY.toFixed(3), z: centerZ.toFixed(3) },
        size: { x: sizeX.toFixed(3), y: sizeY.toFixed(3), z: sizeZ.toFixed(3) },
        maxDimension: Math.max(sizeX, sizeY, sizeZ).toFixed(3)
      });

      // Store bounding box info for camera framing (already scaled)
      cadDocument._importBoundingBox = {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
        center: { x: centerX, y: centerY, z: centerZ },
        size: { x: sizeX, y: sizeY, z: sizeZ }
      };
    }

    // Log objects in Three.js scene (will be done after scene rehydration)
    console.log(`🔍 Objects will be added to Three.js scene after rehydration`);

    return cadDocument;
  }

  /**
   * Convert a 3CAD scene object to a Document node
   * @private
   * @param {Object} obj - 3CAD scene object
   * @param {Document} document - Target document
   * @param {Object} options - Options with jsonFilePath
   */
  static async _convertThreeCADObjectToNode(obj, document, options = {}) {
    if (!obj.geometry || !obj.geometry.type) {
      console.warn('Object missing geometry type, skipping:', obj.name);
      return null;
    }

    // Only support box geometry for now (can be extended)
    if (obj.geometry.type !== 'box') {
      console.warn(`Unsupported geometry type: ${obj.geometry.type}, skipping:`, obj.name);
      return null;
    }

    // Import BoxVisualObject class
    const { BoxVisualObject } = await import('../../cad-three/BasicShapes.js');
    const { markRaw } = await import('vue');

    // Extract geometry parameters (handle scale - objects might be very small)
    const width = obj.geometry.width || 1;
    const height = obj.geometry.height || 1;
    const depth = obj.geometry.depth || 1;

    // Detect if objects are extremely small (likely in mm or smaller units)
    // If max dimension is < 0.1, scale up by 1000 (mm to m conversion)
    const maxDim = Math.max(width, height, depth);
    const scaleFactor = maxDim < 0.1 ? 1000 : 1;
    
    if (scaleFactor > 1) {
      console.log(`   ⚠️  Detected small objects (max: ${maxDim}), applying scale factor: ${scaleFactor}`);
    }

    // Create BoxVisualObject
    const visualObject = new BoxVisualObject(null, {
      width: width * scaleFactor,
      height: height * scaleFactor,
      depth: depth * scaleFactor
    });

    visualObject.name = obj.name || `Box_${Date.now()}`;

    // Set position (with scale factor)
    const position = obj.position || { x: 0, y: 0, z: 0 };
    visualObject.position = {
      x: position.x * scaleFactor,
      y: position.y * scaleFactor,
      z: position.z * scaleFactor
    };

    // Set rotation
    const rotation = obj.rotation || { x: 0, y: 0, z: 0 };
    visualObject.rotation = {
      x: rotation.x || 0,
      y: rotation.y || 0,
      z: rotation.z || 0
    };

    // Set material properties and load textures
    if (obj.material) {
      const material = obj.material;
      
      if (material.map) {
        // Texture material - actually load the texture
        try {
          const jsonFilePath = options.jsonFilePath || null;
          
          // Resolve texture path
          const pathInfo = PathResolver.resolveAssetPath(material.map, jsonFilePath, {});
          
          // Try to load texture from resolved paths
          let textureLoaded = false;
          for (const path of pathInfo.paths) {
            try {
              // Use setTextureFromUrl which properly loads and applies the texture
              const textureOptions = {
                repeatX: material.repeat?.x || 1,
                repeatY: material.repeat?.y || 1,
                roughness: material.roughness !== undefined ? material.roughness : 0.8,
                metalness: material.metalness !== undefined ? material.metalness : 0
              };
              
              await visualObject.setTextureFromUrl(path, textureOptions);
              
              // Also set properties for UI
              visualObject.setProperty('material', {
                type: 'custom-texture',
                texture: material.map
              });
              
              if (material.repeat) {
                visualObject.setProperty('textureRepeatX', material.repeat.x || 1);
                visualObject.setProperty('textureRepeatY', material.repeat.y || 1);
              }
              
              console.log(`   ✅ Texture loaded from: ${path}`);
              textureLoaded = true;
              break;
            } catch (error) {
              // Try next path
              continue;
            }
          }
          
          if (!textureLoaded) {
            console.warn(`   ⚠️ Could not load texture "${material.map}", using default material`);
            // Fall back to color material if texture fails
            if (material.color !== undefined) {
              const colorInt = material.color;
              const colorHex = '#' + colorInt.toString(16).padStart(6, '0');
              visualObject.setProperty('color', colorHex);
            }
          }
        } catch (error) {
          console.error(`   ❌ Failed to load texture:`, error);
          // Fall back to color material
          if (material.color !== undefined) {
            const colorInt = material.color;
            const colorHex = '#' + colorInt.toString(16).padStart(6, '0');
            visualObject.setProperty('color', colorHex);
          }
        }
      } else if (material.color !== undefined) {
        // Color material (convert integer to hex)
        const colorInt = material.color;
        const colorHex = '#' + colorInt.toString(16).padStart(6, '0');
        visualObject.setProperty('color', colorHex);
        
        // Apply roughness and metalness to color material
        const roughness = material.roughness !== undefined ? material.roughness : 0.8;
        const metalness = material.metalness !== undefined ? material.metalness : 0;
        
        // Update material config to use these values
        if (visualObject._materialConfig) {
          visualObject._materialConfig.default = {
            ...visualObject._materialConfig.default,
            color: parseInt(colorHex.replace('#', ''), 16),
            roughness: roughness,
            metalness: metalness
          };
        }
        
        // Also set as properties
        visualObject.setProperty('roughness', roughness);
        visualObject.setProperty('metalness', metalness);
        
        // Update material if object already exists
        if (visualObject._object3D && visualObject._object3D.material) {
          const currentMaterial = visualObject._object3D.material;
          if (currentMaterial instanceof THREE.MeshStandardMaterial) {
            currentMaterial.color.setHex(parseInt(colorHex.replace('#', ''), 16));
            currentMaterial.roughness = roughness;
            currentMaterial.metalness = metalness;
            currentMaterial.needsUpdate = true;
          }
        }
      }

      // Apply roughness and metalness for texture materials (already handled above)
      // For color materials, already handled above
      if (!material.map && material.roughness !== undefined) {
        visualObject.setProperty('roughness', material.roughness);
      }
      if (!material.map && material.metalness !== undefined) {
        visualObject.setProperty('metalness', material.metalness);
      }
    }

    // Set shadow properties
    if (obj.castShadow !== undefined) {
      visualObject.setProperty('castShadow', obj.castShadow);
    }
    if (obj.receiveShadow !== undefined) {
      visualObject.setProperty('receiveShadow', obj.receiveShadow);
    }

    // Set properties for the property panel
    visualObject.setProperty('type', 'Box');
    visualObject.setProperty('width', width * scaleFactor);
    visualObject.setProperty('height', height * scaleFactor);
    visualObject.setProperty('depth', depth * scaleFactor);

    // Create node data
    const nodeData = {
      id: visualObject.id,
      name: visualObject.name,
      type: 'Box',
      visible: true,
      locked: false,
      visualObject: markRaw(visualObject)
    };

    // Add node to document
    const node = document.addNode(nodeData);
    console.log(`   ✓ Added node to document: ${node.name} (document now has ${document.nodes.length} nodes)`);
    return node;
  }

  /**
   * Import selection data
   * @param {Object} selectionData - Selection export data
   * @param {Document} cadDocument - Target document
   * @returns {Promise<Array>} Imported nodes
   */
  static async importSelection(selectionData, cadDocument) {
    if (!selectionData || selectionData.type !== 'selection') {
      throw new Error('Invalid selection data');
    }

    if (!cadDocument) {
      throw new Error('No target document provided');
    }

    const importedNodes = [];
    const textureMap = await this._restoreTextures(selectionData);

    for (const nodeData of selectionData.nodes) {
      try {
        const node = cadDocument.addNode(nodeData);
        importedNodes.push(node);
      } catch (error) {
        console.error(`Failed to import node: ${error.message}`);
      }
    }

    // Update texture references
    await this._updateTextureReferences(cadDocument, { document: selectionData }, textureMap);

    return importedNodes;
  }

  /**
   * Validate file before import
   * @param {File} file - File to validate
   * @returns {Promise<Object>} Validation result
   */
  static async validateFile(file) {
    const result = {
      valid: false,
      errors: [],
      warnings: [],
      info: {}
    };

    if (!file) {
      result.errors.push('No file provided');
      return result;
    }

    const fileName = file.name.toLowerCase();
    const isJson = fileName.endsWith('.json');

    if (!isJson) {
      result.errors.push('Invalid file format. Expected .json file');
      return result;
    }

      try {
        // Handle JSON files
        const jsonString = await file.text();
        const data = JSON.parse(jsonString);

      // Check if this is 3CAD scene format or Three-CAD project format
      const isThreeCADScene = this._isThreeCADSceneFormat(data);

      if (isThreeCADScene) {
        // Validate 3CAD scene format
        if (!Array.isArray(data.objects)) {
          result.errors.push('Invalid 3CAD scene format: missing objects array');
        } else {
          result.info.format = '3CAD Scene';
          result.info.documentName = data.name || 'Untitled Scene';
          result.info.nodeCount = data.objects.length;
          result.info.objectTypes = {};
          
          // Count object types
          data.objects.forEach(obj => {
            const type = obj.geometry?.type || 'unknown';
            result.info.objectTypes[type] = (result.info.objectTypes[type] || 0) + 1;
          });
        }
      } else {
        // Validate Three-CAD project format
        if (!data.version) result.errors.push('Missing version information');
        if (!data.document) result.errors.push('Missing document data');
        if (!data.application) result.warnings.push('Missing application identifier');

        // Set info
        if (data.document) {
          result.info.format = 'Three-CAD Project';
          result.info.documentName = data.document.name;
          result.info.nodeCount = data.document.nodes?.length || 0;
          result.info.textureCount = Object.keys(data.textures || {}).length;
        }

        result.info.version = data.version;
        result.info.exportDate = data.exportDate;
      }

      // Estimate file size
      result.info.fileSize = (file.size / 1024).toFixed(2) + ' KB';

      result.valid = result.errors.length === 0;
      result.info.isZipPackage = false;
      
      return result;
    } catch (error) {
      result.errors.push(`Failed to parse file: ${error.message}`);
      return result;
    }
  }
}

