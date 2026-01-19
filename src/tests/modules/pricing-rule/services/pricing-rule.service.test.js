/**
 * Pricing Rule service tests
 *
 * @module tests/modules/pricing-rule/services
 * @description Tests for pricing rule service layer
 * Per testing.mdc: Mock repositories and external dependencies
 */

const pricingRuleService = require('@services/pricing-rule/pricing-rule.service');
const pricingRuleRepository = require('@repositories/pricing-rule/pricing-rule.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('@repositories/pricing-rule/pricing-rule.repository');
jest.mock('@lib/audit');

describe('Pricing Rule Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockIp = '127.0.0.1';

  describe('listPricingRules', () => {
    it('should list pricing rules with pagination', async () => {
      const mockData = [{ id: '1', name: 'Rule 1' }];
      pricingRuleRepository.findMany.mockResolvedValue(mockData);
      pricingRuleRepository.count.mockResolvedValue(1);

      const result = await pricingRuleService.listPricingRules({}, 1, 20, null, 'asc', mockUserId, mockIp);

      expect(result).toHaveProperty('pricingRules');
      expect(result).toHaveProperty('pagination');
      expect(result.pricingRules).toEqual(mockData);
    });

    it('should handle search filter', async () => {
      pricingRuleRepository.findMany.mockResolvedValue([]);
      pricingRuleRepository.count.mockResolvedValue(0);

      await pricingRuleService.listPricingRules({ search: 'test' }, 1, 20, null, 'asc', mockUserId, mockIp);

      expect(pricingRuleRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          OR: expect.any(Array)
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('getPricingRuleById', () => {
    const mockId = '550e8400-e29b-41d4-a716-446655440001';

    it('should get pricing rule by ID', async () => {
      const mockData = { id: mockId, name: 'Test Rule' };
      pricingRuleRepository.findById.mockResolvedValue(mockData);

      const result = await pricingRuleService.getPricingRuleById(mockId, mockUserId, mockIp);

      expect(result).toEqual(mockData);
    });

    it('should throw error if pricing rule not found', async () => {
      pricingRuleRepository.findById.mockResolvedValue(null);

      await expect(
        pricingRuleService.getPricingRuleById(mockId, mockUserId, mockIp)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createPricingRule', () => {
    const mockData = { tenant_id: mockUserId, name: 'New Rule', amount: 50, currency: 'USD' };

    it('should create pricing rule and audit log', async () => {
      const mockCreated = { id: '1', ...mockData };
      pricingRuleRepository.create.mockResolvedValue(mockCreated);

      const result = await pricingRuleService.createPricingRule(mockData, mockUserId, mockIp);

      expect(result).toEqual(mockCreated);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'pricing_rule'
        })
      );
    });
  });

  describe('updatePricingRule', () => {
    const mockId = '550e8400-e29b-41d4-a716-446655440001';
    const mockData = { name: 'Updated Rule' };

    it('should update pricing rule and create audit log', async () => {
      const mockBefore = { id: mockId, name: 'Old Rule' };
      const mockAfter = { id: mockId, name: 'Updated Rule' };
      pricingRuleRepository.findById.mockResolvedValue(mockBefore);
      pricingRuleRepository.update.mockResolvedValue(mockAfter);

      const result = await pricingRuleService.updatePricingRule(mockId, mockData, mockUserId, mockIp);

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should throw error if pricing rule not found', async () => {
      pricingRuleRepository.findById.mockResolvedValue(null);

      await expect(
        pricingRuleService.updatePricingRule(mockId, mockData, mockUserId, mockIp)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deletePricingRule', () => {
    const mockId = '550e8400-e29b-41d4-a716-446655440001';

    it('should soft delete pricing rule and create audit log', async () => {
      const mockBefore = { id: mockId, name: 'Test Rule' };
      pricingRuleRepository.findById.mockResolvedValue(mockBefore);
      pricingRuleRepository.softDelete.mockResolvedValue(mockBefore);

      await pricingRuleService.deletePricingRule(mockId, mockUserId, mockIp);

      expect(pricingRuleRepository.softDelete).toHaveBeenCalledWith(mockId);
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should throw error if pricing rule not found', async () => {
      pricingRuleRepository.findById.mockResolvedValue(null);

      await expect(
        pricingRuleService.deletePricingRule(mockId, mockUserId, mockIp)
      ).rejects.toThrow(HttpError);
    });
  });
});
