/**
 * License service
 *
 * @module modules/license/services
 * @description Business logic for license operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const licenseRepository = require('@repositories/license/license.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List licenses with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.tenant_id] - Filter by tenant ID
 * @param {string} [filters.license_type] - Filter by license type
 * @param {string} [filters.status] - Filter by status
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated licenses
 */
const listLicenses = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.tenant_id) {
    repoFilters.tenant_id = filters.tenant_id;
  }

  if (filters.license_type) {
    repoFilters.license_type = filters.license_type;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch licenses and count
  const [licenses, total] = await Promise.all([
    licenseRepository.findMany(repoFilters, skip, limit, orderBy),
    licenseRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    licenses,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }
  };
};

/**
 * Get license by ID
 *
 * @param {string} id - License ID
 * @returns {Promise<Object>} License data
 */
const getLicenseById = async (id) => {
  const license = await licenseRepository.findById(id);

  if (!license) {
    throw new HttpError('errors.license.not_found', 404);
  }

  return license;
};

/**
 * Create new license
 * Per module-creation.mdc: All mutations must call createAuditLog
 *
 * @param {Object} data - License data
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Created license
 */
const createLicense = async (data, context) => {
  const license = await licenseRepository.create(data);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'CREATE',
    entity: 'license',
    entity_id: license.id,
    diff_json: { after: license },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(() => {});

  return license;
};

/**
 * Update license
 * Per module-creation.mdc: All mutations must call createAuditLog
 *
 * @param {string} id - License ID
 * @param {Object} data - Update data
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Updated license
 */
const updateLicense = async (id, data, context) => {
  // Get existing license for audit diff
  const existingLicense = await licenseRepository.findById(id);

  if (!existingLicense) {
    throw new HttpError('errors.license.not_found', 404);
  }

  const updatedLicense = await licenseRepository.update(id, data);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'UPDATE',
    entity: 'license',
    entity_id: updatedLicense.id,
    diff_json: { before: existingLicense, after: updatedLicense },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(() => {});

  return updatedLicense;
};

/**
 * Soft delete license
 * Per module-creation.mdc: All mutations must call createAuditLog
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - License ID
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Deleted license
 */
const deleteLicense = async (id, context) => {
  // Get existing license for audit
  const existingLicense = await licenseRepository.findById(id);

  if (!existingLicense) {
    throw new HttpError('errors.license.not_found', 404);
  }

  const deletedLicense = await licenseRepository.softDelete(id);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'DELETE',
    entity: 'license',
    entity_id: deletedLicense.id,
    diff_json: { before: existingLicense },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(() => {});

  return deletedLicense;
};

module.exports = {
  listLicenses,
  getLicenseById,
  createLicense,
  updateLicense,
  deleteLicense
};



