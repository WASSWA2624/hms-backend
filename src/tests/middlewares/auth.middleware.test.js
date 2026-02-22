/**
 * auth middleware tests
 */

const { authorize } = require('@middlewares/auth.middleware');
const { HttpError } = require('@lib/errors');

describe('auth middleware', () => {
  it('authorizes permission checks from role-permission mapping when token permissions are missing', () => {
    const middleware = authorize('tenant:admin', 'permission');
    const req = {
      user: {
        role: 'TENANT_ADMIN',
        roles: ['TENANT_ADMIN']
      }
    };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects permission checks when permission is not granted', () => {
    const middleware = authorize('system:admin', 'permission');
    const req = {
      user: {
        role: 'DOCTOR',
        roles: ['DOCTOR']
      }
    };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(HttpError);
    expect(error.statusCode).toBe(403);
  });
});
