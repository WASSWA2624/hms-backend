/**
 * response error helper tests
 */

const { sendError } = require('@lib/response/error');
const { handleApiError } = require('@lib/errors');

const createResponse = () => {
  const res = {
    locals: { locale: 'en', direction: 'ltr' },
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload) => {
      res.payload = payload;
      return res;
    }),
    setHeader: jest.fn(),
    removeHeader: jest.fn()
  };
  return res;
};

describe('response error helpers', () => {
  it('sendError always includes errors array', () => {
    const res = createResponse();

    sendError(res, 404, 'errors.not_found');

    expect(res.statusCode).toBe(404);
    expect(Array.isArray(res.payload.errors)).toBe(true);
    expect(res.payload.errors).toEqual([]);
  });

  it('handleApiError always includes errors array', () => {
    const res = createResponse();
    const req = { path: '/api/v1/example', method: 'GET', ip: '127.0.0.1' };
    const next = jest.fn();

    handleApiError(new Error('unexpected'), req, res, next);

    expect(res.statusCode).toBe(500);
    expect(Array.isArray(res.payload.errors)).toBe(true);
    expect(res.payload.errors).toEqual([]);
  });
});
