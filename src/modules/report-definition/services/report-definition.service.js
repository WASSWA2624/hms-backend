/**
 * Report definition service
 *
 * @module modules/report-definition/services
 * @description Business logic for report definition operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const reportDefinitionRepository = require('@repositories/report-definition/report-definition.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List report definitions with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.tenant_id] - Filter by tenant ID
 * @param {string} [filters.facility_id] - Filter by facility ID
 * @param {string} [filters.created_by] - Filter by creator ID
 * @param {string} [filters.search] - Search by name
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated report definitions
 */
const listReportDefinitions = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.tenant_id) {
    repoFilters.tenant_id = filters.tenant_id;
  }

  if (filters.facility_id) {
    repoFilters.facility_id = filters.facility_id;
  }

  if (filters.created_by) {
    repoFilters.created_by = filters.created_by;
  }

  // Handle search filter
  if (filters.search) {
    repoFilters.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch report definitions and count
  const [reportDefinitions, total] = await Promise.all([
    reportDefinitionRepository.findMany(repoFilters, skip, limit, orderBy),
    reportDefinitionRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    reportDefinitions,
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
 * Get report definition by ID
 *
 * @param {string} id - Report definition ID
 * @returns {Promise<Object>} Report definition data
 */
const getReportDefinitionById = async (id) => {
  const reportDefinition = await reportDefinitionRepository.findById(id);
  
  if (!reportDefinition) {
    throw new HttpError('errors.report_definition.not_found', 404);
  }

  return reportDefinition;
};

/**
 * Create new report definition
 *
 * @param {Object} data - Report definition data
 * @param {string} data.tenant_id - Tenant ID
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} data.name - Report name
 * @param {string} [data.description] - Report description
 * @param {Object} data.query_json - Query configuration JSON
 * @param {Object} [data.parameters] - Parameters schema JSON
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created report definition
 */
const createReportDefinition = async (data, context = {}) => {
  // Add created_by to data
  const dataWithCreator = {
    ...data,
    created_by: context.user_id || null
  };

  // Create report definition
  const reportDefinition = await reportDefinitionRepository.create(dataWithCreator);

  // Create audit log
  await createAuditLog({
    action: 'REPORT_DEFINITION_CREATED',
    entity: 'report_definition',
    entity_id: reportDefinition.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: reportDefinition.tenant_id,
      facility_id: reportDefinition.facility_id,
      name: reportDefinition.name,
      created_by: reportDefinition.created_by
    }
  });

  return reportDefinition;
};

/**
 * Update report definition
 *
 * @param {string} id - Report definition ID
 * @param {Object} data - Update data
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.name] - Report name
 * @param {string} [data.description] - Report description
 * @param {Object} [data.query_json] - Query configuration JSON
 * @param {Object} [data.parameters] - Parameters schema JSON
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated report definition
 */
const updateReportDefinition = async (id, data, context = {}) => {
  // Check if report definition exists and get before state
  const beforeReportDefinition = await reportDefinitionRepository.findById(id);
  
  if (!beforeReportDefinition) {
    throw new HttpError('errors.report_definition.not_found', 404);
  }

  // Update report definition
  const reportDefinition = await reportDefinitionRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'REPORT_DEFINITION_UPDATED',
    entity: 'report_definition',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        facility_id: beforeReportDefinition.facility_id,
        name: beforeReportDefinition.name,
        description: beforeReportDefinition.description
      },
      after: {
        facility_id: reportDefinition.facility_id,
        name: reportDefinition.name,
        description: reportDefinition.description
      }
    }
  });

  return reportDefinition;
};

/**
 * Delete report definition (soft delete)
 *
 * @param {string} id - Report definition ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteReportDefinition = async (id, context = {}) => {
  // Check if report definition exists
  const reportDefinition = await reportDefinitionRepository.findById(id);
  
  if (!reportDefinition) {
    throw new HttpError('errors.report_definition.not_found', 404);
  }

  // Soft delete report definition
  await reportDefinitionRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'REPORT_DEFINITION_DELETED',
    entity: 'report_definition',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: reportDefinition.tenant_id,
      facility_id: reportDefinition.facility_id,
      name: reportDefinition.name,
      created_by: reportDefinition.created_by
    }
  });
};

module.exports = {
  listReportDefinitions,
  getReportDefinitionById,
  createReportDefinition,
  updateReportDefinition,
  deleteReportDefinition
};
