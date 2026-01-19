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

module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: DATABASE_URL,
  },
};
