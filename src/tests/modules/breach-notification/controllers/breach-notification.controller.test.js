/**
 * Breach notification controller tests
 *
 * @module tests/modules/breach-notification/controllers
 * @description Tests for breach notification controller operations
 * Per testing.mdc: Comprehensive controller tests with mocked services
 */

const breachNotificationController = require('@controllers/breach-notification/breach-notification.controller');
const breachNotificationService = require('@services/breach-notification/breach-notification.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');

// Mock service and response helpers
jest.mock('@services/breach-notification/breach-notification.service');
jest.mock('@lib/response');

describe('Breach Notification Controller', () => {
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

  const mockReq = {
    query: {},
    params: {},
    body: {},
    user: {
      id: 'user-123',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001'
    },
    ip: '127.0.0.1'
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listBreachNotifications', () => {
    it('should list breach notifications with pagination', async () => {
      const mockResult = {
        breachNotifications: [mockBreachNotification],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      breachNotificationService.listBreachNotifications.mockResolvedValue(mockResult);

      const req = { ...mockReq, query: { page: 1, limit: 20 } };

      await breachNotificationController.listBreachNotifications(req, mockRes);

      expect(breachNotificationService.listBreachNotifications).toHaveBeenCalled();
      expect(sendPaginated).toHaveBeenCalledWith(
        mockRes,
        'messages.breach_notification.list.success',
        mockResult.breachNotifications,
        mockResult.pagination
      );
    });
  });

  describe('getBreachNotificationById', () => {
    it('should get breach notification by ID', async () => {
      breachNotificationService.getBreachNotificationById.mockResolvedValue(mockBreachNotification);

      const req = { ...mockReq, params: { id: mockBreachNotification.id } };

      await breachNotificationController.getBreachNotificationById(req, mockRes);

      expect(breachNotificationService.getBreachNotificationById).toHaveBeenCalledWith(
        mockBreachNotification.id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.breach_notification.get.success',
        mockBreachNotification
      );
    });
  });

  describe('createBreachNotification', () => {
    it('should create a new breach notification', async () => {
      const createData = {
        severity: 'HIGH',
        status: 'OPEN',
        description: 'Security breach detected'
      };

      breachNotificationService.createBreachNotification.mockResolvedValue(mockBreachNotification);

      const req = { ...mockReq, body: createData };

      await breachNotificationController.createBreachNotification(req, mockRes);

      expect(breachNotificationService.createBreachNotification).toHaveBeenCalledWith(
        createData,
        mockReq.user.tenant_id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        201,
        'messages.breach_notification.create.success',
        mockBreachNotification
      );
    });
  });

  describe('updateBreachNotification', () => {
    it('should update a breach notification', async () => {
      const updateData = { status: 'INVESTIGATING' };
      const updatedBreachNotification = { ...mockBreachNotification, ...updateData };

      breachNotificationService.updateBreachNotification.mockResolvedValue(updatedBreachNotification);

      const req = {
        ...mockReq,
        params: { id: mockBreachNotification.id },
        body: updateData
      };

      await breachNotificationController.updateBreachNotification(req, mockRes);

      expect(breachNotificationService.updateBreachNotification).toHaveBeenCalledWith(
        mockBreachNotification.id,
        updateData,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.breach_notification.update.success',
        updatedBreachNotification
      );
    });
  });

  describe('resolveBreachNotification', () => {
    it('should resolve a breach notification', async () => {
      const resolvedBreachNotification = {
        ...mockBreachNotification,
        status: 'RESOLVED',
        resolved_at: new Date('2024-01-03T10:00:00Z')
      };

      breachNotificationService.resolveBreachNotification.mockResolvedValue(resolvedBreachNotification);

      const req = {
        ...mockReq,
        params: { id: mockBreachNotification.id },
        body: { resolved_at: '2024-01-03T10:00:00Z' }
      };

      await breachNotificationController.resolveBreachNotification(req, mockRes);

      expect(breachNotificationService.resolveBreachNotification).toHaveBeenCalledWith(
        mockBreachNotification.id,
        expect.any(Date),
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.breach_notification.resolve.success',
        resolvedBreachNotification
      );
    });

    it('should resolve with null date when not provided', async () => {
      const resolvedBreachNotification = {
        ...mockBreachNotification,
        status: 'RESOLVED',
        resolved_at: new Date()
      };

      breachNotificationService.resolveBreachNotification.mockResolvedValue(resolvedBreachNotification);

      const req = {
        ...mockReq,
        params: { id: mockBreachNotification.id },
        body: {}
      };

      await breachNotificationController.resolveBreachNotification(req, mockRes);

      expect(breachNotificationService.resolveBreachNotification).toHaveBeenCalledWith(
        mockBreachNotification.id,
        null,
        mockReq.user.id,
        mockReq.ip
      );
    });
  });

  describe('deleteBreachNotification', () => {
    it('should soft delete a breach notification', async () => {
      breachNotificationService.deleteBreachNotification.mockResolvedValue();

      const req = { ...mockReq, params: { id: mockBreachNotification.id } };

      await breachNotificationController.deleteBreachNotification(req, mockRes);

      expect(breachNotificationService.deleteBreachNotification).toHaveBeenCalledWith(
        mockBreachNotification.id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });
  });
});
