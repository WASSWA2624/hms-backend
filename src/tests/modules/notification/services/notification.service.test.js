/**
 * Notification service tests
 *
 * @module tests/modules/notification/services
 * @description Tests for notification service operations
 * Per testing.mdc: Service tests must mock repositories
 */

const notificationService = require('@services/notification/notification.service');
const notificationRepository = require('@repositories/notification/notification.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('@repositories/notification/notification.repository');
jest.mock('@lib/audit');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  describe('listNotifications', () => {
    it('should list notifications with pagination', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test 1' },
        { id: '2', title: 'Test 2' }
      ];
      notificationRepository.findMany.mockResolvedValue(mockNotifications);
      notificationRepository.count.mockResolvedValue(10);

      const result = await notificationService.listNotifications({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.notifications).toEqual(mockNotifications);
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
      const filters = { tenant_id: 'tenant-1', priority: 'HIGH' };
      notificationRepository.findMany.mockResolvedValue([]);
      notificationRepository.count.mockResolvedValue(0);

      await notificationService.listNotifications(filters, 1, 20, null, 'desc', mockUserId, mockIpAddress);

      expect(notificationRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining(filters),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by read status (is_read = true)', async () => {
      const filters = { is_read: true };
      notificationRepository.findMany.mockResolvedValue([]);
      notificationRepository.count.mockResolvedValue(0);

      await notificationService.listNotifications(filters, 1, 20, null, 'desc', mockUserId, mockIpAddress);

      expect(notificationRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ read_at: { not: null } }),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by read status (is_read = false)', async () => {
      const filters = { is_read: false };
      notificationRepository.findMany.mockResolvedValue([]);
      notificationRepository.count.mockResolvedValue(0);

      await notificationService.listNotifications(filters, 1, 20, null, 'desc', mockUserId, mockIpAddress);

      expect(notificationRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ read_at: null }),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should throw HttpError on repository error', async () => {
      notificationRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        notificationService.listNotifications({}, 1, 20, null, 'desc', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getNotificationById', () => {
    it('should get notification by id', async () => {
      const mockNotification = { id: '123', title: 'Test' };
      notificationRepository.findById.mockResolvedValue(mockNotification);

      const result = await notificationService.getNotificationById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(mockNotification);
      expect(notificationRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw HttpError if notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      await expect(
        notificationService.getNotificationById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        notificationService.getNotificationById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.notification.not_found');
    });

    it('should throw HttpError on repository error', async () => {
      notificationRepository.findById.mockRejectedValue(new Error('DB Error'));

      await expect(
        notificationService.getNotificationById('123', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createNotification', () => {
    it('should create notification and audit log', async () => {
      const mockData = { 
        tenant_id: 'tenant-1', 
        notification_type: 'SYSTEM',
        priority: 'MEDIUM',
        title: 'Test',
        message: 'Test message'
      };
      const mockNotification = { id: '123', ...mockData };
      notificationRepository.create.mockResolvedValue(mockNotification);
      createAuditLog.mockResolvedValue({});

      const result = await notificationService.createNotification(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockNotification);
      expect(notificationRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'notification',
        entity_id: mockNotification.id,
        diff: { after: mockNotification },
        ip_address: mockIpAddress
      });
    });

    it('should create notification even if audit log fails', async () => {
      const mockData = { title: 'Test', message: 'Test message' };
      const mockNotification = { id: '123', ...mockData };
      notificationRepository.create.mockResolvedValue(mockNotification);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await notificationService.createNotification(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockNotification);
    });

    it('should throw HttpError on repository error', async () => {
      notificationRepository.create.mockRejectedValue(new HttpError('errors.database.unexpected', 500));

      await expect(
        notificationService.createNotification({}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('updateNotification', () => {
    it('should update notification and create audit log', async () => {
      const mockBefore = { id: '123', title: 'Old Title' };
      const mockAfter = { id: '123', title: 'New Title' };
      notificationRepository.findById.mockResolvedValue(mockBefore);
      notificationRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await notificationService.updateNotification('123', { title: 'New Title' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'UPDATE',
        entity: 'notification',
        entity_id: '123',
        diff: { before: mockBefore, after: mockAfter },
        ip_address: mockIpAddress
      });
    });

    it('should throw HttpError if notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      await expect(
        notificationService.updateNotification('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        notificationService.updateNotification('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.notification.not_found');
    });

    it('should update notification even if audit log fails', async () => {
      const mockBefore = { id: '123', title: 'Old Title' };
      const mockAfter = { id: '123', title: 'New Title' };
      notificationRepository.findById.mockResolvedValue(mockBefore);
      notificationRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await notificationService.updateNotification('123', { title: 'New Title' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification and create audit log', async () => {
      const mockNotification = { id: '123', title: 'Test' };
      notificationRepository.findById.mockResolvedValue(mockNotification);
      notificationRepository.softDelete.mockResolvedValue({ ...mockNotification, deleted_at: new Date() });
      createAuditLog.mockResolvedValue({});

      await notificationService.deleteNotification('123', mockUserId, mockIpAddress);

      expect(notificationRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'DELETE',
        entity: 'notification',
        entity_id: '123',
        diff: { before: mockNotification },
        ip_address: mockIpAddress
      });
    });

    it('should throw HttpError if notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);

      await expect(
        notificationService.deleteNotification('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        notificationService.deleteNotification('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.notification.not_found');
    });

    it('should delete notification even if audit log fails', async () => {
      const mockNotification = { id: '123', title: 'Test' };
      notificationRepository.findById.mockResolvedValue(mockNotification);
      notificationRepository.softDelete.mockResolvedValue({ ...mockNotification, deleted_at: new Date() });
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      await expect(
        notificationService.deleteNotification('123', mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
    });
  });
});
