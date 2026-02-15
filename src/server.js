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

let createApp;
try {
  createApp = require('@app/index');
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

let logger;
try {
  ({ logger } = require('@lib/logging'));
} catch (err) {
  throw err;
}

/**
 * Start HTTP server
 */
const startServer = () => {
  try {
    // Environment variables are validated in @config/env on import
    // If validation fails, the import will throw an error
    
    // Create Express app
    const app = createApp();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      const startupHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
      console.log(`[startup] backend listening on http://${startupHost}:${PORT}`);
      logger.info(`Server started successfully`, {
        port: PORT,
        host: HOST,
        environment: NODE_ENV,
        nodeVersion: process.version
      });
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(async () => {
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

        process.exit(0);
      });

      // Force close after 30 seconds
      const forcedShutdownTimer = setTimeout(() => {
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
    
    // Handle uncaught exceptions (log only; keep server running)
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    });
    
    // Handle unhandled promise rejections (log only; keep server running)
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason, promise });
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


