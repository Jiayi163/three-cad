/**
 * VisualObject - Base class for all visual 3D objects in the CAD system
 *
 * Provides foundational functionality for managing 3D objects including:
 * - Three.js object lifecycle management
 * - Material management and caching
 * - Selection and highlighting states
 * - Document node integration
 * - Transform operations
 * - Disposal and memory management
 */

import * as THREE from 'three';
import { Observable } from '../cad-core/foundation/Observable.js';
import { materialManager } from './MaterialManager.js';

export class VisualObject extends Observable {
    constructor(nodeId = null) {
        super();

        // Core identification
        this._nodeId = nodeId;
        this._id = this._generateId();
        this._type = 'VisualObject';
        this._name = `${this._type}_${this._id}`;

        // Three.js objects
        this._object3D = null;
        this._geometry = null;
        this._material = null;
        this._originalMaterial = null;

        // Visual states
        this._visible = true;
        this._selected = false;
        this._highlighted = false;
        this._opacity = 1.0;

        // Material management
        this._materials = new Map(); // Cache for different material states
        this._currentMaterialId = 'default'; // Currently used material ID
        this._customMaterial = null; // Custom material
        this._materialConfig = {
            default: {
                color: 0x888888,
                metalness: 0.1,
                roughness: 0.3
            },
            selected: {
                color: 0xff0000,
                emissive: 0x330000,
                metalness: 0.1,
                roughness: 0.3
            },
            highlighted: {
                color: 0x0088ff,
                emissive: 0x001133,
                metalness: 0.1,
                roughness: 0.3
            }
        };

        // Transform properties
        this._position = new THREE.Vector3(0, 0, 0);
        this._rotation = new THREE.Euler(0, 0, 0);
        this._scale = new THREE.Vector3(1, 1, 1);

        // Metadata
        this._metadata = new Map();
        this._tags = new Set();
        this._created = new Date();
        this._modified = new Date();

        // Disposal flag
        this._disposed = false;

        this._initializeProperties();
    }

    /**
     * Initialize observable properties
     * @private
     */
    _initializeProperties() {
        // Core properties
        this.setProperty('id', this._id);
        this.setProperty('nodeId', this._nodeId);
        this.setProperty('type', this._type);
        this.setProperty('name', this._name);

        // Visual properties
        this.setProperty('visible', this._visible);
        this.setProperty('selected', this._selected);
        this.setProperty('highlighted', this._highlighted);
        this.setProperty('opacity', this._opacity);

        // Transform properties
        this.setProperty('position', this._position);
        this.setProperty('rotation', this._rotation);
        this.setProperty('scale', this._scale);
    }

    /**
     * Generate unique ID for the visual object
     * @private
     * @returns {string}
     */
    _generateId() {
        return `vo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get the node ID associated with this visual object
     * @returns {string|null}
     */
    get nodeId() {
        return this._nodeId;
    }

    /**
     * Get the unique ID of this visual object
     * @returns {string}
     */
    get id() {
        return this._id;
    }

    /**
     * Get the type of this visual object
     * @returns {string}
     */
    get type() {
        return this._type;
    }

    /**
     * Get/Set the name of this visual object
     */
    get name() {
        return this._name;
    }

    set name(value) {
        if (this._name !== value) {
            this._name = value;
            this.setProperty('name', value);
            this._markModified();
        }
    }

    /**
     * Get the Three.js Object3D instance
     * @returns {THREE.Object3D|null}
     */
    get object3D() {
        return this._object3D;
    }

    /**
     * Get the geometry instance
     * @returns {THREE.BufferGeometry|null}
     */
    get geometry() {
        return this._geometry;
    }

    /**
     * Get the current material
     * @returns {THREE.Material|null}
     */
    get material() {
        return this._material;
    }

    /**
     * Get/Set visibility
     */
    get visible() {
        return this._visible;
    }

    set visible(value) {
        if (this._visible !== value) {
            this._visible = value;
            if (this._object3D) {
                this._object3D.visible = value;
            }
            this.setProperty('visible', value);
            this._markModified();
        }
    }

    /**
     * Get/Set selection state
     */
    get selected() {
        return this._selected;
    }

    set selected(value) {
        if (this._selected !== value) {
            this._selected = value;
            this._updateMaterialState();
            this.setProperty('selected', value);
            this._markModified();
        }
    }

    /**
     * Get/Set highlight state
     */
    get highlighted() {
        return this._highlighted;
    }

    set highlighted(value) {
        if (this._highlighted !== value) {
            this._highlighted = value;
            this._updateMaterialState();
            this.setProperty('highlighted', value);
        }
    }

    /**
     * Get/Set opacity
     */
    get opacity() {
        return this._opacity;
    }

    set opacity(value) {
        value = Math.max(0, Math.min(1, value));
        if (this._opacity !== value) {
            this._opacity = value;
            if (this._material) {
                this._material.opacity = value;
                this._material.transparent = value < 1.0;
            }
            this.setProperty('opacity', value);
            this._markModified();
        }
    }

    /**
     * Get position
     * @returns {THREE.Vector3}
     */
    get position() {
        return this._position;
    }

    /**
     * Set position
     * @param {THREE.Vector3|object} value
     */
    set position(value) {
        if (value instanceof THREE.Vector3) {
            this._position.copy(value);
        } else if (typeof value === 'object' && value.x !== undefined) {
            this._position.set(value.x || 0, value.y || 0, value.z || 0);
        }

        if (this._object3D) {
            this._object3D.position.copy(this._position);
        }
        this.setProperty('position', this._position.clone());
        this._markModified();
    }

    /**
     * Get rotation
     * @returns {THREE.Euler}
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Set rotation
     * @param {THREE.Euler|object} value
     */
    set rotation(value) {
        if (value instanceof THREE.Euler) {
            this._rotation.copy(value);
        } else if (typeof value === 'object' && value.x !== undefined) {
            this._rotation.set(value.x || 0, value.y || 0, value.z || 0);
        }

        if (this._object3D) {
            this._object3D.rotation.copy(this._rotation);
        }
        this.setProperty('rotation', this._rotation.clone());
        this._markModified();
    }

    /**
     * Get scale
     * @returns {THREE.Vector3}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Set scale
     * @param {THREE.Vector3|object|number} value
     */
    set scale(value) {
        if (typeof value === 'number') {
            this._scale.setScalar(value);
        } else if (value instanceof THREE.Vector3) {
            this._scale.copy(value);
        } else if (typeof value === 'object' && value.x !== undefined) {
            this._scale.set(value.x || 1, value.y || 1, value.z || 1);
        }

        if (this._object3D) {
            this._object3D.scale.copy(this._scale);
        }
        this.setProperty('scale', this._scale.clone());
        this._markModified();
    }

    /**
     * Create the Three.js representation of this visual object
     * Should be implemented by subclasses
     * @param {object} options - Creation options
     * @returns {Promise<THREE.Object3D>}
     */
    async create(options = {}) {
        throw new Error('create() method must be implemented by subclasses');
    }

    /**
     * Update the visual object (called each frame if needed)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Override in subclasses for animation or dynamic updates
    }

    /**
     * Create material for a specific state
     * @param {string} state - Material state ('default', 'selected', 'highlighted')
     * @returns {THREE.Material}
     */
    createMaterial(state = 'default') {
        if (this._materials.has(state)) {
            return this._materials.get(state);
        }

        let material;

        // If there's a custom material, use it as base for ALL states to preserve textures
        if (this._customMaterial) {
            material = this._customMaterial.clone();

            // Apply state-specific modifications while preserving texture
            if (state === 'selected') {
                // Add emissive glow for selection but keep texture
                material.emissive.setHex(0x330000);
                material.emissiveIntensity = 0.5;
                // If no texture (map), apply red color
                if (!material.map) {
                    material.color.setHex(0xff0000);
                }
            } else if (state === 'highlighted') {
                // Add emissive glow for highlight but keep texture
                material.emissive.setHex(0x001133);
                material.emissiveIntensity = 0.5;
                // If no texture (map), apply blue color
                if (!material.map) {
                    material.color.setHex(0x0088ff);
                }
            } else {
                // Default state - reset emissive
                material.emissive.setHex(0x000000);
                material.emissiveIntensity = 0;
            }
        } else {
            // Use preset material or default configuration
            const config = this._materialConfig[state] || this._materialConfig.default;
            material = new THREE.MeshStandardMaterial({
                color: config.color,
                metalness: config.metalness,
                roughness: config.roughness,
                transparent: this._opacity < 1.0,
                opacity: this._opacity
            });

            if (config.emissive) {
                material.emissive.setHex(config.emissive);
            }
        }

        this._materials.set(state, material);
        return material;
    }

    /**
     * Set material
     * @param {string|object} materialConfig - Material ID or configuration
     * @param {object} options - Options
     */
    async setMaterial(materialConfig, options = {}) {
        try {
            let material;

            if (typeof materialConfig === 'string') {
                // Use preset material
                this._currentMaterialId = materialConfig;
                this._customMaterial = null;
                material = materialManager.createMaterial(materialConfig, options);
            } else {
                // Use custom configuration
                this._currentMaterialId = 'custom';
                material = materialManager.createMaterial(materialConfig, options);
                this._customMaterial = material;
            }

            // Update current material
            this._material = material;
            this._originalMaterial = material;

            // Clear state material cache, force recreation
            this._materials.clear();

            // Update Three.js object
            if (this._object3D) {
                this._object3D.material = this.createMaterial('default');
            }

            this.setProperty('materialId', this._currentMaterialId);
            this._markModified();

        } catch (error) {
            console.error('Failed to set material:', error);
            throw error;
        }
    }

    /**
     * Set texture material from image file
     * @param {File} file - Image file
     * @param {object} options - Options
     */
    async setTextureFromFile(file, options = {}) {
        try {
            const material = await materialManager.createTextureMaterialFromFile(file, options);

            this._currentMaterialId = 'texture';
            this._customMaterial = material;
            this._material = material;
            this._originalMaterial = material;

            // Clear state material cache
            this._materials.clear();

            // Update Three.js object
            if (this._object3D) {
                this._object3D.material = this.createMaterial('default');
            }

            this.setProperty('materialId', this._currentMaterialId);
            this.setProperty('textureFile', file.name);
            this._markModified();

        } catch (error) {
            console.error('Failed to set texture from file:', error);
            throw error;
        }
    }

    /**
     * Set texture material from URL
     * @param {string} imageUrl - Image URL
     * @param {object} options - Options
     */
    async setTextureFromUrl(imageUrl, options = {}) {
        try {
            const material = await materialManager.createTextureMaterial(imageUrl, options);

            this._currentMaterialId = 'texture';
            this._customMaterial = material;
            this._material = material;
            this._originalMaterial = material;

            // Clear state material cache
            this._materials.clear();

            // Update Three.js object
            if (this._object3D) {
                this._object3D.material = this.createMaterial('default');
            }

            this.setProperty('materialId', this._currentMaterialId);
            this.setProperty('textureUrl', imageUrl);
            this._markModified();

        } catch (error) {
            console.error('Failed to set texture from URL:', error);
            throw error;
        }
    }

    /**
     * Get current material ID
     * @returns {string}
     */
    getCurrentMaterialId() {
        return this._currentMaterialId;
    }

    /**
     * Get available preset materials list
     * @returns {Array}
     */
    getAvailableMaterials() {
        return materialManager.getPresetMaterials();
    }

    /**
     * Adjust texture repeat
     * @param {THREE.Vector2} surfaceSize - Surface size
     * @param {object} options - Options
     */
    adjustTextureRepeat(surfaceSize, options = {}) {
        if (!this._customMaterial || !this._customMaterial.map) {
            return;
        }

        const texture = this._customMaterial.map;
        materialManager.autoFitTexture(texture, surfaceSize, options);

        this._markModified();
    }

    /**
     * Update material state based on selection/highlight
     * @private
     *
     * NOTE: Selection and highlighting are now handled via outline overlays
     * (see SelectionOverlay.js) rather than material changes.
     * This method is kept for compatibility but does not change materials for selection/highlight.
     */
    _updateMaterialState() {
        if (!this._object3D) return;

        // Material state is always 'default' now
        // Selection and highlighting are handled via outline overlays in ThreeView
        const state = 'default';

        const newMaterial = this.createMaterial(state);
        if (this._object3D.material !== newMaterial) {
            this._object3D.material = newMaterial;
            this._material = newMaterial;
        }
    }

    /**
     * Set custom material configuration
     * @param {string} state - State name
     * @param {object} config - Material configuration
     */
    setMaterialConfig(state, config) {
        this._materialConfig[state] = { ...this._materialConfig[state], ...config };

        // Clear cached material to force recreation
        if (this._materials.has(state)) {
            const material = this._materials.get(state);
            material.dispose();
            this._materials.delete(state);
        }

        // Update current material if it's the active state
        this._updateMaterialState();
    }

    /**
     * Get bounding box of the visual object
     * @returns {THREE.Box3|null}
     */
    getBoundingBox() {
        if (!this._object3D) return null;

        const box = new THREE.Box3();
        box.setFromObject(this._object3D);
        return box;
    }

    /**
     * Get center point of the visual object
     * @returns {THREE.Vector3|null}
     */
    getCenter() {
        const box = this.getBoundingBox();
        if (!box) return null;

        return box.getCenter(new THREE.Vector3());
    }

    /**
     * Set metadata for this visual object
     * @param {string} key
     * @param {any} value
     */
    setMetadata(key, value) {
        this._metadata.set(key, value);
        this._markModified();
    }

    /**
     * Get metadata value
     * @param {string} key
     * @returns {any}
     */
    getMetadata(key) {
        return this._metadata.get(key);
    }

    /**
     * Add tag to this visual object
     * @param {string} tag
     */
    addTag(tag) {
        this._tags.add(tag);
        this._markModified();
    }

    /**
     * Remove tag from this visual object
     * @param {string} tag
     */
    removeTag(tag) {
        this._tags.delete(tag);
        this._markModified();
    }

    /**
     * Check if object has tag
     * @param {string} tag
     * @returns {boolean}
     */
    hasTag(tag) {
        return this._tags.has(tag);
    }

    /**
     * Get all tags
     * @returns {Set<string>}
     */
    getTags() {
        return new Set(this._tags);
    }

    /**
     * Mark object as modified
     * @private
     */
    _markModified() {
        this._modified = new Date();
    }

    /**
     * Get creation date
     * @returns {Date}
     */
    getCreated() {
        return this._created;
    }

    /**
     * Get last modified date
     * @returns {Date}
     */
    getModified() {
        return this._modified;
    }

    /**
     * Serialize visual object to JSON
     * @returns {object}
     */
    toJSON() {
        return {
            id: this._id,
            nodeId: this._nodeId,
            type: this._type,
            name: this._name,
            visible: this._visible,
            opacity: this._opacity,
            position: {
                x: this._position.x,
                y: this._position.y,
                z: this._position.z
            },
            rotation: {
                x: this._rotation.x,
                y: this._rotation.y,
                z: this._rotation.z
            },
            scale: {
                x: this._scale.x,
                y: this._scale.y,
                z: this._scale.z
            },
            materialId: this._currentMaterialId,
            textureFile: this.getProperty('textureFile'),
            textureUrl: this.getProperty('textureUrl'),
            metadata: Object.fromEntries(this._metadata),
            tags: Array.from(this._tags),
            created: this._created.toISOString(),
            modified: this._modified.toISOString()
        };
    }

    /**
     * Load visual object from JSON
     * @param {object} data
     */
    async fromJSON(data) {
        if (data.name) this._name = data.name;
        if (data.visible !== undefined) this.visible = data.visible;
        if (data.opacity !== undefined) this.opacity = data.opacity;

        if (data.position) {
            this.position = data.position;
        }
        if (data.rotation) {
            this.rotation = data.rotation;
        }
        if (data.scale) {
            this.scale = data.scale;
        }

        // Restore material
        if (data.materialId) {
            this._currentMaterialId = data.materialId;
            if (data.textureUrl) {
                try {
                    await this.setTextureFromUrl(data.textureUrl);
                } catch (error) {
                    console.warn('Failed to restore texture from URL:', error);
                }
            } else if (data.materialId !== 'texture') {
                try {
                    await this.setMaterial(data.materialId);
                } catch (error) {
                    console.warn('Failed to restore material:', error);
                }
            }
        }

        if (data.metadata) {
            this._metadata.clear();
            Object.entries(data.metadata).forEach(([key, value]) => {
                this._metadata.set(key, value);
            });
        }

        if (data.tags) {
            this._tags.clear();
            data.tags.forEach(tag => this._tags.add(tag));
        }

        if (data.created) {
            this._created = new Date(data.created);
        }
        if (data.modified) {
            this._modified = new Date(data.modified);
        }
    }

    /**
     * Dispose of the visual object and free resources
     */
    dispose() {
        if (this._disposed) return;

        // Dispose Three.js resources
        if (this._geometry) {
            this._geometry.dispose();
            this._geometry = null;
        }

        // Dispose all materials
        this._materials.forEach(material => {
            material.dispose();
        });
        this._materials.clear();
        this._material = null;
        this._originalMaterial = null;

        // Clear Three.js object
        if (this._object3D) {
            if (this._object3D.parent) {
                this._object3D.parent.remove(this._object3D);
            }
            this._object3D = null;
        }

        // Clear metadata and tags
        this._metadata.clear();
        this._tags.clear();

        // Call parent dispose
        super.dispose();

        this._disposed = true;
    }

    /**
     * Check if object is disposed
     * @returns {boolean}
     */
    get disposed() {
        return this._disposed;
    }
}
