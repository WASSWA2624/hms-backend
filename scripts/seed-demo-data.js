/**
 * Seed Demo Data Script
 *
 * Seeds demo records across seedable models (target ~50 records/model by default).
 * Tenants, facilities, and users are prepared via setup-default-accounts.js.
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 *   node scripts/seed-demo-data.js --skip-default-accounts
 *
 * @module scripts/seed-demo-data
 */

// Must be absolute first - register module aliases before any other requires
require('module-alias/register');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { faker } = require('@faker-js/faker');

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
const env = require('@config/env');
const {
  DEFAULT_SEED_RECORD_COUNT,
  SEED_COUNTS: DEFAULT_SEED_COUNTS
} = require('@config/constants');
const {
  resolveSeedExecutionOrder,
  seedPhase12SupplementalScenarios,
  verifyRequiredModelCoverage
} = require('./seed-phase12-supplemental');

const DEFAULT_TARGET_RECORDS_PER_MODEL = DEFAULT_SEED_RECORD_COUNT;
const DEFAULT_RANDOM_SEED = 20260217;
const MAX_CREATE_ATTEMPTS_MULTIPLIER = 12;
const MAX_CREATE_ATTEMPTS_FLOOR = 80;
const DETERMINISTIC_BASE_TIMESTAMP = Date.UTC(2026, 0, 1, 8, 0, 0);

const EXCLUDED_MODELS = new Set([
  'human_id_counter',
  'tenant',
  'facility',
  'user'
]);

const AUTO_MANAGED_FIELDS = new Set([
  'human_friendly_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'version'
]);

const RETRYABLE_PRISMA_ERROR_CODES = new Set(['P2000', 'P2002', 'P2003', 'P2011', 'P2025']);

const referenceRowsCache = new Map();
const usedFieldValuesCache = new Map();
const sequenceByModel = new Map();
let activeRandomSeed = DEFAULT_RANDOM_SEED;

const isMissingTableError = (error) => error?.code === 'P2021';

const deterministicHashHex = (value) =>
  crypto.createHash('sha256').update(String(value || '')).digest('hex');

const deterministicUuid = (value) => {
  const hex = deterministicHashHex(value);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32)
  ].join('-');
};

const getDeterministicDate = (sequence = 0, minuteOffset = 0) => {
  const seedOffsetMs = (Math.abs(Number(activeRandomSeed) || DEFAULT_RANDOM_SEED) % 100000) * 1000;
  const sequenceOffsetMs = (Number(sequence) + Number(minuteOffset)) * 60 * 1000;
  return new Date(DETERMINISTIC_BASE_TIMESTAMP + seedOffsetMs + sequenceOffsetMs);
};

const stripInlineComment = (line) => {
  const commentStart = line.indexOf('//');
  return commentStart === -1 ? line : line.slice(0, commentStart);
};

const parseSchemaMetadata = (schemaPath) => {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const enumValuesByName = new Map();
  const enumBlocks = [...schema.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
  for (const [, enumName, body] of enumBlocks) {
    const values = [];
    for (const rawLine of body.split(/\r?\n/)) {
      const line = stripInlineComment(rawLine).trim();
      if (!line || line.startsWith('@')) continue;
      const token = line.match(/^(\w+)/);
      if (token) values.push(token[1]);
    }
    enumValuesByName.set(enumName, values);
  }

  const modelBlocks = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
  const modelNames = new Set(modelBlocks.map((entry) => entry[1]));

  const modelsByName = new Map();

  for (const [, modelName, body] of modelBlocks) {
    const fields = [];
    const relationDefinitions = [];

    for (const rawLine of body.split(/\r?\n/)) {
      const line = stripInlineComment(rawLine).trim();
      if (!line || line.startsWith('@@') || line.startsWith('@')) continue;

      const fieldMatch = line.match(/^(\w+)\s+([A-Za-z_][A-Za-z0-9_]*(?:\[\])?\??)\s*(.*)$/);
      if (!fieldMatch) continue;

      const [, fieldName, typeToken, attributes = ''] = fieldMatch;
      const isList = typeToken.endsWith('[]');
      const isOptional = typeToken.endsWith('?');
      const baseType = typeToken.replace(/\[\]|\?/g, '');
      const kind = modelNames.has(baseType)
        ? 'object'
        : enumValuesByName.has(baseType)
          ? 'enum'
          : 'scalar';
      const hasDefault = /@default\(/.test(attributes);
      const isUpdatedAt = /@updatedAt\b/.test(attributes);
      const isId = /@id\b/.test(attributes);
      const isUnique = /@unique\b/.test(attributes);
      const maxLengthMatch = attributes.match(/@db\.VarChar\((\d+)\)/i);
      const maxLength = maxLengthMatch ? Number(maxLengthMatch[1]) : null;

      fields.push({
        name: fieldName,
        type: baseType,
        kind,
        isList,
        isOptional,
        hasDefault,
        isUpdatedAt,
        isId,
        isUnique,
        maxLength,
        attributes
      });

      if (kind === 'object' && /@relation\(/.test(attributes)) {
        const relationArgsMatch = attributes.match(/@relation\((.*)\)/);
        const relationArgs = relationArgsMatch ? relationArgsMatch[1] : '';
        const fromFieldsMatch = relationArgs.match(/fields\s*:\s*\[([^\]]+)\]/);
        const toFieldsMatch = relationArgs.match(/references\s*:\s*\[([^\]]+)\]/);
        if (fromFieldsMatch && toFieldsMatch) {
          const fromFields = fromFieldsMatch[1]
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
          const toFields = toFieldsMatch[1]
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

          if (fromFields.length > 0 && toFields.length > 0) {
            relationDefinitions.push({
              targetModel: baseType,
              fromFields,
              toFields
            });
          }
        }
      }
    }

    const fieldByName = new Map(fields.map((field) => [field.name, field]));
    const relationFromFieldSet = new Set();
    const requiredRelations = [];

    for (const relation of relationDefinitions) {
      const isRequired = relation.fromFields.some((fieldName) => {
        const field = fieldByName.get(fieldName);
        return field ? !field.isOptional : false;
      });

      relation.fromFields.forEach((fieldName) => relationFromFieldSet.add(fieldName));

      if (isRequired) {
        const uniqueSingleField =
          relation.fromFields.length === 1 &&
          Boolean(fieldByName.get(relation.fromFields[0])?.isUnique);

        requiredRelations.push({
          ...relation,
          uniqueSingleField
        });
      }
    }

    modelsByName.set(modelName, {
      name: modelName,
      fields,
      fieldByName,
      relationFromFieldSet,
      requiredRelations
    });
  }

  return {
    enumValuesByName,
    modelsByName
  };
};

const getTopologicalModelOrder = (modelsByName) => {
  const modelNames = [...modelsByName.keys()];
  const depsByModel = new Map();
  const reverseDepsByModel = new Map(modelNames.map((modelName) => [modelName, new Set()]));
  const inDegree = new Map(modelNames.map((modelName) => [modelName, 0]));

  for (const modelName of modelNames) {
    const modelMeta = modelsByName.get(modelName);
    const deps = new Set();
    for (const relation of modelMeta.requiredRelations) {
      if (relation.targetModel !== modelName && modelsByName.has(relation.targetModel)) {
        deps.add(relation.targetModel);
      }
    }
    depsByModel.set(modelName, deps);
  }

  for (const [modelName, deps] of depsByModel.entries()) {
    inDegree.set(modelName, deps.size);
    for (const dependency of deps) {
      reverseDepsByModel.get(dependency)?.add(modelName);
    }
  }

  const queue = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([modelName]) => modelName);
  const ordered = [];

  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(current);

    for (const dependent of reverseDepsByModel.get(current) || []) {
      const nextDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, nextDegree);
      if (nextDegree === 0) queue.push(dependent);
    }
  }

  if (ordered.length < modelNames.length) {
    const remaining = modelNames.filter((modelName) => !ordered.includes(modelName));
    ordered.push(...remaining);
  }

  return ordered;
};

const invalidateModelCaches = (modelName) => {
  for (const key of [...referenceRowsCache.keys()]) {
    if (key.startsWith(`${modelName}:`)) referenceRowsCache.delete(key);
  }
  for (const key of [...usedFieldValuesCache.keys()]) {
    if (key.startsWith(`${modelName}:`)) usedFieldValuesCache.delete(key);
  }
};

const toComparable = (value) => {
  if (value === null || value === undefined) return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getReferenceRows = async (modelName, fields) => {
  const sortedFields = [...new Set(fields)].sort();
  const cacheKey = `${modelName}:${sortedFields.join(',')}`;

  if (referenceRowsCache.has(cacheKey)) {
    return referenceRowsCache.get(cacheKey);
  }

  const delegate = prisma[modelName];
  if (!delegate || typeof delegate.findMany !== 'function') {
    referenceRowsCache.set(cacheKey, []);
    return [];
  }

  const select = {};
  sortedFields.forEach((fieldName) => {
    select[fieldName] = true;
  });

  try {
    const rows = await delegate.findMany({ select });
    referenceRowsCache.set(cacheKey, rows);
    return rows;
  } catch (error) {
    if (isMissingTableError(error)) {
      referenceRowsCache.set(cacheKey, []);
      return [];
    }
    throw error;
  }
};

const getUsedFieldValues = async (modelName, fieldName) => {
  const cacheKey = `${modelName}:${fieldName}`;
  if (usedFieldValuesCache.has(cacheKey)) {
    return usedFieldValuesCache.get(cacheKey);
  }

  const delegate = prisma[modelName];
  if (!delegate || typeof delegate.findMany !== 'function') {
    const empty = new Set();
    usedFieldValuesCache.set(cacheKey, empty);
    return empty;
  }

  let rows = [];
  try {
    rows = await delegate.findMany({
      select: { [fieldName]: true }
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      const empty = new Set();
      usedFieldValuesCache.set(cacheKey, empty);
      return empty;
    }
    throw error;
  }

  const used = new Set(
    rows
      .map((row) => row[fieldName])
      .filter((value) => value !== null && value !== undefined)
      .map((value) => toComparable(value))
  );

  usedFieldValuesCache.set(cacheKey, used);
  return used;
};

const getModelToken = (modelName) =>
  String(modelName || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toLowerCase()
    .padEnd(3, 'x');

const getFieldToken = (fieldName) =>
  String(fieldName || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toLowerCase()
    .padEnd(3, 'x');

const truncateString = (value, maxLength) => {
  if (!maxLength || maxLength <= 0) return value;
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength);
};

const generateStringValue = (field, modelName, sequence) => {
  const fieldName = field.name.toLowerCase();
  const modelToken = getModelToken(modelName);
  const sequenceToken = String(sequence).padStart(6, '0');
  faker.seed(activeRandomSeed + sequence);

  let candidate;
  if (fieldName === 'id') {
    candidate = deterministicUuid(`${modelName}:${field.name}:${sequence}:${activeRandomSeed}`);
  } else if (fieldName.includes('email')) {
    candidate = faker.internet.email({
      firstName: modelToken,
      lastName: sequenceToken,
      provider: 'demo.local'
    }).toLowerCase();
  } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
    candidate = faker.phone.number('+1555#######');
  } else if (fieldName.includes('slug')) {
    candidate = faker.helpers.slugify(`${modelToken}-${sequence}`);
  } else if (fieldName.includes('url') || fieldName.includes('uri') || fieldName.includes('link')) {
    candidate = `https://d.io/${modelToken}${sequence}`;
  } else if (
    fieldName.includes('code') ||
    fieldName.includes('number') ||
    fieldName.endsWith('_no') ||
    fieldName.includes('ref')
  ) {
    candidate = `${modelToken.toUpperCase()}${sequenceToken}`;
  } else if (fieldName.includes('status')) {
    candidate = 'ACTIVE';
  } else if (fieldName.includes('gender')) {
    candidate = 'OTHER';
  } else if (fieldName.includes('name') || fieldName.includes('title')) {
    candidate = faker.person.fullName();
  } else if (fieldName.includes('password')) {
    candidate = 'Demo@123!';
  } else if (fieldName.includes('token')) {
    candidate = faker.string.alphanumeric(32);
  } else if (fieldName.includes('ip')) {
    candidate = `10.0.${sequence % 250}.${(sequence * 7) % 250}`;
  } else if (
    fieldName.includes('description') ||
    fieldName.includes('reason') ||
    fieldName.includes('note')
  ) {
    candidate = faker.lorem.sentence();
  } else {
    candidate = `${getFieldToken(field.name)}${modelToken}${sequenceToken}`;
  }

  const maxLength = field.maxLength || 64;
  return truncateString(candidate, maxLength);
};

const generateFieldValue = (field, modelName, sequence, enumValuesByName) => {
  if (field.kind === 'enum') {
    const values = enumValuesByName.get(field.type) || [];
    if (values.length === 0) return undefined;
    return values[sequence % values.length];
  }

  if (field.kind !== 'scalar') return undefined;

  switch (field.type) {
    case 'String':
      return generateStringValue(field, modelName, sequence);
    case 'Int':
      return sequence;
    case 'BigInt':
      return BigInt(sequence);
    case 'Float':
      return Number(`${(sequence % 1000) + 1}.5`);
    case 'Decimal':
      return Number(`${(sequence % 1000) + 1}.25`);
    case 'Boolean':
      return sequence % 2 === 0;
    case 'DateTime': {
      const lowerFieldName = field.name.toLowerCase();
      if (lowerFieldName.includes('end')) {
        return getDeterministicDate(sequence, 30);
      }
      if (lowerFieldName.includes('start')) {
        return getDeterministicDate(sequence, -45);
      }
      return getDeterministicDate(sequence, -5);
    }
    case 'Json':
      return {
        demo: true,
        model: modelName,
        field: field.name,
        sequence
      };
    case 'Bytes':
      return Buffer.from(`${modelName}_${field.name}_${sequence}`);
    default:
      return undefined;
  }
};

const isCreateRequiredField = (field) => {
  if (field.kind === 'object') return false;
  if (field.isList) return false;
  if (field.isOptional) return false;
  if (field.hasDefault) return false;
  if (field.isUpdatedAt) return false;
  return true;
};

const shouldSkipAutoManagedField = (field) => {
  if (AUTO_MANAGED_FIELDS.has(field.name)) return true;
  if (field.isId && field.hasDefault) return true;
  return false;
};

const getNextSequence = (modelName, baseCount) => {
  if (!sequenceByModel.has(modelName)) {
    sequenceByModel.set(modelName, Math.max(baseCount, 0));
  }

  const next = (sequenceByModel.get(modelName) || 0) + 1;
  sequenceByModel.set(modelName, next);
  return next;
};

const buildRecordData = async (modelMeta, enumValuesByName, currentCount) => {
  const data = {};
  const blockers = [];

  for (const relation of modelMeta.requiredRelations) {
    const targetFields = relation.toFields.length > 0 ? relation.toFields : ['id'];
    const candidates = await getReferenceRows(relation.targetModel, targetFields);
    if (candidates.length === 0) {
      blockers.push(`missing ${relation.targetModel}`);
      continue;
    }

    let selected = null;
    if (relation.uniqueSingleField) {
      const fromField = relation.fromFields[0];
      const toField = targetFields[0];
      const usedValues = await getUsedFieldValues(modelMeta.name, fromField);
      selected = candidates.find((row) => !usedValues.has(toComparable(row[toField])));
      if (!selected) {
        blockers.push(`unique pool exhausted: ${modelMeta.name}.${fromField}`);
        continue;
      }
    } else {
      const sequence = getNextSequence(modelMeta.name, currentCount);
      selected = candidates[sequence % candidates.length];
    }

    relation.fromFields.forEach((fromField, index) => {
      const toField = relation.toFields[index] || relation.toFields[0];
      data[fromField] = selected[toField];
    });
  }

  if (blockers.length > 0) {
    return { blocked: blockers };
  }

  const sequence = getNextSequence(modelMeta.name, currentCount);

  for (const field of modelMeta.fields) {
    if (field.kind === 'object') continue;
    if (modelMeta.relationFromFieldSet.has(field.name)) continue;
    if (shouldSkipAutoManagedField(field)) continue;
    if (!isCreateRequiredField(field)) continue;

    const value = generateFieldValue(field, modelMeta.name, sequence, enumValuesByName);
    if (value === undefined) {
      return {
        error: `Unsupported required field type "${field.type}" for ${modelMeta.name}.${field.name}`
      };
    }

    data[field.name] = value;
  }

  return { data };
};

const seedModel = async (modelMeta, enumValuesByName, targetCount) => {
  const delegate = prisma[modelMeta.name];
  if (!delegate || typeof delegate.create !== 'function' || typeof delegate.count !== 'function') {
    return {
      model: modelMeta.name,
      status: 'skipped',
      reason: 'delegate unavailable',
      created: 0,
      total: 0
    };
  }

  let total = 0;
  try {
    total = await delegate.count();
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        model: modelMeta.name,
        status: 'skipped',
        reason: 'table not found (migration not applied)',
        created: 0,
        total: 0
      };
    }
    throw error;
  }
  if (total >= targetCount) {
    return {
      model: modelMeta.name,
      status: 'ok',
      reason: 'already at target',
      created: 0,
      total
    };
  }

  const needed = targetCount - total;
  const maxAttempts = Math.max(needed * MAX_CREATE_ATTEMPTS_MULTIPLIER, MAX_CREATE_ATTEMPTS_FLOOR);
  let attempts = 0;
  let created = 0;
  let status = 'ok';
  let reason = 'seeded';

  while (created < needed && attempts < maxAttempts) {
    attempts += 1;
    const record = await buildRecordData(modelMeta, enumValuesByName, total + created);

    if (record.blocked) {
      status = 'partial';
      reason = record.blocked.join('; ');
      break;
    }

    if (record.error) {
      status = 'partial';
      reason = record.error;
      break;
    }

    try {
      await delegate.create({ data: record.data });
      created += 1;
      total += 1;
      invalidateModelCaches(modelMeta.name);
    } catch (error) {
      if (isMissingTableError(error)) {
        status = 'skipped';
        reason = 'table not found (migration not applied)';
        break;
      }
      if (RETRYABLE_PRISMA_ERROR_CODES.has(error?.code)) {
        continue;
      }
      status = 'partial';
      reason = `${error?.code || 'UNKNOWN'}: ${error?.message || 'create failed'}`;
      break;
    }
  }

  if (created < needed && status === 'ok') {
    status = 'partial';
    reason = 'attempt limit reached before target';
  }

  return {
    model: modelMeta.name,
    status,
    reason,
    created,
    total
  };
};

const ensureDefaultAccounts = () => {
  console.log('Ensuring tenants/facilities/users via setup-default-accounts.js...');
  execSync('node scripts/setup-default-accounts.js', {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
};

const seedDemoData = async ({
  targetCount = DEFAULT_TARGET_RECORDS_PER_MODEL,
  targetCountsByModel = DEFAULT_SEED_COUNTS,
  randomSeed = DEFAULT_RANDOM_SEED,
  skipDefaultAccounts = false
} = {}) => {
  if (env.NODE_ENV === 'production') {
    console.warn('Skipping seed: NODE_ENV=production');
    return {
      skipped: true,
      reason: 'production_environment'
    };
  }

  referenceRowsCache.clear();
  usedFieldValuesCache.clear();
  sequenceByModel.clear();

  const parsedTarget = Number.parseInt(String(targetCount), 10);
  const safeTargetCount = Number.isFinite(parsedTarget) && parsedTarget >= 0
    ? parsedTarget
    : DEFAULT_TARGET_RECORDS_PER_MODEL;
  const mergedTargetCountsByModel = {
    ...DEFAULT_SEED_COUNTS,
    ...(targetCountsByModel || {})
  };
  const normalizedTargetCountsByModel = Object.entries(mergedTargetCountsByModel).reduce(
    (acc, [modelName, count]) => {
      const parsed = Number.parseInt(String(count), 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        acc[modelName] = parsed;
      }
      return acc;
    },
    {}
  );

  const parsedRandomSeed = Number.parseInt(String(randomSeed), 10);
  activeRandomSeed = Number.isFinite(parsedRandomSeed) ? parsedRandomSeed : DEFAULT_RANDOM_SEED;
  faker.seed(activeRandomSeed);

  if (!skipDefaultAccounts) {
    ensureDefaultAccounts();
  }

  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const { enumValuesByName, modelsByName } = parseSchemaMetadata(schemaPath);
  const topologicalModelOrder = getTopologicalModelOrder(modelsByName);
  const orderedModels = resolveSeedExecutionOrder(topologicalModelOrder);

  const seedableModelNames = orderedModels.filter((modelName) => {
    if (EXCLUDED_MODELS.has(modelName)) return false;
    const delegate = prisma[modelName];
    return Boolean(delegate && typeof delegate.create === 'function' && typeof delegate.count === 'function');
  });

  console.log(`Seeding demo data (target per model: ${safeTargetCount})...`);
  console.log(`Seedable models: ${seedableModelNames.length}`);

  const results = [];
  for (const modelName of seedableModelNames) {
    const modelMeta = modelsByName.get(modelName);
    const modelTargetCount = normalizedTargetCountsByModel[modelName] ?? safeTargetCount;
    const result = await seedModel(modelMeta, enumValuesByName, modelTargetCount);
    results.push(result);

    const statusTag = result.status === 'ok' ? 'OK' : result.status.toUpperCase();
    const summaryReason = result.reason ? ` (${result.reason})` : '';
    console.log(
      `[${statusTag}] ${modelName}: created ${result.created}, total ${result.total}${summaryReason}`
    );
  }

  const supplementalSummary = await seedPhase12SupplementalScenarios({
    randomSeed: activeRandomSeed,
    isMissingTableError
  });

  const coverageSummary = await verifyRequiredModelCoverage({
    isMissingTableError
  });

  const totals = results.reduce(
    (acc, result) => {
      acc.created += result.created;
      if (result.status === 'ok') acc.ok += 1;
      if (result.status === 'partial') acc.partial += 1;
      if (result.status === 'skipped') acc.skipped += 1;
      return acc;
    },
    { created: 0, ok: 0, partial: 0, skipped: 0 }
  );

  console.log('');
  console.log('Demo seeding summary');
  console.log(`- models processed: ${results.length}`);
  console.log(`- models at target/ok: ${totals.ok}`);
  console.log(`- models partial: ${totals.partial}`);
  console.log(`- models skipped: ${totals.skipped}`);
  console.log(`- total records created: ${totals.created}`);
  console.log(`- supplemental scenarios seeded: ${supplementalSummary.skipped ? 0 : supplementalSummary.subscriptionsSeeded || 0}`);
  console.log(`- coverage missing models: ${coverageSummary.missingModels.length}`);
  console.log(`- coverage unavailable models: ${coverageSummary.unavailableModels.length}`);

  if (coverageSummary.missingModels.length > 0) {
    console.warn(`[WARN] Models with zero records: ${coverageSummary.missingModels.join(', ')}`);
  }

  if (coverageSummary.unavailableModels.length > 0) {
    console.warn(`[WARN] Models unavailable for coverage check: ${coverageSummary.unavailableModels.join(', ')}`);
  }

  return {
    skipped: false,
    totals,
    supplementalSummary,
    coverageSummary
  };
};

const main = async () => {
  const skipDefaultAccounts = process.argv.includes('--skip-default-accounts');
  const targetCountFromEnv = env.SEED_RECORD_COUNT || DEFAULT_TARGET_RECORDS_PER_MODEL;
  const randomSeedFromEnv = env.SEED_RANDOM_SEED || DEFAULT_RANDOM_SEED;

  try {
    await seedDemoData({
      targetCount: targetCountFromEnv,
      targetCountsByModel: DEFAULT_SEED_COUNTS,
      randomSeed: randomSeedFromEnv,
      skipDefaultAccounts
    });
  } catch (error) {
    console.error('Failed to seed demo data:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  seedDemoData,
  deterministicUuid,
  getDeterministicDate
};
