/**
 * Webhook subscription service tests
 *
 * @module tests/modules/webhook-subscription/services
 * @description Tests for webhook subscription service functions
 */

const webhookSubscriptionService = require('@services/webhook-subscription/webhook-subscription.service');
const webhookSubscriptionRepository = require('@repositories/webhook-subscription/webhook-subscription.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const prisma = require('@prisma/client');

// Mock dependencies
jest.mock('@repositories/webhook-subscription/webhook-subscription.repository');
jest.mock('@lib/audit');
jest.mock('@prisma/client', () => ({
  $transaction: jest.fn((callback) => callback())
}));

describe('Webhook Subscription Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWebhookSubscriptionById', () => {
    it('should return webhook subscription when found', async () => {
      const mockWebhookSubscription = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: 'tenant-123',
        event: 'user.created',
        target_url: 'https://example.com/webhook',
        is_active: true
      };

      webhookSubscriptionRepository.findById.mockResolvedValue(mockWebhookSubscription);

      const result = await webhookSubscriptionService.getWebhookSubscriptionById(mockWebhookSubscription.id);

      expect(result).toEqual(mockWebhookSubscription);
      expect(webhookSubscriptionRepository.findById).toHaveBeenCalledWith(
        mockWebhookSubscription.id,
        { tenant: true, integration: true }
      );
    });

    it('should throw HttpError when webhook subscription not found', async () => {
      webhookSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(webhookSubscriptionService.getWebhookSubscriptionById('non-existent-id'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('listWebhookSubscriptions', () => {
    it('should return paginated webhook subscriptions', async () => {
      const mockWebhookSubscriptions = [
        { id: '1', event: 'user.created' },
        { id: '2', event: 'user.updated' }
      ];

      webhookSubscriptionRepository.findMany.mockResolvedValue(mockWebhookSubscriptions);
      webhookSubscriptionRepository.count.mockResolvedValue(10);

      const result = await webhookSubscriptionService.listWebhookSubscriptions({}, 1, 20);

      expect(result.data).toEqual(mockWebhookSubscriptions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        tenant_id: 'tenant-123',
        integration_id: 'int-123',
        event: 'user.created',
        is_active: true,
        search: 'webhook'
      };

      webhookSubscriptionRepository.findMany.mockResolvedValue([]);
      webhookSubscriptionRepository.count.mockResolvedValue(0);

      await webhookSubscriptionService.listWebhookSubscriptions(filters, 1, 20);

      expect(webhookSubscriptionRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'tenant-123',
          integration_id: 'int-123',
          event: { contains: 'user.created' },
          is_active: true,
          OR: [
            { event: { contains: 'webhook' } },
            { target_url: { contains: 'webhook' } }
          ]
        }),
        0,
        20,
        { created_at: 'desc' },
        { tenant: true, integration: true }
      );
    });

    it('should handle pagination correctly', async () => {
      webhookSubscriptionRepository.findMany.mockResolvedValue([]);
      webhookSubscriptionRepository.count.mockResolvedValue(100);

      const result = await webhookSubscriptionService.listWebhookSubscriptions({}, 3, 20);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });
  });

  describe('createWebhookSubscription', () => {
    it('should create webhook subscription and audit log', async () => {
      const mockData = {
        tenant_id: 'tenant-123',
        event: 'user.created',
        target_url: 'https://example.com/webhook',
        is_active: true
      };

      const mockCreated = { id: 'new-id', ...mockData };
      webhookSubscriptionRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      const auditContext = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };

      const result = await webhookSubscriptionService.createWebhookSubscription(mockData, auditContext);

      expect(result).toEqual(mockCreated);
      expect(webhookSubscriptionRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'CREATE',
        entity: 'webhook_subscription',
        entity_id: mockCreated.id,
        new_values: mockCreated,
        ...auditContext
      });
    });
  });

  describe('updateWebhookSubscription', () => {
    it('should update webhook subscription and create audit log', async () => {
      const existingWebhookSubscription = {
        id: 'webhook-id',
        event: 'user.created',
        is_active: true
      };

      const updateData = { event: 'user.updated', is_active: false };
      const updatedWebhookSubscription = { ...existingWebhookSubscription, ...updateData };

      webhookSubscriptionRepository.findById.mockResolvedValue(existingWebhookSubscription);
      webhookSubscriptionRepository.update.mockResolvedValue(updatedWebhookSubscription);
      createAuditLog.mockResolvedValue({});

      const auditContext = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };

      const result = await webhookSubscriptionService.updateWebhookSubscription(
        'webhook-id',
        updateData,
        auditContext
      );

      expect(result).toEqual(updatedWebhookSubscription);
      expect(webhookSubscriptionRepository.update).toHaveBeenCalledWith('webhook-id', updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'UPDATE',
        entity: 'webhook_subscription',
        entity_id: 'webhook-id',
        old_values: existingWebhookSubscription,
        new_values: updatedWebhookSubscription,
        ...auditContext
      });
    });

    it('should throw HttpError when webhook subscription not found', async () => {
      webhookSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(
        webhookSubscriptionService.updateWebhookSubscription('non-existent-id', {}, {})
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteWebhookSubscription', () => {
    it('should soft delete webhook subscription and create audit log', async () => {
      const existingWebhookSubscription = {
        id: 'webhook-id',
        event: 'user.created'
      };

      const deletedWebhookSubscription = {
        ...existingWebhookSubscription,
        deleted_at: new Date()
      };

      webhookSubscriptionRepository.findById.mockResolvedValue(existingWebhookSubscription);
      webhookSubscriptionRepository.softDelete.mockResolvedValue(deletedWebhookSubscription);
      createAuditLog.mockResolvedValue({});

      const auditContext = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };

      const result = await webhookSubscriptionService.deleteWebhookSubscription('webhook-id', auditContext);

      expect(result).toEqual(deletedWebhookSubscription);
      expect(webhookSubscriptionRepository.softDelete).toHaveBeenCalledWith('webhook-id');
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'DELETE',
        entity: 'webhook_subscription',
        entity_id: 'webhook-id',
        old_values: existingWebhookSubscription,
        ...auditContext
      });
    });

    it('should throw HttpError when webhook subscription not found', async () => {
      webhookSubscriptionRepository.findById.mockResolvedValue(null);

      await expect(
        webhookSubscriptionService.deleteWebhookSubscription('non-existent-id', {})
      ).rejects.toThrow(HttpError);
    });
  });
});
