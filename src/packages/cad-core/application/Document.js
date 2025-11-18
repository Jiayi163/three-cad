import { Observable } from '../foundation/Observable.js';
import { ObservableCollection } from '../foundation/Collection.js';
import { History } from '../foundation/History.js';
import { markRaw } from 'vue';

/**
 * Document - Represents a CAD document with node hierarchy
 *
 * This class manages:
 * - Node hierarchy (objects, groups, layers)
 * - Document-specific history
 * - Document properties and metadata
 * - Serialization and deserialization
 */
export class Document extends Observable {
  constructor(name = 'Untitled', application = null) {
    super();

    // Basic properties
    this._id = this._generateId('doc');
    this._name = name;
    this._application = application;

    // Node hierarchy
    this._rootNode = null;
    this._nodes = new ObservableCollection();
    this._selectedNodes = new ObservableCollection();

    // Document history
    this._history = new History();

    // Document state
    this._isModified = false;
    this._lastSaved = null;
    this._created = new Date();

    // Document metadata
    this._metadata = new Map();

    // Initialize properties
    this.setProperty('name', name);
    this.setProperty('isModified', false);
    this.setProperty('nodeCount', 0);
    this.setProperty('selectedCount', 0);
    this.setProperty('canUndo', false);
    this.setProperty('canRedo', false);

    // Set up listeners
    this._setupCollectionListeners();
    this._setupHistoryListeners();
  }

  // ==================== Core Properties ====================

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  set name(value) {
    if (this._name !== value) {
      const oldName = this._name;
      this._name = value;
      this.setProperty('name', value);
      this._markModified();
      this.notifyPropertyChanged('name', oldName, value);
    }
  }

  get application() {
    return this._application;
  }

  get rootNode() {
    return this._rootNode;
  }

  get nodes() {
    return this._nodes;
  }

  get selectedNodes() {
    return this._selectedNodes;
  }

  get history() {
    return this._history;
  }

  get isModified() {
    return this.getProperty('isModified');
  }

  get hasUnsavedChanges() {
    return this.isModified;
  }

  get canUndo() {
    return this._history.canUndo;
  }

  get canRedo() {
    return this._history.canRedo;
  }

  get created() {
    return this._created;
  }

  get lastSaved() {
    return this._lastSaved;
  }

  // ==================== Initialization ====================

  initialize() {
    // Create root node
    this._rootNode = this._createNode({
      id: this._generateId('root'),
      name: 'Root',
      type: 'root',
      children: [],
      parent: null,
      visible: true,
      locked: false
    });

    // Initialize default metadata
    this._metadata.set('version', '1.0');
    this._metadata.set('units', 'mm');
    this._metadata.set('precision', 2);

    console.log(`Document initialized: ${this.name}`);
  }

  // ==================== Node Management ====================

  addNode(nodeData, parent = null) {
    if (!parent) {
      parent = this._rootNode;
    }

    // Create node with default properties
    const node = this._createNode({
      id: nodeData.id || this._generateId('node'),
      name: nodeData.name || 'Node',
      type: nodeData.type || 'object',
      parent: parent,
      children: [],
      visible: nodeData.visible !== false,
      locked: nodeData.locked === true,
      geometry: nodeData.geometry || null,
      visualObject: nodeData.visualObject || null,
      properties: nodeData.properties || {},
      ...nodeData
    });

    // Add to parent's children
    if (parent && parent.children) {
      parent.children.push(node);
    }

    // Add to nodes collection
    this._nodes.add(node);

    // Note: History recording disabled - using command pattern in store instead
    // The CommandHistory in the application store handles undo/redo

    // Mark as modified
    this._markModified();

    console.log(`Added node: ${node.name} to ${parent ? parent.name : 'root'}`);
    return node;
  }

  removeNode(node) {
    if (!node || node === this._rootNode) {
      return false;
    }

    // Remove from parent's children
    if (node.parent && node.parent.children) {
      const index = node.parent.children.indexOf(node);
      if (index !== -1) {
        node.parent.children.splice(index, 1);
      }
    }

    // Remove from selected nodes if selected
    this._selectedNodes.remove(node);

    // Remove all children recursively
    if (node.children) {
      const children = [...node.children];
      children.forEach(child => this.removeNode(child));
    }

    // Remove from nodes collection
    const removed = this._nodes.remove(node);

    if (removed) {
      // Note: History recording disabled - using command pattern in store instead
      // The CommandHistory in the application store handles undo/redo

      // Clean up node
      this._disposeNode(node);

      // Mark as modified
      this._markModified();

      console.log(`Removed node: ${node.name}`);
    }

    return removed;
  }

  findNodeById(id) {
    return this._nodes.find(node => node.id === id);
  }

  findNodeByName(name) {
    return this._nodes.find(node => node.name === name);
  }

  findNodesByType(type) {
    return this._nodes.filter(node => node.type === type);
  }

  getAllNodes() {
    return this._nodes.items;
  }

  getNodeHierarchy() {
    return this._buildHierarchy(this._rootNode);
  }

  // ==================== Selection Management ====================

  selectNode(node, addToSelection = false) {
    if (!node) return false;

    // If node is already selected and we're not adding to selection, return false
    if (this._selectedNodes.contains(node) && !addToSelection) {
      return false;
    }

    if (!addToSelection) {
      this.clearSelection();
    }

    if (!this._selectedNodes.contains(node)) {
      this._selectedNodes.add(node);

      // Only set selected property if it's an actual node object
      if (typeof node === 'object' && node !== null && node.hasOwnProperty('name')) {
        node.selected = true;
      }

      // Notify selection change
      this.notifyPropertyChanged('nodeSelected', null, node);

      console.log(`Selected node: ${node.name || node.id || node}`);
      return true;
    }

    return false;
  }

  deselectNode(node) {
    if (!node) return false;

    const removed = this._selectedNodes.remove(node);
    if (removed) {
      // Only set selected property if it's an actual node object
      if (typeof node === 'object' && node !== null && node.hasOwnProperty('name')) {
        node.selected = false;
      }
      this.notifyPropertyChanged('nodeDeselected', node, null);
      console.log(`Deselected node: ${node.name || node.id || node}`);
    }

    return removed;
  }

  clearSelection() {
    const selectedNodes = [...this._selectedNodes.items];

    selectedNodes.forEach(node => {
      // Only set selected property if it's an actual node object
      if (typeof node === 'object' && node !== null && node.hasOwnProperty('name')) {
        node.selected = false;
      }
    });

    this._selectedNodes.clear();

    if (selectedNodes.length > 0) {
      this.notifyPropertyChanged('selectionCleared', selectedNodes, []);
      console.log('Selection cleared');
    }
  }

  selectAll() {
    let count = 0;
    this._nodes.forEach(node => {
      if (node !== this._rootNode && !this._selectedNodes.contains(node)) {
        this._selectedNodes.add(node);
        node.selected = true;
        count++;
      }
    });

    if (count > 0) {
      this.notifyPropertyChanged('allSelected', [], this._selectedNodes.items);
      console.log(`Selected all nodes: ${count} nodes`);
    }

    return count;
  }

  // ==================== History Management ====================

  undo() {
    const result = this._history.undo();
    if (result) {
      this._markModified();
      console.log('Document undo performed');
    }
    return result;
  }

  redo() {
    const result = this._history.redo();
    if (result) {
      this._markModified();
      console.log('Document redo performed');
    }
    return result;
  }

  clearHistory() {
    this._history.clear();
    console.log('Document history cleared');
  }

  // ==================== Serialization ====================

  async saveToData() {
    const data = {
      id: this._id,
      name: this._name,
      created: this._created.toISOString(),
      lastSaved: new Date().toISOString(),
      metadata: Object.fromEntries(this._metadata),
      rootNode: this._serializeNode(this._rootNode),
      nodes: this._nodes.items.map(node => this._serializeNode(node))
    };

    this._lastSaved = new Date();
    this.setProperty('isModified', false);

    console.log(`Document saved: ${this.name}`);
    return data;
  }

  async loadFromData(data) {
    if (!data) {
      throw new Error('No data provided for document loading');
    }

    // Clear existing data
    this._nodes.clear();
    this._selectedNodes.clear();
    this._history.clear();

    // Load basic properties
    // IMPORTANT: Always generate new ID when loading from data to ensure document change detection
    // This ensures that imports trigger document change watchers even if the source document ID matches
    this._id = this._generateId('doc');
    this._name = data.name || 'Untitled';
    this._created = data.created ? new Date(data.created) : new Date();
    this._lastSaved = data.lastSaved ? new Date(data.lastSaved) : null;

    // Load metadata
    if (data.metadata) {
      this._metadata.clear();
      for (const [key, value] of Object.entries(data.metadata)) {
        this._metadata.set(key, value);
      }
    }

    // Load nodes
    if (data.rootNode) {
      this._rootNode = this._deserializeNode(data.rootNode);
    }

    if (data.nodes) {
      for (const nodeData of data.nodes) {
        const node = await this._deserializeNodeWithVisualObject(nodeData);
        this._nodes.add(node);
      }
    }

    // Update properties
    this.setProperty('name', this._name);
    this.setProperty('isModified', false);

    console.log(`Document loaded: ${this.name} with ${this._nodes.length} nodes`);
  }

  // ==================== Metadata Management ====================

  getMetadata(key, defaultValue = null) {
    return this._metadata.get(key) ?? defaultValue;
  }

  setMetadata(key, value) {
    const oldValue = this._metadata.get(key);
    this._metadata.set(key, value);

    // Create a custom record for Map-based metadata
    const record = {
      name: `Change metadata ${key}`,
      undo: () => {
        if (oldValue === undefined) {
          this._metadata.delete(key);
        } else {
          this._metadata.set(key, oldValue);
        }
      },
      redo: () => {
        this._metadata.set(key, value);
      },
      dispose: () => {
        // No special cleanup needed for metadata records
      }
    };
    this._history.add(record);

    this._markModified();
    this.notifyPropertyChanged(`metadata.${key}`, oldValue, value);
  }

  removeMetadata(key) {
    if (this._metadata.has(key)) {
      const oldValue = this._metadata.get(key);
      this._metadata.delete(key);

      // Create a custom record for Map-based metadata
      const record = {
        name: `Remove metadata ${key}`,
        undo: () => {
          this._metadata.set(key, oldValue);
        },
        redo: () => {
          this._metadata.delete(key);
        },
        dispose: () => {
          // No special cleanup needed for metadata records
        }
      };
      this._history.add(record);

      this._markModified();
      this.notifyPropertyChanged(`metadata.${key}`, oldValue, undefined);
      return true;
    }
    return false;
  }

  // ==================== Private Methods ====================

  _createNode(nodeData) {
    const node = {
      id: nodeData.id,
      name: nodeData.name,
      type: nodeData.type,
      parent: nodeData.parent,
      children: nodeData.children || [],
      visible: nodeData.visible !== false,
      locked: nodeData.locked === true,
      selected: false,
      geometry: nodeData.geometry || null,
      visualObject: nodeData.visualObject || null,
      properties: nodeData.properties || {},
      created: new Date(),
      ...nodeData
    };

    // Ensure created is a Date instance
    if (!(node.created instanceof Date)) {
      try {
        const parsed = new Date(node.created);
        node.created = isNaN(parsed.getTime()) ? new Date() : parsed;
      } catch (e) {
        node.created = new Date();
      }
    }

    return node;
  }

  _disposeNode(node) {
    // Clean up visual object if it exists
    if (node.visualObject) {
      // In a real application, this would dispose Three.js objects
      if (node.visualObject.geometry) {
        node.visualObject.geometry.dispose();
      }
      if (node.visualObject.material) {
        if (Array.isArray(node.visualObject.material)) {
          node.visualObject.material.forEach(mat => mat.dispose());
        } else {
          node.visualObject.material.dispose();
        }
      }
    }

    // Clear references
    node.parent = null;
    node.children = [];
    node.visualObject = null;
    node.geometry = null;
  }

  _serializeNode(node) {
    if (!node) return null;

    // Deep clone properties to remove non-serializable objects
    const serializableProperties = this._makeSerializable(node.properties || {});

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parent ? node.parent.id : null,
      visible: node.visible,
      locked: node.locked,
      // Don't serialize geometry (it will be recreated from properties)
      geometry: null,
      properties: serializableProperties,
      created: (() => {
        if (!node?.created) return null;
        if (node.created instanceof Date) return node.created.toISOString();
        if (typeof node.created === 'string') return node.created;
        if (typeof node.created === 'number') return new Date(node.created).toISOString();
        try {
          const d = new Date(node.created);
          return isNaN(d.getTime()) ? null : d.toISOString();
        } catch {
          return null;
        }
      })()
    };
  }

  _makeSerializable(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this._makeSerializable(item));
    }

    // Handle plain objects - use Object.keys to work with Proxy objects
    const serializable = {};
    const keys = Object.keys(obj);

    for (const key of keys) {
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
          serializable[key] = null;
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

          // Skip circular references (basic check)
          if (value === obj) {
            continue;
          }

          // Recursively serialize plain objects and arrays
          serializable[key] = this._makeSerializable(value);
        } else {
          // Primitive value
          serializable[key] = value;
        }
      } catch (error) {
        console.warn(`Failed to serialize property ${key}:`, error);
        // Skip this property
      }
    }

    return serializable;
  }

  _deserializeNode(nodeData) {
    if (!nodeData) return null;

    return this._createNode({
      id: nodeData.id,
      name: nodeData.name,
      type: nodeData.type,
      visible: nodeData.visible,
      locked: nodeData.locked,
      geometry: nodeData.geometry,
      properties: nodeData.properties || {},
      created: nodeData.created ? new Date(nodeData.created) : new Date()
    });
  }

  async _deserializeNodeWithVisualObject(nodeData) {
    if (!nodeData) return null;

    // Create basic node
    const node = this._createNode({
      id: nodeData.id,
      name: nodeData.name,
      type: nodeData.type,
      visible: nodeData.visible,
      locked: nodeData.locked,
      geometry: nodeData.geometry,
      properties: nodeData.properties || {},
      created: nodeData.created ? new Date(nodeData.created) : new Date()
    });

    // Recreate visualObject based on node type
    if (nodeData.type && nodeData.properties) {
      try {
        const visualObject = await this._createVisualObjectForNode(nodeData.type, nodeData.properties, node.id);
        if (visualObject) {
          // CRITICAL: Set the nodeId BEFORE any create() calls so meshes can carry userData.nodeId
          visualObject.nodeId = node.id;

          // Mark as non-reactive to prevent Vue from proxying VisualObject instances
          const nonReactiveVO = markRaw(visualObject);

          node.visualObject = nonReactiveVO;
          console.log(`Recreated visualObject for ${nodeData.name} (${nodeData.type}) with nodeId: ${node.id}`);
        }
      } catch (error) {
        console.warn(`Failed to recreate visualObject for ${nodeData.name}:`, error);
      }
    }

    return node;
  }

  async _createVisualObjectForNode(type, properties, nodeId = null) {
    // Dynamically import visual object classes
    try {
      const {
        BoxVisualObject,
        SphereVisualObject,
        CylinderVisualObject,
        PlaneVisualObject,
        ConeVisualObject,
        TorusVisualObject
      } = await import('../../cad-three/BasicShapes.js');

      // Normalize type name (handle both "Box" and "BoxVisualObject")
      const normalizedType = type.replace('VisualObject', '');

      switch (normalizedType) {
        case 'Box': {
          const visualObject = new BoxVisualObject(nodeId, {
            width: properties.width || 1,
            height: properties.height || 1,
            depth: properties.depth || 1
          });

          // CRITICAL: Set position directly (not just as property) so it's applied to the object
          if (properties.position) {
            visualObject.position = properties.position;
          }
          
          // CRITICAL: Set rotation directly
          if (properties.rotation) {
            visualObject.rotation = properties.rotation;
          }
          
          // Restore color
          if (properties.color) {
            visualObject.setProperty('color', properties.color);
          }
          
          // Store material info - will be applied after object creation
          let materialToRestore = null;
          if (properties.material) {
            materialToRestore = properties.material;
          }
          
          if (properties.roughness !== undefined) {
            visualObject.setProperty('roughness', properties.roughness);
          }
          if (properties.metalness !== undefined) {
            visualObject.setProperty('metalness', properties.metalness);
          }
          if (properties.opacity !== undefined) {
            visualObject.setProperty('opacity', properties.opacity);
          }
          // Set wireframe to false by default for solid objects that can be clicked anywhere
          visualObject.setProperty('wireframe', properties.wireframe ?? false);

          // CRITICAL: Apply material AFTER object is created (in handleNodeAdded)
          // Store material info in visualObject for later application
          if (materialToRestore) {
            visualObject._pendingMaterial = materialToRestore;
          }

          return visualObject;
        }

        case 'Sphere': {
          const visualObject = new SphereVisualObject(nodeId, {
            radius: properties.radius || 1,
            widthSegments: properties.widthSegments || 32,
            heightSegments: properties.heightSegments || 16
          });

          // Restore common properties
          await this._restoreCommonProperties(visualObject, properties);
          return visualObject;
        }

        case 'Cylinder': {
          const visualObject = new CylinderVisualObject(nodeId, {
            radiusTop: properties.radiusTop !== undefined ? properties.radiusTop : 1,
            radiusBottom: properties.radiusBottom !== undefined ? properties.radiusBottom : 1,
            height: properties.height || 2,
            radialSegments: properties.radialSegments || 32
          });

          await this._restoreCommonProperties(visualObject, properties);
          return visualObject;
        }

        case 'Plane': {
          const visualObject = new PlaneVisualObject(nodeId, {
            width: properties.width || 1,
            height: properties.height || 1
          });

          await this._restoreCommonProperties(visualObject, properties);
          return visualObject;
        }

        case 'Cone': {
          const visualObject = new ConeVisualObject(nodeId, {
            radius: properties.radius || 1,
            height: properties.height || 2,
            radialSegments: properties.radialSegments || 32
          });

          await this._restoreCommonProperties(visualObject, properties);
          return visualObject;
        }

        case 'Torus': {
          const visualObject = new TorusVisualObject(nodeId, {
            radius: properties.radius || 1,
            tube: properties.tube || 0.4,
            radialSegments: properties.radialSegments || 16,
            tubularSegments: properties.tubularSegments || 100
          });

          await this._restoreCommonProperties(visualObject, properties);
          return visualObject;
        }

        default:
          console.warn(`Unknown node type: ${type} (normalized: ${normalizedType})`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to create visual object for type ${type}:`, error);
      return null;
    }
  }

  async _restoreCommonProperties(visualObject, properties) {
    // CRITICAL: Set position directly (not just as property) so it's applied to the object
    if (properties.position) {
      visualObject.position = properties.position;
    }
    
    // CRITICAL: Set rotation directly
    if (properties.rotation) {
      visualObject.rotation = properties.rotation;
    }
    
    // Restore color
    if (properties.color) {
      visualObject.setProperty('color', properties.color);
    }
    
    // Store material info - will be applied after object creation
    if (properties.material) {
      visualObject._pendingMaterial = properties.material;
    }
    
    if (properties.roughness !== undefined) {
      visualObject.setProperty('roughness', properties.roughness);
    }
    if (properties.metalness !== undefined) {
      visualObject.setProperty('metalness', properties.metalness);
    }
    if (properties.opacity !== undefined) {
      visualObject.setProperty('opacity', properties.opacity);
    }
    // Set wireframe to false by default for solid objects that can be clicked anywhere
    visualObject.setProperty('wireframe', properties.wireframe ?? false);
  }

  _buildHierarchy(node) {
    if (!node) return null;

    return {
      ...node,
      children: node.children ? node.children.map(child => this._buildHierarchy(child)) : []
    };
  }

  _generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _markModified() {
    if (!this.isModified) {
      this.setProperty('isModified', true);

      // Notify application of document change
      if (this._application) {
        this._application.notifyPropertyChanged('documentModified', this, this);
      }
    }
  }

  _setupCollectionListeners() {
    // Node collection changes
    this._nodes.onCollectionChanged((action, added, removed) => {
      this.setProperty('nodeCount', this._nodes.length);
    });

    // Selection changes
    this._selectedNodes.onCollectionChanged((action, added, removed) => {
      this.setProperty('selectedCount', this._selectedNodes.length);
    });
  }

  _setupHistoryListeners() {
    // History state changes
    this._history.onPropertyChanged('canUndo', (property, oldValue, newValue) => {
      this.setProperty('canUndo', newValue);

      // Update application history state
      if (this._application) {
        this._application._updateHistoryState();
      }
    });

    this._history.onPropertyChanged('canRedo', (property, oldValue, newValue) => {
      this.setProperty('canRedo', newValue);

      // Update application history state
      if (this._application) {
        this._application._updateHistoryState();
      }
    });
  }

  // ==================== Disposal ====================

  dispose() {
    // Clear selection
    this.clearSelection();

    // Dispose all nodes
    const nodes = [...this._nodes.items];
    nodes.forEach(node => this._disposeNode(node));

    // Clear collections
    this._nodes.dispose();
    this._selectedNodes.dispose();

    // Clear history
    this._history.dispose();

    // Clear metadata
    this._metadata.clear();

    // Clear properties
    super.dispose();

    console.log(`Document disposed: ${this.name}`);
  }

  // ==================== Debug/Info Methods ====================

  getInfo() {
    return {
      id: this._id,
      name: this._name,
      nodeCount: this._nodes.length,
      selectedCount: this._selectedNodes.length,
      isModified: this.isModified,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      created: this._created,
      lastSaved: this._lastSaved,
      metadata: Object.fromEntries(this._metadata)
    };
  }

  toString() {
    return `Document(${this.name}, nodes: ${this._nodes.length}, modified: ${this.isModified})`;
  }
}
