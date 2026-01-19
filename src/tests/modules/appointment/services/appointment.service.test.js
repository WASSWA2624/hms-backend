/**
 * Appointment service tests
 *
 * @module tests/modules/appointment/services
 * @description Tests for appointment service
 * Per testing.mdc: Mock repository, test business logic
 */

const appointmentService = require('@services/appointment/appointment.service');
const appointmentRepository = require('@repositories/appointment/appointment.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/appointment/appointment.repository');
jest.mock('@lib/audit');

describe('Appointment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAppointments', () => {
    const mockAppointments = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        patient_id: '550e8400-e29b-41d4-a716-446655440002',
        status: 'SCHEDULED',
        scheduled_start: new Date('2026-01-20T09:00:00.000Z'),
        scheduled_end: new Date('2026-01-20T10:00:00.000Z')
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        patient_id: '550e8400-e29b-41d4-a716-446655440004',
        status: 'CONFIRMED',
        scheduled_start: new Date('2026-01-21T10:00:00.000Z'),
        scheduled_end: new Date('2026-01-21T11:00:00.000Z')
      }
    ];

    it('should list appointments with pagination', async () => {
      appointmentRepository.findMany.mockResolvedValue(mockAppointments);
      appointmentRepository.count.mockResolvedValue(2);

      const result = await appointmentService.listAppointments({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(result).toHaveProperty('appointments', mockAppointments);
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
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'SCHEDULED'
      };
      appointmentRepository.findMany.mockResolvedValue(mockAppointments);
      appointmentRepository.count.mockResolvedValue(2);

      await appointmentService.listAppointments(filters, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: filters.tenant_id,
          status: filters.status
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply search filter', async () => {
      const filters = { search: 'checkup' };
      appointmentRepository.findMany.mockResolvedValue(mockAppointments);
      appointmentRepository.count.mockResolvedValue(2);

      await appointmentService.listAppointments(filters, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: { contains: 'checkup' }
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination correctly', async () => {
      appointmentRepository.findMany.mockResolvedValue(mockAppointments);
      appointmentRepository.count.mockResolvedValue(42);

      const result = await appointmentService.listAppointments({}, 2, 10, null, 'asc', 'user-id', '127.0.0.1');

      expect(result.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 42,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true
      });
      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        10, // skip: (2-1) * 10
        10,
        expect.any(Object)
      );
    });

    it('should apply custom sorting', async () => {
      appointmentRepository.findMany.mockResolvedValue(mockAppointments);
      appointmentRepository.count.mockResolvedValue(2);

      await appointmentService.listAppointments({}, 1, 20, 'scheduled_start', 'asc', 'user-id', '127.0.0.1');

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        { scheduled_start: 'asc' }
      );
    });

    it('should use default sorting when sortBy not provided', async () => {
      appointmentRepository.findMany.mockResolvedValue(mockAppointments);
      appointmentRepository.count.mockResolvedValue(2);

      await appointmentService.listAppointments({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(appointmentRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        { created_at: 'desc' }
      );
    });

    it('should handle repository errors', async () => {
      appointmentRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        appointmentService.listAppointments({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getAppointmentById', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const mockAppointment = {
      id: appointmentId,
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      patient_id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'SCHEDULED'
    };

    it('should get appointment by ID', async () => {
      appointmentRepository.findById.mockResolvedValue(mockAppointment);

      const result = await appointmentService.getAppointmentById(appointmentId, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockAppointment);
      expect(appointmentRepository.findById).toHaveBeenCalledWith(appointmentId);
    });

    it('should throw error if appointment not found', async () => {
      appointmentRepository.findById.mockResolvedValue(null);

      await expect(
        appointmentService.getAppointmentById(appointmentId, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        appointmentService.getAppointmentById(appointmentId, 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.appointment.not_found',
        statusCode: 404
      });
    });

    it('should handle repository errors', async () => {
      appointmentRepository.findById.mockRejectedValue(new Error('DB Error'));

      await expect(
        appointmentService.getAppointmentById(appointmentId, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createAppointment', () => {
    const createData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      patient_id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'SCHEDULED',
      scheduled_start: new Date('2026-01-20T09:00:00.000Z'),
      scheduled_end: new Date('2026-01-20T10:00:00.000Z')
    };

    const mockCreated = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...createData
    };

    it('should create appointment', async () => {
      appointmentRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      const result = await appointmentService.createAppointment(createData, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockCreated);
      expect(appointmentRepository.create).toHaveBeenCalledWith(createData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'CREATE',
        entity: 'appointment',
        entity_id: mockCreated.id,
        diff: { after: mockCreated },
        ip_address: '127.0.0.1'
      });
    });

    it('should handle repository errors', async () => {
      appointmentRepository.create.mockRejectedValue(new Error('DB Error'));

      await expect(
        appointmentService.createAppointment(createData, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });

    it('should not throw if audit log fails', async () => {
      appointmentRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockRejectedValue(new Error('Audit Error'));

      const result = await appointmentService.createAppointment(createData, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateAppointment', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { status: 'CONFIRMED' };
    const mockBefore = {
      id: appointmentId,
      status: 'SCHEDULED'
    };
    const mockAfter = {
      id: appointmentId,
      status: 'CONFIRMED'
    };

    it('should update appointment', async () => {
      appointmentRepository.findById.mockResolvedValue(mockBefore);
      appointmentRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await appointmentService.updateAppointment(appointmentId, updateData, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockAfter);
      expect(appointmentRepository.findById).toHaveBeenCalledWith(appointmentId);
      expect(appointmentRepository.update).toHaveBeenCalledWith(appointmentId, updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'UPDATE',
        entity: 'appointment',
        entity_id: appointmentId,
        diff: { before: mockBefore, after: mockAfter },
        ip_address: '127.0.0.1'
      });
    });

    it('should throw error if appointment not found', async () => {
      appointmentRepository.findById.mockResolvedValue(null);

      await expect(
        appointmentService.updateAppointment(appointmentId, updateData, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        appointmentService.updateAppointment(appointmentId, updateData, 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.appointment.not_found',
        statusCode: 404
      });
    });

    it('should handle repository errors', async () => {
      appointmentRepository.findById.mockResolvedValue(mockBefore);
      appointmentRepository.update.mockRejectedValue(new Error('DB Error'));

      await expect(
        appointmentService.updateAppointment(appointmentId, updateData, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteAppointment', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const mockBefore = {
      id: appointmentId,
      status: 'SCHEDULED'
    };

    it('should soft delete appointment', async () => {
      appointmentRepository.findById.mockResolvedValue(mockBefore);
      appointmentRepository.softDelete.mockResolvedValue({});
      createAuditLog.mockResolvedValue({});

      await appointmentService.deleteAppointment(appointmentId, 'user-id', '127.0.0.1');

      expect(appointmentRepository.findById).toHaveBeenCalledWith(appointmentId);
      expect(appointmentRepository.softDelete).toHaveBeenCalledWith(appointmentId);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'DELETE',
        entity: 'appointment',
        entity_id: appointmentId,
        diff: { before: mockBefore },
        ip_address: '127.0.0.1'
      });
    });

    it('should throw error if appointment not found', async () => {
      appointmentRepository.findById.mockResolvedValue(null);

      await expect(
        appointmentService.deleteAppointment(appointmentId, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        appointmentService.deleteAppointment(appointmentId, 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.appointment.not_found',
        statusCode: 404
      });
    });

    it('should handle repository errors', async () => {
      appointmentRepository.findById.mockResolvedValue(mockBefore);
      appointmentRepository.softDelete.mockRejectedValue(new Error('DB Error'));

      await expect(
        appointmentService.deleteAppointment(appointmentId, 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('cancelAppointment', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const mockBefore = {
      id: appointmentId,
      status: 'SCHEDULED',
      reason: 'General checkup'
    };
    const mockAfter = {
      id: appointmentId,
      status: 'CANCELLED',
      reason: 'General checkup\nCancellation reason: Patient request'
    };

    it('should cancel appointment with reason', async () => {
      appointmentRepository.findById.mockResolvedValue(mockBefore);
      appointmentRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await appointmentService.cancelAppointment(appointmentId, 'Patient request', 'user-id', '127.0.0.1');

      expect(result).toEqual(mockAfter);
      expect(appointmentRepository.findById).toHaveBeenCalledWith(appointmentId);
      expect(appointmentRepository.update).toHaveBeenCalledWith(appointmentId, {
        status: 'CANCELLED',
        reason: 'General checkup\nCancellation reason: Patient request'
      });
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'CANCEL',
        entity: 'appointment',
        entity_id: appointmentId,
        diff: { before: mockBefore, after: mockAfter },
        ip_address: '127.0.0.1'
      });
    });

    it('should cancel appointment without reason', async () => {
      const mockAfterNoReason = { ...mockBefore, status: 'CANCELLED' };
      appointmentRepository.findById.mockResolvedValue(mockBefore);
      appointmentRepository.update.mockResolvedValue(mockAfterNoReason);
      createAuditLog.mockResolvedValue({});

      const result = await appointmentService.cancelAppointment(appointmentId, null, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockAfterNoReason);
      expect(appointmentRepository.update).toHaveBeenCalledWith(appointmentId, {
        status: 'CANCELLED'
      });
    });

    it('should throw error if appointment not found', async () => {
      appointmentRepository.findById.mockResolvedValue(null);

      await expect(
        appointmentService.cancelAppointment(appointmentId, 'reason', 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        appointmentService.cancelAppointment(appointmentId, 'reason', 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.appointment.not_found',
        statusCode: 404
      });
    });

    it('should throw error if appointment already cancelled', async () => {
      const mockCancelled = { ...mockBefore, status: 'CANCELLED' };
      appointmentRepository.findById.mockResolvedValue(mockCancelled);

      await expect(
        appointmentService.cancelAppointment(appointmentId, 'reason', 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        appointmentService.cancelAppointment(appointmentId, 'reason', 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.appointment.already_cancelled',
        statusCode: 400
      });
    });

    it('should handle repository errors', async () => {
      appointmentRepository.findById.mockResolvedValue(mockBefore);
      appointmentRepository.update.mockRejectedValue(new Error('DB Error'));

      await expect(
        appointmentService.cancelAppointment(appointmentId, 'reason', 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });
});
