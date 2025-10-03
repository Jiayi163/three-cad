/**
 * MaterialManager - Material and texture management system
 *
 * Provides functionality:
 * - Preset material library management
 * - Custom texture upload and processing
 * - Texture tiling and repetition
 * - Material caching and optimization
 * - Material state management
 */

import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        // Material cache
        this._materialCache = new Map();
        this._textureCache = new Map();

        // Preset material library
        this._presetMaterials = new Map();

        // Initialize preset materials
        this._initializePresetMaterials();
    }

    /**
     * Initialize preset material library
     * @private
     */
    _initializePresetMaterials() {
        // Basic materials
        this._presetMaterials.set('default', {
            name: 'Default',
            type: 'standard',
            config: {
                color: 0x888888,
                metalness: 0.1,
                roughness: 0.3
            }
        });

        // Metal materials
        this._presetMaterials.set('metal', {
            name: 'Metal',
            type: 'standard',
            config: {
                color: 0xcccccc,
                metalness: 0.9,
                roughness: 0.1
            }
        });

        this._presetMaterials.set('gold', {
            name: 'Gold',
            type: 'standard',
            config: {
                color: 0xffd700,
                metalness: 0.8,
                roughness: 0.2
            }
        });

        this._presetMaterials.set('silver', {
            name: 'Silver',
            type: 'standard',
            config: {
                color: 0xc0c0c0,
                metalness: 0.9,
                roughness: 0.1
            }
        });

        this._presetMaterials.set('copper', {
            name: 'Copper',
            type: 'standard',
            config: {
                color: 0xb87333,
                metalness: 0.8,
                roughness: 0.3
            }
        });

        // Non-metal materials
        this._presetMaterials.set('plastic', {
            name: 'Plastic',
            type: 'standard',
            config: {
                color: 0xffffff,
                metalness: 0.0,
                roughness: 0.4
            }
        });

        this._presetMaterials.set('rubber', {
            name: 'Rubber',
            type: 'standard',
            config: {
                color: 0x333333,
                metalness: 0.0,
                roughness: 0.8
            }
        });

        this._presetMaterials.set('glass', {
            name: 'Glass',
            type: 'standard',
            config: {
                color: 0xffffff,
                metalness: 0.0,
                roughness: 0.0,
                transparent: true,
                opacity: 0.3
            }
        });

        this._presetMaterials.set('wood', {
            name: 'Wood',
            type: 'standard',
            config: {
                color: 0x8b4513,
                metalness: 0.0,
                roughness: 0.7
            }
        });

        this._presetMaterials.set('concrete', {
            name: 'Concrete',
            type: 'standard',
            config: {
                color: 0x808080,
                metalness: 0.0,
                roughness: 0.9
            }
        });

        // Color materials
        this._presetMaterials.set('red', {
            name: 'Red',
            type: 'standard',
            config: {
                color: 0xff0000,
                metalness: 0.1,
                roughness: 0.3
            }
        });

        this._presetMaterials.set('green', {
            name: 'Green',
            type: 'standard',
            config: {
                color: 0x00ff00,
                metalness: 0.1,
                roughness: 0.3
            }
        });

        this._presetMaterials.set('blue', {
            name: 'Blue',
            type: 'standard',
            config: {
                color: 0x0000ff,
                metalness: 0.1,
                roughness: 0.3
            }
        });

        this._presetMaterials.set('yellow', {
            name: 'Yellow',
            type: 'standard',
            config: {
                color: 0xffff00,
                metalness: 0.1,
                roughness: 0.3
            }
        });

        this._presetMaterials.set('white', {
            name: 'White',
            type: 'standard',
            config: {
                color: 0xffffff,
                metalness: 0.1,
                roughness: 0.3
            }
        });

        this._presetMaterials.set('black', {
            name: 'Black',
            type: 'standard',
            config: {
                color: 0x000000,
                metalness: 0.1,
                roughness: 0.3
            }
        });
    }

    /**
     * Get all preset materials
     * @returns {Array} Preset material list
     */
    getPresetMaterials() {
        return Array.from(this._presetMaterials.entries()).map(([key, material]) => ({
            id: key,
            name: material.name,
            type: material.type,
            config: material.config
        }));
    }

    /**
     * Get preset material configuration by ID
     * @param {string} materialId - Material ID
     * @returns {object|null} Material configuration
     */
    getPresetMaterial(materialId) {
        const preset = this._presetMaterials.get(materialId);
        return preset ? { ...preset } : null;
    }

    /**
     * Create material
     * @param {string|object} materialConfig - Material configuration or preset ID
     * @param {object} options - Options
     * @returns {THREE.Material} Three.js material
     */
    createMaterial(materialConfig, options = {}) {
        let config;

        // If string, get from preset materials
        if (typeof materialConfig === 'string') {
            const preset = this.getPresetMaterial(materialConfig);
            if (!preset) {
                throw new Error(`Preset material '${materialConfig}' not found`);
            }
            config = { ...preset.config };
        } else {
            config = { ...materialConfig };
        }

        // Merge options
        config = { ...config, ...options };

        // Generate cache key
        const cacheKey = this._generateCacheKey(config);

        // Check cache
        if (this._materialCache.has(cacheKey)) {
            return this._materialCache.get(cacheKey);
        }

        // Create new material
        const material = new THREE.MeshStandardMaterial(config);

        // Cache material
        this._materialCache.set(cacheKey, material);

        return material;
    }

    /**
     * Create texture material from image URL
     * @param {string} imageUrl - Image URL
     * @param {object} options - Options
     * @returns {Promise<THREE.Material>} Material with texture
     */
    async createTextureMaterial(imageUrl, options = {}) {
        const texture = await this.loadTexture(imageUrl, options.textureOptions || {});

        const config = {
            map: texture,
            metalness: options.metalness || 0.1,
            roughness: options.roughness || 0.3,
            ...options
        };

        // Remove textureOptions as it's not a Three.js material property
        delete config.textureOptions;

        return this.createMaterial(config);
    }

    /**
     * Create texture material from file
     * @param {File} file - Image file
     * @param {object} options - Options
     * @returns {Promise<THREE.Material>} Material with texture
     */
    async createTextureMaterialFromFile(file, options = {}) {
        const imageUrl = await this._fileToDataURL(file);
        return this.createTextureMaterial(imageUrl, options);
    }

    /**
     * Load texture
     * @param {string} imageUrl - Image URL
     * @param {object} options - Texture options
     * @returns {Promise<THREE.Texture>} Three.js texture
     */
    async loadTexture(imageUrl, options = {}) {
        // Check cache
        const cacheKey = this._generateTextureCacheKey(imageUrl, options);
        if (this._textureCache.has(cacheKey)) {
            return this._textureCache.get(cacheKey);
        }

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();

            loader.load(
                imageUrl,
                (texture) => {
                    // Apply texture options
                    this._applyTextureOptions(texture, options);

                    // Cache texture
                    this._textureCache.set(cacheKey, texture);

                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.error('Failed to load texture:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Apply texture options
     * @param {THREE.Texture} texture - Texture object
     * @param {object} options - Options
     * @private
     */
    _applyTextureOptions(texture, options) {
        // Wrap mode
        if (options.wrapS !== undefined) {
            texture.wrapS = options.wrapS;
        } else {
            texture.wrapS = THREE.RepeatWrapping;
        }

        if (options.wrapT !== undefined) {
            texture.wrapT = options.wrapT;
        } else {
            texture.wrapT = THREE.RepeatWrapping;
        }

        // Repeat count
        if (options.repeatX !== undefined) {
            texture.repeat.x = options.repeatX;
        }

        if (options.repeatY !== undefined) {
            texture.repeat.y = options.repeatY;
        }

        // Offset
        if (options.offsetX !== undefined) {
            texture.offset.x = options.offsetX;
        }

        if (options.offsetY !== undefined) {
            texture.offset.y = options.offsetY;
        }

        // Rotation
        if (options.rotation !== undefined) {
            texture.rotation = options.rotation;
        }

        // Center point
        if (options.center !== undefined) {
            texture.center.copy(options.center);
        }

        // Filtering
        if (options.magFilter !== undefined) {
            texture.magFilter = options.magFilter;
        }

        if (options.minFilter !== undefined) {
            texture.minFilter = options.minFilter;
        }

        // Generate mipmaps
        texture.generateMipmaps = options.generateMipmaps !== false;

        // Update texture
        texture.needsUpdate = true;
    }

    /**
     * Calculate texture repeat count to fill surface
     * @param {THREE.Texture} texture - Texture
     * @param {THREE.Vector2} surfaceSize - Surface size
     * @returns {THREE.Vector2} Repeat count
     */
    calculateTextureRepeat(texture, surfaceSize) {
        if (!texture.image) {
            return new THREE.Vector2(1, 1);
        }

        const textureSize = new THREE.Vector2(
            texture.image.width,
            texture.image.height
        );

        const repeat = new THREE.Vector2(
            surfaceSize.x / textureSize.x,
            surfaceSize.y / textureSize.y
        );

        return repeat;
    }

    /**
     * Automatically adjust texture repeat to fill surface
     * @param {THREE.Texture} texture - Texture
     * @param {THREE.Vector2} surfaceSize - Surface size
     * @param {object} options - Options
     */
    autoFitTexture(texture, surfaceSize, options = {}) {
        const repeat = this.calculateTextureRepeat(texture, surfaceSize);

        // Adjust repeat mode based on options
        if (options.fitMode === 'stretch') {
            // Stretch mode: use calculated repeat count directly
            texture.repeat.copy(repeat);
        } else if (options.fitMode === 'tile') {
            // Tile mode: round up to ensure complete coverage
            texture.repeat.set(
                Math.ceil(repeat.x),
                Math.ceil(repeat.y)
            );
        } else {
            // Default mode: maintain proportion, use larger repeat count
            const maxRepeat = Math.max(repeat.x, repeat.y);
            texture.repeat.setScalar(maxRepeat);
        }

        texture.needsUpdate = true;
    }

    /**
     * Convert file to Data URL
     * @param {File} file - File
     * @returns {Promise<string>} Data URL
     * @private
     */
    _fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Generate material cache key
     * @param {object} config - Material configuration
     * @returns {string} Cache key
     * @private
     */
    _generateCacheKey(config) {
        return JSON.stringify(config);
    }

    /**
     * Generate texture cache key
     * @param {string} imageUrl - Image URL
     * @param {object} options - Options
     * @returns {string} Cache key
     * @private
     */
    _generateTextureCacheKey(imageUrl, options) {
        return `${imageUrl}_${JSON.stringify(options)}`;
    }

    /**
     * Clear cache
     */
    clearCache() {
        // Clear material cache
        this._materialCache.forEach(material => {
            material.dispose();
        });
        this._materialCache.clear();

        // Clear texture cache
        this._textureCache.forEach(texture => {
            texture.dispose();
        });
        this._textureCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {object} Statistics
     */
    getCacheStats() {
        return {
            materialCount: this._materialCache.size,
            textureCount: this._textureCache.size,
            presetCount: this._presetMaterials.size
        };
    }

    /**
     * Dispose material manager
     */
    dispose() {
        this.clearCache();
        this._presetMaterials.clear();
    }
}

// Create global instance
export const materialManager = new MaterialManager();

// Export class so other places can create new instances
export default MaterialManager;
