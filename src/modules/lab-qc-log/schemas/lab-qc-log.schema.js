/**
 * Lab QC log module validation schemas
 */

const { z } = require('zod');
const { uuidSchema, listQuerySchema } = require('@lib/validation/zod');

const createLabQcLogSchema = z.object({
  lab_test_id: uuidSchema,
  status: z.string().trim().max(80).optional().nullable(),
  notes: z.string().optional().nullable(),
  logged_at: z.string().datetime().optional()
});

const updateLabQcLogSchema = z.object({
  status: z.string().trim().max(80).optional().nullable(),
  notes: z.string().optional().nullable(),
  logged_at: z.string().datetime().optional()
});

const labQcLogIdParamsSchema = z.object({
  id: uuidSchema
});

const listLabQcLogsQuerySchema = listQuerySchema.extend({
  lab_test_id: uuidSchema.optional()
});

module.exports = {
  createLabQcLogSchema,
  updateLabQcLogSchema,
  labQcLogIdParamsSchema,
  listLabQcLogsQuerySchema
};
