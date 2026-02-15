/**
 * Tenant and facility scope middleware
 *
 * Ensures authenticated request context has consistent scope values and prevents
 * cross-tenant/facility/branch access via crafted query/body values.
 */

const { HttpError } = require('@lib/errors');
const { normalizeUserContext } = require('@middlewares/auth.middleware');

const SCOPE_FIELDS = ['tenant_id', 'facility_id', 'branch_id'];
const ELEVATED_ROLES = new Set(['SUPER_ADMIN', 'SYSTEM_ADMIN', 'PLATFORM_ADMIN']);

const hasElevatedRole = (roles = []) =>
  Array.isArray(roles) &&
  roles.some((role) => ELEVATED_ROLES.has(String(role || '').toUpperCase()));

const toCamelCase = (snakeCase) =>
  String(snakeCase).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const getFromObject = (obj, field) => {
  if (!obj || typeof obj !== 'object') return null;

  const camelField = toCamelCase(field);
  const value = obj[field] ?? obj[camelField];
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const setOnObjectIfMissing = (obj, field, value) => {
  if (!obj || typeof obj !== 'object') return;
  if (obj[field] !== undefined && obj[field] !== null && obj[field] !== '') return;

  const camelField = toCamelCase(field);
  if (obj[camelField] !== undefined && obj[camelField] !== null && obj[camelField] !== '') return;

  obj[field] = value;
};

const ensureFieldMatchesScope = (req, sourceObject, field) => {
  const expected = getFromObject(req.user, field);
  if (!expected) return;

  const provided = getFromObject(sourceObject, field);
  if (provided && provided !== expected) {
    throw new HttpError('errors.auth.scope_mismatch', 403, [
      { field, expected, provided }
    ]);
  }
};

/**
 * Hydrate request-level scope helpers from authenticated user context.
 */
const hydrateRequestScope = () => (req, res, next) => {
  try {
    if (!req.user) return next();

    req.user = normalizeUserContext(req.user);

    const tenantId = req.user.tenant_id || null;
    const facilityId = req.user.facility_id || null;
    const branchId = req.user.branch_id || null;

    req.tenant = tenantId ? { id: tenantId } : null;
    req.facility = facilityId ? { id: facilityId } : null;
    req.branch = branchId ? { id: branchId } : null;

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Enforce tenant/facility/branch scope consistency for query/body payloads.
 */
const enforceTenantScope = () => (req, res, next) => {
  try {
    if (!req.user) return next();
    if (hasElevatedRole(req.user.roles)) return next();

    for (const field of SCOPE_FIELDS) {
      ensureFieldMatchesScope(req, req.query, field);
      ensureFieldMatchesScope(req, req.body, field);
    }

    // Inject canonical scope values when not provided.
    for (const field of SCOPE_FIELDS) {
      const expected = getFromObject(req.user, field);
      if (!expected) continue;

      setOnObjectIfMissing(req.query, field, expected);
      setOnObjectIfMissing(req.body, field, expected);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  hydrateRequestScope,
  enforceTenantScope
};
