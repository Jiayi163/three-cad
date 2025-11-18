/**
 * PathResolver - Utility for resolving asset paths in import/export
 * 
 * Handles:
 * - Normalizing /assets/ and ./assets/ paths
 * - Resolving paths relative to JSON file location
 * - Supporting both absolute and relative paths
 */

export class PathResolver {
  /**
   * Normalize asset path (convert /assets/ and ./assets/ to consistent format)
   * @param {string} path - Path to normalize
   * @returns {string} Normalized path
   */
  static normalizePath(path) {
    if (!path || typeof path !== 'string') {
      return path;
    }

    // Remove leading/trailing whitespace
    path = path.trim();

    // Normalize /assets/ and ./assets/ to ./assets/
    // This makes paths relative and consistent
    path = path.replace(/^\/assets\//, './assets/');
    path = path.replace(/^assets\//, './assets/');
    
    // Ensure ./assets/ paths are consistent
    if (path.startsWith('./assets/')) {
      return path;
    }

    // If path doesn't start with ./ or /, assume it's relative to assets
    if (!path.startsWith('./') && !path.startsWith('/') && !path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:')) {
      // Check if it looks like an asset path
      if (path.includes('/') || path.match(/\.(jpg|jpeg|png|gif|exr|hdr|webp)$/i)) {
        return `./assets/${path}`;
      }
    }

    return path;
  }

  /**
   * Resolve asset path relative to JSON file location
   * @param {string} assetPath - Asset path from JSON
   * @param {string} jsonFilePath - Path to JSON file (optional)
   * @param {Object} extractedAssets - Not used (kept for compatibility)
   * @returns {Object} Resolved path info with possible paths to try
   */
  static resolveAssetPath(assetPath, jsonFilePath = null, extractedAssets = {}) {
    if (!assetPath) {
      return { paths: [], extractedAsset: null };
    }

    const normalizedPath = this.normalizePath(assetPath);
    const fileName = normalizedPath.split('/').pop();
    const paths = [];

    // Build list of possible paths to try
    // 1. Original path (normalized)
    paths.push(normalizedPath);

    // 2. If JSON file path is provided, resolve relative to it
    if (jsonFilePath) {
      const jsonDir = jsonFilePath.substring(0, jsonFilePath.lastIndexOf('/') + 1);
      const relativePath = normalizedPath.replace('./', '');
      paths.push(`${jsonDir}${relativePath}`);
    }

    // 3. Try absolute paths (for public folder)
    if (normalizedPath.startsWith('./assets/')) {
      const assetPath = normalizedPath.replace('./assets/', '/assets/');
      paths.push(assetPath);
      paths.push(assetPath.replace('/assets/', '/public/assets/'));
    }

    // 4. Try just the filename in common locations
    paths.push(`/assets/${fileName}`);
    paths.push(`./assets/${fileName}`);
    paths.push(`/public/assets/${fileName}`);

    // Remove duplicates
    const uniquePaths = [...new Set(paths)];

    return {
      paths: uniquePaths,
      extractedAsset: extractedAsset,
      normalizedPath: normalizedPath,
      fileName: fileName
    };
  }

  /**
   * Try to load asset from multiple paths
   * @param {Array<string>} paths - Array of paths to try
   * @returns {Promise<Blob>} Loaded blob
   */
  static async loadAssetFromPaths(paths) {
    for (const path of paths) {
      try {
        // Skip blob URLs (already loaded)
        if (path.startsWith('blob:')) {
          const response = await fetch(path);
          if (response.ok) {
            return await response.blob();
          }
        } else {
          const response = await fetch(path);
          if (response.ok) {
            return await response.blob();
          }
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }
    throw new Error(`Failed to load asset from any path: ${paths.join(', ')}`);
  }
}

