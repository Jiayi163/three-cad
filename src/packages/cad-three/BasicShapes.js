/**
 * BasicShapes - Concrete implementations of VisualObject for basic geometric shapes
 * 
 * Provides ready-to-use visual objects for common CAD shapes:
 * - BoxVisualObject
 * - SphereVisualObject  
 * - CylinderVisualObject
 * - PlaneVisualObject
 * - ConeVisualObject
 * - TorusVisualObject
 */

import * as THREE from 'three';
import { VisualObject } from './VisualObject.js';
import { geometryFactory } from './GeometryFactory.js';

/**
 * Box Visual Object
 */
export class BoxVisualObject extends VisualObject {
    constructor(nodeId = null, params = {}) {
        super(nodeId);
        this._type = 'BoxVisualObject';
        this._name = `Box_${this._id}`;
        
        // Box-specific parameters
        this._boxParams = {
            width: 1,
            height: 1,
            depth: 1,
            widthSegments: 1,
            heightSegments: 1,
            depthSegments: 1,
            ...params
        };
        
        this.setProperty('type', this._type);
        this.setProperty('name', this._name);
        this.setProperty('boxParams', this._boxParams);
    }
    
    /**
     * Create the Three.js box representation
     * @param {object} options - Creation options
     * @returns {Promise<THREE.Object3D>}
     */
    async create(options = {}) {
        if (this._object3D) {
            return this._object3D;
        }
        
        try {
            // Create geometry using factory
            this._geometry = geometryFactory.createBox(this._boxParams);
            
            // Create material
            this._material = this.createMaterial('default');
            this._originalMaterial = this._material;
            
            // Create mesh
            this._object3D = new THREE.Mesh(this._geometry, this._material);
            this._object3D.userData.visualObject = this;
            this._object3D.userData.nodeId = this._nodeId;
            
            // Apply transform
            this._object3D.position.copy(this._position);
            this._object3D.rotation.copy(this._rotation);
            this._object3D.scale.copy(this._scale);
            this._object3D.visible = this._visible;
            
            // Set name for debugging
            this._object3D.name = this._name;
            
            return this._object3D;
        } catch (error) {
            console.error('Failed to create BoxVisualObject:', error);
            throw error;
        }
    }
    
    /**
     * Update box parameters
     * @param {object} params - New parameters
     */
    updateParams(params) {
        const oldParams = { ...this._boxParams };
        this._boxParams = { ...this._boxParams, ...params };
        
        // Check if geometry needs to be recreated
        const geometryChanged = Object.keys(params).some(key => 
            key in oldParams && oldParams[key] !== this._boxParams[key]
        );
        
        if (geometryChanged && this._object3D) {
            // Dispose old geometry
            if (this._geometry) {
                this._geometry.dispose();
            }
            
            // Create new geometry
            this._geometry = geometryFactory.createBox(this._boxParams);
            this._object3D.geometry = this._geometry;
        }
        
        this.setProperty('boxParams', this._boxParams);
        this._markModified();
    }
    
    /**
     * Get box dimensions
     * @returns {object}
     */
    getDimensions() {
        return {
            width: this._boxParams.width,
            height: this._boxParams.height,
            depth: this._boxParams.depth
        };
    }
    
    /**
     * Serialize box-specific data
     * @returns {object}
     */
    toJSON() {
        const data = super.toJSON();
        data.boxParams = { ...this._boxParams };
        return data;
    }
    
    /**
     * Load box-specific data
     * @param {object} data
     */
    fromJSON(data) {
        super.fromJSON(data);
        if (data.boxParams) {
            this.updateParams(data.boxParams);
        }
    }
}

/**
 * Sphere Visual Object
 */
export class SphereVisualObject extends VisualObject {
    constructor(nodeId = null, params = {}) {
        super(nodeId);
        this._type = 'SphereVisualObject';
        this._name = `Sphere_${this._id}`;
        
        // Sphere-specific parameters
        this._sphereParams = {
            radius: 1,
            widthSegments: 32,
            heightSegments: 16,
            phiStart: 0,
            phiLength: Math.PI * 2,
            thetaStart: 0,
            thetaLength: Math.PI,
            ...params
        };
        
        this.setProperty('type', this._type);
        this.setProperty('name', this._name);
        this.setProperty('sphereParams', this._sphereParams);
    }
    
    async create(options = {}) {
        if (this._object3D) {
            return this._object3D;
        }
        
        try {
            this._geometry = geometryFactory.createSphere(this._sphereParams);
            this._material = this.createMaterial('default');
            this._originalMaterial = this._material;
            
            this._object3D = new THREE.Mesh(this._geometry, this._material);
            this._object3D.userData.visualObject = this;
            this._object3D.userData.nodeId = this._nodeId;
            
            this._object3D.position.copy(this._position);
            this._object3D.rotation.copy(this._rotation);
            this._object3D.scale.copy(this._scale);
            this._object3D.visible = this._visible;
            this._object3D.name = this._name;
            
            return this._object3D;
        } catch (error) {
            console.error('Failed to create SphereVisualObject:', error);
            throw error;
        }
    }
    
    updateParams(params) {
        const oldParams = { ...this._sphereParams };
        this._sphereParams = { ...this._sphereParams, ...params };
        
        const geometryChanged = Object.keys(params).some(key => 
            key in oldParams && oldParams[key] !== this._sphereParams[key]
        );
        
        if (geometryChanged && this._object3D) {
            if (this._geometry) {
                this._geometry.dispose();
            }
            this._geometry = geometryFactory.createSphere(this._sphereParams);
            this._object3D.geometry = this._geometry;
        }
        
        this.setProperty('sphereParams', this._sphereParams);
        this._markModified();
    }
    
    getRadius() {
        return this._sphereParams.radius;
    }
    
    toJSON() {
        const data = super.toJSON();
        data.sphereParams = { ...this._sphereParams };
        return data;
    }
    
    fromJSON(data) {
        super.fromJSON(data);
        if (data.sphereParams) {
            this.updateParams(data.sphereParams);
        }
    }
}

/**
 * Cylinder Visual Object
 */
export class CylinderVisualObject extends VisualObject {
    constructor(nodeId = null, params = {}) {
        super(nodeId);
        this._type = 'CylinderVisualObject';
        this._name = `Cylinder_${this._id}`;
        
        this._cylinderParams = {
            radiusTop: 1,
            radiusBottom: 1,
            height: 1,
            radialSegments: 32,
            heightSegments: 1,
            openEnded: false,
            thetaStart: 0,
            thetaLength: Math.PI * 2,
            ...params
        };
        
        this.setProperty('type', this._type);
        this.setProperty('name', this._name);
        this.setProperty('cylinderParams', this._cylinderParams);
    }
    
    async create(options = {}) {
        if (this._object3D) {
            return this._object3D;
        }
        
        try {
            this._geometry = geometryFactory.createCylinder(this._cylinderParams);
            this._material = this.createMaterial('default');
            this._originalMaterial = this._material;
            
            this._object3D = new THREE.Mesh(this._geometry, this._material);
            this._object3D.userData.visualObject = this;
            this._object3D.userData.nodeId = this._nodeId;
            
            this._object3D.position.copy(this._position);
            this._object3D.rotation.copy(this._rotation);
            this._object3D.scale.copy(this._scale);
            this._object3D.visible = this._visible;
            this._object3D.name = this._name;
            
            return this._object3D;
        } catch (error) {
            console.error('Failed to create CylinderVisualObject:', error);
            throw error;
        }
    }
    
    updateParams(params) {
        const oldParams = { ...this._cylinderParams };
        this._cylinderParams = { ...this._cylinderParams, ...params };
        
        const geometryChanged = Object.keys(params).some(key => 
            key in oldParams && oldParams[key] !== this._cylinderParams[key]
        );
        
        if (geometryChanged && this._object3D) {
            if (this._geometry) {
                this._geometry.dispose();
            }
            this._geometry = geometryFactory.createCylinder(this._cylinderParams);
            this._object3D.geometry = this._geometry;
        }
        
        this.setProperty('cylinderParams', this._cylinderParams);
        this._markModified();
    }
    
    getDimensions() {
        return {
            radiusTop: this._cylinderParams.radiusTop,
            radiusBottom: this._cylinderParams.radiusBottom,
            height: this._cylinderParams.height
        };
    }
    
    toJSON() {
        const data = super.toJSON();
        data.cylinderParams = { ...this._cylinderParams };
        return data;
    }
    
    fromJSON(data) {
        super.fromJSON(data);
        if (data.cylinderParams) {
            this.updateParams(data.cylinderParams);
        }
    }
}

/**
 * Plane Visual Object
 */
export class PlaneVisualObject extends VisualObject {
    constructor(nodeId = null, params = {}) {
        super(nodeId);
        this._type = 'PlaneVisualObject';
        this._name = `Plane_${this._id}`;
        
        this._planeParams = {
            width: 1,
            height: 1,
            widthSegments: 1,
            heightSegments: 1,
            ...params
        };
        
        this.setProperty('type', this._type);
        this.setProperty('name', this._name);
        this.setProperty('planeParams', this._planeParams);
    }
    
    async create(options = {}) {
        if (this._object3D) {
            return this._object3D;
        }
        
        try {
            this._geometry = geometryFactory.createPlane(this._planeParams);
            this._material = this.createMaterial('default');
            this._originalMaterial = this._material;
            
            this._object3D = new THREE.Mesh(this._geometry, this._material);
            this._object3D.userData.visualObject = this;
            this._object3D.userData.nodeId = this._nodeId;
            
            this._object3D.position.copy(this._position);
            this._object3D.rotation.copy(this._rotation);
            this._object3D.scale.copy(this._scale);
            this._object3D.visible = this._visible;
            this._object3D.name = this._name;
            
            return this._object3D;
        } catch (error) {
            console.error('Failed to create PlaneVisualObject:', error);
            throw error;
        }
    }
    
    updateParams(params) {
        const oldParams = { ...this._planeParams };
        this._planeParams = { ...this._planeParams, ...params };
        
        const geometryChanged = Object.keys(params).some(key => 
            key in oldParams && oldParams[key] !== this._planeParams[key]
        );
        
        if (geometryChanged && this._object3D) {
            if (this._geometry) {
                this._geometry.dispose();
            }
            this._geometry = geometryFactory.createPlane(this._planeParams);
            this._object3D.geometry = this._geometry;
        }
        
        this.setProperty('planeParams', this._planeParams);
        this._markModified();
    }
    
    toJSON() {
        const data = super.toJSON();
        data.planeParams = { ...this._planeParams };
        return data;
    }
    
    fromJSON(data) {
        super.fromJSON(data);
        if (data.planeParams) {
            this.updateParams(data.planeParams);
        }
    }
}

/**
 * Factory function to create visual objects by type
 * @param {string} type - Type of visual object to create
 * @param {string} nodeId - Node ID to associate with the object
 * @param {object} params - Parameters for the object
 * @returns {VisualObject}
 */
export function createVisualObject(type, nodeId = null, params = {}) {
    switch (type.toLowerCase()) {
        case 'box':
        case 'cube':
            return new BoxVisualObject(nodeId, params);
        case 'sphere':
            return new SphereVisualObject(nodeId, params);
        case 'cylinder':
            return new CylinderVisualObject(nodeId, params);
        case 'plane':
            return new PlaneVisualObject(nodeId, params);
        default:
            throw new Error(`Unsupported visual object type: ${type}`);
    }
}

/**
 * Get all available visual object types
 * @returns {array}
 */
export function getAvailableTypes() {
    return ['box', 'sphere', 'cylinder', 'plane'];
}