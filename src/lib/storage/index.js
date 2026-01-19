/**
 * Storage Module Barrel Export
 * 
 * Centralized exports for storage module
 * Per storage.mdc: Exports StorageService, factory, providers
 */

const { createStorageServiceBase, sanitizeFilename } = require('@lib/storage/StorageService');
const { createLocalStorageService } = require('@lib/storage/LocalStorageService');
const { createS3StorageService } = require('@lib/storage/S3StorageService');
const { createStorageService } = require('@lib/storage/factory');

// #region agent log
fetch('http://127.0.0.1:7248/ingest/37044cb2-6692-46dd-b93e-b2eef0a91415',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'src/lib/storage/index.js:12',message:'storage index loaded',data:{createLocalStorageServiceType:typeof createLocalStorageService,sanitizeFilenameType:typeof sanitizeFilename},timestamp:Date.now()})}).catch(()=>{});
// #endregion

module.exports = {
  StorageService: createStorageServiceBase,
  LocalStorageService: createLocalStorageService,
  S3StorageService: createS3StorageService,
  createStorageService,
  createStorageServiceBase,
  createLocalStorageService,
  createS3StorageService,
  sanitizeFilename
};

