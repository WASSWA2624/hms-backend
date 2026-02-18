/**
 * readinessCheck helper tests
 */

const loadReadinessModule = ({
  nodeEnv = 'test',
  mysqlCreateConnectionImpl = null,
} = {}) => {
  jest.resetModules();

  const warn = jest.fn();
  const error = jest.fn();
  const info = jest.fn();
  const getCurrentISO = jest.fn(() => '2026-02-15T00:00:00.000Z');
  const createConnection =
    mysqlCreateConnectionImpl ||
    jest.fn(async () => {
      throw new Error('connect failed');
    });

  jest.doMock('@lib/logging', () => ({
    logger: { warn, error, info },
  }));
  jest.doMock('@lib/dates', () => ({
    getCurrentISO,
  }));
  jest.doMock('@config/env', () => ({
    DATABASE_URL: 'mysql://demo:demo@localhost:3306/hms_db',
    NODE_ENV: nodeEnv,
  }));
  jest.doMock('mysql2/promise', () => ({
    createConnection,
  }));

  const { readinessCheck } = require('@lib/health/readinessCheck');
  return { readinessCheck, warn, createConnection, getCurrentISO };
};

describe('readinessCheck helper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns ready and caches successful mysql checks', async () => {
    const query = jest.fn().mockResolvedValue([[{ ok: 1 }], []]);
    const end = jest.fn().mockResolvedValue(undefined);
    const createConnectionMock = jest.fn().mockResolvedValue({ query, end });
    const { readinessCheck, createConnection, getCurrentISO } = loadReadinessModule({
      mysqlCreateConnectionImpl: createConnectionMock,
    });

    const first = await readinessCheck();
    const second = await readinessCheck();

    expect(first).toEqual({
      status: 'ready',
      timestamp: '2026-02-15T00:00:00.000Z',
      checks: { database: 'ok' },
    });
    expect(second.status).toBe('ready');
    expect(getCurrentISO).toHaveBeenCalledTimes(2);
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('returns ready when mysql connection succeeds', async () => {
    const query = jest.fn().mockResolvedValue([[{ ok: 1 }], []]);
    const end = jest.fn().mockResolvedValue(undefined);
    const createConnection = jest.fn().mockResolvedValue({ query, end });

    const { readinessCheck } = loadReadinessModule({
      mysqlCreateConnectionImpl: createConnection,
    });

    const result = await readinessCheck();

    expect(result.status).toBe('ready');
    expect(result.checks.database).toBe('ok');
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('returns not_ready and logs warning when db checks fail in non-development', async () => {
    const createConnection = jest.fn().mockRejectedValue(new Error('mysql down'));
    const { readinessCheck, warn } = loadReadinessModule({
      nodeEnv: 'test',
      mysqlCreateConnectionImpl: createConnection,
    });

    const result = await readinessCheck();

    expect(result.status).toBe('not_ready');
    expect(result.checks.database).toBe('error');
    expect(warn).toHaveBeenCalledWith(
      'Database readiness check failed',
      expect.objectContaining({ error: 'mysql down' })
    );
  });

  it('returns ready in development even when database check fails', async () => {
    const createConnection = jest.fn().mockRejectedValue(new Error('db unavailable'));
    const { readinessCheck, warn } = loadReadinessModule({
      nodeEnv: 'development',
      mysqlCreateConnectionImpl: createConnection,
    });

    const result = await readinessCheck();

    expect(result.status).toBe('ready');
    expect(result.checks.database).toBe('error');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
