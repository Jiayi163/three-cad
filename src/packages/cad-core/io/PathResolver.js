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
   * @param {Map} extractedAssets - Extracted assets from ZIP (optional)
   * @returns {Object} Resolved path info with possible paths to try
   */
  static resolveAssetPath(assetPath, jsonFilePath = null, extractedAssets = null) {
    if (!assetPath) {
      return { paths: [], extractedAsset: null };
    }

    const normalizedPath = this.normalizePath(assetPath);
    const fileName = normalizedPath.split('/').pop();
    const paths = [];
    let extractedAsset = null;

    console.log(`🔍 PathResolver: Resolving asset path: "${assetPath}"`);
    console.log(`   Normalized: "${normalizedPath}"`);
    console.log(`   Filename: "${fileName}"`);
    console.log(`   Has extractedAssets: ${extractedAssets instanceof Map}`);

    // If we have extracted assets from a ZIP, check if this asset is available
    if (extractedAssets && extractedAssets instanceof Map) {
      console.log(`   📦 Checking ${extractedAssets.size} extracted assets...`);
      
      // Try to find the asset by normalized path or filename
      const assetKey = normalizedPath.replace('./', '');
      console.log(`   Looking for key: "${assetKey}"`);
      
      if (extractedAssets.has(assetKey)) {
        extractedAsset = extractedAssets.get(assetKey);
        // Add the blob URL as the first path to try
        paths.push(extractedAsset.blobUrl);
        console.log(`   ✅ Found exact match! Using blob URL: ${extractedAsset.blobUrl}`);
      } else if (extractedAssets.has(`assets/${fileName}`)) {
        // Try just the filename in assets folder
        extractedAsset = extractedAssets.get(`assets/${fileName}`);
        paths.push(extractedAsset.blobUrl);
        console.log(`   ✅ Found by filename in assets/! Using blob URL: ${extractedAsset.blobUrl}`);
      } else {
        // Search for filename match in any path
        console.log(`   🔎 Searching for filename match in all keys...`);
        for (const [key, value] of extractedAssets) {
          if (key.endsWith(fileName)) {
            extractedAsset = value;
            paths.push(value.blobUrl);
            console.log(`   ✅ Found by filename match (key: "${key}")! Using blob URL: ${value.blobUrl}`);
            break;
          }
        }
        if (!extractedAsset) {
          console.warn(`   ⚠️ No match found in extractedAssets`);
          console.warn(`   Available keys:`, Array.from(extractedAssets.keys()));
        }
      }
    }

    // Build list of possible paths to try
    // 1. Original path (normalized)
    paths.push(normalizedPath);

    // 2. If JSON file path is provided, resolve relative to it
    if (jsonFilePath && jsonFilePath.includes('/')) {
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

