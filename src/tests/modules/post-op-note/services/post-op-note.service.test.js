/**
 * Post-op note service tests
 *
 * @module tests/modules/post-op-note/services
 * @description Tests for Post-op note business logic layer
 * Per testing.mdc: Service tests must mock repositories
 */

const postOpNoteService = require('@services/post-op-note/post-op-note.service');
const postOpNoteRepository = require('@repositories/post-op-note/post-op-note.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/post-op-note/post-op-note.repository');
jest.mock('@lib/audit');

describe('Post-op note Service', () => {
  const userId = 'user-123';
  const ipAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listpostOpNotes', () => {
    const mockpostOpNotes = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
        note: '550e8400-e29b-41d4-a716-446655440002',
        notes: 'Test notes'
      }
    ];

    it('should list Post-op notes with pagination', async () => {
      postOpNoteRepository.findMany.mockResolvedValue(mockpostOpNotes);
      postOpNoteRepository.count.mockResolvedValue(1);

      const result = await postOpNoteService.listpostOpNotes({}, 1, 20, 'created_at', 'desc', userId, ipAddress);

      expect(result.post_op_notes).toEqual(mockpostOpNotes);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply encounter_id filter', async () => {
      const filters = { encounter_id: '550e8400-e29b-41d4-a716-446655440001' };
      postOpNoteRepository.findMany.mockResolvedValue(mockpostOpNotes);
      postOpNoteRepository.count.mockResolvedValue(1);

      await postOpNoteService.listpostOpNotes(filters, 1, 20, null, 'asc', userId, ipAddress);

      expect(postOpNoteRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          encounter_id: filters.encounter_id
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply status filter', async () => {
      const filters = { notes: 'Test notes' };
      postOpNoteRepository.findMany.mockResolvedValue(mockpostOpNotes);
      postOpNoteRepository.count.mockResolvedValue(1);

      await postOpNoteService.listpostOpNotes(filters, 1, 20, null, 'asc', userId, ipAddress);

      expect(postOpNoteRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Test notes'
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply date range filters', async () => {
      const filters = {
        scheduled_from: '2026-01-20T00:00:00.000Z',
        scheduled_to: '2026-01-20T23:59:59.000Z'
      };
      postOpNoteRepository.findMany.mockResolvedValue(mockpostOpNotes);
      postOpNoteRepository.count.mockResolvedValue(1);

      await postOpNoteService.listpostOpNotes(filters, 1, 20, null, 'asc', userId, ipAddress);

      expect(postOpNoteRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduled_at: {
            gte: new Date(filters.scheduled_from),
            lte: new Date(filters.scheduled_to)
          }
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination correctly', async () => {
      postOpNoteRepository.findMany.mockResolvedValue(mockpostOpNotes);
      postOpNoteRepository.count.mockResolvedValue(45);

      const result = await postOpNoteService.listpostOpNotes({}, 2, 20, null, 'asc', userId, ipAddress);

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
      postOpNoteRepository.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        postOpNoteService.listpostOpNotes({}, 1, 20, null, 'asc', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getpostOpNoteById', () => {
    const mockpostOpNote = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      note: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    it('should get Post-op note by id', async () => {
      postOpNoteRepository.findById.mockResolvedValue(mockpostOpNote);

      const result = await postOpNoteService.getpostOpNoteById(mockpostOpNote.id, userId, ipAddress);

      expect(result).toEqual(mockpostOpNote);
      expect(postOpNoteRepository.findById).toHaveBeenCalledWith(mockpostOpNote.id);
    });

    it('should throw HttpError when Post-op note not found', async () => {
      postOpNoteRepository.findById.mockResolvedValue(null);

      await expect(
        postOpNoteService.getpostOpNoteById('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on repository error', async () => {
      postOpNoteRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(
        postOpNoteService.getpostOpNoteById('some-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createpostOpNote', () => {
    const createData = {
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      note: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    const mockCreatedpostOpNote = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...createData
    };

    it('should create Post-op note', async () => {
      postOpNoteRepository.create.mockResolvedValue(mockCreatedpostOpNote);
      createAuditLog.mockResolvedValue({});

      const result = await postOpNoteService.createpostOpNote(createData, userId, ipAddress);

      expect(result).toEqual(mockCreatedpostOpNote);
      expect(postOpNoteRepository.create).toHaveBeenCalledWith(createData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'CREATE',
        resource: 'post_op_note',
        resource_id: mockCreatedpostOpNote.id,
        user_id: userId,
        ip_address: ipAddress,
        details: { post_op_note: mockCreatedpostOpNote }
      });
    });

    it('should throw HttpError on repository error', async () => {
      postOpNoteRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        postOpNoteService.createpostOpNote(createData, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should propagate HttpError from repository', async () => {
      const httpError = new HttpError('errors.database.foreign_key_field', 400);
      postOpNoteRepository.create.mockRejectedValue(httpError);

      await expect(
        postOpNoteService.createpostOpNote(createData, userId, ipAddress)
      ).rejects.toThrow(httpError);
    });
  });

  describe('updatepostOpNote', () => {
    const postOpNoteId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'IN_PROGRESS'
    };

    const mockExistingpostOpNote = {
      id: postOpNoteId,
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      note: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    const mockUpdatedpostOpNote = {
      ...mockExistingpostOpNote,
      status: 'IN_PROGRESS'
    };

    it('should update Post-op note', async () => {
      postOpNoteRepository.findById.mockResolvedValue(mockExistingpostOpNote);
      postOpNoteRepository.update.mockResolvedValue(mockUpdatedpostOpNote);
      createAuditLog.mockResolvedValue({});

      const result = await postOpNoteService.updatepostOpNote(postOpNoteId, updateData, userId, ipAddress);

      expect(result).toEqual(mockUpdatedpostOpNote);
      expect(postOpNoteRepository.findById).toHaveBeenCalledWith(postOpNoteId);
      expect(postOpNoteRepository.update).toHaveBeenCalledWith(postOpNoteId, updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'UPDATE',
        resource: 'post_op_note',
        resource_id: postOpNoteId,
        user_id: userId,
        ip_address: ipAddress,
        details: {
          old: mockExistingpostOpNote,
          new: mockUpdatedpostOpNote
        }
      });
    });

    it('should throw HttpError when Post-op note not found', async () => {
      postOpNoteRepository.findById.mockResolvedValue(null);

      await expect(
        postOpNoteService.updatepostOpNote('non-existent-id', updateData, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on repository error', async () => {
      postOpNoteRepository.findById.mockResolvedValue(mockExistingpostOpNote);
      postOpNoteRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        postOpNoteService.updatepostOpNote(postOpNoteId, updateData, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deletepostOpNote', () => {
    const postOpNoteId = '550e8400-e29b-41d4-a716-446655440000';

    const mockExistingpostOpNote = {
      id: postOpNoteId,
      theatre_case_id: '550e8400-e29b-41d4-a716-446655440001',
      note: '550e8400-e29b-41d4-a716-446655440002',
      notes: 'Test notes'
    };

    it('should delete Post-op note', async () => {
      postOpNoteRepository.findById.mockResolvedValue(mockExistingpostOpNote);
      postOpNoteRepository.softDelete.mockResolvedValue(mockExistingpostOpNote);
      createAuditLog.mockResolvedValue({});

      await postOpNoteService.deletepostOpNote(postOpNoteId, userId, ipAddress);

      expect(postOpNoteRepository.findById).toHaveBeenCalledWith(postOpNoteId);
      expect(postOpNoteRepository.softDelete).toHaveBeenCalledWith(postOpNoteId);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'DELETE',
        resource: 'post_op_note',
        resource_id: postOpNoteId,
        user_id: userId,
        ip_address: ipAddress,
        details: { post_op_note: mockExistingpostOpNote }
      });
    });

    it('should throw HttpError when Post-op note not found', async () => {
      postOpNoteRepository.findById.mockResolvedValue(null);

      await expect(
        postOpNoteService.deletepostOpNote('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on repository error', async () => {
      postOpNoteRepository.findById.mockResolvedValue(mockExistingpostOpNote);
      postOpNoteRepository.softDelete.mockRejectedValue(new Error('Database error'));

      await expect(
        postOpNoteService.deletepostOpNote(postOpNoteId, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
