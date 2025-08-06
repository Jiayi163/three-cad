/**
 * GeometryFactory - Factory class for creating and managing Three.js geometries
 * 
 * Provides optimized geometry creation with caching and reuse capabilities:
 * - Basic shapes (box, sphere, cylinder, plane, cone, torus)
 * - Geometry caching and sharing for performance
 * - Parameter validation and normalization
 * - Custom geometry creation utilities
 * - Memory management and disposal
 */

import * as THREE from 'three';

export class GeometryFactory {
    constructor() {
        // Geometry cache for reusing identical geometries
        this._geometryCache = new Map();
        this._cacheEnabled = true;
        this._maxCacheSize = 100;
        
        // Statistics for monitoring
        this._stats = {
            created: 0,
            cached: 0,
            disposed: 0
        };
        
        // Default parameters for different shapes
        this._defaults = {
            box: {
                width: 1,
                height: 1,
                depth: 1,
                widthSegments: 1,
                heightSegments: 1,
                depthSegments: 1
            },
            sphere: {
                radius: 1,
                widthSegments: 32,
                heightSegments: 16,
                phiStart: 0,
                phiLength: Math.PI * 2,
                thetaStart: 0,
                thetaLength: Math.PI
            },
            cylinder: {
                radiusTop: 1,
                radiusBottom: 1,
                height: 1,
                radialSegments: 32,
                heightSegments: 1,
                openEnded: false,
                thetaStart: 0,
                thetaLength: Math.PI * 2
            },
            plane: {
                width: 1,
                height: 1,
                widthSegments: 1,
                heightSegments: 1
            },
            cone: {
                radius: 1,
                height: 1,
                radialSegments: 32,
                heightSegments: 1,
                openEnded: false,
                thetaStart: 0,
                thetaLength: Math.PI * 2
            },
            torus: {
                radius: 1,
                tube: 0.4,
                radialSegments: 16,
                tubularSegments: 100,
                arc: Math.PI * 2
            }
        };
    }
    
    /**
     * Generate cache key for geometry parameters
     * @param {string} type - Geometry type
     * @param {object} params - Geometry parameters
     * @returns {string}
     */
    _generateCacheKey(type, params) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');
        return `${type}:${sortedParams}`;
    }
    
    /**
     * Get geometry from cache or create new one
     * @param {string} type - Geometry type
     * @param {object} params - Geometry parameters
     * @param {Function} createFn - Function to create geometry if not cached
     * @returns {THREE.BufferGeometry}
     */
    _getOrCreateGeometry(type, params, createFn) {
        const cacheKey = this._generateCacheKey(type, params);
        
        if (this._cacheEnabled && this._geometryCache.has(cacheKey)) {
            this._stats.cached++;
            return this._geometryCache.get(cacheKey).clone();
        }
        
        const geometry = createFn();
        this._stats.created++;
        
        // Add to cache if enabled and under size limit
        if (this._cacheEnabled && this._geometryCache.size < this._maxCacheSize) {
            this._geometryCache.set(cacheKey, geometry.clone());
        }
        
        return geometry;
    }
    
    /**
     * Normalize and validate parameters
     * @param {string} type - Geometry type
     * @param {object} params - Input parameters
     * @returns {object} - Normalized parameters
     */
    _normalizeParams(type, params = {}) {
        const defaults = this._defaults[type];
        if (!defaults) {
            throw new Error(`Unknown geometry type: ${type}`);
        }
        
        const normalized = { ...defaults, ...params };
        
        // Validate numeric parameters
        Object.keys(normalized).forEach(key => {
            const value = normalized[key];
            if (typeof value === 'number') {
                if (!isFinite(value)) {
                    throw new Error(`Invalid ${key} parameter: ${value}`);
                }
                if (value < 0 && !key.includes('Start') && !key.includes('phi') && !key.includes('theta')) {
                    normalized[key] = Math.abs(value);
                }
            }
        });
        
        return normalized;
    }
    
    /**
     * Create box geometry
     * @param {object} params - Box parameters
     * @param {number} params.width - Width of the box
     * @param {number} params.height - Height of the box  
     * @param {number} params.depth - Depth of the box
     * @param {number} params.widthSegments - Width segments
     * @param {number} params.heightSegments - Height segments
     * @param {number} params.depthSegments - Depth segments
     * @returns {THREE.BoxGeometry}
     */
    createBox(params = {}) {
        const p = this._normalizeParams('box', params);
        
        return this._getOrCreateGeometry('box', p, () => {
            return new THREE.BoxGeometry(
                p.width,
                p.height,
                p.depth,
                p.widthSegments,
                p.heightSegments,
                p.depthSegments
            );
        });
    }
    
    /**
     * Create sphere geometry
     * @param {object} params - Sphere parameters
     * @param {number} params.radius - Sphere radius
     * @param {number} params.widthSegments - Width segments
     * @param {number} params.heightSegments - Height segments
     * @param {number} params.phiStart - Phi start angle
     * @param {number} params.phiLength - Phi length angle
     * @param {number} params.thetaStart - Theta start angle
     * @param {number} params.thetaLength - Theta length angle
     * @returns {THREE.SphereGeometry}
     */
    createSphere(params = {}) {
        const p = this._normalizeParams('sphere', params);
        
        return this._getOrCreateGeometry('sphere', p, () => {
            return new THREE.SphereGeometry(
                p.radius,
                p.widthSegments,
                p.heightSegments,
                p.phiStart,
                p.phiLength,
                p.thetaStart,
                p.thetaLength
            );
        });
    }
    
    /**
     * Create cylinder geometry
     * @param {object} params - Cylinder parameters
     * @param {number} params.radiusTop - Top radius
     * @param {number} params.radiusBottom - Bottom radius
     * @param {number} params.height - Cylinder height
     * @param {number} params.radialSegments - Radial segments
     * @param {number} params.heightSegments - Height segments
     * @param {boolean} params.openEnded - Whether ends are open
     * @param {number} params.thetaStart - Theta start angle
     * @param {number} params.thetaLength - Theta length angle
     * @returns {THREE.CylinderGeometry}
     */
    createCylinder(params = {}) {
        const p = this._normalizeParams('cylinder', params);
        
        return this._getOrCreateGeometry('cylinder', p, () => {
            return new THREE.CylinderGeometry(
                p.radiusTop,
                p.radiusBottom,
                p.height,
                p.radialSegments,
                p.heightSegments,
                p.openEnded,
                p.thetaStart,
                p.thetaLength
            );
        });
    }
    
    /**
     * Create plane geometry
     * @param {object} params - Plane parameters
     * @param {number} params.width - Plane width
     * @param {number} params.height - Plane height
     * @param {number} params.widthSegments - Width segments
     * @param {number} params.heightSegments - Height segments
     * @returns {THREE.PlaneGeometry}
     */
    createPlane(params = {}) {
        const p = this._normalizeParams('plane', params);
        
        return this._getOrCreateGeometry('plane', p, () => {
            return new THREE.PlaneGeometry(
                p.width,
                p.height,
                p.widthSegments,
                p.heightSegments
            );
        });
    }
    
    /**
     * Create cone geometry
     * @param {object} params - Cone parameters
     * @param {number} params.radius - Base radius
     * @param {number} params.height - Cone height
     * @param {number} params.radialSegments - Radial segments
     * @param {number} params.heightSegments - Height segments
     * @param {boolean} params.openEnded - Whether base is open
     * @param {number} params.thetaStart - Theta start angle
     * @param {number} params.thetaLength - Theta length angle
     * @returns {THREE.ConeGeometry}
     */
    createCone(params = {}) {
        const p = this._normalizeParams('cone', params);
        
        return this._getOrCreateGeometry('cone', p, () => {
            return new THREE.ConeGeometry(
                p.radius,
                p.height,
                p.radialSegments,
                p.heightSegments,
                p.openEnded,
                p.thetaStart,
                p.thetaLength
            );
        });
    }
    
    /**
     * Create torus geometry
     * @param {object} params - Torus parameters
     * @param {number} params.radius - Torus radius
     * @param {number} params.tube - Tube radius
     * @param {number} params.radialSegments - Radial segments
     * @param {number} params.tubularSegments - Tubular segments
     * @param {number} params.arc - Arc length
     * @returns {THREE.TorusGeometry}
     */
    createTorus(params = {}) {
        const p = this._normalizeParams('torus', params);
        
        return this._getOrCreateGeometry('torus', p, () => {
            return new THREE.TorusGeometry(
                p.radius,
                p.tube,
                p.radialSegments,
                p.tubularSegments,
                p.arc
            );
        });
    }
    
    /**
     * Create geometry by type
     * @param {string} type - Geometry type
     * @param {object} params - Parameters for the geometry
     * @returns {THREE.BufferGeometry}
     */
    createGeometry(type, params = {}) {
        switch (type.toLowerCase()) {
            case 'box':
            case 'cube':
                return this.createBox(params);
            case 'sphere':
                return this.createSphere(params);
            case 'cylinder':
                return this.createCylinder(params);
            case 'plane':
                return this.createPlane(params);
            case 'cone':
                return this.createCone(params);
            case 'torus':
                return this.createTorus(params);
            default:
                throw new Error(`Unsupported geometry type: ${type}`);
        }
    }
    
    /**
     * Create custom geometry from vertices and faces
     * @param {array} vertices - Array of vertices [x, y, z, ...]
     * @param {array} indices - Array of face indices
     * @param {array} normals - Optional normals array
     * @param {array} uvs - Optional UV coordinates
     * @returns {THREE.BufferGeometry}
     */
    createCustomGeometry(vertices, indices = null, normals = null, uvs = null) {
        const geometry = new THREE.BufferGeometry();
        
        // Set vertices
        if (!vertices || vertices.length === 0) {
            throw new Error('Vertices array is required and cannot be empty');
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        // Set indices if provided
        if (indices && indices.length > 0) {
            geometry.setIndex(indices);
        }
        
        // Set normals if provided, otherwise compute them
        if (normals && normals.length > 0) {
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        } else {
            geometry.computeVertexNormals();
        }
        
        // Set UV coordinates if provided
        if (uvs && uvs.length > 0) {
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        }
        
        // Compute bounding box and sphere
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        
        this._stats.created++;
        return geometry;
    }
    
    /**
     * Create line geometry from points
     * @param {array} points - Array of THREE.Vector3 points
     * @returns {THREE.BufferGeometry}
     */
    createLineGeometry(points) {
        if (!points || points.length < 2) {
            throw new Error('At least 2 points are required for line geometry');
        }
        
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        
        points.forEach(point => {
            if (point instanceof THREE.Vector3) {
                positions.push(point.x, point.y, point.z);
            } else if (typeof point === 'object' && point.x !== undefined) {
                positions.push(point.x || 0, point.y || 0, point.z || 0);
            } else {
                throw new Error('Invalid point format. Expected Vector3 or {x, y, z} object');
            }
        });
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        this._stats.created++;
        return geometry;
    }
    
    /**
     * Create wireframe geometry from any geometry
     * @param {THREE.BufferGeometry} sourceGeometry - Source geometry
     * @returns {THREE.WireframeGeometry}
     */
    createWireframe(sourceGeometry) {
        if (!sourceGeometry || !(sourceGeometry instanceof THREE.BufferGeometry)) {
            throw new Error('Valid BufferGeometry is required');
        }
        
        const wireframe = new THREE.WireframeGeometry(sourceGeometry);
        this._stats.created++;
        return wireframe;
    }
    
    /**
     * Create edges geometry from any geometry
     * @param {THREE.BufferGeometry} sourceGeometry - Source geometry
     * @param {number} thresholdAngle - Threshold angle for edge detection
     * @returns {THREE.EdgesGeometry}
     */
    createEdges(sourceGeometry, thresholdAngle = 1) {
        if (!sourceGeometry || !(sourceGeometry instanceof THREE.BufferGeometry)) {
            throw new Error('Valid BufferGeometry is required');
        }
        
        const edges = new THREE.EdgesGeometry(sourceGeometry, thresholdAngle);
        this._stats.created++;
        return edges;
    }
    
    /**
     * Merge multiple geometries into one
     * @param {array} geometries - Array of geometries to merge
     * @returns {THREE.BufferGeometry}
     */
    mergeGeometries(geometries) {
        if (!geometries || geometries.length === 0) {
            throw new Error('At least one geometry is required for merging');
        }
        
        // Validate all geometries
        geometries.forEach((geo, index) => {
            if (!geo || !(geo instanceof THREE.BufferGeometry)) {
                throw new Error(`Invalid geometry at index ${index}`);
            }
        });
        
        const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        if (!merged) {
            throw new Error('Failed to merge geometries');
        }
        
        this._stats.created++;
        return merged;
    }
    
    /**
     * Get default parameters for a geometry type
     * @param {string} type - Geometry type
     * @returns {object}
     */
    getDefaults(type) {
        const defaults = this._defaults[type];
        if (!defaults) {
            throw new Error(`Unknown geometry type: ${type}`);
        }
        return { ...defaults };
    }
    
    /**
     * Set default parameters for a geometry type
     * @param {string} type - Geometry type
     * @param {object} params - Default parameters
     */
    setDefaults(type, params) {
        if (!this._defaults[type]) {
            throw new Error(`Unknown geometry type: ${type}`);
        }
        this._defaults[type] = { ...this._defaults[type], ...params };
    }
    
    /**
     * Get supported geometry types
     * @returns {array}
     */
    getSupportedTypes() {
        return Object.keys(this._defaults);
    }
    
    /**
     * Enable or disable geometry caching
     * @param {boolean} enabled - Whether to enable caching
     */
    setCacheEnabled(enabled) {
        this._cacheEnabled = enabled;
        if (!enabled) {
            this.clearCache();
        }
    }
    
    /**
     * Set maximum cache size
     * @param {number} size - Maximum number of cached geometries
     */
    setMaxCacheSize(size) {
        this._maxCacheSize = Math.max(0, size);
        
        // Trim cache if over new limit
        if (this._geometryCache.size > this._maxCacheSize) {
            const entries = Array.from(this._geometryCache.entries());
            entries.slice(this._maxCacheSize).forEach(([key, geometry]) => {
                geometry.dispose();
                this._geometryCache.delete(key);
            });
        }
    }
    
    /**
     * Clear geometry cache
     */
    clearCache() {
        this._geometryCache.forEach(geometry => {
            geometry.dispose();
        });
        this._geometryCache.clear();
    }
    
    /**
     * Get factory statistics
     * @returns {object}
     */
    getStats() {
        return {
            ...this._stats,
            cacheSize: this._geometryCache.size,
            cacheEnabled: this._cacheEnabled,
            maxCacheSize: this._maxCacheSize
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this._stats = {
            created: 0,
            cached: 0,
            disposed: 0
        };
    }
    
    /**
     * Dispose of all cached geometries and reset factory
     */
    dispose() {
        this.clearCache();
        this.resetStats();
    }
}

// Create singleton instance
export const geometryFactory = new GeometryFactory();