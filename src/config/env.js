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
const path = require('path');
const { logger } = require('@lib/logging');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
  // Dotenv's runtime tips are useful for local manual runs, but they add heavy
  // noise/overhead during automated test runs.
  quiet: process.env.NODE_ENV === 'test' || process.env.DOTENV_QUIET === 'true'
});

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
  const HOST = process.env.HOST || '0.0.0.0';
  const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || null;
  const CSRF_SECRET = process.env.CSRF_SECRET || null;
  const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'http://localhost:8081';
  const APP_DISPLAY_NAME =
    String(process.env.APP_DISPLAY_NAME || 'Hospital Management System').trim() ||
    'Hospital Management System';
  const APP_SHORT_NAME = String(process.env.APP_SHORT_NAME || 'HMS').trim() || 'HMS';
  const SMTP_HOST = process.env.SMTP_HOST || null;
  const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null;
  const SMTP_USER = process.env.SMTP_USER || null;
  const SMTP_PASS = process.env.SMTP_PASS || null;
  const SMTP_FROM = process.env.SMTP_FROM || null;
  const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || APP_DISPLAY_NAME;
  const SMTP_REPLY_TO = process.env.SMTP_REPLY_TO || null;
  const SMTP_NO_REPLY_ADDRESS = process.env.SMTP_NO_REPLY_ADDRESS || null;
  const ALLOW_PLAINTEXT_PASSWORD_EMAIL = parseOptionalBoolean(
    process.env.ALLOW_PLAINTEXT_PASSWORD_EMAIL,
    true
  );
  const HANDLE_SIGINT = parseOptionalBoolean(
    process.env.HANDLE_SIGINT,
    true
  );
  const ALLOW_PRIVATE_NETWORK_ORIGINS = parseOptionalBoolean(
    process.env.ALLOW_PRIVATE_NETWORK_ORIGINS,
    NODE_ENV === 'development'
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

  if (SMTP_PORT !== null && (isNaN(SMTP_PORT) || SMTP_PORT < 1 || SMTP_PORT > 65535)) {
    throw new Error(`Invalid SMTP_PORT: ${process.env.SMTP_PORT}. Must be a number between 1 and 65535.`);
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

  const envConfig = {
    DATABASE_URL,
    JWT_SECRET,
    CORS_ORIGINS,
    NODE_ENV,
    PORT,
    HOST,
    STORAGE_PROVIDER,
    ENCRYPTION_KEY,
    CSRF_SECRET,
    APP_PUBLIC_URL,
    APP_DISPLAY_NAME,
    APP_SHORT_NAME,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    SMTP_FROM_NAME,
    SMTP_REPLY_TO,
    SMTP_NO_REPLY_ADDRESS,
    ALLOW_PLAINTEXT_PASSWORD_EMAIL,
    HANDLE_SIGINT,
    ALLOW_PRIVATE_NETWORK_ORIGINS,
    WS_MAX_CONNECTIONS,
    WS_HEARTBEAT_INTERVAL,
    WS_HEARTBEAT_TIMEOUT,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET
  };

  if (NODE_ENV === 'development') {
    logger.warn('Environment variables loaded', {
      nodeEnv: NODE_ENV,
      port: PORT,
      host: HOST,
      corsOrigins: CORS_ORIGINS,
      storageProvider: STORAGE_PROVIDER,
      appPublicUrl: APP_PUBLIC_URL,
      appDisplayName: APP_DISPLAY_NAME,
      appShortName: APP_SHORT_NAME,
      handleSigint: HANDLE_SIGINT,
      allowPrivateNetworkOrigins: ALLOW_PRIVATE_NETWORK_ORIGINS,
      wsMaxConnections: WS_MAX_CONNECTIONS,
      wsHeartbeatInterval: WS_HEARTBEAT_INTERVAL,
      wsHeartbeatTimeout: WS_HEARTBEAT_TIMEOUT
    });
  }

  return envConfig;
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
  'HOST',
  'STORAGE_PROVIDER',
  'ENCRYPTION_KEY',
  'CSRF_SECRET',
  'APP_PUBLIC_URL',
  'APP_DISPLAY_NAME',
  'APP_SHORT_NAME',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_FROM_NAME',
  'SMTP_REPLY_TO',
  'SMTP_NO_REPLY_ADDRESS',
  'ALLOW_PLAINTEXT_PASSWORD_EMAIL',
  'HANDLE_SIGINT',
  'ALLOW_PRIVATE_NETWORK_ORIGINS',
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
