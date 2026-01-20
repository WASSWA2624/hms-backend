/**
 * Anesthesia record service tests
 *
 * @module tests/modules/anesthesia-record/services
 * @description Tests for Anesthesia record business logic layer
 * Per testing.mdc: Service tests must mock repositories
 */

const anesthesiaRecordService = require('@services/anesthesia-record/anesthesia-record.service');
const anesthesiaRecordRepository = require('@repositories/anesthesia-record/anesthesia-record.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/anesthesia-record/anesthesia-record.repository');
jest.mock('@lib/audit');

describe('Anesthesia record Service', () => {
  const userId = 'user-123';
  const ipAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listanesthesiaRecords', () => {
    const mockanesthesiaRecords = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
        anesthetist_user_id: '550e8400-e29b-41d4-a716-446655440002',
        notes: 'Test notes'
      }
    ];

    it('should list Anesthesia records with pagination', async () => {
      anesthesiaRecordRepository.findMany.mockResolvedValue(mockanesthesiaRecords);
      anesthesiaRecordRepository.count.mockResolvedValue(1);

      const result = await anesthesiaRecordService.listAnesthesiaRecords({}, 1, 20, 'created_at', 'desc', userId, ipAddress);

      expect(result.anesthesia_records).toEqual(mockanesthesiaRecords);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply theatre_case_id filter', async () => {
      const filters = { theatre_case_id: '550e8400-e29b-41d4-a716-446655440001' };
      anesthesiaRecordRepository.findMany.mockResolvedValue(mockanesthesiaRecords);
      anesthesiaRecordRepository.count.mockResolvedValue(1);

      await anesthesiaRecordService.listAnesthesiaRecords(filters, 1, 20, null, 'asc', userId, ipAddress);

      expect(anesthesiaRecordRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          theatre_case_id: filters.theatre_case_id
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply anesthetist_user_id filter', async () => {
      const filters = { anesthetist_user_id: '550e8400-e29b-41d4-a716-446655440002' };
      anesthesiaRecordRepository.findMany.mockResolvedValue(mockanesthesiaRecords);
      anesthesiaRecordRepository.count.mockResolvedValue(1);

      await anesthesiaRecordService.listAnesthesiaRecords(filters, 1, 20, null, 'asc', userId, ipAddress);

      expect(anesthesiaRecordRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          anesthetist_user_id: filters.anesthetist_user_id
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle empty filters', async () => {
      const filters = {};
      anesthesiaRecordRepository.findMany.mockResolvedValue(mockanesthesiaRecords);
      anesthesiaRecordRepository.count.mockResolvedValue(1);

      await anesthesiaRecordService.listAnesthesiaRecords(filters, 1, 20, null, 'asc', userId, ipAddress);

      expect(anesthesiaRecordRepository.findMany).toHaveBeenCalledWith(
        {},
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination correctly', async () => {
      anesthesiaRecordRepository.findMany.mockResolvedValue(mockanesthesiaRecords);
      anesthesiaRecordRepository.count.mockResolvedValue(45);

      const result = await anesthesiaRecordService.listAnesthesiaRecords({}, 2, 20, null, 'asc', userId, ipAddress);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });

    it('should throw HttpError on repository error', async () => {
      anesthesiaRecordRepository.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        anesthesiaRecordService.listAnesthesiaRecords({}, 1, 20, null, 'asc', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getanesthesiaRecordById', () => {
    const mockanesthesiaRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      anesthetist_user_id: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    it('should get Anesthesia record by id', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(mockanesthesiaRecord);

      const result = await anesthesiaRecordService.getAnesthesiaRecordById(mockanesthesiaRecord.id, userId, ipAddress);

      expect(result).toEqual(mockanesthesiaRecord);
      expect(anesthesiaRecordRepository.findById).toHaveBeenCalledWith(mockanesthesiaRecord.id);
    });

    it('should throw HttpError when Anesthesia record not found', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(null);

      await expect(
        anesthesiaRecordService.getAnesthesiaRecordById('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on repository error', async () => {
      anesthesiaRecordRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(
        anesthesiaRecordService.getAnesthesiaRecordById('some-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createanesthesiaRecord', () => {
    const createData = {
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      anesthetist_user_id: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    const mockCreatedanesthesiaRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...createData
    };

    it('should create Anesthesia record', async () => {
      anesthesiaRecordRepository.create.mockResolvedValue(mockCreatedanesthesiaRecord);
      createAuditLog.mockResolvedValue({});

      const result = await anesthesiaRecordService.createAnesthesiaRecord(createData, userId, ipAddress);

      expect(result).toEqual(mockCreatedanesthesiaRecord);
      expect(anesthesiaRecordRepository.create).toHaveBeenCalledWith(createData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'CREATE',
        resource: 'anesthesia_record',
        resource_id: mockCreatedanesthesiaRecord.id,
        user_id: userId,
        ip_address: ipAddress,
        details: { anesthesia_record: mockCreatedanesthesiaRecord }
      });
    });

    it('should throw HttpError on repository error', async () => {
      anesthesiaRecordRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        anesthesiaRecordService.createAnesthesiaRecord(createData, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should propagate HttpError from repository', async () => {
      const httpError = new HttpError('errors.database.foreign_key_field', 400);
      anesthesiaRecordRepository.create.mockRejectedValue(httpError);

      await expect(
        anesthesiaRecordService.createAnesthesiaRecord(createData, userId, ipAddress)
      ).rejects.toThrow(httpError);
    });
  });

  describe('updateanesthesiaRecord', () => {
    const anesthesiaRecordId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'IN_PROGRESS'
    };

    const mockExistinganesthesiaRecord = {
      id: anesthesiaRecordId,
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      anesthetist_user_id: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    const mockUpdatedanesthesiaRecord = {
      ...mockExistinganesthesiaRecord,
      status: 'IN_PROGRESS'
    };

    it('should update Anesthesia record', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(mockExistinganesthesiaRecord);
      anesthesiaRecordRepository.update.mockResolvedValue(mockUpdatedanesthesiaRecord);
      createAuditLog.mockResolvedValue({});

      const result = await anesthesiaRecordService.updateAnesthesiaRecord(anesthesiaRecordId, updateData, userId, ipAddress);

      expect(result).toEqual(mockUpdatedanesthesiaRecord);
      expect(anesthesiaRecordRepository.findById).toHaveBeenCalledWith(anesthesiaRecordId);
      expect(anesthesiaRecordRepository.update).toHaveBeenCalledWith(anesthesiaRecordId, updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'UPDATE',
        resource: 'anesthesia_record',
        resource_id: anesthesiaRecordId,
        user_id: userId,
        ip_address: ipAddress,
        details: {
          old: mockExistinganesthesiaRecord,
          new: mockUpdatedanesthesiaRecord
        }
      });
    });

    it('should throw HttpError when Anesthesia record not found', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(null);

      await expect(
        anesthesiaRecordService.updateAnesthesiaRecord('non-existent-id', updateData, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on repository error', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(mockExistinganesthesiaRecord);
      anesthesiaRecordRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        anesthesiaRecordService.updateAnesthesiaRecord(anesthesiaRecordId, updateData, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteanesthesiaRecord', () => {
    const anesthesiaRecordId = '550e8400-e29b-41d4-a716-446655440000';

    const mockExistinganesthesiaRecord = {
      id: anesthesiaRecordId,
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      anesthetist_user_id: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    it('should delete Anesthesia record', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(mockExistinganesthesiaRecord);
      anesthesiaRecordRepository.softDelete.mockResolvedValue(mockExistinganesthesiaRecord);
      createAuditLog.mockResolvedValue({});

      await anesthesiaRecordService.deleteAnesthesiaRecord(anesthesiaRecordId, userId, ipAddress);

      expect(anesthesiaRecordRepository.findById).toHaveBeenCalledWith(anesthesiaRecordId);
      expect(anesthesiaRecordRepository.softDelete).toHaveBeenCalledWith(anesthesiaRecordId);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'DELETE',
        resource: 'anesthesia_record',
        resource_id: anesthesiaRecordId,
        user_id: userId,
        ip_address: ipAddress,
        details: { anesthesia_record: mockExistinganesthesiaRecord }
      });
    });

    it('should throw HttpError when Anesthesia record not found', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(null);

      await expect(
        anesthesiaRecordService.deleteAnesthesiaRecord('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on repository error', async () => {
      anesthesiaRecordRepository.findById.mockResolvedValue(mockExistinganesthesiaRecord);
      anesthesiaRecordRepository.softDelete.mockRejectedValue(new Error('Database error'));

      await expect(
        anesthesiaRecordService.deleteAnesthesiaRecord(anesthesiaRecordId, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
