/**
 * Report run service
 *
 * @module modules/report-run/services
 * @description Business logic for report run operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const reportRunRepository = require('@repositories/report-run/report-run.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List report runs with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.tenant_id] - Filter by tenant ID
 * @param {string} [filters.report_definition_id] - Filter by report definition ID
 * @param {string} [filters.format] - Filter by format
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.created_by] - Filter by creator ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated report runs
 */
const listReportRuns = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.tenant_id) {
    repoFilters.tenant_id = filters.tenant_id;
  }

  if (filters.report_definition_id) {
    repoFilters.report_definition_id = filters.report_definition_id;
  }

  if (filters.format) {
    repoFilters.format = filters.format;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  if (filters.created_by) {
    repoFilters.created_by = filters.created_by;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch report runs and count
  const [reportRuns, total] = await Promise.all([
    reportRunRepository.findMany(repoFilters, skip, limit, orderBy),
    reportRunRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    reportRuns,
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
 * Get report run by ID
 *
 * @param {string} id - Report run ID
 * @returns {Promise<Object>} Report run data
 */
const getReportRunById = async (id) => {
  const reportRun = await reportRunRepository.findById(id);
  
  if (!reportRun) {
    throw new HttpError('errors.report_run.not_found', 404);
  }

  return reportRun;
};

/**
 * Create new report run
 *
 * @param {Object} data - Report run data
 * @param {string} data.tenant_id - Tenant ID
 * @param {string} data.report_definition_id - Report definition ID
 * @param {string} data.format - Report format (PDF, EXCEL, CSV, JSON)
 * @param {Object} [data.parameters] - Parameter values JSON
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created report run
 */
const createReportRun = async (data, context = {}) => {
  // Add created_by to data
  const dataWithCreator = {
    ...data,
    created_by: context.user_id || null
  };

  // Create report run
  const reportRun = await reportRunRepository.create(dataWithCreator);

  // Create audit log
  await createAuditLog({
    action: 'REPORT_RUN_CREATED',
    entity: 'report_run',
    entity_id: reportRun.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: reportRun.tenant_id,
      report_definition_id: reportRun.report_definition_id,
      format: reportRun.format,
      created_by: reportRun.created_by
    }
  });

  return reportRun;
};

/**
 * Update report run
 *
 * @param {string} id - Report run ID
 * @param {Object} data - Update data
 * @param {string} [data.status] - Report run status
 * @param {string} [data.file_path] - File path for generated report
 * @param {string} [data.error_message] - Error message if failed
 * @param {string} [data.started_at] - When processing started
 * @param {string} [data.completed_at] - When processing completed
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated report run
 */
const updateReportRun = async (id, data, context = {}) => {
  // Check if report run exists and get before state
  const beforeReportRun = await reportRunRepository.findById(id);
  
  if (!beforeReportRun) {
    throw new HttpError('errors.report_run.not_found', 404);
  }

  // Convert datetime strings to Date objects if present
  const updateData = { ...data };
  if (updateData.started_at) {
    updateData.started_at = new Date(updateData.started_at);
  }
  if (updateData.completed_at) {
    updateData.completed_at = new Date(updateData.completed_at);
  }

  // Update report run
  const reportRun = await reportRunRepository.update(id, updateData);

  // Create audit log
  await createAuditLog({
    action: 'REPORT_RUN_UPDATED',
    entity: 'report_run',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        status: beforeReportRun.status,
        file_path: beforeReportRun.file_path,
        error_message: beforeReportRun.error_message
      },
      after: {
        status: reportRun.status,
        file_path: reportRun.file_path,
        error_message: reportRun.error_message
      }
    }
  });

  return reportRun;
};

/**
 * Delete report run (soft delete)
 *
 * @param {string} id - Report run ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteReportRun = async (id, context = {}) => {
  // Check if report run exists
  const reportRun = await reportRunRepository.findById(id);
  
  if (!reportRun) {
    throw new HttpError('errors.report_run.not_found', 404);
  }

  // Soft delete report run
  await reportRunRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'REPORT_RUN_DELETED',
    entity: 'report_run',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: reportRun.tenant_id,
      report_definition_id: reportRun.report_definition_id,
      format: reportRun.format,
      status: reportRun.status,
      created_by: reportRun.created_by
    }
  });
};

module.exports = {
  listReportRuns,
  getReportRunById,
  createReportRun,
  updateReportRun,
  deleteReportRun
};
