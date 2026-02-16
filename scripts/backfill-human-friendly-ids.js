/**
 * Backfill human-friendly IDs for all Prisma models that use UUID primary keys.
 *
 * Usage:
 *   node scripts/backfill-human-friendly-ids.js
 *
 * Notes:
 * - This script is idempotent for rows that already have standard IDs.
 * - IDs are generated in batches to avoid loading full tables into memory.
 * - Role-specific prefixes/scopes are applied to `user_role` rows.
 */

require('module-alias/register');
const path = require('path');

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
    '@prisma/client': path.join(__dirname, '..', 'src', 'prisma', 'client.js'),
  });

  const prismaRuntimePath = path.join(prismaClientPath, 'runtime');
  moduleAlias.addAlias('@prisma/client/runtime', prismaRuntimePath);
} catch (error) {
  console.error('Failed to register module aliases:', error);
  process.exit(1);
}

try {
  const { registerAllModuleAliases } = require('@lib/aliases');
  registerAllModuleAliases();
} catch (error) {
  console.warn('Failed to register module aliases (may not be critical):', error.message);
}

const prisma = require('@prisma/client');
const actualPrisma = require(path.resolve(process.cwd(), 'node_modules', '@prisma', 'client'));

const BATCH_SIZE = 100;
const FRIENDLY_ID_PREFIX_LENGTH = 3;
const DEFAULT_FRIENDLY_ID_PADDING = 7;
const FRIENDLY_ID_COUNTER_RETRIES = 3;
const FRIENDLY_ID_REGEX = /^[A-Z]{3}\d{7}$/;

const MODEL_PREFIX_OVERRIDES = Object.freeze({
  tenant: 'TEN',
  facility: 'FAC',
  branch: 'BRA',
  department: 'DEP',
  unit: 'UNI',
  ward: 'WRD',
  room: 'ROM',
  bed: 'BED',
  user: 'USR',
  user_profile: 'UPR',
  user_role: 'URO',
  staff_position: 'SPO',
  patient: 'PAT',
  staff_profile: 'STF',
  appointment: 'APT',
  encounter: 'ENC',
  admission: 'ADM',
  invoice: 'INV',
  payment: 'PAY',
  role: 'ROL',
  permission: 'PER',
});

const ROLE_PREFIX_MAP = Object.freeze({
  SUPER_ADMIN: 'SUP',
  TENANT_ADMIN: 'TEN',
  FACILITY_ADMIN: 'FAC',
  HR: 'HRM',
  DOCTOR: 'DOC',
  NURSE: 'NUR',
  LAB_TECH: 'LAB',
  PHARMACIST: 'PHA',
  RECEPTIONIST: 'REC',
  BILLING: 'BIL',
  OPERATIONS: 'OPR',
  PATIENT: 'PAT',
  BIOMED: 'BIO',
  HOUSE_KEEPER: 'HOU',
  OTHER: 'OTH',
});

const FACILITY_SCOPED_ROLES = new Set([
  'DOCTOR',
  'NURSE',
  'LAB_TECH',
  'PHARMACIST',
  'RECEPTIONIST',
  'OPERATIONS',
  'HR',
  'BIOMED',
  'HOUSE_KEEPER',
]);

const SYSTEM_MODELS = new Set(['human_id_counter']);
const isFriendlyId = (value) => typeof value === 'string' && FRIENDLY_ID_REGEX.test(value);

const normalizePrefix = (value) =>
  (String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, FRIENDLY_ID_PREFIX_LENGTH)
    .padEnd(FRIENDLY_ID_PREFIX_LENGTH, 'X'));

const deriveModelPrefix = (model) => {
  if (!model) return 'XXX';
  if (MODEL_PREFIX_OVERRIDES[model]) return normalizePrefix(MODEL_PREFIX_OVERRIDES[model]);

  const alphaNumericModelName = String(model).replace(/[^a-zA-Z0-9]/g, '');
  return normalizePrefix(alphaNumericModelName);
};

const formatFriendlyId = (prefix, sequence) => {
  const safePrefix = normalizePrefix(prefix);
  return `${safePrefix}${String(sequence).padStart(DEFAULT_FRIENDLY_ID_PADDING, '0')}`;
};

const buildScopeKey = (model, row, roleName, prefix) => {
  if (model === 'user_role' && roleName) {
    if (FACILITY_SCOPED_ROLES.has(roleName) && typeof row.facility_id === 'string' && row.facility_id) {
      return `facility:${row.facility_id}:role:${roleName}:prefix:${prefix}`;
    }
    if (typeof row.tenant_id === 'string' && row.tenant_id) {
      return `tenant:${row.tenant_id}:role:${roleName}:prefix:${prefix}`;
    }
    return `global:role:${roleName}:prefix:${prefix}`;
  }

  if (typeof row.facility_id === 'string' && row.facility_id) {
    return `facility:${row.facility_id}:model:${model}:prefix:${prefix}`;
  }

  if (typeof row.tenant_id === 'string' && row.tenant_id) {
    return `tenant:${row.tenant_id}:model:${model}:prefix:${prefix}`;
  }

  return `global:model:${model}:prefix:${prefix}`;
};

const reserveNextFriendlySequence = async (model, prefix, scopeKey, retryCount = 0) => {
  try {
    const counter = await prisma.human_id_counter.upsert({
      where: {
        model_name_prefix_scope_key: {
          model_name: model,
          prefix,
          scope_key: scopeKey,
        },
      },
      create: {
        model_name: model,
        prefix,
        scope_key: scopeKey,
        last_value: 1,
      },
      update: {
        last_value: {
          increment: 1,
        },
      },
      select: {
        last_value: true,
      },
    });

    return counter.last_value;
  } catch (error) {
    if (error?.code === 'P2002' && retryCount < FRIENDLY_ID_COUNTER_RETRIES) {
      return reserveNextFriendlySequence(model, prefix, scopeKey, retryCount + 1);
    }
    throw error;
  }
};

const roleNameCache = new Map();

const resolveRoleName = async (roleId) => {
  if (!roleId) return null;
  if (roleNameCache.has(roleId)) return roleNameCache.get(roleId);

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { name: true },
  });

  const roleName = role?.name || null;
  roleNameCache.set(roleId, roleName);
  return roleName;
};

const backfillModel = async (modelMeta) => {
  const model = modelMeta.name;

  if (SYSTEM_MODELS.has(model)) return { model, updated: 0 };

  const delegate = prisma[model];
  if (!delegate || typeof delegate.findMany !== 'function' || typeof delegate.update !== 'function') {
    return { model, updated: 0 };
  }

  const fields = new Set(modelMeta.fields.map((field) => field.name));
  if (!fields.has('id') || !fields.has('human_friendly_id')) {
    return { model, updated: 0 };
  }

  const select = {
    id: true,
    human_friendly_id: true,
  };

  if (fields.has('tenant_id')) select.tenant_id = true;
  if (fields.has('facility_id')) select.facility_id = true;
  if (model === 'user_role' && fields.has('role_id')) select.role_id = true;

  const orderBy = { id: 'asc' };
  let cursorId = null;
  let updated = 0;

  while (true) {
    const rows = await delegate.findMany({
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select,
      orderBy,
      take: BATCH_SIZE,
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      let roleName = null;
      if (model === 'user_role') {
        roleName = await resolveRoleName(row.role_id);
      }

      const currentFriendlyId =
        typeof row.human_friendly_id === 'string' ? row.human_friendly_id.trim().toUpperCase() : null;
      if (isFriendlyId(currentFriendlyId)) {
        continue;
      }

      const prefix = normalizePrefix(roleName ? ROLE_PREFIX_MAP[roleName] || roleName : deriveModelPrefix(model));
      const scopeKey = buildScopeKey(model, row, roleName, prefix);
      const sequence = await reserveNextFriendlySequence(model, prefix, scopeKey);
      const humanFriendlyId = formatFriendlyId(prefix, sequence);

      await delegate.update({
        where: { id: row.id },
        data: {
          human_friendly_id: humanFriendlyId,
        },
      });

      updated += 1;
    }

    cursorId = rows[rows.length - 1].id;
  }

  return { model, updated };
};

const main = async () => {
  const models = actualPrisma.Prisma.dmmf.datamodel.models;

  console.log(`Starting human-friendly ID backfill for ${models.length} models...\n`);

  let totalUpdated = 0;
  for (const modelMeta of models) {
    const result = await backfillModel(modelMeta);
    if (result.updated > 0) {
      console.log(`- ${result.model}: updated ${result.updated} rows`);
      totalUpdated += result.updated;
    }
  }

  console.log(`\nBackfill complete. Total rows updated: ${totalUpdated}`);
};

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('Backfill failed:', error);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { main };
