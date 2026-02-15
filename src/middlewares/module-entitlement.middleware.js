/**
 * Module entitlement middleware
 *
 * Enforces free-core vs paid-module access for tenant-scoped requests.
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;

const entitlementCache = new Map();
const moduleExistenceCache = new Map();
const subscriptionStateCache = new Map();

const ELEVATED_ROLES = new Set([
  'SUPER_ADMIN',
  'SYSTEM_ADMIN',
  'PLATFORM_ADMIN'
]);

// Free core modules available across all plans.
const FREE_CORE_MODULES = new Set([
  'tenant',
  'user-session',
  'facility',
  'branch',
  'department',
  'unit',
  'room',
  'ward',
  'bed',
  'address',
  'contact',
  'user',
  'user-profile',
  'role',
  'permission',
  'role-permission',
  'user-role',
  'user-mfa',
  'oauth-account',
  'api-key',
  'api-key-permission',
  'patient',
  'patient-identifier',
  'patient-contact',
  'patient-guardian',
  'appointment',
  'appointment-participant',
  'appointment-reminder',
  'provider-schedule',
  'availability-slot',
  'visit-queue',
  'encounter',
  'clinical-note',
  'vital-sign',
  'invoice',
  'invoice-item',
  'payment',
  'notification',
  'notification-delivery',
  'template',
  'template-variable',
  'report-definition',
  'report-run',
  'dashboard-widget',
  'kpi-snapshot',
  'module',
  'module-subscription',
  'subscription',
  'subscription-plan',
  'subscription-invoice',
  'license',
  'maintenance-request',
  'equipment-incident-report',
  'asset',
  'asset-service-log'
]);

const IRREGULAR_PATH_SEGMENTS = {
  diagnoses: 'diagnosis'
};

const trimExpiredEntries = (cache) => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (!entry || entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
};

const enforceCacheLimit = (cache) => {
  if (cache.size <= CACHE_MAX_ENTRIES) return;

  trimExpiredEntries(cache);
  if (cache.size <= CACHE_MAX_ENTRIES) return;

  // Remove oldest entries first (Map iteration order is insertion order)
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
};

const getCached = (cache, key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.value;
};

const setCached = (cache, key, value) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
  enforceCacheLimit(cache);
};

const normalizeSegmentToModuleSlug = (segment) => {
  const normalized = String(segment || '').trim().toLowerCase();
  if (!normalized) return null;

  if (IRREGULAR_PATH_SEGMENTS[normalized]) {
    return IRREGULAR_PATH_SEGMENTS[normalized];
  }

  if (normalized.endsWith('ies')) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith('sses')) {
    return normalized.slice(0, -2);
  }

  if (normalized.endsWith('s')) {
    return normalized.slice(0, -1);
  }

  return normalized;
};

const resolveModuleSlugFromPath = (reqPath) => {
  const normalizedPath = String(reqPath || '').trim();
  if (!normalizedPath || normalizedPath === '/' || normalizedPath === '.') return null;

  const rawSegment = normalizedPath.replace(/^\/+/, '').split('/')[0];
  return normalizeSegmentToModuleSlug(rawSegment);
};

const hasElevatedRole = (roles = []) =>
  Array.isArray(roles) &&
  roles.some((role) => ELEVATED_ROLES.has(String(role || '').toUpperCase()));

const moduleExists = async (moduleSlug) => {
  const cacheKey = `module:${moduleSlug}`;
  const cached = getCached(moduleExistenceCache, cacheKey);
  if (cached !== null) return cached;

  const record = await prisma.module.findFirst({
    where: {
      name: moduleSlug,
      deleted_at: null
    },
    select: { id: true }
  });

  const exists = Boolean(record);
  setCached(moduleExistenceCache, cacheKey, exists);
  return exists;
};

const tenantHasModuleAccess = async (tenantId, moduleSlug) => {
  const cacheKey = `${tenantId}:${moduleSlug}`;
  const cached = getCached(entitlementCache, cacheKey);
  if (cached !== null) return cached;

  const entitlement = await prisma.module_subscription.findFirst({
    where: {
      deleted_at: null,
      is_active: true,
      module: {
        name: moduleSlug,
        deleted_at: null
      },
      subscription: {
        tenant_id: tenantId,
        deleted_at: null,
        status: { in: ['ACTIVE', 'TRIAL'] },
        OR: [
          { end_date: null },
          { end_date: { gte: new Date() } }
        ]
      }
    },
    select: { id: true }
  });

  const allowed = Boolean(entitlement);
  setCached(entitlementCache, cacheKey, allowed);
  return allowed;
};

const tenantHasActiveSubscription = async (tenantId) => {
  const cacheKey = `tenant-subscription:${tenantId}`;
  const cached = getCached(subscriptionStateCache, cacheKey);
  if (cached !== null) return cached;

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      status: { in: ['ACTIVE', 'TRIAL'] },
      OR: [
        { end_date: null },
        { end_date: { gte: new Date() } }
      ]
    },
    select: { id: true }
  });

  const hasActiveSubscription = Boolean(activeSubscription);
  setCached(subscriptionStateCache, cacheKey, hasActiveSubscription);
  return hasActiveSubscription;
};

const enforceModuleEntitlement = () => async (req, res, next) => {
  try {
    const moduleSlug = resolveModuleSlugFromPath(req.path);
    if (!moduleSlug) return next();

    if (FREE_CORE_MODULES.has(moduleSlug)) return next();

    const user = req.user || {};
    const tenantId = user.tenant_id || user.tenantId || null;
    if (!tenantId) return next();

    if (hasElevatedRole(user.roles)) return next();

    // Backward-compatible mode: if tenant has no active/trial subscription yet,
    // do not block module access.
    const hasSubscription = await tenantHasActiveSubscription(tenantId);
    if (!hasSubscription) return next();

    const knownModule = await moduleExists(moduleSlug);

    // Fail open only when module metadata has not been created yet.
    if (!knownModule) return next();

    const allowed = await tenantHasModuleAccess(tenantId, moduleSlug);
    if (!allowed) {
      return next(new HttpError('errors.auth.module_not_entitled', 403, [
        { tenant_id: tenantId, module: moduleSlug }
      ]));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  enforceModuleEntitlement
};
