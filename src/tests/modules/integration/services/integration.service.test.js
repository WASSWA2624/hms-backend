/**
 * Integration service tests
 *
 * @module tests/modules/integration/services
 * @description Tests for integration service functions
 */

const integrationService = require('@services/integration/integration.service');
const integrationRepository = require('@repositories/integration/integration.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const prisma = require('@prisma/client');

// Mock dependencies
jest.mock('@repositories/integration/integration.repository');
jest.mock('@lib/audit');
jest.mock('@prisma/client', () => ({
  $transaction: jest.fn(async (callback) => await callback())
}));

describe('Integration Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIntegrationById', () => {
    it('should return integration when found', async () => {
      const mockIntegration = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Integration',
        integration_type: 'HL7',
        status: 'ACTIVE'
      };

      integrationRepository.findById.mockResolvedValue(mockIntegration);

      const result = await integrationService.getIntegrationById(mockIntegration.id);

      expect(result).toEqual(mockIntegration);
      expect(integrationRepository.findById).toHaveBeenCalledWith(mockIntegration.id);
    });

    it('should throw HttpError when integration not found', async () => {
      integrationRepository.findById.mockResolvedValue(null);

      await expect(integrationService.getIntegrationById('non-existent-id'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('listIntegrations', () => {
    it('should return paginated integrations', async () => {
      const mockIntegrations = [
        { id: '1', name: 'Integration 1' },
        { id: '2', name: 'Integration 2' }
      ];

      integrationRepository.findMany.mockResolvedValue(mockIntegrations);
      integrationRepository.count.mockResolvedValue(10);

      const result = await integrationService.listIntegrations({}, 1, 20);

      expect(result.data).toEqual(mockIntegrations);
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
      const filters = {
        tenant_id: 'tenant-123',
        integration_type: 'HL7',
        status: 'ACTIVE',
        name: 'Test',
        search: 'integration'
      };

      integrationRepository.findMany.mockResolvedValue([]);
      integrationRepository.count.mockResolvedValue(0);

      await integrationService.listIntegrations(filters, 1, 20);

      expect(integrationRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'tenant-123',
          integration_type: 'HL7',
          status: 'ACTIVE',
          name: { contains: 'Test' },
          OR: [{ name: { contains: 'integration' } }]
        }),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should handle pagination correctly', async () => {
      integrationRepository.findMany.mockResolvedValue([]);
      integrationRepository.count.mockResolvedValue(100);

      const result = await integrationService.listIntegrations({}, 3, 20);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });
  });

  describe('createIntegration', () => {
    it('should create integration and audit log', async () => {
      const mockData = {
        tenant_id: 'tenant-123',
        integration_type: 'HL7',
        status: 'ACTIVE',
        name: 'New Integration'
      };

      const mockCreated = { id: 'new-id', ...mockData };
      integrationRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      const auditContext = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };

      const result = await integrationService.createIntegration(mockData, auditContext);

      expect(result).toEqual(mockCreated);
      expect(integrationRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'CREATE',
        entity: 'integration',
        entity_id: mockCreated.id,
        new_values: mockCreated,
        ...auditContext
      });
    });
  });

  describe('updateIntegration', () => {
    it('should update integration and create audit log', async () => {
      const existingIntegration = {
        id: 'integration-id',
        name: 'Old Name',
        status: 'INACTIVE'
      };

      const updateData = { name: 'New Name', status: 'ACTIVE' };
      const updatedIntegration = { ...existingIntegration, ...updateData };

      integrationRepository.findById.mockResolvedValue(existingIntegration);
      integrationRepository.update.mockResolvedValue(updatedIntegration);
      createAuditLog.mockResolvedValue({});

      const auditContext = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };

      const result = await integrationService.updateIntegration(
        'integration-id',
        updateData,
        auditContext
      );

      expect(result).toEqual(updatedIntegration);
      expect(integrationRepository.update).toHaveBeenCalledWith('integration-id', updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'UPDATE',
        entity: 'integration',
        entity_id: 'integration-id',
        old_values: existingIntegration,
        new_values: updatedIntegration,
        ...auditContext
      });
    });

    it('should throw HttpError when integration not found', async () => {
      integrationRepository.findById.mockResolvedValue(null);

      await expect(
        integrationService.updateIntegration('non-existent-id', {}, {})
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteIntegration', () => {
    it('should soft delete integration and create audit log', async () => {
      const existingIntegration = {
        id: 'integration-id',
        name: 'Test Integration'
      };

      const deletedIntegration = {
        ...existingIntegration,
        deleted_at: new Date()
      };

      integrationRepository.findById.mockResolvedValue(existingIntegration);
      integrationRepository.softDelete.mockResolvedValue(deletedIntegration);
      createAuditLog.mockResolvedValue({});

      const auditContext = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };

      const result = await integrationService.deleteIntegration('integration-id', auditContext);

      expect(result).toEqual(deletedIntegration);
      expect(integrationRepository.softDelete).toHaveBeenCalledWith('integration-id');
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'DELETE',
        entity: 'integration',
        entity_id: 'integration-id',
        old_values: existingIntegration,
        ...auditContext
      });
    });

    it('should throw HttpError when integration not found', async () => {
      integrationRepository.findById.mockResolvedValue(null);

      await expect(
        integrationService.deleteIntegration('non-existent-id', {})
      ).rejects.toThrow(HttpError);
    });
  });
});
