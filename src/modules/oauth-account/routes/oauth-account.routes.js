/**
 * OAuth Account routes
 *
 * @module modules/oauth-account/routes
 * @description OAuth account endpoints mounted at /api/v1/oauth-accounts
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const oauthAccountController = require('@controllers/oauth-account/oauth-account.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createOAuthAccountSchema,
  updateOAuthAccountSchema,
  oauthAccountIdParamsSchema,
  userIdParamsSchema,
  listOAuthAccountsQuerySchema
} = require('@validations/oauth-account/oauth-account.schema');

/**
 * @description List OAuth accounts with pagination and filters
 * @method GET
 * @route /api/v1/oauth-accounts/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listOAuthAccountsQuerySchema }),
  oauthAccountController.listOAuthAccounts
);

/**
 * @description Get OAuth account by ID
 * @method GET
 * @route /api/v1/oauth-accounts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: oauthAccountIdParamsSchema }),
  oauthAccountController.getOAuthAccountById
);

/**
 * @description Get OAuth accounts by user ID
 * @method GET
 * @route /api/v1/oauth-accounts/user/:userId
 * @authentication Required (JWT)
 * @permissions Authenticated users
 */
router.get(
  '/user/:userId',
  authenticate(),
  validateRequest({ params: userIdParamsSchema }),
  oauthAccountController.getOAuthAccountsByUserId
);

/**
 * @description Create new OAuth account
 * @method POST
 * @route /api/v1/oauth-accounts/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createOAuthAccountSchema }),
  oauthAccountController.createOAuthAccount
);

/**
 * @description Update OAuth account
 * @method PUT
 * @route /api/v1/oauth-accounts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: oauthAccountIdParamsSchema, body: updateOAuthAccountSchema }),
  oauthAccountController.updateOAuthAccount
);

/**
 * @description Delete OAuth account (soft delete)
 * @method DELETE
 * @route /api/v1/oauth-accounts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: oauthAccountIdParamsSchema }),
  oauthAccountController.deleteOAuthAccount
);

module.exports = router;
