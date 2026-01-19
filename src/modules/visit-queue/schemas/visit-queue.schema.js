/**
 * Visit queue module validation schemas
 *
 * @module modules/visit-queue/schemas
 * @description Zod validation schemas for visit queue endpoints.
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
 * Create visit queue entry body validation
 * Used for POST /visit-queues endpoint
 */
const createVisitQueueSchema = z.object({
  tenant_id: uuidSchema,
  facility_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema,
  appointment_id: uuidSchema.optional().nullable(),
  provider_user_id: uuidSchema.optional().nullable(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  queued_at: z.string().datetime().optional()
});

/**
 * Update visit queue entry body validation
 * Used for PUT /visit-queues/:id endpoint
 * All fields optional for partial updates
 */
const updateVisitQueueSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  appointment_id: uuidSchema.optional().nullable(),
  provider_user_id: uuidSchema.optional().nullable(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  queued_at: z.string().datetime().optional()
});

// ==================== URL Params ====================

/**
 * Visit queue ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const visitQueueIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List visit queues query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with visit-queue-specific filters
 */
const listVisitQueuesQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional(),
  patient_id: uuidSchema.optional(),
  appointment_id: uuidSchema.optional(),
  provider_user_id: uuidSchema.optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createVisitQueueSchema,
  updateVisitQueueSchema,
  visitQueueIdParamsSchema,
  listVisitQueuesQuerySchema
};
