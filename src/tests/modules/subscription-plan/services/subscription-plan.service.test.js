/**
 * Subscription Plan service tests
 *
 * @module tests/modules/subscription-plan/services
 * @description Tests for subscription plan business logic layer
 */

const subscriptionPlanService = require('../../../../modules/subscription-plan/services/subscription-plan.service');
const subscriptionPlanRepository = require('../../../../modules/subscription-plan/repositories/subscription-plan.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('../../../../modules/subscription-plan/repositories/subscription-plan.repository');
jest.mock('@lib/audit');

describe('Subscription Plan Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptionPlanById', () => {
    it('should get subscription plan by ID', async () => {
      const mockPlan = { id: '123', name: 'Basic Plan' };
      subscriptionPlanRepository.findById.mockResolvedValue(mockPlan);

      const result = await subscriptionPlanService.getSubscriptionPlanById('123');

      expect(result).toEqual(mockPlan);
      expect(subscriptionPlanRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw HttpError when not found', async () => {
      subscriptionPlanRepository.findById.mockResolvedValue(null);

      await expect(subscriptionPlanService.getSubscriptionPlanById('999')).rejects.toThrow(HttpError);
    });
  });

  describe('listSubscriptionPlans', () => {
    it('should list subscription plans with pagination', async () => {
      const mockPlans = [{ id: '1' }, { id: '2' }];
      subscriptionPlanRepository.findMany.mockResolvedValue(mockPlans);
      subscriptionPlanRepository.count.mockResolvedValue(10);

      const result = await subscriptionPlanService.listSubscriptionPlans({}, 1, 20);

      expect(result.subscriptionPlans).toEqual(mockPlans);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply search filter', async () => {
      subscriptionPlanRepository.findMany.mockResolvedValue([]);
      subscriptionPlanRepository.count.mockResolvedValue(0);

      await subscriptionPlanService.listSubscriptionPlans({ search: 'basic' }, 1, 20);

      expect(subscriptionPlanRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          OR: expect.any(Array)
        }),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should apply billing_cycle filter', async () => {
      subscriptionPlanRepository.findMany.mockResolvedValue([]);
      subscriptionPlanRepository.count.mockResolvedValue(0);

      await subscriptionPlanService.listSubscriptionPlans({ billing_cycle: 'MONTHLY' }, 1, 20);

      expect(subscriptionPlanRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          billing_cycle: 'MONTHLY'
        }),
        0,
        20,
        { created_at: 'desc' }
      );
    });
  });

  describe('createSubscriptionPlan', () => {
    it('should create subscription plan and audit log', async () => {
      const mockData = { name: 'Basic Plan', price: 99.99, billing_cycle: 'MONTHLY' };
      const mockCreated = { id: '123', ...mockData };
      subscriptionPlanRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionPlanService.createSubscriptionPlan(
        mockData,
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockCreated);
      expect(subscriptionPlanRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'subscription_plan',
          entity_id: '123'
        })
      );
    });

    it('should handle audit log failure gracefully', async () => {
      const mockData = { name: 'Basic Plan' };
      const mockCreated = { id: '123', ...mockData };
      subscriptionPlanRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await subscriptionPlanService.createSubscriptionPlan(mockData, {}, '127.0.0.1');

      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateSubscriptionPlan', () => {
    it('should update subscription plan and audit log', async () => {
      const mockBefore = { id: '123', name: 'Basic Plan' };
      const mockAfter = { id: '123', name: 'Updated Plan' };
      subscriptionPlanRepository.findById.mockResolvedValue(mockBefore);
      subscriptionPlanRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionPlanService.updateSubscriptionPlan(
        '123',
        { name: 'Updated Plan' },
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'subscription_plan',
          diff: { before: mockBefore, after: mockAfter }
        })
      );
    });
  });

  describe('deleteSubscriptionPlan', () => {
    it('should soft delete subscription plan and audit log', async () => {
      const mockBefore = { id: '123', name: 'Basic Plan', deleted_at: null };
      const mockAfter = { id: '123', name: 'Basic Plan', deleted_at: new Date() };
      subscriptionPlanRepository.findById.mockResolvedValue(mockBefore);
      subscriptionPlanRepository.softDelete.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionPlanService.deleteSubscriptionPlan(
        '123',
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'subscription_plan'
        })
      );
    });
  });
});
