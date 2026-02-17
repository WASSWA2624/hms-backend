/**
 * Pricing Rule service
 *
 * @module modules/pricing-rule/services
 * @description Business logic layer for pricing rule operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const pricingRuleRepository = require('@repositories/pricing-rule/pricing-rule.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List pricing rules with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Pricing rules and pagination data
 */
const listPricingRules = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.currency) whereClause.currency = filters.currency;
    if (filters.name) whereClause.name = { contains: filters.name };
    
    // Search filter (searches in name, description)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }

    const [pricingRules, total] = await Promise.all([
      pricingRuleRepository.findMany(whereClause, skip, limit, orderBy),
      pricingRuleRepository.count(whereClause)
    ]);

    return {
      pricingRules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get pricing rule by ID
 *
 * @param {string} id - Pricing Rule ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Pricing rule data
 */
const getPricingRuleById = async (id, userId, ipAddress) => {
  try {
    const pricingRule = await pricingRuleRepository.findById(id);

    if (!pricingRule) {
      throw new HttpError('errors.pricing_rule.not_found', 404);
    }

    return pricingRule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new pricing rule
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Pricing Rule data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created pricing rule
 */
const createPricingRule = async (data, userId, ipAddress) => {
  try {
    const pricingRule = await pricingRuleRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'pricing_rule',
      entity_id: pricingRule.id,
      diff: { after: pricingRule },
      ip_address: ipAddress
    }).catch(() => {});

    return pricingRule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update pricing rule
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Pricing Rule ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated pricing rule
 */
const updatePricingRule = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await pricingRuleRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.pricing_rule.not_found', 404);
    }

    const pricingRule = await pricingRuleRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'pricing_rule',
      entity_id: pricingRule.id,
      diff: { before, after: pricingRule },
      ip_address: ipAddress
    }).catch(() => {});

    return pricingRule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete pricing rule (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Pricing Rule ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deletePricingRule = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await pricingRuleRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.pricing_rule.not_found', 404);
    }

    await pricingRuleRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'pricing_rule',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listPricingRules,
  getPricingRuleById,
  createPricingRule,
  updatePricingRule,
  deletePricingRule
};
