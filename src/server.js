/**
 * Server Entry Point
 *
 * HTTP server bootstrap per architecture.mdc
 * Uses nodemon in dev, node in prod
 * Validates environment variables on startup via @config/env
 *
 * Per architecture.mdc: Development runtime uses nodemon, production uses node directly
 */

// Must be absolute first - register module aliases before any other requires
// This enables @app/*, @lib/*, @config/*, etc. to work at runtime
require('module-alias/register');
const path = require('path');
const os = require('os');

// Register global aliases for runtime resolution
try {
  const moduleAlias = require('module-alias');
  const prismaClientPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
  
  // Register base aliases first
  moduleAlias.addAliases({
    '@app': path.join(__dirname, 'app'),
    '@lib': path.join(__dirname, 'lib'),
    '@config': path.join(__dirname, 'config'),
    '@middlewares': path.join(__dirname, 'middlewares'),
    '@logs': path.join(process.cwd(), 'logs'),
    '@websockets': path.join(__dirname, 'websockets'),
    '@modules': path.join(__dirname, 'modules'),
    '@prisma/client': path.join(__dirname, 'prisma', 'client.js')
  });
  
  // CRITICAL: Register @prisma/client/runtime LAST so it takes precedence
  // module-alias checks aliases in reverse order (last registered = checked first)
  // Prisma's generated code requires '@prisma/client/runtime/client.js' which must resolve to the actual package
  // By registering runtime AFTER @prisma/client, it will be checked first and match before @prisma/client
  const prismaRuntimePath = path.join(prismaClientPath, 'runtime');
  moduleAlias.addAlias('@prisma/client/runtime', prismaRuntimePath);
} catch (err) {
  throw err;
}

// Register module-scoped aliases (@controllers/*, @services/*, etc.) for all existing modules
// This auto-discovers modules in src/modules/ and registers their aliases
try {
  const { registerAllModuleAliases } = require('@lib/aliases');
  registerAllModuleAliases();
} catch (err) {
  throw err;
}

let PORT, HOST, NODE_ENV, HANDLE_SIGINT;
try {
  const envConfig = require('@config/env');
  PORT = envConfig.PORT;
  HOST = envConfig.HOST;
  NODE_ENV = envConfig.NODE_ENV;
  HANDLE_SIGINT = envConfig.HANDLE_SIGINT;
} catch (err) {
  throw err;
}

let createApp;
try {
  createApp = require('@app/index');
} catch (err) {
  throw err;
}

let logger;
try {
  ({ logger } = require('@lib/logging'));
} catch (err) {
  throw err;
}

const getLanAddresses = () => {
  const interfaces = os.networkInterfaces();
  const results = [];

  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.internal) return;
      const family = typeof entry.family === 'string' ? entry.family : String(entry.family);
      if (family !== 'IPv4') return;
      if (!entry.address) return;
      results.push(entry.address);
    });
  });

  return Array.from(new Set(results));
};

const getStartupUrls = (host, port) => {
  const normalizedHost = String(host || '').trim();
  const lanHosts = getLanAddresses();
  const urls = [];

  if (!normalizedHost || normalizedHost === '0.0.0.0' || normalizedHost === '::') {
    urls.push(`http://localhost:${port}`);
    lanHosts.forEach((address) => urls.push(`http://${address}:${port}`));
    return Array.from(new Set(urls));
  }

  if (normalizedHost.includes(':') && !normalizedHost.startsWith('[')) {
    urls.push(`http://[${normalizedHost}]:${port}`);
    return urls;
  }

  urls.push(`http://${normalizedHost}:${port}`);
  return urls;
};

/**
 * Start HTTP server
 */
const startServer = () => {
  try {
    // Environment variables are validated in @config/env on import
    // If validation fails, the import will throw an error
    
    // Create Express app
    const app = createApp();
    
    // Start HTTP server.
    const server = app.listen(PORT, HOST);

    // Handle bind/runtime errors explicitly so startup failures are actionable.
    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`[startup] Port ${PORT} is already in use on ${HOST}.`);
        console.error('[startup] Stop the existing backend process or change PORT in .env.');
      } else {
        console.error(`[startup] HTTP server error: ${err?.message || 'Unknown error'}`);
      }

      logger.error('HTTP server failed to start', {
        error: err?.message,
        code: err?.code,
        errno: err?.errno,
        syscall: err?.syscall,
        address: err?.address,
        port: err?.port
      });

      process.exit(1);
    });

    server.once('listening', () => {
      const startupUrls = getStartupUrls(HOST, PORT);
      console.log(`[startup] backend listening on ${startupUrls[0]}`);
      if (startupUrls.length > 1) {
        console.log(`[startup] LAN access URLs: ${startupUrls.slice(1).join(', ')}`);
      }
      logger.info(`Server started successfully`, {
        port: PORT,
        host: HOST,
        urls: startupUrls,
        environment: NODE_ENV,
        nodeVersion: process.version
      });

      // Initialize WebSocket runtime on the same HTTP server after bind succeeds.
      try {
        const { initializeWebSocketServer } = require('@websockets/server');
        const { initializeGateway } = require('@websockets/gateway');
        initializeWebSocketServer(server);
        initializeGateway();
        logger.info('WebSocket runtime initialized');
      } catch (wsErr) {
        logger.error('Failed to initialize WebSocket runtime', {
          error: wsErr.message,
          stack: wsErr.stack
        });
        server.close(() => process.exit(1));
      }
    });
    
    // Graceful shutdown handling
    let isShuttingDown = false;
    const gracefulShutdown = (signal, reason = null) => {
      if (isShuttingDown) {
        logger.warn('Shutdown already in progress', { signal });
        return;
      }
      isShuttingDown = true;
      let forcedShutdownTimer = null;

      logger.info(`Received ${signal}, shutting down gracefully...`);
      if (reason) {
        logger.error(`Shutdown reason: ${signal}`, reason);
      }

      // Stop accepting new connections
      server.close(async () => {
        if (forcedShutdownTimer) {
          clearTimeout(forcedShutdownTimer);
        }

        logger.info('HTTP server closed');

        try {
          // Close WebSocket server and cleanup gateway
          const wsServer = require('@websockets/server');
          const wsGateway = require('@websockets/gateway');
          if (wsGateway && typeof wsGateway.cleanup === 'function') {
            wsGateway.cleanup();
          }
          if (wsServer && typeof wsServer.closeWebSocketServer === 'function') {
            await wsServer.closeWebSocketServer();
          }
        } catch (err) {
          logger.warn('WebSocket shutdown encountered an error', {
            error: err.message
          });
        }

        try {
          // Close Prisma client if initialized
          if (globalThis.prisma && typeof globalThis.prisma.$disconnect === 'function') {
            await globalThis.prisma.$disconnect();
          }
        } catch (err) {
          logger.warn('Prisma disconnect encountered an error', {
            error: err.message
          });
        }

        process.exit(signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : 1);
      });

      // Force close after 30 seconds
      forcedShutdownTimer = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
      if (typeof forcedShutdownTimer.unref === 'function') {
        forcedShutdownTimer.unref();
      }
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    if (HANDLE_SIGINT) {
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } else {
      process.on('SIGINT', () => {
        logger.warn('SIGINT received but ignored to keep server running', {
          pid: process.pid
        });
      });
    }
    
    // Handle uncaught exceptions via graceful shutdown.
    process.on('uncaughtException', (err) => {
      gracefulShutdown('UNCAUGHT_EXCEPTION', {
        error: err?.message || 'Unknown uncaught exception',
        stack: err?.stack
      });
    });
    
    // Handle unhandled promise rejections via graceful shutdown.
    process.on('unhandledRejection', (reason, promise) => {
      gracefulShutdown('UNHANDLED_REJECTION', {
        reason,
        promise
      });
    });
    
    return server;
  } catch (err) {
    console.error('[startup] Failed to start server:', err.message);
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };


