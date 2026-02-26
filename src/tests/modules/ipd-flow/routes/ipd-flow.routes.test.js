const subject = require('@routes/ipd-flow/ipd-flow.routes');

const getRouteSignatures = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`)
    )
    .sort();

describe('ipd-flow.routes contract', () => {
  it('exports an express router with registered handlers', () => {
    expect(subject).toBeDefined();
    expect(typeof subject).toBe('function');
    expect(Array.isArray(subject.stack)).toBe(true);
    expect(subject.stack.length).toBeGreaterThan(0);
  });

  it('registers canonical IPD flow endpoints', () => {
    expect(getRouteSignatures(subject)).toEqual([
      'GET /',
      'GET /:id',
      'POST /:id/add-medication-administration',
      'POST /:id/add-nursing-note',
      'POST /:id/add-ward-round',
      'POST /:id/assign-bed',
      'POST /:id/finalize-discharge',
      'POST /:id/plan-discharge',
      'POST /:id/release-bed',
      'POST /:id/request-transfer',
      'POST /:id/update-transfer',
      'POST /start',
    ]);
  });

  it('applies validation/auth middleware before handlers', () => {
    const routes = subject.stack.filter((layer) => layer.route);
    routes.forEach((layer) => {
      expect(layer.route.stack.length).toBeGreaterThanOrEqual(4);
    });
  });
});
