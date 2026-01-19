/**
 * Application Constants
 * 
 * All constants must live in this file (per constants-env.mdc)
 * Naming convention: UPPER_SNAKE_CASE for constants
 * Config objects: PascalCase
 */

// Pagination Constants
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

const API_VERSION = 'v1';
const DEPRECATED_API_VERSIONS = [];
const DEPRECATION_SUNSET = null;

// Storage
const LOCAL_STORAGE_DIR = 'uploads';
const STORAGE_ENCRYPTION_MAGIC = 'BMP1';

// Resilience defaults (per error-logging.mdc)
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_INITIAL_DELAY_MS = 100;
const RETRY_BACKOFF_MULTIPLIER = 2;
const RETRY_MAX_DELAY_MS = 5000;
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

const SUPPORTED_LOCALES = ['en', 'en-US'];
const DEFAULT_LOCALE = 'en';

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  LOCAL_STORAGE_DIR,
  STORAGE_ENCRYPTION_MAGIC,
  RETRY_MAX_ATTEMPTS,
  RETRY_INITIAL_DELAY_MS,
  RETRY_BACKOFF_MULTIPLIER,
  RETRY_MAX_DELAY_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  API_VERSION,
  DEPRECATED_API_VERSIONS,
  DEPRECATION_SUNSET
};

