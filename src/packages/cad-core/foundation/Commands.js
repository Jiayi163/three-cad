/**
 * Commands - Concrete command implementations for undo/redo
 * Supports create, delete, and update operations on document nodes
 */

import { Command } from './CommandHistory.js';

/**
 * Safely clone node data, excluding non-serializable properties
 * Recursively filters out Three.js objects, functions, and other non-serializable data
 * @param {Object} obj - Object to clone
 * @param {Set} visited - Set of visited objects to prevent circular references
 * @returns {Object} Cloned object
 */
function safeClone(obj, visited = new Set()) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Preserve Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => safeClone(item, visited));
  }

  // Prevent circular references
  if (visited.has(obj)) {
    return null; // Return null for circular references
  }
  visited.add(obj);

  // Create a new object for cloning
  const cloneable = {};

  // Use Object.keys to work with Proxy objects
  const keys = Object.keys(obj);

  for (const key of keys) {
    // Skip non-cloneable properties
    if (key === 'visualObject' || key === 'parent' || key === 'children') {
      // Skip these - they will be recreated or are references
      continue;
    }

    try {
      const value = obj[key];

      // Skip non-serializable types
      if (value === undefined ||
          typeof value === 'function' ||
          value instanceof Map ||
          value instanceof Set ||
          value instanceof WeakMap ||
          value instanceof WeakSet) {
        continue;
      }

      // Handle null explicitly
      if (value === null) {
        cloneable[key] = null;
        continue;
      }

      // Skip Three.js objects and other complex objects
      if (typeof value === 'object') {
        // Skip if it looks like a Three.js object or DOM element
        if (value.isObject3D ||
            value.isGeometry ||
            value.isMaterial ||
            value.isTexture ||
            value.isBufferGeometry ||
            value instanceof HTMLElement ||
            value instanceof Window) {
          continue;
        }

        // Recursively clone plain objects and arrays
        cloneable[key] = safeClone(value, visited);
      } else {
        // Primitive value
        cloneable[key] = value;
      }
    } catch (error) {
      // Skip this property if cloning fails
      console.warn(`Failed to clone property ${key}:`, error);
      continue;
    }
  }

  visited.delete(obj); // Remove from visited set after processing
  return cloneable;
}

/**
 * CreateNodeCommand - Creates a node in the document
 */
export class CreateNodeCommand extends Command {
  /**
   * @param {Object} document - The document instance
   * @param {Object} nodeSnapshot - Snapshot of node data to create
   */
  constructor(document, nodeSnapshot) {
    super('Create Node');
    this.document = document;
    this.nodeSnapshot = safeClone(nodeSnapshot);
    this.createdNode = null;
  }

  do() {
    // Skip if we're restoring from persistence
    if (window.__CAD_RESTORING__) {
      console.log('Skipping command execution during restoration');
      return;
    }

    // Add node to document
    this.createdNode = this.document.addNode(this.nodeSnapshot);
    console.log(`[CMD] Executed: Create node "${this.createdNode.name}"`);
  }

  undo() {
    if (this.createdNode) {
      // Remove the node
      this.document.removeNode(this.createdNode);
      console.log(`[CMD] Undone: Create node "${this.createdNode.name}"`);
    }
  }
}

/**
 * DeleteNodeCommand - Deletes a node from the document
 */
export class DeleteNodeCommand extends Command {
  /**
   * @param {Object} document - The document instance
   * @param {string} nodeId - ID of the node to delete
   */
  constructor(document, nodeId) {
    super('Delete Node');
    this.document = document;
    this.nodeId = nodeId;
    this.nodeSnapshot = null;
  }

  do() {
    // Capture the node before deletion
    const node = this.document.findNodeById(this.nodeId);
    if (node) {
      // Store a deep copy of the node for undo
      this.nodeSnapshot = this._captureNodeSnapshot(node);
      this.document.removeNode(node);
      console.log(`Executed: Delete node "${this.nodeSnapshot.name}"`);
    }
  }

  undo() {
    if (!this.nodeSnapshot) {
      return;
    }

    // Prefer restoring with a visualObject so 3D reappears immediately
    // Use the document's async factory; if unavailable, fall back to addNode
    const restoreWithVisualObject = async () => {
      try {
        if (typeof this.document._deserializeNodeWithVisualObject === 'function') {
          const node = await this.document._deserializeNodeWithVisualObject(this.nodeSnapshot);

          // Attach to root
          const parent = this.document.rootNode;
          if (parent && parent.children) {
            parent.children.push(node);
            node.parent = parent;
          }

          // Add to nodes collection to trigger UI updates
          this.document.nodes.add(node);

          console.log(`Undone: Delete node "${node.name}" (with visualObject)`);
          return true;
        }
      } catch (e) {
        console.warn('Visual restore failed, falling back to addNode:', e);
      }
      return false;
    };

    // Kick off visual restore; if it cannot run synchronously, fall back immediately
    // Note: CommandHistory.undo is synchronous; asynchronous restore will still complete shortly after
    const started = restoreWithVisualObject();

    // If restoreWithVisualObject is a Promise (most cases), also do a quick synchronous fallback
    // to ensure node returns if async path isn't possible
    if (!(started instanceof Promise)) {
      if (!started) {
        this.document.addNode(this.nodeSnapshot);
        console.log(`Undone: Delete node "${this.nodeSnapshot.name}"`);
      }
      return;
    }

    started.then((ok) => {
      if (!ok) {
        this.document.addNode(this.nodeSnapshot);
        console.log(`Undone: Delete node "${this.nodeSnapshot.name}"`);
      }
    });
  }

  /**
   * Capture a complete snapshot of the node for restoration
   * @private
   */
  _captureNodeSnapshot(node) {
    // Use safeClone to handle the entire node
    return safeClone(node);
  }
}

/**
 * UpdateNodeCommand - Updates node properties
 */
export class UpdateNodeCommand extends Command {
  /**
   * @param {Object} document - The document instance
   * @param {string} nodeId - ID of the node to update
   * @param {Object} beforeState - State before update (partial)
   * @param {Object} afterState - State after update (partial)
   */
  constructor(document, nodeId, beforeState, afterState) {
    super('Update Node');
    this.document = document;
    this.nodeId = nodeId;
    this.before = safeClone(beforeState);
    this.after = safeClone(afterState);
  }

  do() {
    const node = this.document.findNodeById(this.nodeId);
    if (node) {
      this._applyState(node, this.after);
      console.log(`Executed: Update node "${node.name}"`);
    }
  }

  undo() {
    const node = this.document.findNodeById(this.nodeId);
    if (node) {
      this._applyState(node, this.before);
      console.log(`Undone: Update node "${node.name}"`);
    }
  }

  /**
   * Coalesce consecutive updates to the same node
   * This allows drag operations to be a single undo step
   */
  coalesce(next) {
    if (!(next instanceof UpdateNodeCommand)) return false;
    if (next.nodeId !== this.nodeId) return false;

    // Merge: keep our "before", use next's "after"
    this.after = safeClone(next.after);
    return true;
  }

  /**
   * Apply state to node (handles nested properties)
   * @private
   */
  _applyState(node, state) {
    for (const [key, value] of Object.entries(state)) {
      if (key === 'properties' && typeof value === 'object') {
        // Handle nested properties
        if (!node.properties) {
          node.properties = {};
        }
        for (const [propKey, propValue] of Object.entries(value)) {
          if (typeof propValue === 'object' && !Array.isArray(propValue) && propValue !== null) {
            // Nested object (like position, rotation)
            if (!node.properties[propKey]) {
              node.properties[propKey] = {};
            }
            Object.assign(node.properties[propKey], propValue);
          } else {
            node.properties[propKey] = propValue;
          }
        }

        // Also update the visualObject if it exists
        if (node.visualObject) {
          for (const [propKey, propValue] of Object.entries(value)) {
            if (node.visualObject.setProperty) {
              node.visualObject.setProperty(propKey, propValue);
            } else if (propKey in node.visualObject) {
              node.visualObject[propKey] = propValue;
            }
          }
        }
      } else {
        // Direct property
        node[key] = value;
      }
    }
  }
}

// ==================== Clipboard Commands ====================

/**
 * Convert a node to a clipboard DTO (pure JSON, no Three.js objects)
 * @param {Object} node - The node to convert
 * @returns {Object} Clipboard DTO
 */
export function toClipboardDTO(node) {
  return {
    type: node.type,
    name: node.name,
    geometry: node.geometry ? JSON.parse(JSON.stringify(node.geometry)) : null,
    transform: {
      position: node.properties?.position ?? { x: 0, y: 0, z: 0 },
      rotation: node.properties?.rotation ?? { x: 0, y: 0, z: 0 },
      scale: node.properties?.scale ?? { x: 1, y: 1, z: 1 },
    },
    // Visual properties
    color: node.properties?.color ?? null,
    material: node.properties?.material ?? null,
    roughness: node.properties?.roughness ?? null,
    metalness: node.properties?.metalness ?? null,
    opacity: node.properties?.opacity ?? null,
    wireframe: node.properties?.wireframe ?? null,
    // Geometry-specific properties
    width: node.properties?.width ?? null,
    height: node.properties?.height ?? null,
    depth: node.properties?.depth ?? null,
    radius: node.properties?.radius ?? null,
    radiusTop: node.properties?.radiusTop ?? null,
    radiusBottom: node.properties?.radiusBottom ?? null,
    widthSegments: node.properties?.widthSegments ?? null,
    heightSegments: node.properties?.heightSegments ?? null,
    radialSegments: node.properties?.radialSegments ?? null,
    tube: node.properties?.tube ?? null,
    tubularSegments: node.properties?.tubularSegments ?? null,
    // Metadata
    metadata: node.properties?.metadata ?? null,
    tags: node.properties?.tags ?? [],
    visible: node.visible ?? true,
    locked: node.locked ?? false,
  };
}

/**
 * Create a node from a clipboard DTO
 * @param {Object} dto - The clipboard DTO
 * @param {Function} makeId - Function to generate new IDs
 * @param {string} namePrefix - Prefix for the new node name
 * @returns {Object} Node data
 */
export function fromClipboardDTO(dto, { makeId, namePrefix }) {
  const id = makeId(dto.type);
  const properties = {
    position: { ...dto.transform.position },
    rotation: { ...dto.transform.rotation },
    scale: { ...dto.transform.scale },
  };

  // Add visual properties if present
  if (dto.color !== null) properties.color = dto.color;
  if (dto.material !== null) properties.material = dto.material;
  if (dto.roughness !== null) properties.roughness = dto.roughness;
  if (dto.metalness !== null) properties.metalness = dto.metalness;
  if (dto.opacity !== null) properties.opacity = dto.opacity;
  if (dto.wireframe !== null) properties.wireframe = dto.wireframe;

  // Add geometry-specific properties if present
  if (dto.width !== null) properties.width = dto.width;
  if (dto.height !== null) properties.height = dto.height;
  if (dto.depth !== null) properties.depth = dto.depth;
  if (dto.radius !== null) properties.radius = dto.radius;
  if (dto.radiusTop !== null) properties.radiusTop = dto.radiusTop;
  if (dto.radiusBottom !== null) properties.radiusBottom = dto.radiusBottom;
  if (dto.widthSegments !== null) properties.widthSegments = dto.widthSegments;
  if (dto.heightSegments !== null) properties.heightSegments = dto.heightSegments;
  if (dto.radialSegments !== null) properties.radialSegments = dto.radialSegments;
  if (dto.tube !== null) properties.tube = dto.tube;
  if (dto.tubularSegments !== null) properties.tubularSegments = dto.tubularSegments;

  // Add metadata if present
  if (dto.metadata !== null) properties.metadata = dto.metadata;
  if (dto.tags && dto.tags.length > 0) properties.tags = [...dto.tags];

  return {
    id,
    name: `${namePrefix}_${id.split('_').pop()}`, // Use last part of ID for uniqueness
    type: dto.type,
    geometry: dto.geometry,
    properties,
    visible: dto.visible ?? true,
    locked: dto.locked ?? false,
  };
}

/**
 * CopyObjectsCommand - Copies selected nodes to internal clipboard
 * This command does NOT go into history (no undo/redo)
 */
export class CopyObjectsCommand extends Command {
  /**
   * @param {Object} document - The document instance
   * @param {Array} selectedNodes - Array of nodes to copy
   */
  constructor(document, selectedNodes = []) {
    super('Copy Objects');
    this.document = document;
    this.selectedNodes = selectedNodes;
  }

  do() {
    // Copy is a non-destructive operation, so no history entry
    console.log(`[CMD] Copy: ${this.selectedNodes.length} objects`);
  }

  undo() {
    // Copy cannot be undone
  }
}

/**
 * PasteObjectsCommand - Pastes nodes from clipboard to document
 * This command DOES go into history (can be undone/redone)
 */
export class PasteObjectsCommand extends Command {
  /**
   * @param {Object} document - The document instance
   * @param {Array} clipboardDTOs - Array of clipboard DTOs to paste
   * @param {Object} options - Paste options (offset, etc.)
   */
  constructor(document, clipboardDTOs, options = {}) {
    super('Paste Objects');
    this.document = document;
    this.clipboardDTOs = clipboardDTOs;
    this.options = {
      offsetX: options.offsetX ?? 0.2,
      offsetY: options.offsetY ?? 0.2,
      offsetZ: options.offsetZ ?? 0,
      ...options
    };
    this.createdNodes = []; // Store created nodes for undo
    this.createdNodeIds = []; // Store IDs for undo
  }

  do() {
    // Skip if we're restoring from persistence
    if (window.__CAD_RESTORING__) {
      console.log('Skipping paste command execution during restoration');
      return;
    }

    const makeId = (type) => `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Clear previous selection
    this.document.clearSelection();

    // Create nodes from clipboard DTOs
    this.createdNodes = [];
    this.createdNodeIds = [];

    for (const dto of this.clipboardDTOs) {
      const nodeData = fromClipboardDTO(dto, {
        makeId,
        namePrefix: dto.type || 'Object'
      });

      // Apply position offset
      nodeData.properties.position = {
        x: (nodeData.properties.position?.x ?? 0) + this.options.offsetX,
        y: (nodeData.properties.position?.y ?? 0) + this.options.offsetY,
        z: (nodeData.properties.position?.z ?? 0) + this.options.offsetZ,
      };

      // Add node to document (this will trigger visual object creation)
      const createdNode = this.document.addNode(nodeData);
      this.createdNodes.push(createdNode);
      this.createdNodeIds.push(createdNode.id);

      // Select the newly created node
      this.document.selectNode(createdNode, true);
    }

    console.log(`[CMD] Executed: Paste ${this.createdNodes.length} objects`);
  }

  undo() {
    // Remove all created nodes
    for (const nodeId of this.createdNodeIds) {
      const node = this.document.findNodeById(nodeId);
      if (node) {
        this.document.removeNode(node);
      }
    }

    console.log(`[CMD] Undone: Paste ${this.createdNodeIds.length} objects`);
  }
}


