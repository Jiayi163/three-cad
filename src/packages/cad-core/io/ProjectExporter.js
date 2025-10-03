/**
 * ProjectExporter - Export CAD projects to files
 *
 * Features:
 * - Export entire document with all objects
 * - Embed textures as base64 data URLs
 * - Include material information
 * - Support for metadata export
 * - Generate downloadable JSON files
 */

import { ImageLoader } from './ImageLoader.js';

export class ProjectExporter {
  /**
   * Export document to JSON format
   * @param {Document} document - Document to export
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  static async exportDocument(document, options = {}) {
    const {
      includeHistory = false,
      embedTextures = true,
      compressionLevel = 'none' // 'none', 'low', 'medium', 'high'
    } = options;

    if (!document) {
      throw new Error('No document provided for export');
    }

    console.log(`Exporting document: ${document.name}`);

    // Get base document data
    const documentData = await document.saveToData();

    // Add export metadata
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      application: 'Three-CAD',
      document: documentData,
      textures: {},
      materials: {}
    };

    // Collect and embed textures if requested
    if (embedTextures) {
      await this._embedTextures(document, exportData);
    }

    // Add history if requested
    if (includeHistory && document.history) {
      exportData.history = this._serializeHistory(document.history);
    }

    console.log('Document export completed');
    return exportData;
  }

  /**
   * Embed textures as base64 data URLs
   * @private
   */
  static async _embedTextures(document, exportData) {
    const textureMap = new Map();

    // Iterate through all nodes to find objects with textures
    const nodes = document.nodes?.items || [];

    for (const node of nodes) {
      const visualObject = node.visualObject;
      if (!visualObject) continue;

      const textureFile = visualObject.getProperty('textureFile');
      const textureUrl = visualObject.getProperty('textureUrl');

      if (textureUrl && !textureMap.has(textureUrl)) {
        try {
          // Convert blob URL to data URL
          let dataUrl = textureUrl;
          if (textureUrl.startsWith('blob:')) {
            dataUrl = await ImageLoader.blobUrlToDataURL(textureUrl);
          }

          const textureId = this._generateTextureId(textureUrl);
          textureMap.set(textureUrl, textureId);

          exportData.textures[textureId] = {
            dataUrl: dataUrl,
            originalName: textureFile?.name || 'texture.png',
            mimeType: textureFile?.type || 'image/png'
          };

          // Update the visual object reference to use texture ID
          if (exportData.document.nodes) {
            const nodeData = exportData.document.nodes.find(n => n.id === node.id);
            if (nodeData) {
              nodeData.textureId = textureId;
            }
          }
        } catch (error) {
          console.error(`Failed to embed texture: ${error.message}`);
        }
      }
    }

    console.log(`Embedded ${textureMap.size} textures`);
  }

  /**
   * Generate unique texture ID
   * @private
   */
  static _generateTextureId(url) {
    return `texture_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Serialize history to JSON-compatible format
   * @private
   */
  static _serializeHistory(history) {
    return {
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      currentIndex: history._currentIndex || 0,
      stackSize: history._stack?.length || 0
    };
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
   * Export selection only (selected objects)
   * @param {Document} cadDocument - Document containing selection
   * @param {Array} selectedNodes - Array of selected nodes
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported selection data
   */
  static async exportSelection(cadDocument, selectedNodes, options = {}) {
    if (!selectedNodes || selectedNodes.length === 0) {
      throw new Error('No nodes selected for export');
    }

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      application: 'Three-CAD',
      type: 'selection',
      nodes: [],
      textures: {}
    };

    // Export selected nodes
    for (const node of selectedNodes) {
      const nodeData = cadDocument._serializeNode(node);
      exportData.nodes.push(nodeData);
    }

    // Embed textures if needed
    if (options.embedTextures !== false) {
      const tempDoc = { nodes: { items: selectedNodes } };
      await this._embedTextures(tempDoc, exportData);
    }

    return exportData;
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
}

