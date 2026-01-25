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

/**
 * Check database connectivity using MySQL connection pool directly
 * This avoids Prisma's module resolution issues by using the underlying connection
 * 
 * @returns {Promise<{status: string, error?: string}>} Database check result
 */
const checkDatabaseDirect = async () => {
  // Try Prisma first, but fall back to direct mysql2 connection if it fails
  // This ensures we can always check database connectivity even if Prisma's pool has issues
  if (globalThis.prisma && typeof globalThis.prisma.$queryRaw === 'function') {
    try {
      const prismaPromise = globalThis.prisma.$queryRaw`SELECT 1`;
      // Avoid unhandled rejection if the timeout "wins" but Prisma later rejects.
      prismaPromise.catch(() => {});
      // Use shorter timeout (2 seconds) for Prisma - if it fails, fall back to direct connection
      await Promise.race([
        prismaPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Prisma query timeout')), 2000)
        )
      ]);
      return { status: 'ok' };
    } catch (prismaError) {
      // Fall through to direct mysql2 connection
    }
  }
  
  // Fallback: Test database connection directly using mysql2
  // This avoids Prisma's pool issues and provides a reliable connectivity check
  try {
    const { DATABASE_URL } = require('@config/env');
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
      await Promise.race([
        connection.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database check timeout')), 5000)
        )
      ]);
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
  return await checkDatabaseDirect();
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
  const isDevelopment = process.env.NODE_ENV === 'development';
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

