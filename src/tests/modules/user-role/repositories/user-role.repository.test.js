/**
 * User-Role repository tests
 *
 * @module tests/modules/user-role/repositories
 * Per testing.mdc: Mock all Prisma operations
 */

const { HttpError } = require('@lib/errors');

jest.mock('@prisma/client', () => ({
  user_role: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

const {
  findById,
  findMany,
  count,
  create,
  update,
  softDelete
} = require('@repositories/user-role/user-role.repository');

const prisma = require('@prisma/client');

describe('User-Role Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find user-role by ID', async () => {
      const mock = {
        id: 'ur-123',
        user_id: 'user-123',
        role_id: 'role-123',
        tenant_id: 'tenant-123'
      };
      prisma.user_role.findFirst.mockResolvedValue(mock);

      const result = await findById('ur-123');

      expect(result).toEqual(mock);
    });
  });

  describe('findMany', () => {
    it('should find many user-roles', async () => {
      const mocks = [{ id: 'ur-1' }, { id: 'ur-2' }];
      prisma.user_role.findMany.mockResolvedValue(mocks);

      const result = await findMany({}, 0, 20);

      expect(result).toEqual(mocks);
    });
  });

  describe('count', () => {
    it('should count user-roles', async () => {
      prisma.user_role.count.mockResolvedValue(5);
      const result = await count({});
      expect(result).toBe(5);
    });
  });

  describe('create', () => {
    it('should create user-role', async () => {
      const mock = { id: 'ur-123', user_id: 'user-123' };
      prisma.user_role.create.mockResolvedValue(mock);

      const result = await create(mock);

      expect(result).toEqual(mock);
    });
  });

  describe('update', () => {
    it('should update user-role', async () => {
      const mock = { id: 'ur-123', role_id: 'role-456' };
      prisma.user_role.update.mockResolvedValue(mock);

      const result = await update('ur-123', { role_id: 'role-456' });

      expect(result).toEqual(mock);
    });
  });

  describe('softDelete', () => {
    it('should soft delete user-role', async () => {
      const mock = { id: 'ur-123', deleted_at: new Date() };
      prisma.user_role.update.mockResolvedValue(mock);

      const result = await softDelete('ur-123');

      expect(result).toEqual(mock);
    });
  });
});
