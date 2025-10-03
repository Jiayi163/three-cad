import { describe, it, expect, beforeEach } from 'vitest';
import { ImageLoader } from '../ImageLoader.js';

describe('ImageLoader', () => {
  describe('isValidImageFile', () => {
    it('should validate supported image formats', () => {
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const webpFile = new File([''], 'test.webp', { type: 'image/webp' });
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });

      expect(ImageLoader.isValidImageFile(jpegFile)).toBe(true);
      expect(ImageLoader.isValidImageFile(pngFile)).toBe(true);
      expect(ImageLoader.isValidImageFile(webpFile)).toBe(true);
      expect(ImageLoader.isValidImageFile(gifFile)).toBe(true);
    });

    it('should reject unsupported file formats', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });

      expect(ImageLoader.isValidImageFile(textFile)).toBe(false);
      expect(ImageLoader.isValidImageFile(pdfFile)).toBe(false);
    });

    it('should reject non-File objects', () => {
      expect(ImageLoader.isValidImageFile(null)).toBe(false);
      expect(ImageLoader.isValidImageFile(undefined)).toBe(false);
      expect(ImageLoader.isValidImageFile({})).toBe(false);
      expect(ImageLoader.isValidImageFile('file.jpg')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(ImageLoader.getFileExtension('image.jpg')).toBe('jpg');
      expect(ImageLoader.getFileExtension('document.pdf')).toBe('pdf');
      expect(ImageLoader.getFileExtension('file.test.png')).toBe('png');
    });

    it('should handle files without extension', () => {
      expect(ImageLoader.getFileExtension('noextension')).toBe('');
    });

    it('should return lowercase extension', () => {
      expect(ImageLoader.getFileExtension('IMAGE.JPG')).toBe('jpg');
      expect(ImageLoader.getFileExtension('File.PNG')).toBe('png');
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with timestamp and random string', () => {
      const original = 'test.jpg';
      const unique1 = ImageLoader.generateUniqueFilename(original);
      const unique2 = ImageLoader.generateUniqueFilename(original);

      expect(unique1).toContain('test_');
      expect(unique1).toContain('.jpg');
      expect(unique1).not.toBe(unique2);
    });

    it('should preserve file extension', () => {
      expect(ImageLoader.generateUniqueFilename('image.png')).toContain('.png');
      expect(ImageLoader.generateUniqueFilename('photo.webp')).toContain('.webp');
    });
  });

  describe('revokeBlobURL', () => {
    it('should handle blob URLs safely', () => {
      // This should not throw
      expect(() => ImageLoader.revokeBlobURL('blob:http://example.com/123')).not.toThrow();
    });

    it('should handle non-blob URLs safely', () => {
      // These should not throw
      expect(() => ImageLoader.revokeBlobURL('http://example.com/image.jpg')).not.toThrow();
      expect(() => ImageLoader.revokeBlobURL(null)).not.toThrow();
      expect(() => ImageLoader.revokeBlobURL(undefined)).not.toThrow();
    });
  });
});

