const invokeMiddleware = (middleware, req, res = {}) =>
  new Promise((resolve) => {
    middleware(req, res, (error) => resolve(error));
  });

describe('module entitlement middleware', () => {
  let prisma;

  const loadMiddleware = () => {
    jest.resetModules();
    prisma = require('@prisma/client');
    prisma.subscription = { findFirst: jest.fn() };
    prisma.module = { findFirst: jest.fn() };
    prisma.module_subscription = { findFirst: jest.fn() };
    return require('@middlewares/module-entitlement.middleware');
  };

  test('allows free-core equipment incident reporting without subscription lookup', async () => {
    const { enforceModuleEntitlement } = loadMiddleware();
    const req = {
      path: '/equipment-incident-reports',
      user: { tenant_id: 'tenant-free', roles: ['NURSE'] }
    };

    const error = await invokeMiddleware(enforceModuleEntitlement(), req);

    expect(error).toBeUndefined();
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    expect(prisma.module.findFirst).not.toHaveBeenCalled();
    expect(prisma.module_subscription.findFirst).not.toHaveBeenCalled();
  });

  test('blocks paid module when active subscription exists but tenant lacks entitlement', async () => {
    const { enforceModuleEntitlement } = loadMiddleware();
    const req = {
      path: '/equipment-work-orders',
      user: { tenant_id: 'tenant-no-entitlement', roles: ['NURSE'] }
    };

    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-1' });
    prisma.module.findFirst.mockResolvedValue({ id: 'module-1' });
    prisma.module_subscription.findFirst.mockResolvedValue(null);

    const error = await invokeMiddleware(enforceModuleEntitlement(), req);

    expect(error).toBeDefined();
    expect(error.messageKey).toBe('errors.auth.module_not_entitled');
    expect(error.statusCode).toBe(403);
  });

  test('allows request when tenant has no active subscription (backward-compatible mode)', async () => {
    const { enforceModuleEntitlement } = loadMiddleware();
    const req = {
      path: '/equipment-work-orders',
      user: { tenant_id: 'tenant-legacy', roles: ['NURSE'] }
    };

    prisma.subscription.findFirst.mockResolvedValue(null);

    const error = await invokeMiddleware(enforceModuleEntitlement(), req);

    expect(error).toBeUndefined();
    expect(prisma.module.findFirst).not.toHaveBeenCalled();
    expect(prisma.module_subscription.findFirst).not.toHaveBeenCalled();
  });

  test('allows paid module when entitlement exists', async () => {
    const { enforceModuleEntitlement } = loadMiddleware();
    const req = {
      path: '/equipment-work-orders',
      user: { tenant_id: 'tenant-entitled', roles: ['NURSE'] }
    };

    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-2' });
    prisma.module.findFirst.mockResolvedValue({ id: 'module-2' });
    prisma.module_subscription.findFirst.mockResolvedValue({ id: 'entitlement-1' });

    const error = await invokeMiddleware(enforceModuleEntitlement(), req);

    expect(error).toBeUndefined();
  });
});
