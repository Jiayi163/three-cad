/**
 * ProjectExporter - Export CAD projects to files
 *
 * Features:
 * - Export document with "Interactive Hallway" schema
 * - Map boxes to standardized object format
 * - Handle texture and color materials
 * - Apply unit scaling (mm → m)
 * - Generate downloadable JSON files
 */

export class ProjectExporter {
  /**
   * Export document to JSON format
   * @param {Document} document - Document to export
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  static async exportDocument(document, options = {}) {
    if (!document) {
      throw new Error('No document provided for export');
    }

    console.log(`Exporting document: ${document.name}`);

    // Determine unit scale (mm → m conversion)
    const units = document.metadata?.units || 'mm';
    const unitScale = units === 'mm' ? 0.001 : 1;

    // Build "Interactive Hallway" schema
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

    console.log(`Document export completed: ${exportData.objects.length} objects`);
    return exportData;
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

    if (materialType === 'custom-texture' && textureFile && textureFile.trim() !== '') {
      return {
        map: textureFile,
        roughness,
        metalness
      };
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
}

