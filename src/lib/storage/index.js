/**
 * Storage Module Barrel Export
 * 
 * Centralized exports for storage module
 * Per storage.mdc: Exports StorageService, factory, providers
 */

const { createStorageServiceBase, sanitizeFilename } = require('@lib/storage/storage-service');
const { createLocalStorageService } = require('@lib/storage/local-storage.service');
const { createS3StorageService } = require('@lib/storage/s3-storage.service');
const { createStorageService } = require('@lib/storage/factory');

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

