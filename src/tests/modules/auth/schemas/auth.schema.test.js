/**
 * Auth schema validation tests
 *
 * @module tests/modules/auth/schemas
 */

const {
  loginBodySchema,
  registerBodySchema,
  verifyEmailBodySchema,
  verifyPhoneBodySchema,
  resendVerificationBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  changePasswordBodySchema,
  refreshTokenBodySchema,
  logoutBodySchema
} = require('@validations/auth/auth.schema');

describe('Auth Schema Validation', () => {
  describe('loginBodySchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'Password123!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = loginBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = loginBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'short',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = loginBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid tenant_id format', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'Password123!',
        tenant_id: 'not-a-uuid'
      };
      const result = loginBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should lowercase email', () => {
      const data = {
        email: 'USER@EXAMPLE.COM',
        password: 'Password123!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = loginBodySchema.parse(data);
      expect(result.email).toBe('user@example.com');
    });
  });

  describe('registerBodySchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        facility_id: '223e4567-e89b-12d3-a456-426614174001',
        phone: '+1234567890'
      };
      const result = registerBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'password123!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = registerBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'PASSWORD123!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = registerBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = registerBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'Password123',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = registerBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept registration without optional fields', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = registerBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('verifyEmailBodySchema', () => {
    it('should validate correct email verification data', () => {
      const validData = {
        token: 'verification-token-123',
        email: 'user@example.com'
      };
      const result = verifyEmailBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept token without email', () => {
      const validData = {
        token: 'verification-token-123'
      };
      const result = verifyEmailBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const invalidData = {
        token: '',
        email: 'user@example.com'
      };
      const result = verifyEmailBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyPhoneBodySchema', () => {
    it('should validate correct phone verification data', () => {
      const validData = {
        token: 'verification-token-123',
        phone: '+1234567890'
      };
      const result = verifyPhoneBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short phone number', () => {
      const invalidData = {
        token: 'verification-token-123',
        phone: '123'
      };
      const result = verifyPhoneBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resendVerificationBodySchema', () => {
    it('should validate email type verification', () => {
      const validData = {
        email: 'user@example.com',
        type: 'email'
      };
      const result = resendVerificationBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate phone type verification', () => {
      const validData = {
        phone: '+1234567890',
        type: 'phone'
      };
      const result = resendVerificationBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const invalidData = {
        email: 'user@example.com',
        type: 'invalid'
      };
      const result = resendVerificationBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordBodySchema', () => {
    it('should validate correct forgot password data', () => {
      const validData = {
        email: 'user@example.com',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = forgotPasswordBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        tenant_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = forgotPasswordBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordBodySchema', () => {
    it('should validate correct reset password data', () => {
      const validData = {
        token: 'reset-token-123',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!'
      };
      const result = resetPasswordBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        token: 'reset-token-123',
        new_password: 'NewPassword123!',
        confirm_password: 'DifferentPassword123!'
      };
      const result = resetPasswordBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const invalidData = {
        token: 'reset-token-123',
        new_password: 'weak',
        confirm_password: 'weak'
      };
      const result = resetPasswordBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordBodySchema', () => {
    it('should validate correct change password data', () => {
      const validData = {
        old_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
        confirm_password: 'NewPassword123!'
      };
      const result = changePasswordBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject if new password same as old password', () => {
      const invalidData = {
        old_password: 'Password123!',
        new_password: 'Password123!',
        confirm_password: 'Password123!'
      };
      const result = changePasswordBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject mismatched confirmation', () => {
      const invalidData = {
        old_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
        confirm_password: 'DifferentPassword123!'
      };
      const result = changePasswordBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenBodySchema', () => {
    it('should validate correct refresh token data', () => {
      const validData = {
        refresh_token: 'refresh-token-123'
      };
      const result = refreshTokenBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', () => {
      const invalidData = {
        refresh_token: ''
      };
      const result = refreshTokenBodySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('logoutBodySchema', () => {
    it('should validate with refresh token', () => {
      const validData = {
        refresh_token: 'refresh-token-123'
      };
      const result = logoutBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate without refresh token', () => {
      const validData = {};
      const result = logoutBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
