/**
 * NotificationDelivery schema tests
 *
 * @module tests/modules/notification-delivery/schemas
 * @description Tests for notification-delivery validation schemas
 * Per testing.mdc: Schema tests verify validation logic
 */

const {
  createNotificationDeliverySchema,
  updateNotificationDeliverySchema,
  notificationDeliveryIdParamsSchema,
  listNotificationDeliveriesQuerySchema
} = require('@validations/notification-delivery/notification-delivery.schema');

describe('NotificationDelivery Schemas', () => {
  describe('createNotificationDeliverySchema', () => {
    it('should validate valid create data', () => {
      const validData = {
        notification_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'EMAIL',
        status: 'pending'
      };

      const result = createNotificationDeliverySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        channel: 'EMAIL'
      };

      const result = createNotificationDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid channel', () => {
      const invalidData = {
        notification_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'INVALID_CHANNEL'
      };

      const result = createNotificationDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept all valid channels', () => {
      const channels = ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP'];
      
      channels.forEach(channel => {
        const validData = {
          notification_id: '123e4567-e89b-12d3-a456-426614174000',
          channel
        };
        const result = createNotificationDeliverySchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid UUID format', () => {
      const invalidData = {
        notification_id: 'invalid-uuid',
        channel: 'EMAIL'
      };

      const result = createNotificationDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional status as null', () => {
      const validData = {
        notification_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'EMAIL',
        status: null
      };

      const result = createNotificationDeliverySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject status exceeding max length', () => {
      const invalidData = {
        notification_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'EMAIL',
        status: 'a'.repeat(61)
      };

      const result = createNotificationDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateNotificationDeliverySchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        status: 'sent',
        channel: 'SMS'
      };

      const result = updateNotificationDeliverySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept empty object for partial update', () => {
      const result = updateNotificationDeliverySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid field values', () => {
      const invalidData = {
        channel: 'INVALID_CHANNEL'
      };

      const result = updateNotificationDeliverySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('notificationDeliveryIdParamsSchema', () => {
    it('should validate valid UUID', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = notificationDeliveryIdParamsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'invalid-uuid'
      };

      const result = notificationDeliveryIdParamsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('listNotificationDeliveriesQuerySchema', () => {
    it('should validate valid query params', () => {
      const validData = {
        notification_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'EMAIL',
        status: 'sent',
        page: '1',
        limit: '20'
      };

      const result = listNotificationDeliveriesQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept empty query params', () => {
      const result = listNotificationDeliveriesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid enum values', () => {
      const invalidData = {
        channel: 'INVALID_CHANNEL'
      };

      const result = listNotificationDeliveriesQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
