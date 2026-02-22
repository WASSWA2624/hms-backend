jest.mock('@faker-js/faker', () => ({
  faker: {
    seed: jest.fn(),
    internet: { email: jest.fn(() => 'seed@example.local') },
    phone: { number: jest.fn(() => '+15550000000') },
    helpers: { slugify: jest.fn((value) => String(value).toLowerCase()) },
    person: { fullName: jest.fn(() => 'Seed User') },
    string: { alphanumeric: jest.fn(() => 'seedtokenvalue') },
    lorem: { sentence: jest.fn(() => 'Seed sentence.') }
  }
}));

const env = require('@config/env');

describe('seed-demo-data script', () => {
  afterEach(() => {
    env.setEnvForTests({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://test:test@localhost:3306/test_db',
      JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
      CORS_ORIGINS: 'http://localhost:3000'
    });
  });

  it('skips seeding in production environment', async () => {
    env.setEnvForTests({
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://test:test@localhost:3306/test_db',
      JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
      CORS_ORIGINS: 'http://localhost:3000'
    });

    jest.resetModules();
    const { seedDemoData } = require('../../../scripts/seed-demo-data');

    const result = await seedDemoData({
      skipDefaultAccounts: true
    });

    expect(result).toEqual({
      skipped: true,
      reason: 'production_environment'
    });
  });

  it('produces deterministic UUID output for identical input', () => {
    jest.resetModules();
    const { deterministicUuid } = require('../../../scripts/seed-demo-data');

    const first = deterministicUuid('seed:deterministic-check');
    const second = deterministicUuid('seed:deterministic-check');
    const third = deterministicUuid('seed:deterministic-check-other');

    expect(first).toBe(second);
    expect(third).not.toBe(first);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
