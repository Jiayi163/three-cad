import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectExporter } from '../ProjectExporter.js';

describe('ProjectExporter', () => {
  let mockCadDocument;

  beforeEach(() => {
    mockCadDocument = {
      id: 'doc-123',
      name: 'Test Document',
      nodes: {
        items: []
      },
      saveToData: vi.fn().mockResolvedValue({
        id: 'doc-123',
        name: 'Test Document',
        nodes: []
      }),
      history: {
        canUndo: true,
        canRedo: false,
        _currentIndex: 5,
        _stack: new Array(6)
      }
    };
  });

  describe('exportDocument', () => {
    it('should export document with basic data', async () => {
      const exportData = await ProjectExporter.exportDocument(mockCadDocument);

      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('exportDate');
      expect(exportData).toHaveProperty('application', 'Three-CAD');
      expect(exportData).toHaveProperty('document');
      expect(exportData.document.name).toBe('Test Document');
    });

    it('should include textures when embedTextures is true', async () => {
      const exportData = await ProjectExporter.exportDocument(mockCadDocument, {
        embedTextures: true
      });

      expect(exportData).toHaveProperty('textures');
      expect(typeof exportData.textures).toBe('object');
    });

    it('should include history when requested', async () => {
      const exportData = await ProjectExporter.exportDocument(mockCadDocument, {
        includeHistory: true
      });

      expect(exportData).toHaveProperty('history');
      expect(exportData.history).toHaveProperty('canUndo', true);
      expect(exportData.history).toHaveProperty('canRedo', false);
    });

    it('should throw error when no document provided', async () => {
      await expect(
        ProjectExporter.exportDocument(null)
      ).rejects.toThrow('No document provided for export');
    });
  });

  describe('_generateTextureId', () => {
    it('should generate unique texture IDs', () => {
      const id1 = ProjectExporter._generateTextureId('blob:123');
      const id2 = ProjectExporter._generateTextureId('blob:123');

      expect(id1).toContain('texture_');
      expect(id1).not.toBe(id2);
    });
  });

  describe('getExportSize', () => {
    it('should calculate export data size', () => {
      const exportData = {
        version: '1.0.0',
        document: { name: 'Test' }
      };

      const size = ProjectExporter.getExportSize(exportData);

      expect(size).toHaveProperty('bytes');
      expect(size).toHaveProperty('kilobytes');
      expect(size).toHaveProperty('megabytes');
      expect(size.bytes).toBeGreaterThan(0);
    });
  });
});

