/**
 * Integration module validation schemas
 *
 * @module modules/integration/schemas
 * @description Zod validation schemas for integration endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

// ==================== Enums ====================

/**
 * Integration type enum (matches Prisma schema)
 */
const IntegrationTypeEnum = z.enum(['HL7', 'FHIR', 'LAB', 'RADIOLOGY', 'BILLING', 'OTHER']);

/**
 * Integration status enum (matches Prisma schema)
 */
const IntegrationStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ERROR']);

// ==================== Body Schemas ====================

/**
 * Create integration body validation
 * Used for POST /integrations endpoint
 */
const createIntegrationSchema = z.object({
  tenant_id: uuidSchema,
  integration_type: IntegrationTypeEnum,
  status: IntegrationStatusEnum,
  name: z.string().trim().min(1).max(120),
  config_json: z.any().optional().nullable()
});

/**
 * Update integration body validation
 * Used for PUT /integrations/:id endpoint
 * All fields optional for partial updates
 */
const updateIntegrationSchema = z.object({
  integration_type: IntegrationTypeEnum.optional(),
  status: IntegrationStatusEnum.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  config_json: z.any().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Integration ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const integrationIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List integrations query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with integration-specific filters
 */
const listIntegrationsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  integration_type: IntegrationTypeEnum.optional(),
  status: IntegrationStatusEnum.optional(),
  name: z.string().trim().optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createIntegrationSchema,
  updateIntegrationSchema,
  integrationIdParamsSchema,
  listIntegrationsQuerySchema,
  IntegrationTypeEnum,
  IntegrationStatusEnum
};
