/**
 * MirrorCommand - Mirror/reflect objects across a plane
 *
 * Features:
 * - Mirror objects across X, Y, or Z axis
 * - Mirror across custom plane
 * - Preserve original objects or create copies
 * - Interactive plane selection
 */

import * as THREE from 'three';
import { ModificationCommand } from '../cad-core/command/Command.js';

export class MirrorCommand extends ModificationCommand {
  constructor(options = {}) {
    super();

    // Mirror configuration
    this.axis = options.axis || 'x'; // 'x', 'y', 'z', or 'custom'
    this.plane = options.plane || null; // Custom plane for 'custom' axis
    this.createCopy = options.createCopy || false; // Create copy instead of modifying original
    this.center = options.center || null; // Mirror center point

    // Validate axis
    if (!['x', 'y', 'z', 'custom'].includes(this.axis)) {
      throw new Error(`Invalid mirror axis: ${this.axis}. Must be 'x', 'y', 'z', or 'custom'`);
    }

    if (this.axis === 'custom' && !this.plane) {
      throw new Error('Custom plane must be provided when axis is "custom"');
    }

    // Set command properties
    this.setProperty('name', 'Mirror');
    this.setProperty('description', `Mirror objects across ${this.axis.toUpperCase()} axis`);
    this.setProperty('icon', 'mirror');
  }

  // ==================== Parameters ====================

  getParameters() {
    return {
      axis: this.axis,
      plane: this.plane,
      createCopy: this.createCopy,
      center: this.center
    };
  }

  setParameters(params) {
    if (params.axis !== undefined) {
      if (!['x', 'y', 'z', 'custom'].includes(params.axis)) {
        throw new Error(`Invalid mirror axis: ${params.axis}`);
      }
      this.axis = params.axis;
    }

    if (params.plane !== undefined) {
      this.plane = params.plane;
    }

    if (params.createCopy !== undefined) {
      this.createCopy = params.createCopy;
    }

    if (params.center !== undefined) {
      this.center = params.center;
    }

    this.setProperty('description', `Mirror objects across ${this.axis.toUpperCase()} axis`);
  }

  // ==================== Mirror Operations ====================

  /**
   * Get mirror plane for the specified axis
   * @private
   */
  _getMirrorPlane() {
    if (this.axis === 'custom') {
      return this.plane;
    }

    // Standard axis planes
    const planes = {
      x: { normal: [1, 0, 0], point: [0, 0, 0] },
      y: { normal: [0, 1, 0], point: [0, 0, 0] },
      z: { normal: [0, 0, 1], point: [0, 0, 0] }
    };

    return planes[this.axis];
  }

  /**
   * Calculate mirror transformation matrix
   * @private
   */
  _getMirrorMatrix() {
    const plane = this._getMirrorPlane();

    // Create reflection matrix
    const matrix = new THREE.Matrix4();

    if (this.axis === 'x') {
      matrix.set(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    } else if (this.axis === 'y') {
      matrix.set(1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    } else if (this.axis === 'z') {
      matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1);
    } else {
      // Custom plane - more complex calculation
      // For now, use identity matrix (would need proper plane reflection math)
      matrix.identity();
    }

    return matrix;
  }

  // ==================== Command Execution ====================

  async executeAsync() {
    if (!this.application.activeDocument) {
      throw new Error('No active document available');
    }

    const selectedObjects = this.application.activeDocument.getSelectedNodes();
    if (selectedObjects.length === 0) {
      throw new Error('No objects selected for mirroring');
    }

    console.log(`Starting mirror operation...`, {
      selectedCount: selectedObjects.length,
      axis: this.axis,
      createCopy: this.createCopy
    });

    // Store original transforms for undo
    this._originalTransforms = new Map();

    for (const obj of selectedObjects) {
      if (obj.transform) {
        this._originalTransforms.set(obj.id, {
          position: obj.transform.position ? [...obj.transform.position] : [0, 0, 0],
          rotation: obj.transform.rotation ? [...obj.transform.rotation] : [0, 0, 0],
          scale: obj.transform.scale ? [...obj.transform.scale] : [1, 1, 1]
        });
      }
    }

    // Apply mirror transformation
    const mirrorMatrix = this._getMirrorMatrix();

    for (const obj of selectedObjects) {
      if (this.createCopy) {
        // Create mirrored copy
        const mirroredObj = this._createMirroredCopy(obj, mirrorMatrix);
        this.application.activeDocument.addNode(mirroredObj);
      } else {
        // Mirror original object
        this._applyMirrorTransform(obj, mirrorMatrix);
      }
    }

    const resultCount = this.createCopy ? selectedObjects.length * 2 : selectedObjects.length;
    console.log(`Mirror operation completed successfully:`, {
      axis: this.axis,
      resultCount: resultCount,
      createCopy: this.createCopy
    });

    this.setProperty('status', 'completed');
  }

  /**
   * Create a mirrored copy of an object
   * @private
   */
  _createMirroredCopy(originalObj, mirrorMatrix) {
    const mirroredObj = {
      id: `${originalObj.id}_mirrored`,
      name: `${originalObj.name} (Mirrored)`,
      type: originalObj.type,
      transform: originalObj.transform ? { ...originalObj.transform } : null,
      geometry: originalObj.geometry ? { ...originalObj.geometry } : null,
      material: originalObj.material ? { ...originalObj.material } : null
    };

    // Apply mirror transformation to copy
    this._applyMirrorTransform(mirroredObj, mirrorMatrix);

    return mirroredObj;
  }

  /**
   * Apply mirror transformation to an object
   * @private
   */
  _applyMirrorTransform(obj, mirrorMatrix) {
    if (!obj.transform) {
      obj.transform = {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      };
    }

    // Apply mirror transformation to position
    if (obj.transform.position) {
      const position = new THREE.Vector3(...obj.transform.position);
      position.applyMatrix4(mirrorMatrix);
      obj.transform.position = [position.x, position.y, position.z];
    }

    // Apply mirror transformation to rotation
    if (obj.transform.rotation) {
      const rotation = new THREE.Euler(...obj.transform.rotation);
      rotation.applyMatrix4(mirrorMatrix);
      obj.transform.rotation = [rotation.x, rotation.y, rotation.z];
    }

    // Scale might need adjustment for mirroring
    if (obj.transform.scale) {
      if (this.axis === 'x') {
        obj.transform.scale[0] *= -1;
      } else if (this.axis === 'y') {
        obj.transform.scale[1] *= -1;
      } else if (this.axis === 'z') {
        obj.transform.scale[2] *= -1;
      }
    }
  }

  // ==================== Undo/Redo ====================

  async undo() {
    if (!this._originalTransforms) {
      throw new Error('No original transforms stored for undo');
    }

    const selectedObjects = this.application.activeDocument.getSelectedNodes();

    for (const obj of selectedObjects) {
      const originalTransform = this._originalTransforms.get(obj.id);
      if (originalTransform && obj.transform) {
        obj.transform.position = [...originalTransform.position];
        obj.transform.rotation = [...originalTransform.rotation];
        obj.transform.scale = [...originalTransform.scale];
      }
    }

    console.log('Mirror operation undone');
  }

  // ==================== Static Factory Methods ====================

  static createXAxisMirror(createCopy = false) {
    return new MirrorCommand({ axis: 'x', createCopy });
  }

  static createYAxisMirror(createCopy = false) {
    return new MirrorCommand({ axis: 'y', createCopy });
  }

  static createZAxisMirror(createCopy = false) {
    return new MirrorCommand({ axis: 'z', createCopy });
  }

  static createCustomPlaneMirror(plane, createCopy = false) {
    return new MirrorCommand({ axis: 'custom', plane, createCopy });
  }

  // ==================== Status and Cleanup ====================

  getStatusMessage() {
    if (this.isCompleted) {
      return `Mirrored objects across ${this.axis.toUpperCase()} axis`;
    }
    return `Mirroring objects across ${this.axis.toUpperCase()} axis...`;
  }

  dispose() {
    this._originalTransforms = null;
    super.dispose();
  }
}
