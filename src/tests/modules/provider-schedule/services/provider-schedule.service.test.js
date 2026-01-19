/**
 * Provider schedule service tests
 *
 * @module tests/modules/provider-schedule/services
 * @description Tests for provider schedule service
 * Per testing.mdc: Mock repository, test business logic
 */

const providerScheduleService = require('@services/provider-schedule/provider-schedule.service');
const providerScheduleRepository = require('@repositories/provider-schedule/provider-schedule.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/provider-schedule/provider-schedule.repository');
jest.mock('@lib/audit');

describe('Provider Schedule Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listProviderSchedules', () => {
    const mockSchedules = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        provider_user_id: '550e8400-e29b-41d4-a716-446655440002',
        day_of_week: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        provider_user_id: '550e8400-e29b-41d4-a716-446655440002',
        day_of_week: 3
      }
    ];

    it('should list schedules with pagination', async () => {
      providerScheduleRepository.findMany.mockResolvedValue(mockSchedules);
      providerScheduleRepository.count.mockResolvedValue(2);

      const result = await providerScheduleService.listProviderSchedules({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(result).toHaveProperty('schedules', mockSchedules);
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
        provider_user_id: '550e8400-e29b-41d4-a716-446655440002',
        day_of_week: 1
      };
      providerScheduleRepository.findMany.mockResolvedValue(mockSchedules);
      providerScheduleRepository.count.mockResolvedValue(2);

      await providerScheduleService.listProviderSchedules(filters, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(providerScheduleRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: filters.tenant_id,
          provider_user_id: filters.provider_user_id,
          day_of_week: filters.day_of_week
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should throw HttpError on repository error', async () => {
      providerScheduleRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(providerScheduleService.listProviderSchedules({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1'))
        .rejects.toThrow(HttpError);
    });
  });

  describe('getProviderScheduleById', () => {
    const scheduleId = '550e8400-e29b-41d4-a716-446655440000';
    const mockSchedule = {
      id: scheduleId,
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      day_of_week: 1
    };

    it('should get schedule by ID', async () => {
      providerScheduleRepository.findById.mockResolvedValue(mockSchedule);

      const result = await providerScheduleService.getProviderScheduleById(scheduleId, 'user-id', '127.0.0.1');

      expect(result).toEqual(mockSchedule);
      expect(providerScheduleRepository.findById).toHaveBeenCalledWith(scheduleId);
    });

    it('should throw HttpError if schedule not found', async () => {
      providerScheduleRepository.findById.mockResolvedValue(null);

      await expect(providerScheduleService.getProviderScheduleById(scheduleId, 'user-id', '127.0.0.1'))
        .rejects.toThrow(HttpError);
      await expect(providerScheduleService.getProviderScheduleById(scheduleId, 'user-id', '127.0.0.1'))
        .rejects.toMatchObject({
          messageKey: 'errors.provider_schedule.not_found',
          statusCode: 404
        });
    });
  });

  describe('createProviderSchedule', () => {
    const scheduleData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      provider_user_id: '550e8400-e29b-41d4-a716-446655440002',
      day_of_week: 1,
      start_time: new Date('2026-01-20T08:00:00.000Z'),
      end_time: new Date('2026-01-20T17:00:00.000Z')
    };

    const createdSchedule = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...scheduleData
    };

    it('should create a schedule', async () => {
      providerScheduleRepository.create.mockResolvedValue(createdSchedule);
      createAuditLog.mockResolvedValue({});

      const result = await providerScheduleService.createProviderSchedule(scheduleData, 'user-id', '127.0.0.1');

      expect(result).toEqual(createdSchedule);
      expect(providerScheduleRepository.create).toHaveBeenCalledWith(scheduleData);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-id',
          action: 'CREATE',
          entity: 'provider_schedule',
          entity_id: createdSchedule.id
        })
      );
    });

    it('should throw HttpError on repository error', async () => {
      providerScheduleRepository.create.mockRejectedValue(new Error('DB Error'));

      await expect(providerScheduleService.createProviderSchedule(scheduleData, 'user-id', '127.0.0.1'))
        .rejects.toThrow(HttpError);
    });
  });

  describe('updateProviderSchedule', () => {
    const scheduleId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { day_of_week: 3 };
    const existingSchedule = { id: scheduleId, day_of_week: 1 };
    const updatedSchedule = { id: scheduleId, day_of_week: 3 };

    it('should update a schedule', async () => {
      providerScheduleRepository.findById.mockResolvedValue(existingSchedule);
      providerScheduleRepository.update.mockResolvedValue(updatedSchedule);
      createAuditLog.mockResolvedValue({});

      const result = await providerScheduleService.updateProviderSchedule(scheduleId, updateData, 'user-id', '127.0.0.1');

      expect(result).toEqual(updatedSchedule);
      expect(providerScheduleRepository.findById).toHaveBeenCalledWith(scheduleId);
      expect(providerScheduleRepository.update).toHaveBeenCalledWith(scheduleId, updateData);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-id',
          action: 'UPDATE',
          entity: 'provider_schedule',
          entity_id: scheduleId,
          diff: expect.objectContaining({
            before: existingSchedule,
            after: updatedSchedule
          })
        })
      );
    });

    it('should throw HttpError if schedule not found', async () => {
      providerScheduleRepository.findById.mockResolvedValue(null);

      await expect(providerScheduleService.updateProviderSchedule(scheduleId, updateData, 'user-id', '127.0.0.1'))
        .rejects.toThrow(HttpError);
      await expect(providerScheduleService.updateProviderSchedule(scheduleId, updateData, 'user-id', '127.0.0.1'))
        .rejects.toMatchObject({
          messageKey: 'errors.provider_schedule.not_found',
          statusCode: 404
        });
    });
  });

  describe('deleteProviderSchedule', () => {
    const scheduleId = '550e8400-e29b-41d4-a716-446655440000';
    const existingSchedule = { id: scheduleId, day_of_week: 1 };

    it('should soft delete a schedule', async () => {
      providerScheduleRepository.findById.mockResolvedValue(existingSchedule);
      providerScheduleRepository.softDelete.mockResolvedValue({ ...existingSchedule, deleted_at: new Date() });
      createAuditLog.mockResolvedValue({});

      await providerScheduleService.deleteProviderSchedule(scheduleId, 'user-id', '127.0.0.1');

      expect(providerScheduleRepository.findById).toHaveBeenCalledWith(scheduleId);
      expect(providerScheduleRepository.softDelete).toHaveBeenCalledWith(scheduleId);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-id',
          action: 'DELETE',
          entity: 'provider_schedule',
          entity_id: scheduleId,
          diff: expect.objectContaining({ before: existingSchedule })
        })
      );
    });

    it('should throw HttpError if schedule not found', async () => {
      providerScheduleRepository.findById.mockResolvedValue(null);

      await expect(providerScheduleService.deleteProviderSchedule(scheduleId, 'user-id', '127.0.0.1'))
        .rejects.toThrow(HttpError);
      await expect(providerScheduleService.deleteProviderSchedule(scheduleId, 'user-id', '127.0.0.1'))
        .rejects.toMatchObject({
          messageKey: 'errors.provider_schedule.not_found',
          statusCode: 404
        });
    });
  });
});
