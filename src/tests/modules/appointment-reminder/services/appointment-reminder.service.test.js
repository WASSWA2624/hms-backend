/**
 * Appointment reminder service tests
 *
 * @module tests/modules/appointment-reminder/services
 * @description Tests for appointment reminder service
 * Per testing.mdc: Mock repository, test business logic
 */

const appointmentReminderService = require('@services/appointment-reminder/appointment-reminder.service');
const appointmentReminderRepository = require('@repositories/appointment-reminder/appointment-reminder.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/appointment-reminder/appointment-reminder.repository');
jest.mock('@lib/audit');

describe('Appointment Reminder Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAppointmentReminders', () => {
    const mockReminders = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        appointment_id: '550e8400-e29b-41d4-a716-446655440001',
        channel: 'EMAIL',
        scheduled_at: new Date('2026-01-20T08:00:00.000Z')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        appointment_id: '550e8400-e29b-41d4-a716-446655440003',
        channel: 'SMS',
        scheduled_at: new Date('2026-01-21T09:00:00.000Z')
      }
    ];

    it('should list reminders with pagination', async () => {
      appointmentReminderRepository.findMany.mockResolvedValue(mockReminders);
      appointmentReminderRepository.count.mockResolvedValue(2);

      const result = await appointmentReminderService.listAppointmentReminders({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(result).toHaveProperty('reminders', mockReminders);
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        appointment_id: '550e8400-e29b-41d4-a716-446655440001',
        channel: 'EMAIL'
      };
      appointmentReminderRepository.findMany.mockResolvedValue(mockReminders);
      appointmentReminderRepository.count.mockResolvedValue(2);

      await appointmentReminderService.listAppointmentReminders(filters, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(appointmentReminderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          appointment_id: filters.appointment_id,
          channel: filters.channel
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination correctly', async () => {
      appointmentReminderRepository.findMany.mockResolvedValue(mockReminders);
      appointmentReminderRepository.count.mockResolvedValue(42);

      const result = await appointmentReminderService.listAppointmentReminders({}, 2, 10, null, 'asc', 'user-id', '127.0.0.1');

      expect(result.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 42,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });

    it('should handle repository errors', async () => {
      appointmentReminderRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        appointmentReminderService.listAppointmentReminders({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });

    it('should apply is_sent filter', async () => {
      appointmentReminderRepository.findMany.mockResolvedValue(mockReminders);
      appointmentReminderRepository.count.mockResolvedValue(2);

      await appointmentReminderService.listAppointmentReminders(
        { is_sent: true },
        1,
        20,
        null,
        'asc',
        'user-id',
        '127.0.0.1'
      );

      expect(appointmentReminderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          AND: expect.arrayContaining([{ sent_at: { not: null } }]),
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply due_state overdue filter', async () => {
      appointmentReminderRepository.findMany.mockResolvedValue(mockReminders);
      appointmentReminderRepository.count.mockResolvedValue(2);

      await appointmentReminderService.listAppointmentReminders(
        { due_state: 'OVERDUE' },
        1,
        20,
        null,
        'asc',
        'user-id',
        '127.0.0.1'
      );

      expect(appointmentReminderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          AND: expect.arrayContaining([
            { sent_at: null },
            expect.objectContaining({ scheduled_at: expect.any(Object) }),
          ]),
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('getAppointmentReminderById', () => {
    const reminderId = '550e8400-e29b-41d4-a716-446655440000';
    const mockReminder = {
      id: reminderId,
      appointment_id: '550e8400-e29b-41d4-a716-446655440001',
      channel: 'EMAIL'
    };

    it('should get reminder by ID', async () => {
      appointmentReminderRepository.findById.mockResolvedValue(mockReminder);

      const result = await appointmentReminderService.getAppointmentReminderById(reminderId, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockReminder);
      expect(appointmentReminderRepository.findById).toHaveBeenCalledWith(reminderId);
    });

    it('should throw error if reminder not found', async () => {
      appointmentReminderRepository.findById.mockResolvedValue(null);

      await expect(
        appointmentReminderService.getAppointmentReminderById(reminderId, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        appointmentReminderService.getAppointmentReminderById(reminderId, 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.appointment_reminder.not_found',
        statusCode: 404
      });
    });
  });

  describe('createAppointmentReminder', () => {
    const createData = {
      appointment_id: '550e8400-e29b-41d4-a716-446655440001',
      channel: 'EMAIL',
      scheduled_at: new Date('2026-01-20T08:00:00.000Z')
    };

    const mockCreated = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...createData
    };

    it('should create reminder', async () => {
      appointmentReminderRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      const result = await appointmentReminderService.createAppointmentReminder(createData, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockCreated);
      expect(appointmentReminderRepository.create).toHaveBeenCalledWith(createData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'CREATE',
        entity: 'appointment_reminder',
        entity_id: mockCreated.id,
        diff: { after: mockCreated },
        ip_address: '127.0.0.1'
      });
    });

    it('should not throw if audit log fails', async () => {
      appointmentReminderRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockRejectedValue(new Error('Audit Error'));

      const result = await appointmentReminderService.createAppointmentReminder(createData, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateAppointmentReminder', () => {
    const reminderId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { sent_at: new Date('2026-01-20T08:05:00.000Z') };
    const mockBefore = {
      id: reminderId,
      channel: 'EMAIL'
    };
    const mockAfter = {
      id: reminderId,
      sent_at: new Date('2026-01-20T08:05:00.000Z')
    };

    it('should update reminder', async () => {
      appointmentReminderRepository.findById.mockResolvedValue(mockBefore);
      appointmentReminderRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await appointmentReminderService.updateAppointmentReminder(reminderId, updateData, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockAfter);
      expect(appointmentReminderRepository.findById).toHaveBeenCalledWith(reminderId);
      expect(appointmentReminderRepository.update).toHaveBeenCalledWith(reminderId, updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'UPDATE',
        entity: 'appointment_reminder',
        entity_id: reminderId,
        diff: { before: mockBefore, after: mockAfter },
        ip_address: '127.0.0.1'
      });
    });

    it('should throw error if reminder not found', async () => {
      appointmentReminderRepository.findById.mockResolvedValue(null);

      await expect(
        appointmentReminderService.updateAppointmentReminder(reminderId, updateData, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteAppointmentReminder', () => {
    const reminderId = '550e8400-e29b-41d4-a716-446655440000';
    const mockBefore = {
      id: reminderId,
      channel: 'EMAIL'
    };

    it('should soft delete reminder', async () => {
      appointmentReminderRepository.findById.mockResolvedValue(mockBefore);
      appointmentReminderRepository.softDelete.mockResolvedValue({});
      createAuditLog.mockResolvedValue({});

      await appointmentReminderService.deleteAppointmentReminder(reminderId, 'user-id', '127.0.0.1');

      expect(appointmentReminderRepository.findById).toHaveBeenCalledWith(reminderId);
      expect(appointmentReminderRepository.softDelete).toHaveBeenCalledWith(reminderId);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'DELETE',
        entity: 'appointment_reminder',
        entity_id: reminderId,
        diff: { before: mockBefore },
        ip_address: '127.0.0.1'
      });
    });

    it('should throw error if reminder not found', async () => {
      appointmentReminderRepository.findById.mockResolvedValue(null);

      await expect(
        appointmentReminderService.deleteAppointmentReminder(reminderId, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('markAppointmentReminderSent', () => {
    const reminderId = '550e8400-e29b-41d4-a716-446655440000';

    it('should mark reminder as sent when currently unsent', async () => {
      const before = {
        id: reminderId,
        sent_at: null,
      };
      const after = {
        ...before,
        sent_at: new Date('2026-01-20T08:05:00.000Z'),
      };

      appointmentReminderRepository.findById.mockResolvedValue(before);
      appointmentReminderRepository.update.mockResolvedValue(after);
      createAuditLog.mockResolvedValue({});

      const result = await appointmentReminderService.markAppointmentReminderSent(
        reminderId,
        { sent_at: '2026-01-20T08:05:00.000Z' },
        'user-id',
        '127.0.0.1'
      );

      expect(result).toEqual(after);
      expect(appointmentReminderRepository.update).toHaveBeenCalledWith(
        reminderId,
        expect.objectContaining({ sent_at: expect.any(Date) })
      );
    });

    it('should be idempotent when reminder is already sent', async () => {
      const alreadySent = {
        id: reminderId,
        sent_at: new Date('2026-01-20T08:00:00.000Z'),
      };

      appointmentReminderRepository.findById.mockResolvedValue(alreadySent);

      const result = await appointmentReminderService.markAppointmentReminderSent(
        reminderId,
        {},
        'user-id',
        '127.0.0.1'
      );

      expect(result).toEqual(alreadySent);
      expect(appointmentReminderRepository.update).not.toHaveBeenCalled();
    });
  });
});
