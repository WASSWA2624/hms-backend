/**
 * Breach notification service tests
 *
 * @module tests/modules/breach-notification/services
 * @description Tests for breach notification service operations
 * Per testing.mdc: Comprehensive service tests with mocked repositories and audit
 */

const breachNotificationService = require('@services/breach-notification/breach-notification.service');
const breachNotificationRepository = require('@repositories/breach-notification/breach-notification.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('@repositories/breach-notification/breach-notification.repository');
jest.mock('@lib/audit');

describe('Breach Notification Service', () => {
  const mockBreachNotification = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenant_id: '550e8400-e29b-41d4-a716-446655440001',
    severity: 'HIGH',
    status: 'OPEN',
    description: 'Security breach detected',
    reported_at: new Date('2024-01-01T10:00:00Z'),
    resolved_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    version: 1
  };

  const userId = 'user-123';
  const ipAddress = '127.0.0.1';
  const tenantId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  describe('listBreachNotifications', () => {
    it('should list breach notifications with pagination', async () => {
      const mockBreachNotifications = [mockBreachNotification];
      breachNotificationRepository.findMany.mockResolvedValue(mockBreachNotifications);
      breachNotificationRepository.count.mockResolvedValue(1);

      const filters = { severity: 'HIGH' };
      const result = await breachNotificationService.listBreachNotifications(
        filters, 1, 20, 'reported_at', 'desc', userId, ipAddress
      );

      expect(result.breachNotifications).toEqual(mockBreachNotifications);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should handle date range filters', async () => {
      breachNotificationRepository.findMany.mockResolvedValue([mockBreachNotification]);
      breachNotificationRepository.count.mockResolvedValue(1);

      const filters = {
        from_date: '2024-01-01T00:00:00Z',
        to_date: '2024-01-31T23:59:59Z'
      };

      await breachNotificationService.listBreachNotifications(
        filters, 1, 20, 'reported_at', 'desc', userId, ipAddress
      );

      expect(breachNotificationRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          reported_at: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('getBreachNotificationById', () => {
    it('should get breach notification by ID', async () => {
      breachNotificationRepository.findById.mockResolvedValue(mockBreachNotification);

      const result = await breachNotificationService.getBreachNotificationById(
        mockBreachNotification.id, userId, ipAddress
      );

      expect(result).toEqual(mockBreachNotification);
      expect(breachNotificationRepository.findById).toHaveBeenCalledWith(mockBreachNotification.id);
    });

    it('should throw HttpError when breach notification not found', async () => {
      breachNotificationRepository.findById.mockResolvedValue(null);

      await expect(
        breachNotificationService.getBreachNotificationById('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createBreachNotification', () => {
    it('should create a new breach notification', async () => {
      const createData = {
        severity: 'HIGH',
        status: 'OPEN',
        description: 'Security breach detected'
      };

      breachNotificationRepository.create.mockResolvedValue(mockBreachNotification);

      const result = await breachNotificationService.createBreachNotification(
        createData, tenantId, userId, ipAddress
      );

      expect(result).toEqual(mockBreachNotification);
      expect(breachNotificationRepository.create).toHaveBeenCalledWith({
        ...createData,
        tenant_id: tenantId
      });
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'CREATE',
          entity: 'breach_notification',
          entity_id: mockBreachNotification.id
        })
      );
    });
  });

  describe('updateBreachNotification', () => {
    it('should update a breach notification', async () => {
      const updateData = { status: 'INVESTIGATING' };
      const updatedBreachNotification = { ...mockBreachNotification, ...updateData };

      breachNotificationRepository.findById.mockResolvedValue(mockBreachNotification);
      breachNotificationRepository.update.mockResolvedValue(updatedBreachNotification);

      const result = await breachNotificationService.updateBreachNotification(
        mockBreachNotification.id, updateData, userId, ipAddress
      );

      expect(result).toEqual(updatedBreachNotification);
      expect(breachNotificationRepository.update).toHaveBeenCalledWith(
        mockBreachNotification.id, updateData
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'UPDATE',
          entity: 'breach_notification'
        })
      );
    });

    it('should throw HttpError when breach notification not found', async () => {
      breachNotificationRepository.findById.mockResolvedValue(null);

      await expect(
        breachNotificationService.updateBreachNotification('non-existent-id', {}, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('resolveBreachNotification', () => {
    it('should resolve a breach notification', async () => {
      const resolvedAt = new Date('2024-01-03T10:00:00Z');
      const resolvedBreachNotification = {
        ...mockBreachNotification,
        status: 'RESOLVED',
        resolved_at: resolvedAt
      };

      breachNotificationRepository.findById.mockResolvedValue(mockBreachNotification);
      breachNotificationRepository.update.mockResolvedValue(resolvedBreachNotification);

      const result = await breachNotificationService.resolveBreachNotification(
        mockBreachNotification.id, resolvedAt, userId, ipAddress
      );

      expect(result).toEqual(resolvedBreachNotification);
      expect(breachNotificationRepository.update).toHaveBeenCalledWith(
        mockBreachNotification.id,
        expect.objectContaining({
          status: 'RESOLVED',
          resolved_at: resolvedAt
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESOLVE',
          entity: 'breach_notification'
        })
      );
    });

    it('should use current date when resolvedAt not provided', async () => {
      const resolvedBreachNotification = {
        ...mockBreachNotification,
        status: 'RESOLVED',
        resolved_at: expect.any(Date)
      };

      breachNotificationRepository.findById.mockResolvedValue(mockBreachNotification);
      breachNotificationRepository.update.mockResolvedValue(resolvedBreachNotification);

      await breachNotificationService.resolveBreachNotification(
        mockBreachNotification.id, null, userId, ipAddress
      );

      expect(breachNotificationRepository.update).toHaveBeenCalledWith(
        mockBreachNotification.id,
        expect.objectContaining({
          status: 'RESOLVED',
          resolved_at: expect.any(Date)
        })
      );
    });

    it('should throw HttpError when breach notification not found', async () => {
      breachNotificationRepository.findById.mockResolvedValue(null);

      await expect(
        breachNotificationService.resolveBreachNotification('non-existent-id', null, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError when breach notification already resolved', async () => {
      const resolvedBreachNotification = { ...mockBreachNotification, status: 'RESOLVED' };
      breachNotificationRepository.findById.mockResolvedValue(resolvedBreachNotification);

      await expect(
        breachNotificationService.resolveBreachNotification(
          mockBreachNotification.id, null, userId, ipAddress
        )
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteBreachNotification', () => {
    it('should soft delete a breach notification', async () => {
      breachNotificationRepository.findById.mockResolvedValue(mockBreachNotification);
      breachNotificationRepository.softDelete.mockResolvedValue(mockBreachNotification);

      await breachNotificationService.deleteBreachNotification(
        mockBreachNotification.id, userId, ipAddress
      );

      expect(breachNotificationRepository.softDelete).toHaveBeenCalledWith(mockBreachNotification.id);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'breach_notification'
        })
      );
    });

    it('should throw HttpError when breach notification not found', async () => {
      breachNotificationRepository.findById.mockResolvedValue(null);

      await expect(
        breachNotificationService.deleteBreachNotification('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
