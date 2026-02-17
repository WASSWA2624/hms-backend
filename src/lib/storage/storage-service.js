/**
 * Storage Service Base
 *
 * Abstract interface for storage providers per storage.mdc.
 * All storage operations must go through StorageService.
 */

/**
 * Sanitize filename to prevent path traversal.
 *
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  let sanitized = filename
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .trim();

  if (!sanitized) {
    sanitized = `file_${Date.now()}`;
  }

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
    upload: async () => {
      throw new Error('upload() method must be implemented by storage provider');
    },
    delete: async () => {
      throw new Error('delete() method must be implemented by storage provider');
    },
    getUrl: async () => {
      throw new Error('getUrl() method must be implemented by storage provider');
    },
    exists: async () => {
      throw new Error('exists() method must be implemented by storage provider');
    },
    getMetadata: async () => {
      throw new Error('getMetadata() method must be implemented by storage provider');
    },
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
