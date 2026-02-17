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

const SUPPORTED_LOCALES = [
  'en',
  'en-US',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ru',
  'nl',
  'pl',
  'sv',
  'el',
  'ro',
  'cs',
  'hu',
  'uk',
  'da',
  'no',
  'fi',
  'tr',
  'zh',
  'ja',
  'ko',
  'hi',
  'bn',
  'ur',
  'pa',
  'te',
  'mr',
  'ta',
  'vi',
  'th',
  'ms',
  'id',
  'tl',
  'gu',
  'jv',
  'yue',
  'fa',
  'km',
  'my',
  'ne',
  'si',
  'ar',
  'he',
  'sw',
  'am',
  'ha',
  'yo',
  'zu',
  'af',
  'lg',
  'ht',
  'qu',
  'mi'
];
const DEFAULT_LOCALE = 'en';
const DEFAULT_SEED_RECORD_COUNT = 50;
const SEED_COUNTS = Object.freeze({});

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
  DEFAULT_SEED_RECORD_COUNT,
  SEED_COUNTS,
  API_VERSION,
  DEPRECATED_API_VERSIONS,
  DEPRECATION_SUNSET
};

