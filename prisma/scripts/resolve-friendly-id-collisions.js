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

const MAX_FRIENDLY_ID_LENGTH = 32;

const normalizeFriendlyId = (value) => String(value || '').trim().toUpperCase();
const buildScopeKey = (row, scopeFields) =>
  scopeFields.map((field) => String(row[field] || '')).join('|');

const buildCandidate = (base, ordinal) => {
  const suffix = `_${String(ordinal).padStart(2, '0')}`;
  const allowedBaseLength = MAX_FRIENDLY_ID_LENGTH - suffix.length;
  const trimmedBase = base.slice(0, Math.max(1, allowedBaseLength));
  return `${trimmedBase}${suffix}`;
};

const resolveTable = async ({ model, scope }) => {
  const delegate = prisma[model];
  if (!delegate?.findMany || !delegate?.update) {
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

  const scopeToUsed = new Map();
  const keyToRows = new Map();

  for (const row of rows) {
    const normalizedFriendlyId = normalizeFriendlyId(row.human_friendly_id);
    if (!normalizedFriendlyId) continue;

    const scopeKey = buildScopeKey(row, scope);
    const used = scopeToUsed.get(scopeKey) || new Set();
    used.add(normalizedFriendlyId);
    scopeToUsed.set(scopeKey, used);

    const collisionKey = `${scopeKey}|${normalizedFriendlyId}`;
    const existing = keyToRows.get(collisionKey) || [];
    existing.push(row);
    keyToRows.set(collisionKey, existing);
  }

  let updates = 0;
  for (const entries of keyToRows.values()) {
    if (entries.length <= 1) continue;

    const first = entries[0];
    const scopeKey = buildScopeKey(first, scope);
    const baseFriendlyId = normalizeFriendlyId(first.human_friendly_id);
    const used = scopeToUsed.get(scopeKey) || new Set();

    for (let index = 1; index < entries.length; index += 1) {
      const row = entries[index];
      let ordinal = index + 1;
      let candidate = buildCandidate(baseFriendlyId, ordinal);

      while (used.has(candidate)) {
        ordinal += 1;
        candidate = buildCandidate(baseFriendlyId, ordinal);
      }

      await delegate.update({
        where: { id: row.id },
        data: { human_friendly_id: candidate },
      });

      used.add(candidate);
      updates += 1;
      console.log(
        `[${model}] updated ${row.id}: ${normalizeFriendlyId(row.human_friendly_id)} -> ${candidate}`
      );
    }
  }

  return updates;
};

const main = async () => {
  try {
    let totalUpdates = 0;
    for (const table of CORE_TABLES) {
      const updates = await resolveTable(table);
      totalUpdates += updates;
    }

    console.log(`Collision resolution complete. Updated rows: ${totalUpdates}`);
  } catch (error) {
    console.error(`Collision resolution failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
};

main();
