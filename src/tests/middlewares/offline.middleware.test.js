jest.mock('@lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const {
  offlineSupportMiddleware,
  clearIdempotencyStore
} = require('@middlewares/offline.middleware');

const createReq = (overrides = {}) => ({
  method: 'GET',
  path: '/api/v1/test',
  query: {},
  body: {},
  headers: {},
  ...overrides
});

const createRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader: jest.fn((name, value) => {
      res.headers[name] = value;
    }),
    getHeader: jest.fn((name) => res.headers[name]),
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload) => {
      res.body = payload;
      return res;
    }),
    send: jest.fn((payload) => {
      res.body = payload;
      return res;
    }),
    end: jest.fn(() => {
      res.ended = true;
      return res;
    })
  };

  return res;
};

describe('offline support middleware', () => {
  beforeEach(() => {
    clearIdempotencyStore();
    jest.clearAllMocks();
  });

  test('adds sync metadata when since query is provided on list response', () => {
    const middleware = offlineSupportMiddleware();
    const req = createReq({
      method: 'GET',
      path: '/api/v1/patients',
      query: { since: '2026-02-01T00:00:00.000Z' }
    });
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    res.json({
      status: 200,
      message: 'ok',
      data: [
        { id: 'p1', updated_at: '2026-02-10T10:00:00.000Z' },
        { id: 'p2', deleted_at: '2026-02-11T10:00:00.000Z' }
      ],
      meta: { locale: 'en', direction: 'ltr' },
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
    });

    expect(res.body.sync).toBeDefined();
    expect(res.body.sync.has_more).toBe(false);
    expect(typeof res.body.sync.sync_token).toBe('string');
    expect(typeof res.body.sync.timestamp).toBe('string');
    expect(res.body.data[1].deleted).toBe(true);
    expect(res.headers['Cache-Control']).toBeDefined();
    expect(res.headers.Vary).toContain('Accept-Language');
    expect(res.headers.ETag).toBeDefined();
    expect(res.headers['Last-Modified']).toBeDefined();
  });

  test('returns 304 when If-None-Match matches computed ETag', () => {
    const middleware = offlineSupportMiddleware();
    const payload = {
      status: 200,
      message: 'ok',
      data: [{ id: 'x1', updated_at: '2026-02-10T10:00:00.000Z' }],
      meta: { locale: 'en', direction: 'ltr' }
    };

    const firstReq = createReq({ method: 'GET', path: '/api/v1/resources' });
    const firstRes = createRes();
    middleware(firstReq, firstRes, jest.fn());
    firstRes.json(payload);
    const etag = firstRes.headers.ETag;

    const secondReq = createReq({
      method: 'GET',
      path: '/api/v1/resources',
      headers: { 'if-none-match': etag }
    });
    const secondRes = createRes();
    middleware(secondReq, secondRes, jest.fn());
    secondRes.json(payload);

    expect(secondRes.statusCode).toBe(304);
    expect(secondRes.ended).toBe(true);
    expect(secondRes.body).toBeUndefined();
  });

  test('replays stored response for duplicate Idempotency-Key requests', () => {
    const middleware = offlineSupportMiddleware();
    const headers = {
      'idempotency-key': 'demo-key-1',
      authorization: 'Bearer token-123'
    };
    const body = { name: 'demo' };

    const req1 = createReq({
      method: 'POST',
      path: '/api/v1/integrations',
      headers,
      body
    });
    const res1 = createRes();
    const next1 = jest.fn();

    middleware(req1, res1, next1);
    expect(next1).toHaveBeenCalled();

    res1.status(201);
    res1.json({
      status: 201,
      message: 'created',
      data: { id: 'it-1', name: 'demo' },
      meta: { locale: 'en', direction: 'ltr' }
    });

    const req2 = createReq({
      method: 'POST',
      path: '/api/v1/integrations',
      headers,
      body
    });
    const res2 = createRes();
    const next2 = jest.fn();

    middleware(req2, res2, next2);

    expect(next2).not.toHaveBeenCalled();
    expect(res2.statusCode).toBe(201);
    expect(res2.body).toEqual(res1.body);
  });
});

