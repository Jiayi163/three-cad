import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectImporter } from '../ProjectImporter.js';

describe('ProjectImporter', () => {
  let mockApplication;
  let mockImportData;

  beforeEach(() => {
    mockApplication = {
      openDocument: vi.fn().mockResolvedValue({
        id: 'doc-123',
        name: 'Imported Document',
        nodes: {
          items: []
        }
      })
    };

    mockImportData = {
      version: '1.0.0',
      exportDate: '2024-01-01T00:00:00.000Z',
      application: 'Three-CAD',
      document: {
        id: 'doc-123',
        name: 'Test Document',
        nodes: []
      },
      textures: {},
      materials: {}
    };
  });

  describe('_validateImportData', () => {
    it('should validate correct import data', () => {
      expect(() => {
        ProjectImporter._validateImportData(mockImportData);
      }).not.toThrow();
    });

    it('should throw error for missing version', () => {
      const invalidData = { ...mockImportData };
      delete invalidData.version;

      expect(() => {
        ProjectImporter._validateImportData(invalidData);
      }).toThrow('missing version');
    });

    it('should throw error for missing document', () => {
      const invalidData = { ...mockImportData };
      delete invalidData.document;

      expect(() => {
        ProjectImporter._validateImportData(invalidData);
      }).toThrow('missing document');
    });

    it('should warn for different application', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const differentAppData = { ...mockImportData, application: 'Other-CAD' };

      ProjectImporter._validateImportData(differentAppData);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('different application')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('importDocument', () => {
    it('should import document successfully', async () => {
      const cadDocument = await ProjectImporter.importDocument(
        mockImportData,
        mockApplication
      );

      expect(cadDocument).toBeDefined();
      expect(mockApplication.openDocument).toHaveBeenCalled();
    });

    it('should throw error when no import data provided', async () => {
      await expect(
        ProjectImporter.importDocument(null, mockApplication)
      ).rejects.toThrow('No import data provided');
    });

    it('should throw error when no application provided', async () => {
      await expect(
        ProjectImporter.importDocument(mockImportData, null)
      ).rejects.toThrow('No application instance provided');
    });
  });

  describe('validateFile', () => {
    it('should validate correct JSON file', async () => {
      const validJson = JSON.stringify(mockImportData);
      const file = new File([validJson], 'test.json', { type: 'application/json' });

      const result = await ProjectImporter.validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.info.documentName).toBe('Test Document');
    });

    it('should reject non-JSON files', async () => {
      const result = await ProjectImporter.validateFile(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No file provided');
    });

    it('should reject files without .json extension', async () => {
      const file = new File(['{}'], 'test.txt', { type: 'text/plain' });

      const result = await ProjectImporter.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid file format. Expected .json file');
    });

    it('should detect invalid JSON structure', async () => {
      const invalidJson = JSON.stringify({ invalid: 'structure' });
      const file = new File([invalidJson], 'test.json', { type: 'application/json' });

      const result = await ProjectImporter.validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

