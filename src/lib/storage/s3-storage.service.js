/**
 * S3 Storage Service
 *
 * AWS S3 storage implementation.
 */

const { createStorageServiceBase, sanitizeFilename } = require('@lib/storage/storage-service');
const { encryptBuffer, decryptBuffer } = require('@lib/crypto');
const { STORAGE_ENCRYPTION_MAGIC } = require('@config/constants');

/**
 * Create S3 storage service.
 *
 * @param {Object} config - S3 configuration
 * @returns {Object} S3 storage service implementation
 */
const createS3StorageService = (config) => {
  if (!config?.accessKeyId || !config?.secretAccessKey || !config?.region || !config?.bucket) {
    throw new Error('S3 configuration requires accessKeyId, secretAccessKey, region, and bucket');
  }

  const service = createStorageServiceBase();
  let s3Client = null;
  let PutObjectCommand;
  let DeleteObjectCommand;
  let GetObjectCommand;
  let HeadObjectCommand;

  const initializeClient = () => {
    try {
      const {
        S3Client,
        PutObjectCommand: Put,
        DeleteObjectCommand: Delete,
        GetObjectCommand: Get,
        HeadObjectCommand: Head
      } = require('@aws-sdk/client-s3');

      s3Client = new S3Client({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      });

      PutObjectCommand = Put;
      DeleteObjectCommand = Delete;
      GetObjectCommand = Get;
      HeadObjectCommand = Head;
    } catch (err) {
      throw new Error(
        'AWS SDK not installed. Please install @aws-sdk/client-s3: npm install @aws-sdk/client-s3'
      );
    }
  };

  initializeClient();

  const upload = async (file, filename, options = {}) => {
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const sanitizedKey = sanitizeFilename(filename);

    try {
      let fileBuffer = file;
      if (file && typeof file.pipe === 'function') {
        const chunks = [];
        for await (const chunk of file) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
      }

      if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error('File must be a Buffer or Stream');
      }

      const toUpload = options.encrypt ? encryptBuffer(fileBuffer) : fileBuffer;

      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: sanitizedKey,
        Body: toUpload,
        ContentType: options.mimeType || 'application/octet-stream',
        Metadata: {
          ...(options.metadata || {}),
          ...(options.encrypt ? { encrypted: '1', enc: 'aes-256-gcm' } : {})
        }
      });

      await s3Client.send(command);
      const url = await getUrl(sanitizedKey);

      return {
        path: sanitizedKey,
        url,
        size: toUpload.length,
        mimeType: options.mimeType || 'application/octet-stream',
        encrypted: Boolean(options.encrypt),
        uploadedAt: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Failed to upload file to S3: ${err.message}`);
    }
  };

  const deleteFile = async (filePath) => {
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const sanitizedKey = sanitizeFilename(filePath);

    try {
      const command = new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: sanitizedKey
      });

      await s3Client.send(command);
      return true;
    } catch (err) {
      throw new Error(`Failed to delete file from S3: ${err.message}`);
    }
  };

  const getUrl = async (filePath) => {
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const sanitizedKey = sanitizeFilename(filePath);

    const fileExists = await exists(filePath);
    if (!fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }

    return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${sanitizedKey}`;
  };

  const exists = async (filePath) => {
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const sanitizedKey = sanitizeFilename(filePath);

    try {
      const command = new HeadObjectCommand({
        Bucket: config.bucket,
        Key: sanitizedKey
      });

      await s3Client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new Error(`Failed to check file existence: ${err.message}`);
    }
  };

  const getMetadata = async (filePath) => {
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const sanitizedKey = sanitizeFilename(filePath);

    try {
      const command = new HeadObjectCommand({
        Bucket: config.bucket,
        Key: sanitizedKey
      });

      const response = await s3Client.send(command);

      return {
        size: response.ContentLength,
        mimeType: response.ContentType,
        lastModified: response.LastModified?.toISOString(),
        etag: response.ETag,
        metadata: response.Metadata || {}
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Failed to get file metadata: ${err.message}`);
    }
  };

  const download = async (filePath) => {
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const sanitizedKey = sanitizeFilename(filePath);

    try {
      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: sanitizedKey
      });

      const response = await s3Client.send(command);

      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks);
      const magic = data.length >= 4 ? data.subarray(0, 4).toString('utf8') : null;
      if (magic === String(STORAGE_ENCRYPTION_MAGIC)) {
        return decryptBuffer(data);
      }
      return data;
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
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

module.exports = { createS3StorageService };
