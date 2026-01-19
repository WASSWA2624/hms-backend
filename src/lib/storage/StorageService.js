/**
 * Storage Service Base
 * 
 * Abstract interface for storage providers per storage.mdc
 * All storage operations must go through StorageService
 * Controllers and services must not directly access storage providers
 */

/**
 * Sanitize filename to prevent path traversal
 * 
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  // Remove path traversal attempts
  let sanitized = filename
    .replace(/\.\./g, '') // Remove ..
    .replace(/[\/\\]/g, '_') // Replace slashes with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .trim();

  // Ensure filename is not empty after sanitization
  if (!sanitized) {
    sanitized = `file_${Date.now()}`;
  }

  // Limit filename length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }

  return sanitized;
};

/**
 * Create a base StorageService interface with required methods.
 * 
 * @returns {Object} Storage service base interface
 */
const createStorageServiceBase = () => {
  return {
    /**
     * Upload a file
     * 
     * @param {Buffer|Stream} file - File data to upload
     * @param {string} filename - Destination filename (will be sanitized)
     * @param {Object} [options] - Upload options (mimeType, metadata, etc.)
     * @returns {Promise<Object>} Upload result with file path/URL and metadata
     */
    upload: async () => {
      throw new Error('upload() method must be implemented by storage provider');
    },

    /**
     * Delete a file
     * 
     * @param {string} filePath - Path or key of file to delete
     * @returns {Promise<boolean>} True if file was deleted, false if not found
     */
    delete: async () => {
      throw new Error('delete() method must be implemented by storage provider');
    },

    /**
     * Get file URL or path
     * 
     * @param {string} filePath - Path or key of file
     * @returns {Promise<string>} File URL or path
     */
    getUrl: async () => {
      throw new Error('getUrl() method must be implemented by storage provider');
    },

    /**
     * Check if file exists
     * 
     * @param {string} filePath - Path or key of file
     * @returns {Promise<boolean>} True if file exists
     */
    exists: async () => {
      throw new Error('exists() method must be implemented by storage provider');
    },

    /**
     * Get file metadata
     * 
     * @param {string} filePath - Path or key of file
     * @returns {Promise<Object>} File metadata (size, mimeType, lastModified, etc.)
     */
    getMetadata: async () => {
      throw new Error('getMetadata() method must be implemented by storage provider');
    },

    /**
     * Download file as buffer
     * 
     * @param {string} filePath - Path or key of file
     * @returns {Promise<Buffer>} File data as buffer
     */
    download: async () => {
      throw new Error('download() method must be implemented by storage provider');
    },

    sanitizeFilename
  };
};

module.exports = {
  createStorageServiceBase,
  sanitizeFilename
};

