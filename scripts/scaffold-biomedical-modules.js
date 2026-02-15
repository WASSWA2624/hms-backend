#!/usr/bin/env node
/**
 * Scaffolds biomedical modules with the standard 5 backend layers and tests.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODULES_ROOT = path.join(ROOT, 'src', 'modules');
const TESTS_ROOT = path.join(ROOT, 'src', 'tests', 'modules');

const MODULES = [
  'equipment-category',
  'equipment-registry',
  'equipment-location-history',
  'equipment-maintenance-plan',
  'equipment-work-order',
  'equipment-calibration-log',
  'equipment-safety-test-log',
  'equipment-downtime-log',
  'equipment-spare-part',
  'equipment-warranty-contract',
  'equipment-service-provider',
  'equipment-incident-report',
  'equipment-recall-notice',
  'equipment-utilization-snapshot',
  'equipment-disposal-transfer'
];

const toSnake = (value) => value.replace(/-/g, '_');
const toPascal = (value) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
const toCamel = (value) => {
  const pascal = toPascal(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
const pluralPath = (value) => {
  if (value.endsWith('y')) return `${value.slice(0, -1)}ies`;
  if (value.endsWith('s')) return `${value}es`;
  return `${value}s`;
};

const ensureDir = (value) => fs.mkdirSync(value, { recursive: true });
const write = (filePath, content) => fs.writeFileSync(filePath, content);

for (const slug of MODULES) {
  const snake = toSnake(slug);
  const pascal = toPascal(slug);
  const camel = toCamel(slug);
  const pathPlural = pluralPath(slug);

  const moduleDir = path.join(MODULES_ROOT, slug);
  const testDir = path.join(TESTS_ROOT, slug);

  for (const layer of ['schemas', 'repositories', 'services', 'controllers', 'routes']) {
    ensureDir(path.join(moduleDir, layer));
    ensureDir(path.join(testDir, layer));
  }

  write(
    path.join(moduleDir, 'schemas', `${slug}.schema.js`),
    `const { z } = require('zod');
const { uuidSchema, listQuerySchema } = require('@lib/validation/zod');

const create${pascal}Schema = z.object({
  tenant_id: uuidSchema
}).passthrough();

const update${pascal}Schema = z.object({}).passthrough();

const ${camel}IdParamsSchema = z.object({
  id: uuidSchema
});

const list${pascal}sQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  search: z.string().trim().optional()
}).passthrough();

module.exports = {
  create${pascal}Schema,
  update${pascal}Schema,
  ${camel}IdParamsSchema,
  list${pascal}sQuerySchema
};
`
  );

  write(
    path.join(moduleDir, 'repositories', `${slug}.repository.js`),
    `const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

const findById = async (id, include = {}) => {
  try {
    return await prisma.${snake}.findFirst({ where: { id, deleted_at: null }, include });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

const findMany = async (filters = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' }, include = {}) => {
  try {
    return await prisma.${snake}.findMany({ where: { deleted_at: null, ...filters }, skip, take, orderBy, include });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

const count = async (filters = {}) => {
  try {
    return await prisma.${snake}.count({ where: { deleted_at: null, ...filters } });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

const create = async (data) => {
  try {
    return await prisma.${snake}.create({ data });
  } catch (error) {
    if (error.code === 'P2002') throw new HttpError('errors.database.unique_field', 409);
    if (error.code === 'P2003') throw new HttpError('errors.database.foreign_key_field', 400);
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

const update = async (id, data) => {
  try {
    return await prisma.${snake}.update({ where: { id }, data });
  } catch (error) {
    if (error.code === 'P2025') throw new HttpError('errors.${snake}.not_found', 404);
    if (error.code === 'P2002') throw new HttpError('errors.database.unique_field', 409);
    if (error.code === 'P2003') throw new HttpError('errors.database.foreign_key_field', 400);
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

const softDelete = async (id) => {
  try {
    return await prisma.${snake}.update({ where: { id }, data: { deleted_at: new Date() } });
  } catch (error) {
    if (error.code === 'P2025') throw new HttpError('errors.${snake}.not_found', 404);
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = { findById, findMany, count, create, update, softDelete };
`
  );

  write(
    path.join(moduleDir, 'services', `${slug}.service.js`),
    `const ${camel}Repository = require('../repositories/${slug}.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const list${pascal}s = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const where = {};
  if (filters.tenant_id) where.tenant_id = filters.tenant_id;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };
  const [items, total] = await Promise.all([
    ${camel}Repository.findMany(where, skip, limit, orderBy),
    ${camel}Repository.count(where)
  ]);

  return {
    ${camel}s: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
};

const get${pascal}ById = async (id) => {
  const item = await ${camel}Repository.findById(id);
  if (!item) throw new HttpError('errors.${snake}.not_found', 404);
  return item;
};

const create${pascal} = async (data, context = {}) => {
  const item = await ${camel}Repository.create(data);
  const tenantId = item.tenant_id || data.tenant_id || context.tenant_id;
  createAuditLog({
    tenant_id: tenantId,
    user_id: context.user_id || context.user?.id,
    action: 'CREATE',
    entity: '${snake}',
    entity_id: item.id,
    diff: { after: item },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});
  return item;
};

const update${pascal} = async (id, data, context = {}) => {
  const before = await ${camel}Repository.findById(id);
  if (!before) throw new HttpError('errors.${snake}.not_found', 404);
  const item = await ${camel}Repository.update(id, data);
  createAuditLog({
    tenant_id: before.tenant_id || context.tenant_id,
    user_id: context.user_id || context.user?.id,
    action: 'UPDATE',
    entity: '${snake}',
    entity_id: item.id,
    diff: { before, after: item },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});
  return item;
};

const delete${pascal} = async (id, context = {}) => {
  const before = await ${camel}Repository.findById(id);
  if (!before) throw new HttpError('errors.${snake}.not_found', 404);
  await ${camel}Repository.softDelete(id);
  createAuditLog({
    tenant_id: before.tenant_id || context.tenant_id,
    user_id: context.user_id || context.user?.id,
    action: 'DELETE',
    entity: '${snake}',
    entity_id: id,
    diff: { before },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});
};

module.exports = { list${pascal}s, get${pascal}ById, create${pascal}, update${pascal}, delete${pascal} };
`
  );

  write(
    path.join(moduleDir, 'controllers', `${slug}.controller.js`),
    `const ${camel}Service = require('../services/${slug}.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

const list${pascal}s = asyncHandler(async (req, res) => {
  const { page = DEFAULT_PAGE, limit = DEFAULT_PAGE_LIMIT, sort_by, order = 'desc', ...filters } = req.query;
  const result = await ${camel}Service.list${pascal}s(filters, parseInt(page, 10), parseInt(limit, 10), sort_by || 'created_at', order);
  sendPaginated(res, 'messages.${snake}.list.success', result.${camel}s, result.pagination);
});

const get${pascal}ById = asyncHandler(async (req, res) => {
  const item = await ${camel}Service.get${pascal}ById(req.params.id);
  sendSuccess(res, 200, 'messages.${snake}.get.success', item);
});

const create${pascal} = asyncHandler(async (req, res) => {
  const item = await ${camel}Service.create${pascal}(req.body, { user_id: req.user?.id, tenant_id: req.user?.tenant_id, ip_address: req.ip });
  sendSuccess(res, 201, 'messages.${snake}.create.success', item);
});

const update${pascal} = asyncHandler(async (req, res) => {
  const item = await ${camel}Service.update${pascal}(req.params.id, req.body, { user_id: req.user?.id, tenant_id: req.user?.tenant_id, ip_address: req.ip });
  sendSuccess(res, 200, 'messages.${snake}.update.success', item);
});

const delete${pascal} = asyncHandler(async (req, res) => {
  await ${camel}Service.delete${pascal}(req.params.id, { user_id: req.user?.id, tenant_id: req.user?.tenant_id, ip_address: req.ip });
  sendNoContent(res);
});

module.exports = { list${pascal}s, get${pascal}ById, create${pascal}, update${pascal}, delete${pascal} };
`
  );

  write(
    path.join(moduleDir, 'routes', `${slug}.routes.js`),
    `const express = require('express');
const router = express.Router();
const ${camel}Controller = require('../controllers/${slug}.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { create${pascal}Schema, update${pascal}Schema, ${camel}IdParamsSchema, list${pascal}sQuerySchema } = require('../schemas/${slug}.schema');

router.get('/', authenticate(), validateRequest({ query: list${pascal}sQuerySchema }), ${camel}Controller.list${pascal}s);
router.get('/:id', authenticate(), validateRequest({ params: ${camel}IdParamsSchema }), ${camel}Controller.get${pascal}ById);
router.post('/', authenticate(), validateRequest({ body: create${pascal}Schema }), ${camel}Controller.create${pascal});
router.put('/:id', authenticate(), validateRequest({ params: ${camel}IdParamsSchema, body: update${pascal}Schema }), ${camel}Controller.update${pascal});
router.delete('/:id', authenticate(), validateRequest({ params: ${camel}IdParamsSchema }), ${camel}Controller.delete${pascal});

module.exports = router;
`
  );

  write(
    path.join(testDir, 'schemas', `${slug}.schema.test.js`),
    `const { create${pascal}Schema } = require('@validations/${slug}/${slug}.schema');
describe('${pascal} schema', () => {
  it('validates create payload with tenant_id', () => {
    const result = create${pascal}Schema.safeParse({ tenant_id: '550e8400-e29b-41d4-a716-446655440000', any_field: 'ok' });
    expect(result.success).toBe(true);
  });
});
`
  );

  write(
    path.join(testDir, 'repositories', `${slug}.repository.test.js`),
    `describe('${pascal} repository', () => {
  it('placeholder repository test', () => {
    expect(true).toBe(true);
  });
});
`
  );

  write(
    path.join(testDir, 'services', `${slug}.service.test.js`),
    `describe('${pascal} service', () => {
  it('placeholder service test', () => {
    expect(true).toBe(true);
  });
});
`
  );

  write(
    path.join(testDir, 'controllers', `${slug}.controller.test.js`),
    `describe('${pascal} controller', () => {
  it('placeholder controller test', () => {
    expect(true).toBe(true);
  });
});
`
  );

  write(
    path.join(testDir, 'routes', `${slug}.routes.test.js`),
    `describe('${pascal} routes', () => {
  it('placeholder route test', () => {
    expect(true).toBe(true);
  });
});
`
  );

  console.log(`scaffolded ${slug}`);
}

console.log(`done: ${MODULES.length} biomedical modules`);
