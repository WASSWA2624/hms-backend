/**
 * Anesthesia record controller tests
 *
 * @module tests/modules/anesthesia-record/controllers
 * @description Tests for Anesthesia record request handlers
 * Per testing.mdc: Controller tests must mock services
 */

const anesthesiaRecordController = require('@controllers/anesthesia-record/anesthesia-record.controller');
const anesthesiaRecordService = require('@services/anesthesia-record/anesthesia-record.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');

// Mock dependencies
jest.mock('@services/anesthesia-record/anesthesia-record.service');
jest.mock('@lib/response');

describe('Anesthesia record Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 'user-123' },
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('listanesthesiaRecords', () => {
    const mockResult = {
      anesthesia_records: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          encounter_id: '550e8400-e29b-41d4-a716-446655440001',
          scheduled_at: new Date('2026-01-20T10:00:00.000Z'),
          status: 'SCHEDULED'
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      }
    };

    it('should list Anesthesia records with default pagination', async () => {
      req.query = {};
      anesthesiaRecordService.listanesthesiaRecords.mockResolvedValue(mockResult);

      await anesthesiaRecordController.listanesthesiaRecords(req, res);

      expect(anesthesiaRecordService.listanesthesiaRecords).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20,
        undefined,
        'asc',
        'user-123',
        '127.0.0.1'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        res,
        'messages.anesthesia_record.list.success',
        mockResult.anesthesia_records,
        mockResult.pagination
      );
    });

    it('should list Anesthesia records with custom pagination', async () => {
      req.query = { page: '2', limit: '10', sort_by: 'scheduled_at', order: 'desc' };
      anesthesiaRecordService.listanesthesiaRecords.mockResolvedValue(mockResult);

      await anesthesiaRecordController.listanesthesiaRecords(req, res);

      expect(anesthesiaRecordService.listanesthesiaRecords).toHaveBeenCalledWith(
        expect.any(Object),
        2,
        10,
        'scheduled_at',
        'desc',
        'user-123',
        '127.0.0.1'
      );
    });

    it('should list Anesthesia records with filters', async () => {
      req.query = {
        encounter_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'SCHEDULED',
        scheduled_from: '2026-01-20T00:00:00.000Z',
        scheduled_to: '2026-01-20T23:59:59.000Z'
      };
      anesthesiaRecordService.listanesthesiaRecords.mockResolvedValue(mockResult);

      await anesthesiaRecordController.listanesthesiaRecords(req, res);

      expect(anesthesiaRecordService.listanesthesiaRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          encounter_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'SCHEDULED',
          scheduled_from: '2026-01-20T00:00:00.000Z',
          scheduled_to: '2026-01-20T23:59:59.000Z'
        }),
        1,
        20,
        undefined,
        'asc',
        'user-123',
        '127.0.0.1'
      );
    });
  });

  describe('getanesthesiaRecordById', () => {
    const mockanesthesiaRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      encounter_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: new Date('2026-01-20T10:00:00.000Z'),
      status: 'SCHEDULED'
    };

    it('should get Anesthesia record by id', async () => {
      req.params = { id: mockanesthesiaRecord.id };
      anesthesiaRecordService.getanesthesiaRecordById.mockResolvedValue(mockanesthesiaRecord);

      await anesthesiaRecordController.getanesthesiaRecordById(req, res);

      expect(anesthesiaRecordService.getanesthesiaRecordById).toHaveBeenCalledWith(
        mockanesthesiaRecord.id,
        'user-123',
        '127.0.0.1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        200,
        'messages.anesthesia_record.get.success',
        mockanesthesiaRecord
      );
    });
  });

  describe('createanesthesiaRecord', () => {
    const createData = {
      encounter_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-01-20T10:00:00.000Z',
      status: 'SCHEDULED'
    };

    const mockCreatedanesthesiaRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...createData
    };

    it('should create Anesthesia record', async () => {
      req.body = createData;
      anesthesiaRecordService.createanesthesiaRecord.mockResolvedValue(mockCreatedanesthesiaRecord);

      await anesthesiaRecordController.createanesthesiaRecord(req, res);

      expect(anesthesiaRecordService.createanesthesiaRecord).toHaveBeenCalledWith(
        createData,
        'user-123',
        '127.0.0.1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        201,
        'messages.anesthesia_record.create.success',
        mockCreatedanesthesiaRecord
      );
    });
  });

  describe('updateanesthesiaRecord', () => {
    const updateData = {
      status: 'IN_PROGRESS'
    };

    const mockUpdatedanesthesiaRecord = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      encounter_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: new Date('2026-01-20T10:00:00.000Z'),
      status: 'IN_PROGRESS'
    };

    it('should update Anesthesia record', async () => {
      req.params = { id: mockUpdatedanesthesiaRecord.id };
      req.body = updateData;
      anesthesiaRecordService.updateanesthesiaRecord.mockResolvedValue(mockUpdatedanesthesiaRecord);

      await anesthesiaRecordController.updateanesthesiaRecord(req, res);

      expect(anesthesiaRecordService.updateanesthesiaRecord).toHaveBeenCalledWith(
        mockUpdatedanesthesiaRecord.id,
        updateData,
        'user-123',
        '127.0.0.1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        200,
        'messages.anesthesia_record.update.success',
        mockUpdatedanesthesiaRecord
      );
    });
  });

  describe('deleteanesthesiaRecord', () => {
    it('should delete Anesthesia record', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      req.params = { id };
      anesthesiaRecordService.deleteanesthesiaRecord.mockResolvedValue();

      await anesthesiaRecordController.deleteanesthesiaRecord(req, res);

      expect(anesthesiaRecordService.deleteanesthesiaRecord).toHaveBeenCalledWith(
        id,
        'user-123',
        '127.0.0.1'
      );
      expect(sendNoContent).toHaveBeenCalledWith(res);
    });
  });
});
