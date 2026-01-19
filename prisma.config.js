/**
 * Prisma Configuration for Migrations
 *
 * Prisma 7.x requires connection URLs to be configured here for migrations
 * instead of in schema.prisma. The runtime Prisma client uses the adapter pattern
 * defined in src/prisma/client.js
 *
 * This file is used by Prisma Migrate and other CLI tools
 */

// Use validated env config. Must be a relative require (no aliases).
const { DATABASE_URL } = require('./src/config/env');
// #region agent log
fetch('http://127.0.0.1:7250/ingest/78423c27-2923-42d5-b202-4e290da986d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.config.js:13',message:'prisma config loaded',data:{hasDatabaseUrl: Boolean(DATABASE_URL)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7250/ingest/78423c27-2923-42d5-b202-4e290da986d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.config.js:17',message:'prisma config export',data:{schemaPath:'./prisma/schema.prisma'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
// #endregion
module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: DATABASE_URL,
  },
};
// #region agent log
fetch('http://127.0.0.1:7250/ingest/78423c27-2923-42d5-b202-4e290da986d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'prisma.config.js:24',message:'prisma config ready',data:{hasDatasourceUrl: Boolean(DATABASE_URL)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
// #endregion
