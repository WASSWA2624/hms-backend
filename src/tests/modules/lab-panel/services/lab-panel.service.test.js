/**
 * Lab panel service tests
 *
 * @module tests/modules/lab-panel/services
 * @description Tests for lab panel service operations
 * Per testing.mdc: All services must be tested with mocked repositories
 */

const labPanelService = require('@services/lab-panel/lab-panel.service');
const labPanelRepository = require('@repositories/lab-panel/lab-panel.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/lab-panel/lab-panel.repository');
jest.mock('@lib/audit');

describe('Lab Panel Service', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listLabPanels', () => {
    it('should list lab panels with pagination successfully', async () => {
      const mockLabPanels = [
        { id: '1', name: 'Complete Metabolic Panel', code: 'CMP' },
        { id: '2', name: 'Basic Metabolic Panel', code: 'BMP' }
      ];

      labPanelRepository.findMany.mockResolvedValue(mockLabPanels);
      labPanelRepository.count.mockResolvedValue(2);

      const result = await labPanelService.listLabPanels({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.labPanels).toEqual(mockLabPanels);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
      expect(labPanelRepository.findMany).toHaveBeenCalled();
      expect(labPanelRepository.count).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      labPanelRepository.findMany.mockResolvedValue([]);
      labPanelRepository.count.mockResolvedValue(0);

      const filters = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Metabolic',
        code: 'CMP'
      };

      await labPanelService.listLabPanels(filters, 1, 20, 'name', 'asc', mockUserId, mockIpAddress);

      expect(labPanelRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: filters.tenant_id,
          name: { contains: 'Metabolic' },
          code: { contains: 'CMP' }
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply search filter correctly', async () => {
      labPanelRepository.findMany.mockResolvedValue([]);
      labPanelRepository.count.mockResolvedValue(0);

      const filters = { search: 'metabolic' };

      await labPanelService.listLabPanels(filters, 1, 20, 'name', 'asc', mockUserId, mockIpAddress);

      expect(labPanelRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          OR: [
            { name: { contains: 'metabolic' } },
            { code: { contains: 'metabolic' } }
          ]
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      labPanelRepository.findMany.mockResolvedValue([]);
      labPanelRepository.count.mockResolvedValue(45);

      const result = await labPanelService.listLabPanels({}, 2, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });

    it('should throw HttpError when repository throws', async () => {
      labPanelRepository.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        labPanelService.listLabPanels({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getLabPanelById', () => {
    it('should get lab panel by ID successfully', async () => {
      const mockLabPanel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complete Metabolic Panel',
        code: 'CMP'
      };

      labPanelRepository.findById.mockResolvedValue(mockLabPanel);

      const result = await labPanelService.getLabPanelById(
        '123e4567-e89b-12d3-a456-426614174000',
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockLabPanel);
      expect(labPanelRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw HttpError when lab panel not found', async () => {
      labPanelRepository.findById.mockResolvedValue(null);

      await expect(
        labPanelService.getLabPanelById('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError when repository throws', async () => {
      labPanelRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(
        labPanelService.getLabPanelById('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createLabPanel', () => {
    it('should create lab panel successfully and create audit log', async () => {
      const newLabPanel = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Complete Metabolic Panel',
        code: 'CMP'
      };

      const createdLabPanel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...newLabPanel,
        created_at: new Date(),
        updated_at: new Date()
      };

      labPanelRepository.create.mockResolvedValue(createdLabPanel);
      createAuditLog.mockResolvedValue(undefined);

      const result = await labPanelService.createLabPanel(newLabPanel, mockUserId, mockIpAddress);

      expect(result).toEqual(createdLabPanel);
      expect(labPanelRepository.create).toHaveBeenCalledWith(newLabPanel);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'create',
        entity: 'lab_panel',
        entity_id: createdLabPanel.id,
        diff: { after: createdLabPanel },
        ip: mockIpAddress
      });
    });

    it('should throw HttpError when repository throws', async () => {
      labPanelRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        labPanelService.createLabPanel({ name: 'Test' }, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should propagate HttpError from repository', async () => {
      const httpError = new HttpError('errors.database.unique_field', 409, [{ field: 'code' }]);
      labPanelRepository.create.mockRejectedValue(httpError);

      await expect(
        labPanelService.createLabPanel({ name: 'Test' }, mockUserId, mockIpAddress)
      ).rejects.toThrow(httpError);
    });
  });

  describe('updateLabPanel', () => {
    it('should update lab panel successfully and create audit log', async () => {
      const updateData = { name: 'Updated Lab Panel' };
      const beforeLabPanel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complete Metabolic Panel',
        code: 'CMP'
      };
      const afterLabPanel = {
        ...beforeLabPanel,
        ...updateData,
        updated_at: new Date()
      };

      labPanelRepository.findById.mockResolvedValue(beforeLabPanel);
      labPanelRepository.update.mockResolvedValue(afterLabPanel);
      createAuditLog.mockResolvedValue(undefined);

      const result = await labPanelService.updateLabPanel(
        '123e4567-e89b-12d3-a456-426614174000',
        updateData,
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(afterLabPanel);
      expect(labPanelRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(labPanelRepository.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'update',
        entity: 'lab_panel',
        entity_id: afterLabPanel.id,
        diff: { before: beforeLabPanel, after: afterLabPanel },
        ip: mockIpAddress
      });
    });

    it('should throw HttpError when lab panel not found', async () => {
      labPanelRepository.findById.mockResolvedValue(null);

      await expect(
        labPanelService.updateLabPanel(
          '123e4567-e89b-12d3-a456-426614174000',
          { name: 'Test' },
          mockUserId,
          mockIpAddress
        )
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError when repository throws', async () => {
      labPanelRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });
      labPanelRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        labPanelService.updateLabPanel(
          '123e4567-e89b-12d3-a456-426614174000',
          { name: 'Test' },
          mockUserId,
          mockIpAddress
        )
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteLabPanel', () => {
    it('should delete lab panel successfully and create audit log', async () => {
      const labPanel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complete Metabolic Panel',
        code: 'CMP'
      };
      const deletedLabPanel = {
        ...labPanel,
        deleted_at: new Date()
      };

      labPanelRepository.findById.mockResolvedValue(labPanel);
      labPanelRepository.softDelete.mockResolvedValue(deletedLabPanel);
      createAuditLog.mockResolvedValue(undefined);

      const result = await labPanelService.deleteLabPanel(
        '123e4567-e89b-12d3-a456-426614174000',
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(deletedLabPanel);
      expect(labPanelRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(labPanelRepository.softDelete).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'delete',
        entity: 'lab_panel',
        entity_id: deletedLabPanel.id,
        diff: { before: labPanel },
        ip: mockIpAddress
      });
    });

    it('should throw HttpError when lab panel not found', async () => {
      labPanelRepository.findById.mockResolvedValue(null);

      await expect(
        labPanelService.deleteLabPanel('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError when repository throws', async () => {
      labPanelRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });
      labPanelRepository.softDelete.mockRejectedValue(new Error('Database error'));

      await expect(
        labPanelService.deleteLabPanel('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
