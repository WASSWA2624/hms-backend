/**
 * Module service tests
 *
 * @module tests/modules/module/services
 * Per testing.mdc: Mock all external dependencies
 */

const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/module/module.repository');
jest.mock('@lib/audit');

const moduleRepository = require('@repositories/module/module.repository');
const { createAuditLog } = require('@lib/audit');
const {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule
} = require('@services/module/module.service');

describe('Module Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock audit log to return resolved promise
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listModules', () => {
    it('should list modules with default pagination', async () => {
      const mockModules = [
        { id: 'module-1', name: 'Module A' },
        { id: 'module-2', name: 'Module B' }
      ];
      moduleRepository.findMany.mockResolvedValue(mockModules);
      moduleRepository.count.mockResolvedValue(10);

      const result = await listModules({}, 1, 20);

      expect(result.modules).toEqual(mockModules);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
      expect(moduleRepository.findMany).toHaveBeenCalledWith(
        {},
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by search term', async () => {
      const mockModules = [{ id: 'module-1', name: 'Test Module' }];
      moduleRepository.findMany.mockResolvedValue(mockModules);
      moduleRepository.count.mockResolvedValue(1);

      const result = await listModules({ search: 'test' }, 1, 20);

      expect(result.modules).toEqual(mockModules);
      expect(moduleRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } }
          ])
        }),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should calculate pagination correctly for multiple pages', async () => {
      const mockModules = [{ id: 'module-1', name: 'Module A' }];
      moduleRepository.findMany.mockResolvedValue(mockModules);
      moduleRepository.count.mockResolvedValue(50);

      const result = await listModules({}, 2, 20);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
      expect(moduleRepository.findMany).toHaveBeenCalledWith(
        {},
        20,
        20,
        { created_at: 'desc' }
      );
    });

    it('should use custom sort order', async () => {
      const mockModules = [{ id: 'module-1', name: 'Module A' }];
      moduleRepository.findMany.mockResolvedValue(mockModules);
      moduleRepository.count.mockResolvedValue(1);

      await listModules({}, 1, 20, 'name', 'asc');

      expect(moduleRepository.findMany).toHaveBeenCalledWith(
        {},
        0,
        20,
        { name: 'asc' }
      );
    });
  });

  describe('getModuleById', () => {
    it('should return module by ID', async () => {
      const mockModule = { id: 'module-123', name: 'Test Module' };
      moduleRepository.findById.mockResolvedValue(mockModule);

      const result = await getModuleById('module-123');

      expect(result).toEqual(mockModule);
      expect(moduleRepository.findById).toHaveBeenCalledWith('module-123');
    });

    it('should throw HttpError if module not found', async () => {
      moduleRepository.findById.mockResolvedValue(null);

      await expect(getModuleById('module-123'))
        .rejects
        .toThrow(HttpError);
      await expect(getModuleById('module-123'))
        .rejects
        .toThrow('errors.module.not_found');
    });
  });

  describe('createModule', () => {
    it('should create a new module and log audit', async () => {
      const moduleData = {
        name: 'New Module',
        description: 'New description'
      };
      const mockCreatedModule = {
        id: 'module-new',
        ...moduleData,
        created_at: new Date(),
        updated_at: new Date()
      };
      const context = {
        user: { id: 'user-123' },
        ip: '127.0.0.1',
        tenant_id: 'tenant-123'
      };

      moduleRepository.create.mockResolvedValue(mockCreatedModule);

      const result = await createModule(moduleData, context);

      expect(result).toEqual(mockCreatedModule);
      expect(moduleRepository.create).toHaveBeenCalledWith(moduleData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'CREATE',
        entity: 'module',
        entity_id: 'module-new',
        diff_json: { after: mockCreatedModule },
        ip_address: '127.0.0.1',
        tenant_id: 'tenant-123'
      });
    });

    it('should create module even if audit log fails', async () => {
      const moduleData = {
        name: 'New Module',
        description: 'New description'
      };
      const mockCreatedModule = {
        id: 'module-new',
        ...moduleData
      };
      const context = {
        user: { id: 'user-123' },
        ip: '127.0.0.1',
        tenant_id: 'tenant-123'
      };

      moduleRepository.create.mockResolvedValue(mockCreatedModule);
      createAuditLog.mockReturnValue(Promise.reject(new Error('Audit failed')));

      const result = await createModule(moduleData, context);

      expect(result).toEqual(mockCreatedModule);
    });
  });

  describe('updateModule', () => {
    it('should update module and log audit', async () => {
      const updateData = {
        name: 'Updated Module'
      };
      const existingModule = {
        id: 'module-123',
        name: 'Old Module',
        description: 'Old description'
      };
      const updatedModule = {
        id: 'module-123',
        name: 'Updated Module',
        description: 'Old description'
      };
      const context = {
        user: { id: 'user-123' },
        ip: '127.0.0.1',
        tenant_id: 'tenant-123'
      };

      moduleRepository.findById.mockResolvedValue(existingModule);
      moduleRepository.update.mockResolvedValue(updatedModule);

      const result = await updateModule('module-123', updateData, context);

      expect(result).toEqual(updatedModule);
      expect(moduleRepository.findById).toHaveBeenCalledWith('module-123');
      expect(moduleRepository.update).toHaveBeenCalledWith('module-123', updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'UPDATE',
        entity: 'module',
        entity_id: 'module-123',
        diff_json: { before: existingModule, after: updatedModule },
        ip_address: '127.0.0.1',
        tenant_id: 'tenant-123'
      });
    });

    it('should throw HttpError if module not found', async () => {
      moduleRepository.findById.mockResolvedValue(null);

      await expect(updateModule('module-123', { name: 'Updated' }, {}))
        .rejects
        .toThrow(HttpError);
      await expect(updateModule('module-123', { name: 'Updated' }, {}))
        .rejects
        .toThrow('errors.module.not_found');
    });
  });

  describe('deleteModule', () => {
    it('should soft delete module and log audit', async () => {
      const existingModule = {
        id: 'module-123',
        name: 'Test Module',
        description: 'Test description'
      };
      const deletedModule = {
        ...existingModule,
        deleted_at: new Date()
      };
      const context = {
        user: { id: 'user-123' },
        ip: '127.0.0.1',
        tenant_id: 'tenant-123'
      };

      moduleRepository.findById.mockResolvedValue(existingModule);
      moduleRepository.softDelete.mockResolvedValue(deletedModule);

      const result = await deleteModule('module-123', context);

      expect(result).toEqual(deletedModule);
      expect(moduleRepository.findById).toHaveBeenCalledWith('module-123');
      expect(moduleRepository.softDelete).toHaveBeenCalledWith('module-123');
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-123',
        action: 'DELETE',
        entity: 'module',
        entity_id: 'module-123',
        diff_json: { before: existingModule },
        ip_address: '127.0.0.1',
        tenant_id: 'tenant-123'
      });
    });

    it('should throw HttpError if module not found', async () => {
      moduleRepository.findById.mockResolvedValue(null);

      await expect(deleteModule('module-123', {}))
        .rejects
        .toThrow(HttpError);
      await expect(deleteModule('module-123', {}))
        .rejects
        .toThrow('errors.module.not_found');
    });
  });
});
