import { Observable } from '../foundation/Observable.js';
import { ObservableCollection } from '../foundation/Collection.js';
import { History } from '../foundation/History.js';

/**
 * CADApplication - Main application class managing documents, views, and global state
 * 
 * This class serves as the central hub for the CAD application, managing:
 * - Document lifecycle (create, open, save, close)
 * - Active document and view tracking
 * - Global application state and settings
 * - Integration with Vue.js through reactive properties
 */
export class CADApplication extends Observable {
  constructor() {
    super();
    
    // Core collections
    this._documents = new ObservableCollection();
    this._views = new ObservableCollection();
    
    // Current state
    this._activeDocument = null;
    this._activeView = null;
    
    // Application settings
    this._settings = new Map();
    
    // Global history for application-level operations
    this._globalHistory = new History();
    
    // Initialize properties
    this.setProperty('isInitialized', false);
    this.setProperty('activeDocumentId', null);
    this.setProperty('activeViewId', null);
    this.setProperty('documentCount', 0);
    this.setProperty('viewCount', 0);
    this.setProperty('canUndo', false);
    this.setProperty('canRedo', false);
    
    // Set up collection change listeners
    this._setupCollectionListeners();
    
    // Set up history listeners
    this._setupHistoryListeners();
  }

  // ==================== Core Properties ====================
  
  get documents() {
    return this._documents;
  }
  
  get views() {
    return this._views;
  }
  
  get activeDocument() {
    return this._activeDocument;
  }
  
  get activeView() {
    return this._activeView;
  }
  
  get globalHistory() {
    return this._globalHistory;
  }
  
  get isInitialized() {
    return this.getProperty('isInitialized');
  }
  
  get canUndo() {
    return this.getProperty('canUndo');
  }
  
  get canRedo() {
    return this.getProperty('canRedo');
  }

  // ==================== Initialization ====================
  
  async initialize() {
    if (this.isInitialized) {
      console.warn('CADApplication is already initialized');
      return;
    }

    try {
      // Load application settings
      await this._loadSettings();
      
      // Initialize default document if none exist
      if (this._documents.length === 0) {
        await this.createNewDocument('Untitled');
      }
      
      this.setProperty('isInitialized', true);
      console.log('CADApplication initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize CADApplication:', error);
      throw error;
    }
  }

  // ==================== Document Management ====================
  
  async createNewDocument(name = 'Untitled') {
    const { Document } = await import('./Document.js');
    
    const document = new Document(name, this);
    document.initialize();
    
    // Add to collection
    this._documents.add(document);
    
    // Set as active if it's the first document
    if (this._documents.length === 1) {
      this.setActiveDocument(document);
    }
    
    console.log(`Created new document: ${name}`);
    return document;
  }
  
  async openDocument(data) {
    const { Document } = await import('./Document.js');
    
    const document = new Document('', this);
    await document.loadFromData(data);
    
    this._documents.add(document);
    this.setActiveDocument(document);
    
    console.log(`Opened document: ${document.name}`);
    return document;
  }
  
  async saveDocument(document) {
    if (!document) {
      document = this._activeDocument;
    }
    
    if (!document) {
      throw new Error('No document to save');
    }
    
    const data = await document.saveToData();
    console.log(`Saved document: ${document.name}`);
    return data;
  }
  
  closeDocument(document) {
    if (!document) {
      document = this._activeDocument;
    }
    
    if (!document) {
      return false;
    }
    
    // Check if document has unsaved changes
    if (document.hasUnsavedChanges) {
      // In a real application, this would show a dialog
      console.warn(`Document ${document.name} has unsaved changes`);
    }
    
    // Remove from collection
    const removed = this._documents.remove(document);
    
    if (removed && document === this._activeDocument) {
      // Set new active document
      if (this._documents.length > 0) {
        this.setActiveDocument(this._documents.get(0));
      } else {
        this.setActiveDocument(null);
      }
    }
    
    // Dispose document
    document.dispose();
    
    console.log(`Closed document: ${document.name}`);
    return true;
  }
  
  setActiveDocument(document) {
    if (this._activeDocument === document) {
      return;
    }
    
    const oldDocument = this._activeDocument;
    this._activeDocument = document;
    
    // Update property
    this.setProperty('activeDocumentId', document ? document.id : null);
    
    // Update history state
    this._updateHistoryState();
    
    // Notify listeners
    this.notifyPropertyChanged('activeDocument', oldDocument, document);
    
    console.log(`Active document changed to: ${document ? document.name : 'none'}`);
  }
  
  findDocumentById(id) {
    return this._documents.find(doc => doc.id === id);
  }
  
  findDocumentByName(name) {
    return this._documents.find(doc => doc.name === name);
  }

  // ==================== View Management ====================
  
  createView(document, name = 'View') {
    if (!document) {
      document = this._activeDocument;
    }
    
    if (!document) {
      throw new Error('No document available for view creation');
    }
    
    // This would typically create a ThreeView instance
    const view = {
      id: this._generateId('view'),
      name: name,
      document: document,
      isActive: false,
      created: new Date()
    };
    
    this._views.add(view);
    
    // Set as active if it's the first view
    if (this._views.length === 1) {
      this.setActiveView(view);
    }
    
    console.log(`Created view: ${name} for document: ${document.name}`);
    return view;
  }
  
  setActiveView(view) {
    if (this._activeView === view) {
      return;
    }
    
    const oldView = this._activeView;
    
    // Update active state
    if (this._activeView) {
      this._activeView.isActive = false;
    }
    
    this._activeView = view;
    
    if (view) {
      view.isActive = true;
    }
    
    // Update property
    this.setProperty('activeViewId', view ? view.id : null);
    
    // Notify listeners
    this.notifyPropertyChanged('activeView', oldView, view);
    
    console.log(`Active view changed to: ${view ? view.name : 'none'}`);
  }
  
  closeView(view) {
    if (!view) {
      view = this._activeView;
    }
    
    if (!view) {
      return false;
    }
    
    const removed = this._views.remove(view);
    
    if (removed && view === this._activeView) {
      // Set new active view
      if (this._views.length > 0) {
        this.setActiveView(this._views.get(0));
      } else {
        this.setActiveView(null);
      }
    }
    
    console.log(`Closed view: ${view.name}`);
    return true;
  }

  // ==================== History Management ====================
  
  undo() {
    if (this._activeDocument && this._activeDocument.canUndo) {
      return this._activeDocument.undo();
    } else if (this._globalHistory.canUndo) {
      return this._globalHistory.undo();
    }
    return false;
  }
  
  redo() {
    if (this._activeDocument && this._activeDocument.canRedo) {
      return this._activeDocument.redo();
    } else if (this._globalHistory.canRedo) {
      return this._globalHistory.redo();
    }
    return false;
  }
  
  clearHistory() {
    this._globalHistory.clear();
    
    // Clear all document histories
    this._documents.forEach(doc => {
      if (doc.history) {
        doc.history.clear();
      }
    });
    
    this._updateHistoryState();
  }

  // ==================== Settings Management ====================
  
  getSetting(key, defaultValue = null) {
    return this._settings.get(key) ?? defaultValue;
  }
  
  setSetting(key, value) {
    const oldValue = this._settings.get(key);
    this._settings.set(key, value);
    
    // Record in history for undo/redo
    const record = this._globalHistory.createPropertyRecord(
      this._settings,
      key,
      oldValue,
      value
    );
    this._globalHistory.add(record);
    
    // Notify change
    this.notifyPropertyChanged(`setting.${key}`, oldValue, value);
  }
  
  removeSetting(key) {
    if (this._settings.has(key)) {
      const oldValue = this._settings.get(key);
      this._settings.delete(key);
      
      // Record in history
      const record = this._globalHistory.createPropertyRecord(
        this._settings,
        key,
        oldValue,
        undefined
      );
      this._globalHistory.add(record);
      
      this.notifyPropertyChanged(`setting.${key}`, oldValue, undefined);
      return true;
    }
    return false;
  }

  // ==================== Utility Methods ====================
  
  _generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  _setupCollectionListeners() {
    // Document collection changes
    this._documents.onCollectionChanged((action, added, removed) => {
      this.setProperty('documentCount', this._documents.length);
      
      if (action === 'clear' && this._activeDocument) {
        this.setActiveDocument(null);
      }
    });
    
    // View collection changes
    this._views.onCollectionChanged((action, added, removed) => {
      this.setProperty('viewCount', this._views.length);
      
      if (action === 'clear' && this._activeView) {
        this.setActiveView(null);
      }
    });
  }
  
  _setupHistoryListeners() {
    // Listen to global history changes
    this._globalHistory.onPropertyChanged('canUndo', () => {
      this._updateHistoryState();
    });
    
    this._globalHistory.onPropertyChanged('canRedo', () => {
      this._updateHistoryState();
    });
  }
  
  _updateHistoryState() {
    let canUndo = this._globalHistory.canUndo;
    let canRedo = this._globalHistory.canRedo;
    
    // Check active document history
    if (this._activeDocument && this._activeDocument.history) {
      canUndo = canUndo || this._activeDocument.history.canUndo;
      canRedo = canRedo || this._activeDocument.history.canRedo;
    }
    
    this.setProperty('canUndo', canUndo);
    this.setProperty('canRedo', canRedo);
  }
  
  async _loadSettings() {
    // In a real application, this would load from localStorage or server
    const defaultSettings = {
      theme: 'light',
      units: 'mm',
      precision: 2,
      autoSave: true,
      autoSaveInterval: 300000, // 5 minutes
      gridVisible: true,
      gridSize: 10,
      snapToGrid: false
    };
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (!this._settings.has(key)) {
        this._settings.set(key, value);
      }
    }
  }

  // ==================== Disposal ====================
  
  dispose() {
    // Close all documents
    const documents = [...this._documents.items];
    documents.forEach(doc => this.closeDocument(doc));
    
    // Close all views
    const views = [...this._views.items];
    views.forEach(view => this.closeView(view));
    
    // Clear collections
    this._documents.dispose();
    this._views.dispose();
    
    // Clear history
    this._globalHistory.dispose();
    
    // Clear settings
    this._settings.clear();
    
    // Clear properties
    super.dispose();
    
    console.log('CADApplication disposed');
  }

  // ==================== Debug/Info Methods ====================
  
  getInfo() {
    return {
      isInitialized: this.isInitialized,
      documentCount: this._documents.length,
      viewCount: this._views.length,
      activeDocument: this._activeDocument ? this._activeDocument.name : null,
      activeView: this._activeView ? this._activeView.name : null,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      settings: Object.fromEntries(this._settings)
    };
  }
  
  toString() {
    return `CADApplication(docs: ${this._documents.length}, views: ${this._views.length})`;
  }
} 