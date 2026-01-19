/**
 * Imaging study module validation schemas
 *
 * @module modules/imaging-study/schemas
 * @description Zod validation schemas for imaging study endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema,
  isoDateSchema
} = require('@lib/validation/zod');

// ==================== Body Schemas ====================

/**
 * Create imaging study body validation
 * Used for POST /imaging-studies endpoint
 */
const createImagingStudySchema = z.object({
  radiology_order_id: uuidSchema,
  modality: z.enum(['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'PET', 'OTHER']),
  performed_at: isoDateSchema.optional().nullable()
});

/**
 * Update imaging study body validation
 * Used for PUT /imaging-studies/:id endpoint
 * All fields optional for partial updates
 */
const updateImagingStudySchema = z.object({
  modality: z.enum(['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'PET', 'OTHER']).optional(),
  performed_at: isoDateSchema.optional().nullable()
});

// ==================== URL Params ====================

/**
 * Imaging study ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const imagingStudyIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List imaging studies query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with imaging study-specific filters
 */
const listImagingStudiesQuerySchema = listQuerySchema.extend({
  radiology_order_id: uuidSchema.optional(),
  modality: z.enum(['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'PET', 'OTHER']).optional(),
  performed_at: isoDateSchema.optional()
});

module.exports = {
  createImagingStudySchema,
  updateImagingStudySchema,
  imagingStudyIdParamsSchema,
  listImagingStudiesQuerySchema
};
