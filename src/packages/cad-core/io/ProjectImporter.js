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
    if (!cadDocument.nodes || textureMap.size === 0) {
      return;
    }

    const nodes = cadDocument.nodes.items || [];

    for (const node of nodes) {
      const visualObject = node.visualObject;
      if (!visualObject) continue;

      // Find corresponding node data with texture ID
      const nodeData = importData.document.nodes?.find(n => n.name === node.name);
      if (!nodeData || !nodeData.textureId) continue;

      const textureInfo = textureMap.get(nodeData.textureId);
      if (!textureInfo) continue;

      try {
        // Restore texture to visual object
        visualObject.setProperty('textureUrl', textureInfo.url);
        visualObject.setProperty('textureFile', textureInfo.file);

        // If visual object has texture restoration method, call it
        if (typeof visualObject.restoreTextureFromUrl === 'function') {
          await visualObject.restoreTextureFromUrl(textureInfo.url, textureInfo.file);
        }

        console.log(`Updated texture reference for node: ${node.name}`);
      } catch (error) {
        console.error(`Failed to update texture reference: ${error.message}`);
      }
    }
  }

  /**
   * Import from file
   * @param {File} file - JSON file to import
   * @param {CADApplication} application - Application instance
   * @returns {Promise<Document>} Imported document
   */
  static async importFromFile(file, application) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Invalid file format. Expected .json file');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const jsonString = event.target.result;
          const importData = JSON.parse(jsonString);
          const cadDocument = await this.importDocument(importData, application);
          resolve(cadDocument);
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

    if (!file.name.toLowerCase().endsWith('.json')) {
      result.errors.push('Invalid file format. Expected .json file');
      return result;
    }

    try {
      const jsonString = await file.text();
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!data.version) result.errors.push('Missing version information');
      if (!data.document) result.errors.push('Missing document data');
      if (!data.application) result.warnings.push('Missing application identifier');

      // Set info
      if (data.document) {
        result.info.documentName = data.document.name;
        result.info.nodeCount = data.document.nodes?.length || 0;
        result.info.textureCount = Object.keys(data.textures || {}).length;
      }

      result.info.version = data.version;
      result.info.exportDate = data.exportDate;

      // Estimate file size
      result.info.fileSize = (file.size / 1024).toFixed(2) + ' KB';

      result.valid = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Failed to parse JSON: ${error.message}`);
    }

    return result;
  }
}

