/**
 * NotificationDelivery service tests
 *
 * @module tests/modules/notification-delivery/services
 * @description Tests for notification-delivery service operations
 * Per testing.mdc: Service tests must mock repositories
 */

const notificationDeliveryService = require('@services/notification-delivery/notification-delivery.service');
const notificationDeliveryRepository = require('@repositories/notification-delivery/notification-delivery.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('@repositories/notification-delivery/notification-delivery.repository');
jest.mock('@lib/audit');

describe('NotificationDelivery Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  describe('listNotificationDeliveries', () => {
    it('should list deliveries with pagination', async () => {
      const mockDeliveries = [{ id: '1' }, { id: '2' }];
      notificationDeliveryRepository.findMany.mockResolvedValue(mockDeliveries);
      notificationDeliveryRepository.count.mockResolvedValue(10);

      const result = await notificationDeliveryService.listNotificationDeliveries({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.notificationDeliveries).toEqual(mockDeliveries);
      expect(result.pagination.total).toBe(10);
    });
  });

  describe('getNotificationDeliveryById', () => {
    it('should get delivery by id', async () => {
      const mockDelivery = { id: '123', channel: 'EMAIL' };
      notificationDeliveryRepository.findById.mockResolvedValue(mockDelivery);

      const result = await notificationDeliveryService.getNotificationDeliveryById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(mockDelivery);
    });

    it('should throw HttpError if not found', async () => {
      notificationDeliveryRepository.findById.mockResolvedValue(null);

      await expect(
        notificationDeliveryService.getNotificationDeliveryById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.notification_delivery.not_found');
    });
  });

  describe('createNotificationDelivery', () => {
    it('should create delivery and audit log', async () => {
      const mockData = { notification_id: '123', channel: 'EMAIL' };
      const mockDelivery = { id: '456', ...mockData };
      notificationDeliveryRepository.create.mockResolvedValue(mockDelivery);
      createAuditLog.mockResolvedValue({});

      const result = await notificationDeliveryService.createNotificationDelivery(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockDelivery);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateNotificationDelivery', () => {
    it('should update delivery and create audit log', async () => {
      const mockBefore = { id: '123', status: 'pending' };
      const mockAfter = { id: '123', status: 'sent' };
      notificationDeliveryRepository.findById.mockResolvedValue(mockBefore);
      notificationDeliveryRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await notificationDeliveryService.updateNotificationDelivery('123', { status: 'sent' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('deleteNotificationDelivery', () => {
    it('should delete delivery and create audit log', async () => {
      const mockDelivery = { id: '123', channel: 'EMAIL' };
      notificationDeliveryRepository.findById.mockResolvedValue(mockDelivery);
      notificationDeliveryRepository.softDelete.mockResolvedValue({ ...mockDelivery, deleted_at: new Date() });
      createAuditLog.mockResolvedValue({});

      await notificationDeliveryService.deleteNotificationDelivery('123', mockUserId, mockIpAddress);

      expect(notificationDeliveryRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalled();
    });
  });
});
