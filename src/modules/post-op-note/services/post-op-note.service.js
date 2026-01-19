/**
 * Post-op note service
 *
 * @module modules/post-op-note/services
 * @description Business logic layer for Post-op note operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const postOpNoteRepository = require('../repositories/post-op-note.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List Post-op notes with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Post-op notes and pagination data
 */
const listpostOpNotes = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.theatre_case_id) whereClause.theatre_case_id = filters.theatre_case_id;
    if (filters.note) whereClause.note = filters.note;

    const [postOpNotes, total] = await Promise.all([
      postOpNoteRepository.findMany(whereClause, skip, limit, orderBy),
      postOpNoteRepository.count(whereClause)
    ]);

    return {
      post_op_notes: postOpNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get Post-op note by ID
 *
 * @param {string} id - Post-op note ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Post-op note data
 */
const getpostOpNoteById = async (id, userId, ipAddress) => {
  try {
    const postOpNote = await postOpNoteRepository.findById(id);

    if (!postOpNote) {
      throw new HttpError('errors.post_op_note.not_found', 404);
    }

    return postOpNote;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new Post-op note
 *
 * @param {Object} data - Post-op note data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created Post-op note
 */
const createpostOpNote = async (data, userId, ipAddress) => {
  try {
    const postOpNote = await postOpNoteRepository.create(data);

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'post_op_note',
      resource_id: postOpNote.id,
      user_id: userId,
      ip_address: ipAddress,
      details: { post_op_note: postOpNote }
    });

    return postOpNote;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update Post-op note
 *
 * @param {string} id - Post-op note ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated Post-op note
 */
const updatepostOpNote = async (id, data, userId, ipAddress) => {
  try {
    // Verify Post-op note exists
    const existingpostOpNote = await postOpNoteRepository.findById(id);
    if (!existingpostOpNote) {
      throw new HttpError('errors.post_op_note.not_found', 404);
    }

    const updatedpostOpNote = await postOpNoteRepository.update(id, data);

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'post_op_note',
      resource_id: id,
      user_id: userId,
      ip_address: ipAddress,
      details: {
        old: existingpostOpNote,
        new: updatedpostOpNote
      }
    });

    return updatedpostOpNote;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete Post-op note (soft delete)
 *
 * @param {string} id - Post-op note ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deletepostOpNote = async (id, userId, ipAddress) => {
  try {
    // Verify Post-op note exists
    const existingpostOpNote = await postOpNoteRepository.findById(id);
    if (!existingpostOpNote) {
      throw new HttpError('errors.post_op_note.not_found', 404);
    }

    await postOpNoteRepository.softDelete(id);

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'post_op_note',
      resource_id: id,
      user_id: userId,
      ip_address: ipAddress,
      details: { post_op_note: existingpostOpNote }
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listpostOpNotes,
  getpostOpNoteById,
  createpostOpNote,
  updatepostOpNote,
  deletepostOpNote
};
