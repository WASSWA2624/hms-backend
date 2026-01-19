/**
 * Dashboard widget module validation schemas
 *
 * @module modules/dashboard-widget/schemas
 * @description Zod validation schemas for dashboard widget endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

// ==================== Body Schemas ====================

/**
 * Create dashboard widget body validation
 * Used for POST /dashboard-widgets endpoint
 */
const createDashboardWidgetSchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().trim().min(1).max(255),
  config_json: z.record(z.any())
});

/**
 * Update dashboard widget body validation
 * Used for PUT /dashboard-widgets/:id endpoint
 * All fields optional for partial updates
 */
const updateDashboardWidgetSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  config_json: z.record(z.any()).optional()
});

// ==================== URL Params ====================

/**
 * Dashboard widget ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const dashboardWidgetIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List dashboard widgets query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with dashboard-widget-specific filters
 */
const listDashboardWidgetsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  name: z.string().trim().optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createDashboardWidgetSchema,
  updateDashboardWidgetSchema,
  dashboardWidgetIdParamsSchema,
  listDashboardWidgetsQuerySchema
};
