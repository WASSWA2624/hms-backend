// Import from actual Prisma package (not alias) to avoid circular dependency
// The alias @prisma/client points to this file, so we need to bypass the alias
// CRITICAL: We must use the actual package path directly to ensure Prisma's internal
// path resolution works correctly. Prisma's generated code uses __dirname which must
// point to the actual package location, not our wrapper file.
const path = require('path');
const fs = require('fs');

// Get the actual @prisma/client package path (bypasses module-alias)
// Use absolute path to ensure Prisma can resolve its runtime files correctly
const actualPrismaPath = path.resolve(process.cwd(), 'node_modules', '@prisma', 'client');

// Verify the path exists
if (!fs.existsSync(actualPrismaPath)) {
  throw new Error(`Prisma client not found at ${actualPrismaPath}. Please run 'npx prisma generate' first.`);
}

// Require PrismaClient using the actual package path
// We use a direct require with the resolved path to bypass module-alias
// This ensures Prisma's internal path resolution works correctly
const prismaPackage = require(actualPrismaPath);
const { PrismaClient } = prismaPackage;

// Import MariaDB adapter for MySQL (Prisma 7.x requirement)
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

const { NODE_ENV, DATABASE_URL } = require('@config/env');

/**
 * Parse MySQL connection string to extract connection parameters
 * Format: mysql://user:password@host:port/database
 */
const parseConnectionString = (url) => {
  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '3306', 10),
      user: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.substring(1), // Remove leading '/'
    };
  } catch (err) {
    throw new Error(`Invalid DATABASE_URL format: ${err.message}`);
  }
};

/**
 * Prisma client singleton wrapper
 * Handles singleton pattern for development (globalThis) and production instances
 * Prevents multiple Prisma client instances in development with hot-reload
 * 
 * Prisma 7.x: Connection URL must be passed via adapter (MariaDB adapter for MySQL)
 */
const globalForPrisma = globalThis;

const isDevelopment = NODE_ENV === 'development';

// Parse connection string and create MariaDB adapter
const connectionConfig = parseConnectionString(DATABASE_URL);

// PrismaMariaDb adapter ships with the official `mariadb` driver and expects connection
// options (or a mariadb pool), not a mysql2 PromisePool. Passing mysql2's PromisePool
// can cause connection acquisition to hang and eventually time out.
const adapter = new PrismaMariaDb({
  host: connectionConfig.host,
  port: connectionConfig.port,
  user: connectionConfig.user,
  password: connectionConfig.password,
  database: connectionConfig.database,
});

// Prisma 7.x: Pass adapter to PrismaClient constructor
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: adapter,
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (isDevelopment || NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Add query performance tracking per performance.mdc
// Track query performance using Prisma's $on event system
try {
  const { logQueryPerformance } = require('@lib/performance');
  
  prisma.$on('query', (e) => {
    // e.query: SQL query string
    // e.params: Query parameters
    // e.duration: Query duration in milliseconds
    // e.target: Model name (e.g., 'user', 'product')
    
    const durationMs = e.duration;
    const model = e.target || 'unknown';
    
    // Determine if query is complex (has joins, unions, subqueries, etc.)
    // Simple heuristic: queries with JOIN, UNION, or nested SELECT are complex
    const query = e.query || '';
    const queryLower = query.toLowerCase();
    const hasJoin = queryLower.includes('join');
    const hasUnion = queryLower.includes('union');
    const hasSubquery = queryLower.includes('(select') || queryLower.includes('( select');
    const isComplex = hasJoin || hasUnion || hasSubquery;
    
    // Extract operation type from query
    // This is a simple heuristic - actual operation is not directly available in query event
    let operation = 'query';
    if (queryLower.startsWith('insert')) {
      operation = 'create';
    } else if (queryLower.startsWith('update')) {
      operation = 'update';
    } else if (queryLower.startsWith('delete')) {
      operation = 'delete';
    } else if (queryLower.includes('select')) {
      if (queryLower.includes('count(')) {
        operation = 'count';
      } else if (queryLower.includes('limit') && queryLower.match(/limit\s+1\b/)) {
        operation = 'findUnique';
      } else {
        operation = 'findMany';
      }
    }
    
    // Log query performance (non-blocking)
    setImmediate(() => {
      logQueryPerformance(operation, model, durationMs, isComplex);
    });
  });
} catch (err) {
  // If performance tracking fails, log warning but don't crash
  // This ensures Prisma client still works even if performance module has issues
  if (isDevelopment) {
    console.warn('Failed to initialize Prisma query performance tracking:', err.message);
  }
}

module.exports = prisma;

