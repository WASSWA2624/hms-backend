/**
 * NotificationDelivery module validation schemas
 *
 * @module modules/notification-delivery/schemas
 * @description Zod validation schemas for notification-delivery endpoints.
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
 * Create notification-delivery body validation
 * Used for POST /notification-deliveries endpoint
 */
const createNotificationDeliverySchema = z.object({
  notification_id: uuidSchema,
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP']),
  status: z.string().trim().max(60).optional().nullable(),
  sent_at: z.string().datetime().optional().nullable()
});

/**
 * Update notification-delivery body validation
 * Used for PUT /notification-deliveries/:id endpoint
 * All fields optional for partial updates
 */
const updateNotificationDeliverySchema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP']).optional(),
  status: z.string().trim().max(60).optional().nullable(),
  sent_at: z.string().datetime().optional().nullable()
});

// ==================== URL Params ====================

/**
 * NotificationDelivery ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const notificationDeliveryIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List notification-deliveries query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with notification-delivery-specific filters
 */
const listNotificationDeliveriesQuerySchema = listQuerySchema.extend({
  notification_id: uuidSchema.optional(),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP']).optional(),
  status: z.string().trim().optional()
});

module.exports = {
  createNotificationDeliverySchema,
  updateNotificationDeliverySchema,
  notificationDeliveryIdParamsSchema,
  listNotificationDeliveriesQuerySchema
};
