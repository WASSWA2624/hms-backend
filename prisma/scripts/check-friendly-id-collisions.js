#!/usr/bin/env node
/* eslint-disable no-console */

const prisma = require('../../src/prisma/client');

const CORE_TABLES = [
  { model: 'user', scope: ['tenant_id'] },
  { model: 'staff_profile', scope: ['tenant_id'] },
  { model: 'staff_position', scope: ['tenant_id'] },
  { model: 'patient', scope: ['tenant_id'] },
  { model: 'appointment', scope: ['tenant_id'] },
  { model: 'visit_queue', scope: ['tenant_id'] },
  { model: 'encounter', scope: ['tenant_id'] },
  { model: 'provider_schedule', scope: ['tenant_id'] },
  { model: 'availability_slot', scope: ['schedule_id'] },
];

const normalizeFriendlyId = (value) => String(value || '').trim().toUpperCase();

const buildScopeKey = (row, scopeFields) =>
  scopeFields.map((field) => String(row[field] || '')).join('|');

const checkTable = async ({ model, scope }) => {
  const delegate = prisma[model];
  if (!delegate?.findMany) {
    throw new Error(`Prisma model "${model}" is not available`);
  }

  const select = {
    id: true,
    human_friendly_id: true,
    created_at: true,
    deleted_at: true,
  };
  for (const field of scope) {
    select[field] = true;
  }

  const rows = await delegate.findMany({
    where: {
      deleted_at: null,
      human_friendly_id: {
        not: null,
      },
    },
    select,
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
  });

  const keyToRows = new Map();
  for (const row of rows) {
    const normalizedFriendlyId = normalizeFriendlyId(row.human_friendly_id);
    if (!normalizedFriendlyId) continue;
    const scopeKey = buildScopeKey(row, scope);
    const key = `${scopeKey}|${normalizedFriendlyId}`;
    const existing = keyToRows.get(key) || [];
    existing.push(row);
    keyToRows.set(key, existing);
  }

  const collisions = [];
  for (const entries of keyToRows.values()) {
    if (entries.length <= 1) continue;
    collisions.push(entries);
  }

  return {
    model,
    scope,
    totalRows: rows.length,
    collisionGroups: collisions.length,
    collisions,
  };
};

const main = async () => {
  try {
    const results = [];
    for (const table of CORE_TABLES) {
      const result = await checkTable(table);
      results.push(result);
    }

    const totalGroups = results.reduce((sum, item) => sum + item.collisionGroups, 0);
    const totalRows = results.reduce(
      (sum, item) => sum + item.collisions.reduce((acc, group) => acc + group.length, 0),
      0
    );

    console.log('Friendly ID collision report (core tables)');
    console.log(`Collision groups: ${totalGroups}`);
    console.log(`Colliding rows: ${totalRows}`);
    console.log('');

    for (const result of results) {
      if (result.collisionGroups === 0) continue;
      console.log(
        `- ${result.model} (${result.scope.join(', ')}): ${result.collisionGroups} groups`
      );
      for (const group of result.collisions) {
        const sample = group[0];
        const scopeLabel = result.scope
          .map((field) => `${field}=${String(sample[field] || '')}`)
          .join(', ');
        const hfid = normalizeFriendlyId(sample.human_friendly_id);
        const ids = group.map((row) => row.id).join(', ');
        console.log(`  ${scopeLabel}; human_friendly_id=${hfid}; rows=[${ids}]`);
      }
      console.log('');
    }

    if (totalGroups === 0) {
      console.log('No collisions found.');
    } else {
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(`Collision check failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
};

main();
