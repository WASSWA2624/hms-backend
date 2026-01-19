/**
 * Follow-up service tests
 *
 * @module tests/modules/follow-up/services
 * Per testing.mdc: Test business logic with mocked repositories
 */

const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/follow-up/follow-up.repository');
jest.mock('@lib/audit');

const followUpRepository = require('@repositories/follow-up/follow-up.repository');
const { createAuditLog } = require('@lib/audit');
const {
  listFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp
} = require('@services/follow-up/follow-up.service');

describe('Follow-up Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue();
  });

  describe('listFollowUps', () => {
    it('should list follow-ups with pagination', async () => {
      const mockFollowUps = [{ id: 'fu-1' }, { id: 'fu-2' }];
      followUpRepository.findMany.mockResolvedValue(mockFollowUps);
      followUpRepository.count.mockResolvedValue(2);

      const result = await listFollowUps({}, 1, 20, 'created_at', 'desc', 'user-1', '127.0.0.1');

      expect(result.followUps).toEqual(mockFollowUps);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getFollowUpById', () => {
    it('should get follow-up by ID', async () => {
      const mockFollowUp = { id: 'fu-1' };
      followUpRepository.findById.mockResolvedValue(mockFollowUp);

      const result = await getFollowUpById('fu-1', 'user-1', '127.0.0.1');

      expect(result).toEqual(mockFollowUp);
    });

    it('should throw HttpError if not found', async () => {
      followUpRepository.findById.mockResolvedValue(null);

      await expect(getFollowUpById('fu-1', 'user-1', '127.0.0.1'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('createFollowUp', () => {
    it('should create follow-up and audit log', async () => {
      const mockFollowUp = { id: 'fu-1' };
      followUpRepository.create.mockResolvedValue(mockFollowUp);

      const result = await createFollowUp(
        { encounter_id: 'enc-1', scheduled_at: '2026-01-25' },
        'user-1',
        '127.0.0.1'
      );

      expect(result).toEqual(mockFollowUp);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateFollowUp', () => {
    it('should update follow-up and audit log', async () => {
      const mockBefore = { id: 'fu-1', notes: 'Old notes' };
      const mockAfter = { id: 'fu-1', notes: 'New notes' };
      followUpRepository.findById.mockResolvedValue(mockBefore);
      followUpRepository.update.mockResolvedValue(mockAfter);

      const result = await updateFollowUp('fu-1', { notes: 'New notes' }, 'user-1', '127.0.0.1');

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should throw HttpError if not found', async () => {
      followUpRepository.findById.mockResolvedValue(null);

      await expect(updateFollowUp('fu-1', {}, 'user-1', '127.0.0.1'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('deleteFollowUp', () => {
    it('should soft delete follow-up and audit log', async () => {
      const mockFollowUp = { id: 'fu-1' };
      followUpRepository.findById.mockResolvedValue(mockFollowUp);
      followUpRepository.softDelete.mockResolvedValue(mockFollowUp);

      await deleteFollowUp('fu-1', 'user-1', '127.0.0.1');

      expect(followUpRepository.softDelete).toHaveBeenCalledWith('fu-1');
      expect(createAuditLog).toHaveBeenCalled();
    });

    it('should throw HttpError if not found', async () => {
      followUpRepository.findById.mockResolvedValue(null);

      await expect(deleteFollowUp('fu-1', 'user-1', '127.0.0.1'))
        .rejects
        .toThrow(HttpError);
    });
  });
});
