/**
 * Auth routes
 *
 * @module modules/auth/routes
 * @description Auth endpoints mounted at /api/v1/auth
 */

const express = require('express');
const router = express.Router();
const authController = require('@controllers/auth/auth.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
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

/**
 * @route POST /api/v1/auth/login
 * @desc Authenticate user and return JWT
 * @access Public
 */
router.post(
  '/login',
  validateRequest({ body: loginBodySchema }),
  authController.login
);

/**
 * @route POST /api/v1/auth/register
 * @desc Register new user account
 * @access Public
 */
router.post(
  '/register',
  validateRequest({ body: registerBodySchema }),
  authController.register
);

/**
 * @route POST /api/v1/auth/verify-email
 * @desc Verify email with token/code
 * @access Public
 */
router.post(
  '/verify-email',
  validateRequest({ body: verifyEmailBodySchema }),
  authController.verifyEmail
);

/**
 * @route POST /api/v1/auth/verify-phone
 * @desc Verify phone with token
 * @access Public
 */
router.post(
  '/verify-phone',
  validateRequest({ body: verifyPhoneBodySchema }),
  authController.verifyPhone
);

/**
 * @route POST /api/v1/auth/resend-verification
 * @desc Resend verification email/SMS
 * @access Public
 */
router.post(
  '/resend-verification',
  validateRequest({ body: resendVerificationBodySchema }),
  authController.resendVerification
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
router.post(
  '/forgot-password',
  validateRequest({ body: forgotPasswordBodySchema }),
  authController.forgotPassword
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post(
  '/reset-password',
  validateRequest({ body: resetPasswordBodySchema }),
  authController.resetPassword
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change password (authenticated)
 * @access Private
 */
router.post(
  '/change-password',
  authenticate(),
  validateRequest({ body: changePasswordBodySchema }),
  authController.changePassword
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh JWT token
 * @access Public
 */
router.post(
  '/refresh',
  validateRequest({ body: refreshTokenBodySchema }),
  authController.refresh
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout and invalidate session
 * @access Private
 */
router.post(
  '/logout',
  authenticate(),
  validateRequest({ body: logoutBodySchema }),
  authController.logout
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get(
  '/me',
  authenticate(),
  authController.getMe
);

module.exports = router;
