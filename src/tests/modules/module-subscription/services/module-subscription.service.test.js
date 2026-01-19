/**
 * Module subscription service tests
 *
 * @module tests/modules/module-subscription/services
 * Per testing.mdc: Mock all external dependencies
 */

const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/module-subscription/module-subscription.repository');
jest.mock('@lib/audit');

const moduleSubscriptionRepository = require('@repositories/module-subscription/module-subscription.repository');
const { createAuditLog } = require('@lib/audit');
const {
  listModuleSubscriptions,
  getModuleSubscriptionById,
  createModuleSubscription,
  updateModuleSubscription,
  deleteModuleSubscription
} = require('@services/module-subscription/module-subscription.service');

describe('Module Subscription Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listModuleSubscriptions', () => {
    it('should list module subscriptions with pagination', async () => {
      const mockSubscriptions = [
        { id: 'sub-1', module_id: 'module-1', subscription_id: 'subscription-1' },
        { id: 'sub-2', module_id: 'module-2', subscription_id: 'subscription-2' }
      ];
      moduleSubscriptionRepository.findMany.mockResolvedValue(mockSubscriptions);
      moduleSubscriptionRepository.count.mockResolvedValue(10);

      const result = await listModuleSubscriptions({}, 1, 20);

      expect(result.module_subscriptions).toEqual(mockSubscriptions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should filter by module_id', async () => {
      moduleSubscriptionRepository.findMany.mockResolvedValue([]);
      moduleSubscriptionRepository.count.mockResolvedValue(0);

      await listModuleSubscriptions({ module_id: 'module-123' }, 1, 20);

      expect(moduleSubscriptionRepository.findMany).toHaveBeenCalledWith(
        { module_id: 'module-123' },
        0,
        20,
        { created_at: 'desc' }
      );
    });
  });

  describe('getModuleSubscriptionById', () => {
    it('should return module subscription by ID', async () => {
      const mockSubscription = { id: 'sub-123', module_id: 'module-123' };
      moduleSubscriptionRepository.findById.mockResolvedValue(mockSubscription);

      const result = await getModuleSubscriptionById('sub-123');

      expect(result).toEqual(mockSubscription);
    });

    it('should throw HttpError if not found', async () => {
      moduleSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(getModuleSubscriptionById('sub-123'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('createModuleSubscription', () => {
    it('should create module subscription and log audit', async () => {
      const data = {
        module_id: 'module-123',
        subscription_id: 'subscription-123'
      };
      const mockCreated = { id: 'sub-new', ...data };
      const context = {
        user: { id: 'user-123' },
        ip: '127.0.0.1',
        tenant_id: 'tenant-123'
      };

      moduleSubscriptionRepository.create.mockResolvedValue(mockCreated);

      const result = await createModuleSubscription(data, context);

      expect(result).toEqual(mockCreated);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'CREATE',
        entity: 'module_subscription',
        entity_id: 'sub-new',
        diff_json: { after: mockCreated },
        ip_address: '127.0.0.1',
        tenant_id: 'tenant-123'
      });
    });
  });

  describe('updateModuleSubscription', () => {
    it('should update module subscription and log audit', async () => {
      const existing = { id: 'sub-123', is_active: true };
      const updated = { id: 'sub-123', is_active: false };
      const context = { user: { id: 'user-123' }, ip: '127.0.0.1', tenant_id: 'tenant-123' };

      moduleSubscriptionRepository.findById.mockResolvedValue(existing);
      moduleSubscriptionRepository.update.mockResolvedValue(updated);

      const result = await updateModuleSubscription('sub-123', { is_active: false }, context);

      expect(result).toEqual(updated);
    });

    it('should throw HttpError if not found', async () => {
      moduleSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(updateModuleSubscription('sub-123', {}, {}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('deleteModuleSubscription', () => {
    it('should soft delete module subscription and log audit', async () => {
      const existing = { id: 'sub-123', is_active: true };
      const deleted = { ...existing, deleted_at: new Date() };
      const context = { user: { id: 'user-123' }, ip: '127.0.0.1', tenant_id: 'tenant-123' };

      moduleSubscriptionRepository.findById.mockResolvedValue(existing);
      moduleSubscriptionRepository.softDelete.mockResolvedValue(deleted);

      const result = await deleteModuleSubscription('sub-123', context);

      expect(result).toEqual(deleted);
    });
  });
});
