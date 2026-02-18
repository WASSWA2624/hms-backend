/**
 * Readiness Check Utility
 * 
 * Checks if application is ready to serve traffic per health-checks.mdc
 * GET /ready endpoint: Returns 200 if ready, 503 if not ready
 * Checks database connectivity via Prisma (lightweight query)
 * Response format: { status: "ready" | "not_ready", timestamp: ISO 8601, checks: {...} }
 */

const { getCurrentISO } = require('@lib/dates');
const { logger } = require('@lib/logging');
const { DATABASE_URL, NODE_ENV } = require('@config/env');

const READINESS_CACHE_TTL_MS = 5000;

let lastDatabaseCheckAt = 0;
let lastDatabaseCheckResult = null;

/**
 * Race a promise with a timeout and clear timer when done.
 *
 * @param {Promise<any>} promise - Promise to guard
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} timeoutMessage - Error message on timeout
 * @returns {Promise<any>} Promise result
 */
const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    if (timeoutId && typeof timeoutId.unref === 'function') {
      timeoutId.unref();
    }
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Check database connectivity using a short-lived mysql2 connection.
 *
 * Readiness is polled frequently in development. Probing with Prisma can leave
 * background acquisition attempts alive after a timeout and produce noisy engine
 * pool timeout logs. The direct mysql2 check is deterministic and keeps readiness
 * output stable.
 *
 * @returns {Promise<{status: string, error?: string}>} Database check result
 */
const checkDatabaseDirect = async () => {
  try {
    const mysql = require('mysql2/promise');
    
    const urlObj = new URL(DATABASE_URL);
    let connection;
    try {
      connection = await mysql.createConnection({
        host: urlObj.hostname,
        port: parseInt(urlObj.port || '3306', 10),
        user: urlObj.username,
        password: urlObj.password,
        database: urlObj.pathname.substring(1),
      });
    } catch (err) {
      throw err;
    }
    
    try {
      await withTimeout(connection.query('SELECT 1'), 5000, 'Database check timeout');
      await connection.end();
      return { status: 'ok' };
    } catch (err) {
      await connection.end();
      throw err;
    }
  } catch (err) {
    return { status: 'error', error: err?.message || err?.code || 'Database connection failed' };
  }
};

/**
 * Check database connectivity
 * Uses lightweight query (SELECT 1) per health-checks.mdc
 * 
 * @returns {Promise<{status: string, error?: string}>} Database check result
 */
const checkDatabase = async () => {
  const now = Date.now();
  if (lastDatabaseCheckResult && now - lastDatabaseCheckAt < READINESS_CACHE_TTL_MS) {
    return lastDatabaseCheckResult;
  }

  const result = await checkDatabaseDirect();
  lastDatabaseCheckAt = now;
  lastDatabaseCheckResult = result;
  return result;
};

/**
 * Readiness check function
 * Checks all dependencies and returns readiness status
 * 
 * @returns {Promise<Object>} Readiness check response
 */
const readinessCheck = async () => {
  const timestamp = getCurrentISO();
  const checks = {};
  
  // Check database connectivity
  const dbCheck = await checkDatabase();
  checks.database = dbCheck.status;
  
  if (dbCheck.status === 'error' && dbCheck.error) {
    logger.warn('Database readiness check failed', {
      error: dbCheck.error
    });
  }
  
  // Determine overall readiness status
  // For development: Application is ready even if database is unavailable (can reconnect)
  // For production: Application is only ready if all critical checks pass
  const isDevelopment = NODE_ENV === 'development';
  const allChecksPass = isDevelopment 
    ? true // In development, always consider ready for faster iteration
    : Object.values(checks).every((status) => status === 'ok');
  const status = allChecksPass ? 'ready' : 'not_ready';
  
  return {
    status,
    timestamp,
    checks
  };
};

module.exports = { readinessCheck };

