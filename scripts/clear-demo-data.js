/**
 * Clear Demo Data Script
 *
 * Deletes all application data from the current database while keeping
 * Prisma migration metadata intact.
 *
 * Usage:
 *   node scripts/clear-demo-data.js
 *   node scripts/clear-demo-data.js --dry-run
 *
 * @module scripts/clear-demo-data
 */

// Must be absolute first - register module aliases before any other requires
require('module-alias/register');
const path = require('path');

// Register global aliases for runtime resolution
try {
  const moduleAlias = require('module-alias');
  const prismaClientPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client');

  moduleAlias.addAliases({
    '@app': path.join(__dirname, '..', 'src', 'app'),
    '@lib': path.join(__dirname, '..', 'src', 'lib'),
    '@config': path.join(__dirname, '..', 'src', 'config'),
    '@middlewares': path.join(__dirname, '..', 'src', 'middlewares'),
    '@logs': path.join(process.cwd(), 'logs'),
    '@websockets': path.join(__dirname, '..', 'src', 'websockets'),
    '@modules': path.join(__dirname, '..', 'src', 'modules'),
    '@prisma/client': path.join(__dirname, '..', 'src', 'prisma', 'client.js')
  });

  // Register Prisma runtime alias after @prisma/client alias.
  moduleAlias.addAlias('@prisma/client/runtime', path.join(prismaClientPath, 'runtime'));
} catch (err) {
  console.error('Failed to register module aliases:', err);
  process.exit(1);
}

// Register module-scoped aliases
try {
  const { registerAllModuleAliases } = require('@lib/aliases');
  registerAllModuleAliases();
} catch (err) {
  console.warn('Failed to register module aliases (may not be critical):', err.message);
}

const prisma = require('@prisma/client');

const PROTECTED_TABLES = new Set(['_prisma_migrations']);

const normalizeTableName = (row) =>
  row?.TABLE_NAME || row?.table_name || row?.tableName || row?.Table_name || null;

const clearDemoData = async ({ dryRun = false } = {}) => {
  const rows = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_type = 'BASE TABLE'
  `;

  const allTables = rows
    .map(normalizeTableName)
    .filter(Boolean);

  const targetTables = allTables
    .filter((tableName) => !PROTECTED_TABLES.has(tableName))
    .sort((a, b) => a.localeCompare(b));

  if (targetTables.length === 0) {
    console.log('No application tables found to clear.');
    return;
  }

  if (dryRun) {
    console.log('Dry run mode: the following tables would be truncated:');
    targetTables.forEach((tableName) => {
      console.log(`  - ${tableName}`);
    });
    return;
  }

  console.log(`Clearing ${targetTables.length} table(s)...`);

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const tableName of targetTables) {
      const safeTableName = tableName.replace(/`/g, '');
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${safeTableName}\``);
      console.log(`  - truncated ${safeTableName}`);
    }
  } finally {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log('Database data cleared successfully.');
};

const main = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await clearDemoData({ dryRun });
  } catch (error) {
    console.error('Failed to clear database data:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main();
}

module.exports = { clearDemoData };

