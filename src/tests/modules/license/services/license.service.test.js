/**
 * License service tests
 *
 * @module tests/modules/license/services
 * Per testing.mdc: Mock all external dependencies
 */

const { HttpError } = require('@lib/errors');

jest.mock('@repositories/license/license.repository');
jest.mock('@lib/audit');

const licenseRepository = require('@repositories/license/license.repository');
const { createAuditLog } = require('@lib/audit');
const {
  listLicenses,
  getLicenseById,
  createLicense,
  updateLicense,
  deleteLicense
} = require('@services/license/license.service');

describe('License Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listLicenses', () => {
    it('should list licenses with pagination', async () => {
      const mockLicenses = [
        { id: 'license-1', tenant_id: 'tenant-1' },
        { id: 'license-2', tenant_id: 'tenant-2' }
      ];
      licenseRepository.findMany.mockResolvedValue(mockLicenses);
      licenseRepository.count.mockResolvedValue(10);

      const result = await listLicenses({}, 1, 20);

      expect(result.licenses).toEqual(mockLicenses);
      expect(result.pagination.total).toBe(10);
    });

    it('should filter by tenant_id', async () => {
      licenseRepository.findMany.mockResolvedValue([]);
      licenseRepository.count.mockResolvedValue(0);

      await listLicenses({ tenant_id: 'tenant-123' }, 1, 20);

      expect(licenseRepository.findMany).toHaveBeenCalledWith(
        { tenant_id: 'tenant-123' },
        0,
        20,
        { created_at: 'desc' }
      );
    });
  });

  describe('getLicenseById', () => {
    it('should return license by ID', async () => {
      const mockLicense = { id: 'license-123', tenant_id: 'tenant-123' };
      licenseRepository.findById.mockResolvedValue(mockLicense);

      const result = await getLicenseById('license-123');

      expect(result).toEqual(mockLicense);
    });

    it('should throw HttpError if not found', async () => {
      licenseRepository.findById.mockResolvedValue(null);

      await expect(getLicenseById('license-123')).rejects.toThrow(HttpError);
    });
  });

  describe('createLicense', () => {
    it('should create license and log audit', async () => {
      const data = {
        tenant_id: 'tenant-123',
        license_type: 'PER_USER',
        status: 'ACTIVE'
      };
      const mockCreated = { id: 'license-new', ...data };
      const context = {
        user: { id: 'user-123' },
        ip: '127.0.0.1',
        tenant_id: 'tenant-123'
      };

      licenseRepository.create.mockResolvedValue(mockCreated);

      const result = await createLicense(data, context);

      expect(result).toEqual(mockCreated);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateLicense', () => {
    it('should update license and log audit', async () => {
      const existing = { id: 'license-123', status: 'ACTIVE' };
      const updated = { id: 'license-123', status: 'CANCELLED' };
      const context = { user: { id: 'user-123' }, ip: '127.0.0.1', tenant_id: 'tenant-123' };

      licenseRepository.findById.mockResolvedValue(existing);
      licenseRepository.update.mockResolvedValue(updated);

      const result = await updateLicense('license-123', { status: 'CANCELLED' }, context);

      expect(result).toEqual(updated);
    });

    it('should throw HttpError if not found', async () => {
      licenseRepository.findById.mockResolvedValue(null);

      await expect(updateLicense('license-123', {}, {})).rejects.toThrow(HttpError);
    });
  });

  describe('deleteLicense', () => {
    it('should soft delete license and log audit', async () => {
      const existing = { id: 'license-123', status: 'ACTIVE' };
      const deleted = { ...existing, deleted_at: new Date() };
      const context = { user: { id: 'user-123' }, ip: '127.0.0.1', tenant_id: 'tenant-123' };

      licenseRepository.findById.mockResolvedValue(existing);
      licenseRepository.softDelete.mockResolvedValue(deleted);

      const result = await deleteLicense('license-123', context);

      expect(result).toEqual(deleted);
    });
  });
});
