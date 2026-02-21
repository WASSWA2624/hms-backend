/**
 * Prisma CLI Configuration
 *
 * Per Phase 0 contract, prisma.config.js must not read environment variables directly.
 * It imports validated configuration from src/config/env.js using a relative path
 * because Prisma CLI does not auto-register runtime aliases.
 */

const env = require('./src/config/env');

module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: env.DATABASE_URL,
  },
};
