/**
 * Subscription service tests
 *
 * @module tests/modules/subscription/services
 * @description Tests for subscription business logic layer
 */

const subscriptionService = require('../../../../modules/subscription/services/subscription.service');
const subscriptionRepository = require('../../../../modules/subscription/repositories/subscription.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('../../../../modules/subscription/repositories/subscription.repository');
jest.mock('@lib/audit');

describe('Subscription Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptionById', () => {
    it('should get subscription by ID', async () => {
      const mockSubscription = { id: '123', tenant_id: '456' };
      subscriptionRepository.findById.mockResolvedValue(mockSubscription);

      const result = await subscriptionService.getSubscriptionById('123');

      expect(result).toEqual(mockSubscription);
      expect(subscriptionRepository.findById).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          plan: true,
          tenant: true
        })
      );
    });

    it('should throw HttpError when not found', async () => {
      subscriptionRepository.findById.mockResolvedValue(null);

      await expect(subscriptionService.getSubscriptionById('999')).rejects.toThrow(HttpError);
    });
  });

  describe('listSubscriptions', () => {
    it('should list subscriptions with pagination', async () => {
      const mockSubscriptions = [{ id: '1' }, { id: '2' }];
      subscriptionRepository.findMany.mockResolvedValue(mockSubscriptions);
      subscriptionRepository.count.mockResolvedValue(10);

      const result = await subscriptionService.listSubscriptions({}, 1, 20);

      expect(result.subscriptions).toEqual(mockSubscriptions);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply status filter', async () => {
      subscriptionRepository.findMany.mockResolvedValue([]);
      subscriptionRepository.count.mockResolvedValue(0);

      await subscriptionService.listSubscriptions({ status: 'ACTIVE' }, 1, 20);

      expect(subscriptionRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ACTIVE'
        }),
        0,
        20,
        { created_at: 'desc' },
        expect.any(Object)
      );
    });
  });

  describe('createSubscription', () => {
    it('should create subscription with defaults and audit log', async () => {
      const mockData = { tenant_id: '456', plan_id: '789' };
      const mockCreated = { id: '123', ...mockData, status: 'ACTIVE' };
      subscriptionRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionService.createSubscription(
        mockData,
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockCreated);
      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockData,
          status: 'ACTIVE',
          start_date: expect.any(String)
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'subscription'
        })
      );
    });

    it('should handle audit log failure gracefully', async () => {
      const mockData = { tenant_id: '456', plan_id: '789' };
      const mockCreated = { id: '123', ...mockData };
      subscriptionRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await subscriptionService.createSubscription(mockData, {}, '127.0.0.1');

      expect(result).toEqual(mockCreated);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      const mockBefore = { id: '123', status: 'ACTIVE' };
      const mockAfter = { id: '123', status: 'CANCELLED' };
      subscriptionRepository.findById.mockResolvedValue(mockBefore);
      subscriptionRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionService.cancelSubscription(
        '123',
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          status: 'CANCELLED',
          end_date: expect.any(String)
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CANCEL'
        })
      );
    });

    it('should throw error if already cancelled', async () => {
      const mockBefore = { id: '123', status: 'CANCELLED' };
      subscriptionRepository.findById.mockResolvedValue(mockBefore);

      await expect(
        subscriptionService.cancelSubscription('123', {}, '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription', async () => {
      const mockBefore = { id: '123', status: 'CANCELLED' };
      const mockAfter = { id: '123', status: 'ACTIVE', end_date: null };
      subscriptionRepository.findById.mockResolvedValue(mockBefore);
      subscriptionRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionService.reactivateSubscription(
        '123',
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(subscriptionRepository.update).toHaveBeenCalledWith('123', {
        status: 'ACTIVE',
        end_date: null
      });
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REACTIVATE'
        })
      );
    });

    it('should throw error if not cancelled', async () => {
      const mockBefore = { id: '123', status: 'ACTIVE' };
      subscriptionRepository.findById.mockResolvedValue(mockBefore);

      await expect(
        subscriptionService.reactivateSubscription('123', {}, '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription and audit log', async () => {
      const mockBefore = { id: '123', status: 'ACTIVE' };
      const mockAfter = { id: '123', status: 'PAST_DUE' };
      subscriptionRepository.findById.mockResolvedValue(mockBefore);
      subscriptionRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionService.updateSubscription(
        '123',
        { status: 'PAST_DUE' },
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          diff: { before: mockBefore, after: mockAfter }
        })
      );
    });
  });

  describe('deleteSubscription', () => {
    it('should soft delete subscription and audit log', async () => {
      const mockBefore = { id: '123', deleted_at: null };
      const mockAfter = { id: '123', deleted_at: new Date() };
      subscriptionRepository.findById.mockResolvedValue(mockBefore);
      subscriptionRepository.softDelete.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionService.deleteSubscription(
        '123',
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE'
        })
      );
    });
  });
});
