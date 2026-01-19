/**
 * Local Storage Service
 * 
 * Local file system storage implementation
 * Stores files in local directory (e.g., public/ or uploads/)
 * Per storage.mdc: LocalStorageService implements StorageService interface
 */

const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const { createStorageServiceBase, sanitizeFilename } = require('@lib/storage/StorageService');
const { encryptBuffer, decryptBuffer } = require('@lib/crypto');
const { STORAGE_ENCRYPTION_MAGIC } = require('@config/constants');

/**
 * Create local storage service
 * 
 * @param {string} [basePath='uploads'] - Base directory for file storage
 * @returns {Object} Local storage service implementation
 */
const createLocalStorageService = (basePath = 'uploads') => {
  const service = createStorageServiceBase();
  const resolvedBasePath = path.resolve(process.cwd(), basePath);

  /**
   * Ensure base directory exists
   */
  const ensureDirectory = async () => {
    try {
      await fs.mkdir(resolvedBasePath, { recursive: true });
    } catch (err) {
      throw new Error(`Failed to create storage directory: ${err.message}`);
    }
  };

  /**
   * Upload a file to local storage
   */
  const upload = async (file, filename, options = {}) => {
    const sanitizedFilename = sanitizeFilename(filename);
    const filePath = path.join(resolvedBasePath, sanitizedFilename);

    // Ensure directory exists
    await ensureDirectory();

    try {
      if (Buffer.isBuffer(file)) {
        const toWrite = options.encrypt ? encryptBuffer(file) : file;
        await fs.writeFile(filePath, toWrite);
      } else if (file && typeof file.pipe === 'function') {
        if (options.encrypt) {
          throw new Error('Encryption requires Buffer input');
        }
        const writeStream = createWriteStream(filePath);
        await new Promise((resolve, reject) => {
          file.pipe(writeStream);
          file.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('finish', resolve);
        });
      } else {
        throw new Error('File must be a Buffer or Stream');
      }

      const stats = await fs.stat(filePath);

      return {
        path: sanitizedFilename,
        fullPath: filePath,
        size: stats.size,
        mimeType: options.mimeType || 'application/octet-stream',
        encrypted: Boolean(options.encrypt),
        uploadedAt: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Failed to upload file: ${err.message}`);
    }
  };

  /**
   * Delete a file from local storage
   */
  const deleteFile = async (filePath) => {
    const sanitizedPath = sanitizeFilename(filePath);
    const fullPath = path.join(resolvedBasePath, sanitizedPath);

    try {
      await fs.unlink(fullPath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw new Error(`Failed to delete file: ${err.message}`);
    }
  };

  /**
   * Get file URL (local path)
   */
  const getUrl = async (filePath) => {
    const sanitizedPath = sanitizeFilename(filePath);

    const fileExists = await exists(filePath);
    if (!fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }

    return sanitizedPath;
  };

  /**
   * Check if file exists
   */
  const exists = async (filePath) => {
    const sanitizedPath = sanitizeFilename(filePath);
    const fullPath = path.join(resolvedBasePath, sanitizedPath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Get file metadata
   */
  const getMetadata = async (filePath) => {
    const sanitizedPath = sanitizeFilename(filePath);
    const fullPath = path.join(resolvedBasePath, sanitizedPath);

    try {
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to get file metadata: ${err.message}`);
    }
  };

  /**
   * Download file as buffer
   */
  const download = async (filePath) => {
    const sanitizedPath = sanitizeFilename(filePath);
    const fullPath = path.join(resolvedBasePath, sanitizedPath);

    try {
      const data = await fs.readFile(fullPath);
      const magic = data.length >= 4 ? data.subarray(0, 4).toString('utf8') : null;
      if (magic === String(STORAGE_ENCRYPTION_MAGIC)) {
        return decryptBuffer(data);
      }
      return data;
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to download file: ${err.message}`);
    }
  };

  return {
    ...service,
    upload,
    delete: deleteFile,
    getUrl,
    exists,
    getMetadata,
    download
  };
};

module.exports = { createLocalStorageService };

