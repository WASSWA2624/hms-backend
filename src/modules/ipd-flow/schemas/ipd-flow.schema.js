/**
 * IPD flow module validation schemas
 *
 * @module modules/ipd-flow/schemas
 * @description Zod validation schemas for IPD orchestration endpoints.
 */

const { z } = require('zod');
const { listQuerySchema } = require('@lib/validation/zod');

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FRIENDLY_ID_REGEX = /^(?=.*\d)[A-Za-z][A-Za-z0-9_-]*$/;

const parseBooleanString = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return null;
};

const identifierSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .refine(
    (value) => UUID_LIKE_REGEX.test(value) || FRIENDLY_ID_REGEX.test(value),
    'Invalid identifier format'
  )
  .transform((value) => (UUID_LIKE_REGEX.test(value) ? value.toLowerCase() : value.toUpperCase()));

const optionalIdentifierSchema = identifierSchema.optional().nullable();

const workflowStageSchema = z.enum([
  'ADMITTED_PENDING_BED',
  'ADMITTED_IN_BED',
  'TRANSFER_REQUESTED',
  'TRANSFER_IN_PROGRESS',
  'DISCHARGE_PLANNED',
  'DISCHARGED',
  'CANCELLED',
]);

const transferStatusSchema = z.enum(['REQUESTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const transferActionSchema = z.enum(['APPROVE', 'START', 'COMPLETE', 'CANCEL']);
const medicationRouteSchema = z.enum(['ORAL', 'IV', 'IM', 'TOPICAL', 'INHALATION', 'OTHER']);

const listIpdFlowsQuerySchema = listQuerySchema.extend({
  tenant_id: identifierSchema.optional(),
  facility_id: identifierSchema.optional(),
  patient_id: identifierSchema.optional(),
  stage: workflowStageSchema.optional(),
  ward_id: identifierSchema.optional(),
  transfer_status: transferStatusSchema.optional(),
  has_active_bed: z
    .union([
      z.boolean(),
      z
        .string()
        .trim()
        .min(1)
        .transform((value, ctx) => {
          const parsed = parseBooleanString(value);
          if (parsed === null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid boolean flag',
            });
            return z.NEVER;
          }
          return parsed;
        }),
    ])
    .optional(),
  search: z.string().trim().optional(),
});

const admissionIdParamsSchema = z.object({
  id: identifierSchema,
});

const startIpdFlowSchema = z.object({
  tenant_id: identifierSchema.optional(),
  facility_id: optionalIdentifierSchema,
  patient_id: identifierSchema,
  encounter_id: optionalIdentifierSchema,
  admitted_at: z.string().datetime().optional(),
  bed_id: optionalIdentifierSchema,
});

const assignBedSchema = z.object({
  bed_id: identifierSchema,
  assigned_at: z.string().datetime().optional(),
});

const releaseBedSchema = z.object({
  released_at: z.string().datetime().optional(),
});

const requestTransferSchema = z.object({
  from_ward_id: optionalIdentifierSchema,
  to_ward_id: identifierSchema,
  requested_at: z.string().datetime().optional(),
});

const updateTransferSchema = z.object({
  transfer_request_id: optionalIdentifierSchema,
  action: transferActionSchema,
  to_bed_id: optionalIdentifierSchema,
}).superRefine((value, ctx) => {
  if (value.action === 'COMPLETE' && !value.to_bed_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to_bed_id'],
      message: 'to_bed_id is required for COMPLETE action',
    });
  }
});

const addWardRoundSchema = z.object({
  round_at: z.string().datetime().optional(),
  notes: z.string().trim().max(65535).optional().nullable(),
});

const addNursingNoteSchema = z.object({
  nurse_user_id: optionalIdentifierSchema,
  note: z.string().trim().min(1).max(65535),
});

const addMedicationAdministrationSchema = z.object({
  prescription_id: optionalIdentifierSchema,
  administered_at: z.string().datetime().optional(),
  dose: z.string().trim().min(1).max(80),
  unit: z.string().trim().max(40).optional().nullable(),
  route: medicationRouteSchema.optional().default('ORAL'),
});

const planDischargeSchema = z.object({
  summary: z.string().trim().min(1).max(65535),
  discharged_at: z.string().datetime().optional().nullable(),
});

const finalizeDischargeSchema = z.object({
  summary: z.string().trim().max(65535).optional().nullable(),
  discharged_at: z.string().datetime().optional(),
});

module.exports = {
  listIpdFlowsQuerySchema,
  admissionIdParamsSchema,
  startIpdFlowSchema,
  assignBedSchema,
  releaseBedSchema,
  requestTransferSchema,
  updateTransferSchema,
  addWardRoundSchema,
  addNursingNoteSchema,
  addMedicationAdministrationSchema,
  planDischargeSchema,
  finalizeDischargeSchema,
  workflowStageSchema,
  transferActionSchema,
};
