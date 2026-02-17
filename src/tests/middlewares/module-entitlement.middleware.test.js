const invokeMiddleware = (middleware, req, res = {}) =>
  new Promise((resolve) => {
    middleware(req, res, (error) => resolve(error));
  });

describe('module entitlement middleware', () => {
  let moduleRepository;
  let moduleSubscriptionRepository;
  let subscriptionRepository;

  const loadMiddleware = () => {
    jest.resetModules();

    moduleRepository = {
      count: jest.fn()
    };
    moduleSubscriptionRepository = {
      count: jest.fn()
    };
    subscriptionRepository = {
      count: jest.fn()
    };

    jest.doMock('@repositories/module/module.repository', () => moduleRepository);
    jest.doMock('@repositories/module-subscription/module-subscription.repository', () => moduleSubscriptionRepository);
    jest.doMock('@repositories/subscription/subscription.repository', () => subscriptionRepository);

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
    expect(subscriptionRepository.count).not.toHaveBeenCalled();
    expect(moduleRepository.count).not.toHaveBeenCalled();
    expect(moduleSubscriptionRepository.count).not.toHaveBeenCalled();
  });

  test('blocks paid module when active subscription exists but tenant lacks entitlement', async () => {
    const { enforceModuleEntitlement } = loadMiddleware();
    const req = {
      path: '/equipment-work-orders',
      user: { tenant_id: 'tenant-no-entitlement', roles: ['NURSE'] }
    };

    subscriptionRepository.count.mockResolvedValue(1);
    moduleRepository.count.mockResolvedValue(1);
    moduleSubscriptionRepository.count.mockResolvedValue(0);

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

    subscriptionRepository.count.mockResolvedValue(0);

    const error = await invokeMiddleware(enforceModuleEntitlement(), req);

    expect(error).toBeUndefined();
    expect(moduleRepository.count).not.toHaveBeenCalled();
    expect(moduleSubscriptionRepository.count).not.toHaveBeenCalled();
  });

  test('allows paid module when entitlement exists', async () => {
    const { enforceModuleEntitlement } = loadMiddleware();
    const req = {
      path: '/equipment-work-orders',
      user: { tenant_id: 'tenant-entitled', roles: ['NURSE'] }
    };

    subscriptionRepository.count.mockResolvedValue(1);
    moduleRepository.count.mockResolvedValue(1);
    moduleSubscriptionRepository.count.mockResolvedValue(1);

    const error = await invokeMiddleware(enforceModuleEntitlement(), req);

    expect(error).toBeUndefined();
  });
});
