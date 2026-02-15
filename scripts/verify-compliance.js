#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();

const REQUIRED_PATHS = [
  'src/app/router.js',
  'prisma/schema.prisma',
  'src/locales/en.json',
  'dev-plan/P009_models.mdc',
  'dev-plan/P010_api_endpoints.mdc',
  'dev-plan/P011_modules.mdc'
];

const missing = REQUIRED_PATHS.filter((relativePath) => {
  const absolutePath = path.join(ROOT, relativePath);
  return !fs.existsSync(absolutePath);
});

if (missing.length > 0) {
  console.error('Compliance check failed: required files are missing');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

const syncCheck = spawnSync('node', ['scripts/verify-writeup-sync.js'], {
  cwd: ROOT,
  stdio: 'inherit'
});

if (syncCheck.status !== 0) {
  console.error('Compliance check failed: write-up sync verification did not pass.');
  process.exit(syncCheck.status || 1);
}

console.log('Compliance check passed.');
