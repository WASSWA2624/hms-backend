/**
 * Prisma seed entrypoint
 *
 * Runs schema-aware demo seeding with deterministic faker randomness.
 */

const { faker } = require('@faker-js/faker');
const { seedDemoData } = require('../scripts/seed-demo-data');
const env = require('@config/env');
const prisma = require('@prisma/client');
const { DEFAULT_SEED_RECORD_COUNT, SEED_COUNTS } = require('@config/constants');

const resolveSeedTargetCount = () => {
  const value = Number.parseInt(String(env.SEED_RECORD_COUNT), 10);
  if (Number.isFinite(value) && value >= 0) return value;
  return DEFAULT_SEED_RECORD_COUNT;
};

const run = async () => {
  if (env.NODE_ENV === 'production') {
    console.warn('Skipping seed: NODE_ENV=production');
    return;
  }

  const randomSeed = Number.parseInt(String(env.SEED_RANDOM_SEED), 10) || 20260217;
  faker.seed(randomSeed);

  await seedDemoData({
    targetCount: resolveSeedTargetCount(),
    targetCountsByModel: SEED_COUNTS,
    randomSeed,
    skipDefaultAccounts: process.argv.includes('--skip-default-accounts')
  });
};

run()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
