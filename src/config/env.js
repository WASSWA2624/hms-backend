/**
 * Environment Configuration
 *
 * This is the ONLY file allowed to read process.env directly (per constants-env.mdc)
 * All other files must import environment variables from this module via @config/env
 *
 * Validates required environment variables on application boot
 * Throws errors if required variables are missing or invalid
 */

// Load .env once here (no other file should read process.env)
require('dotenv').config();

/**
 * Required environment variables
 * These must be present for the application to start
 */
const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CORS_ORIGINS',
  'NODE_ENV'
];

/**
 * Validate that a required environment variable exists
 */
const validateRequired = (varName) => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
      `Please check your .env file or environment configuration.`
    );
  }
  return value;
};

/**
 * Validate JWT_SECRET meets minimum length requirement (≥ 32 characters)
 */
const validateJwtSecret = (secret) => {
  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters long for security. ` +
      `Current length: ${secret.length}. Please update your .env file.`
    );
  }
};

/**
 * Validate NODE_ENV is a valid value
 */
const validateNodeEnv = (env) => {
  const validEnvs = ['development', 'staging', 'production', 'test'];
  if (!validEnvs.includes(env)) {
    throw new Error(
      `Invalid NODE_ENV: ${env}. Must be one of: ${validEnvs.join(', ')}`
    );
  }
};

/**
 * Validate STORAGE_PROVIDER is valid
 */
const validateStorageProvider = (provider) => {
  if (provider && !['local', 's3'].includes(provider)) {
    throw new Error(
      `Invalid STORAGE_PROVIDER: ${provider}. Must be 'local' or 's3'`
    );
  }
};

/**
 * Parse comma-separated CORS_ORIGINS into array
 */
const parseCorsOrigins = (origins) => {
  if (!origins) return [];
  return origins.split(',').map((origin) => origin.trim()).filter(Boolean);
};

/**
 * Parse optional boolean env values
 */
const parseOptionalBoolean = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  throw new Error(`Invalid boolean value: ${value}. Use "true" or "false".`);
};

/**
 * Build validated environment config
 */
const buildEnv = () => {
  const DATABASE_URL = validateRequired('DATABASE_URL');
  const JWT_SECRET = validateRequired('JWT_SECRET');
  const CORS_ORIGINS_RAW = validateRequired('CORS_ORIGINS');
  const NODE_ENV = validateRequired('NODE_ENV');

  validateJwtSecret(JWT_SECRET);
  validateNodeEnv(NODE_ENV);

  const CORS_ORIGINS = parseCorsOrigins(CORS_ORIGINS_RAW);

  const rawPort = process.env.PORT;
  const PORT = rawPort ? parseInt(rawPort, 10) : 3000;
  const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || null;
  const CSRF_SECRET = process.env.CSRF_SECRET || null;
  const HANDLE_SIGINT = parseOptionalBoolean(
    process.env.HANDLE_SIGINT,
    NODE_ENV !== 'development'
  );
  const WS_MAX_CONNECTIONS = process.env.WS_MAX_CONNECTIONS ? parseInt(process.env.WS_MAX_CONNECTIONS, 10) : 1000;
  const WS_HEARTBEAT_INTERVAL = process.env.WS_HEARTBEAT_INTERVAL ? parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) : 30000;
  const WS_HEARTBEAT_TIMEOUT = process.env.WS_HEARTBEAT_TIMEOUT ? parseInt(process.env.WS_HEARTBEAT_TIMEOUT, 10) : 60000;

  if (process.env.STORAGE_PROVIDER) {
    validateStorageProvider(STORAGE_PROVIDER);
  }

  if (ENCRYPTION_KEY) {
    const hex = String(ENCRYPTION_KEY).trim();
    const isValidHex = /^[0-9a-fA-F]{64}$/.test(hex);
    if (!isValidHex) {
      throw new Error(
        'Invalid ENCRYPTION_KEY. Must be a 64-character hex string (32 bytes) for AES-256.'
      );
    }
  }

  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(
      `Invalid PORT: ${rawPort}. Must be a number between 1 and 65535.`
    );
  }

  if (CSRF_SECRET && CSRF_SECRET.length < 32) {
    throw new Error('CSRF_SECRET must be at least 32 characters long.');
  }

  if (isNaN(WS_MAX_CONNECTIONS) || WS_MAX_CONNECTIONS < 1) {
    throw new Error('WS_MAX_CONNECTIONS must be a positive integer.');
  }

  if (isNaN(WS_HEARTBEAT_INTERVAL) || WS_HEARTBEAT_INTERVAL < 1000) {
    throw new Error('WS_HEARTBEAT_INTERVAL must be at least 1000ms.');
  }

  if (isNaN(WS_HEARTBEAT_TIMEOUT) || WS_HEARTBEAT_TIMEOUT < 2000) {
    throw new Error('WS_HEARTBEAT_TIMEOUT must be at least 2000ms.');
  }

  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || null;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || null;
  const AWS_REGION = process.env.AWS_REGION || null;
  const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || null;

  if (STORAGE_PROVIDER === 's3') {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET) {
      throw new Error(
        'AWS credentials are required when STORAGE_PROVIDER is "s3". ' +
        'Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET in your .env file.'
      );
    }
  }

  return {
    DATABASE_URL,
    JWT_SECRET,
    CORS_ORIGINS,
    NODE_ENV,
    PORT,
    STORAGE_PROVIDER,
    ENCRYPTION_KEY,
    CSRF_SECRET,
    HANDLE_SIGINT,
    WS_MAX_CONNECTIONS,
    WS_HEARTBEAT_INTERVAL,
    WS_HEARTBEAT_TIMEOUT,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET
  };
};

let cachedEnv = null;

const getEnv = () => {
  if (!cachedEnv) {
    cachedEnv = buildEnv();
  }
  return cachedEnv;
};

const setEnvForTests = (overrides = {}) => {
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      delete process.env[key];
    } else {
      process.env[key] = String(value);
    }
  });

  cachedEnv = buildEnv();
  return cachedEnv;
};

const envKeys = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CORS_ORIGINS',
  'NODE_ENV',
  'PORT',
  'STORAGE_PROVIDER',
  'ENCRYPTION_KEY',
  'CSRF_SECRET',
  'HANDLE_SIGINT',
  'WS_MAX_CONNECTIONS',
  'WS_HEARTBEAT_INTERVAL',
  'WS_HEARTBEAT_TIMEOUT',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET'
];

const exported = {
  setEnvForTests
};

envKeys.forEach((key) => {
  Object.defineProperty(exported, key, {
    enumerable: true,
    get: () => getEnv()[key]
  });
});

module.exports = exported;
