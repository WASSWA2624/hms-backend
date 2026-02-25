/**
 * Notification module validation schemas
 *
 * @module modules/notification/schemas
 * @description Zod validation schemas for notification endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

const RESOURCE_FRIENDLY_ID_REGEX = /^(?=.*\d)[A-Za-z][A-Za-z0-9_-]*$/;

const resourceFriendlyIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(RESOURCE_FRIENDLY_ID_REGEX, 'Invalid identifier format')
  .transform((value) => value.toUpperCase());

const resourceIdentifierSchema = z.union([uuidSchema, resourceFriendlyIdSchema]);

// ==================== Body Schemas ====================

/**
 * Create notification body validation
 * Used for POST /notifications endpoint
 */
const createNotificationSchema = z.object({
  tenant_id: resourceIdentifierSchema,
  user_id: resourceIdentifierSchema.optional().nullable(),
  notification_type: z.enum(['SYSTEM', 'APPOINTMENT', 'BILLING', 'LAB', 'PHARMACY']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  title: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1),
  read_at: z.string().datetime().optional().nullable()
});

/**
 * Update notification body validation
 * Used for PUT /notifications/:id endpoint
 * All fields optional for partial updates
 */
const updateNotificationSchema = z.object({
  user_id: resourceIdentifierSchema.optional().nullable(),
  notification_type: z.enum(['SYSTEM', 'APPOINTMENT', 'BILLING', 'LAB', 'PHARMACY']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  title: z.string().trim().min(1).max(255).optional(),
  message: z.string().trim().min(1).optional(),
  read_at: z.string().datetime().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Notification ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const notificationIdParamsSchema = z.object({
  id: resourceIdentifierSchema
});

// ==================== Query Params ====================

/**
 * List notifications query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with notification-specific filters
 */
const listNotificationsQuerySchema = listQuerySchema.extend({
  tenant_id: resourceIdentifierSchema.optional(),
  user_id: resourceIdentifierSchema.optional(),
  notification_type: z.enum(['SYSTEM', 'APPOINTMENT', 'BILLING', 'LAB', 'PHARMACY']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  is_read: z.string().transform(val => val === 'true').optional()
});

module.exports = {
  createNotificationSchema,
  updateNotificationSchema,
  notificationIdParamsSchema,
  listNotificationsQuerySchema
};
