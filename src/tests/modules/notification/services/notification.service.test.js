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

  const mockUserId = '123e4567-e89b-12d3-a456-426614174099';
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
      const filters = { tenant_id: '123e4567-e89b-12d3-a456-426614174010', priority: 'HIGH' };
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

    it('should resolve friendly user_id filter before querying', async () => {
      const filters = { user_id: 'USR0000003' };
      notificationRepository.findUserByIdentifier.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174201',
      });
      notificationRepository.findMany.mockResolvedValue([]);
      notificationRepository.count.mockResolvedValue(0);

      await notificationService.listNotifications(filters, 1, 20, null, 'desc', mockUserId, mockIpAddress);

      expect(notificationRepository.findUserByIdentifier).toHaveBeenCalledWith('USR0000003', null);
      expect(notificationRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: '123e4567-e89b-12d3-a456-426614174201' }),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should return empty result when friendly user_id cannot be resolved', async () => {
      notificationRepository.findUserByIdentifier.mockResolvedValue(null);

      const result = await notificationService.listNotifications(
        { user_id: 'USR9999999' },
        1,
        20,
        null,
        'desc',
        mockUserId,
        mockIpAddress
      );

      expect(result.notifications).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(notificationRepository.findMany).not.toHaveBeenCalled();
      expect(notificationRepository.count).not.toHaveBeenCalled();
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
      const id = '123e4567-e89b-12d3-a456-426614174050';
      const mockNotification = { id, title: 'Test' };
      notificationRepository.findById.mockResolvedValue(mockNotification);

      const result = await notificationService.getNotificationById(id, mockUserId, mockIpAddress);

      expect(result).toEqual(mockNotification);
      expect(notificationRepository.findById).toHaveBeenCalledWith(id);
    });

    it('should throw HttpError if notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);
      const id = '123e4567-e89b-12d3-a456-426614174051';

      await expect(
        notificationService.getNotificationById(id, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        notificationService.getNotificationById(id, mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.notification.not_found');
    });

    it('should throw HttpError on repository error', async () => {
      notificationRepository.findById.mockRejectedValue(new Error('DB Error'));
      const id = '123e4567-e89b-12d3-a456-426614174052';

      await expect(
        notificationService.getNotificationById(id, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createNotification', () => {
    it('should create notification and audit log', async () => {
      const mockData = { 
        tenant_id: '123e4567-e89b-12d3-a456-426614174011', 
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
      const mockData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174012',
        title: 'Test',
        message: 'Test message',
      };
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

    it('should resolve friendly tenant and user identifiers on create', async () => {
      const mockData = {
        tenant_id: 'TEN0000001',
        user_id: 'USR0000003',
        notification_type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Escalation',
        message: 'Escalated notification'
      };
      notificationRepository.findTenantByIdentifier.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174210',
      });
      notificationRepository.findUserByIdentifier.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174211',
      });
      notificationRepository.create.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174212',
        ...mockData,
      });

      await notificationService.createNotification(mockData, mockUserId, mockIpAddress);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: '123e4567-e89b-12d3-a456-426614174210',
          user_id: '123e4567-e89b-12d3-a456-426614174211',
        })
      );
    });
  });

  describe('updateNotification', () => {
    it('should update notification and create audit log', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174060';
      const mockBefore = { id, title: 'Old Title' };
      const mockAfter = { id, title: 'New Title' };
      notificationRepository.findById.mockResolvedValue(mockBefore);
      notificationRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await notificationService.updateNotification(id, { title: 'New Title' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'UPDATE',
        entity: 'notification',
        entity_id: id,
        diff: { before: mockBefore, after: mockAfter },
        ip_address: mockIpAddress
      });
    });

    it('should throw HttpError if notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);
      const id = '123e4567-e89b-12d3-a456-426614174061';

      await expect(
        notificationService.updateNotification(id, {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        notificationService.updateNotification(id, {}, mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.notification.not_found');
    });

    it('should update notification even if audit log fails', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174062';
      const mockBefore = { id, title: 'Old Title' };
      const mockAfter = { id, title: 'New Title' };
      notificationRepository.findById.mockResolvedValue(mockBefore);
      notificationRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await notificationService.updateNotification(id, { title: 'New Title' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification and create audit log', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174070';
      const mockNotification = { id, title: 'Test' };
      notificationRepository.findById.mockResolvedValue(mockNotification);
      notificationRepository.softDelete.mockResolvedValue({ ...mockNotification, deleted_at: new Date() });
      createAuditLog.mockResolvedValue({});

      await notificationService.deleteNotification(id, mockUserId, mockIpAddress);

      expect(notificationRepository.softDelete).toHaveBeenCalledWith(id);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'DELETE',
        entity: 'notification',
        entity_id: id,
        diff: { before: mockNotification },
        ip_address: mockIpAddress
      });
    });

    it('should throw HttpError if notification not found', async () => {
      notificationRepository.findById.mockResolvedValue(null);
      const id = '123e4567-e89b-12d3-a456-426614174071';

      await expect(
        notificationService.deleteNotification(id, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        notificationService.deleteNotification(id, mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.notification.not_found');
    });

    it('should delete notification even if audit log fails', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174072';
      const mockNotification = { id, title: 'Test' };
      notificationRepository.findById.mockResolvedValue(mockNotification);
      notificationRepository.softDelete.mockResolvedValue({ ...mockNotification, deleted_at: new Date() });
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      await expect(
        notificationService.deleteNotification(id, mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
    });
  });
});
