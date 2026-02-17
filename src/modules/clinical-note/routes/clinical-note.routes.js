/**
 * Clinical note routes
 *
 * @module modules/clinical-note/routes
 * @description Clinical note endpoints mounted at /api/v1/clinical-notes
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const clinicalNoteController = require('@controllers/clinical-note/clinical-note.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createClinicalNoteSchema,
  updateClinicalNoteSchema,
  clinicalNoteIdParamsSchema,
  listClinicalNotesQuerySchema
} = require('@validations/clinical-note/clinical-note.schema');

/**
 * @description List clinical notes with pagination and filters
 * @method GET
 * @route /api/v1/clinical-notes/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [author_user_id] - Filter by author user ID (UUID)
 * @bodyParams None
 * @returns {Object} Paginated list of clinical notes
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listClinicalNotesQuerySchema }),

  authenticate(),
  clinicalNoteController.listClinicalNotes
);

/**
 * @description Get clinical note by ID
 * @method GET
 * @route /api/v1/clinical-notes/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Clinical note ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Clinical note data
 * @throws 401 Unauthorized
 * @throws 404 Clinical note not found
 */
router.get(
  '/:id',  validateRequest({ params: clinicalNoteIdParamsSchema }),

  authenticate(),
  clinicalNoteController.getClinicalNoteById
);

/**
 * @description Create new clinical note
 * @method POST
 * @route /api/v1/clinical-notes/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} author_user_id - Author user ID (required, UUID)
 * @bodyParams {string} note - Clinical note content (required, max 65535 chars)
 * @returns {Object} Created clinical note
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createClinicalNoteSchema }),

  authenticate(),
  clinicalNoteController.createClinicalNote
);

/**
 * @description Update clinical note
 * @method PUT
 * @route /api/v1/clinical-notes/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Clinical note ID (UUID)
 * @queryParams None
 * @bodyParams {string} [note] - Clinical note content (max 65535 chars)
 * @returns {Object} Updated clinical note
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Clinical note not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: clinicalNoteIdParamsSchema, body: updateClinicalNoteSchema }),

  authenticate(),
  clinicalNoteController.updateClinicalNote
);

/**
 * @description Delete clinical note (soft delete)
 * @method DELETE
 * @route /api/v1/clinical-notes/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Clinical note ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Clinical note not found
 */
router.delete(
  '/:id',  validateRequest({ params: clinicalNoteIdParamsSchema }),

  authenticate(),
  clinicalNoteController.deleteClinicalNote
);

module.exports = router;
