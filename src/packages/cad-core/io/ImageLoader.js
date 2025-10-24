/**
 * ImageLoader - Handle image file loading and processing
 *
 * Features:
 * - Image file validation
 * - Base64 encoding/decoding for serialization
 * - Image URL management
 * - Memory cleanup
 */

export class ImageLoader {
  /**
   * Supported image formats
   */
  static SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * Supported HDR formats (by file extension)
   */
  static HDR_FORMATS = ['exr', 'hdr'];

  /**
   * Validate if file is a supported image format
   * @param {File} file - File to validate
   * @returns {boolean}
   */
  static isValidImageFile(file) {
    if (!file instanceof File) return false;

    // Check standard image MIME types
    if (this.SUPPORTED_FORMATS.includes(file.type)) {
      return true;
    }

    // Check HDR formats by extension (EXR files may not have proper MIME type)
    const extension = this.getFileExtension(file.name);
    return this.HDR_FORMATS.includes(extension);
  }

  /**
   * Check if file is an HDR/EXR format
   * @param {File} file - File to check
   * @returns {boolean}
   */
  static isHDRFile(file) {
    const extension = this.getFileExtension(file.name);
    return this.HDR_FORMATS.includes(extension);
  }

  /**
   * Load image file and return as data URL
   * @param {File} file - Image file to load
   * @returns {Promise<string>} Data URL
   */
  static async loadImageAsDataURL(file) {
    if (!this.isValidImageFile(file)) {
      throw new Error(`Unsupported image format: ${file.type || file.name}`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Load HDR/EXR file as ArrayBuffer for Three.js loaders
   * @param {File} file - HDR/EXR file to load
   * @returns {Promise<ArrayBuffer>} Array buffer of file data
   */
  static async loadHDRAsArrayBuffer(file) {
    if (!this.isHDRFile(file)) {
      throw new Error(`File is not an HDR format: ${file.name}`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read HDR file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Load image file and return as blob URL
   * @param {File} file - Image file to load
   * @returns {Promise<{url: string, file: File}>}
   */
  static async loadImageAsBlobURL(file) {
    if (!this.isValidImageFile(file)) {
      throw new Error(`Unsupported image format: ${file.type}`);
    }

    const url = URL.createObjectURL(file);
    return { url, file };
  }

  /**
   * Convert blob URL to data URL
   * @param {string} blobUrl - Blob URL to convert
   * @returns {Promise<string>} Data URL
   */
  static async blobUrlToDataURL(blobUrl) {
    const response = await fetch(blobUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        resolve(event.target.result);
      };

      reader.onerror = () => {
        reject(new Error('Failed to convert blob URL to data URL'));
      };

      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get image dimensions from file
   * @param {File} file - Image file
   * @returns {Promise<{width: number, height: number}>}
   */
  static async getImageDimensions(file) {
    const dataUrl = await this.loadImageAsDataURL(file);

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = dataUrl;
    });
  }

  /**
   * Revoke blob URL to free memory
   * @param {string} blobUrl - Blob URL to revoke
   */
  static revokeBlobURL(blobUrl) {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  }

  /**
   * Extract file extension from filename
   * @param {string} filename - Filename to extract extension from
   * @returns {string} File extension (lowercase)
   */
  static getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Generate unique filename for image
   * @param {string} originalName - Original filename
   * @returns {string} Unique filename
   */
  static generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(originalName);
    const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

    return `${baseName}_${timestamp}_${random}.${extension}`;
  }
}

