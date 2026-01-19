/**
 * Auth repository
 *
 * @module modules/auth/repositories
 * @description Data access layer for authentication operations.
 * Special repository that works with user and user_session models.
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

/**
 * Find user by email and tenant
 *
 * @param {string} email - User email
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByEmailAndTenant = async (email, tenantId) => {
  try {
    return await prisma.user.findFirst({
      where: {
        email,
        tenant_id: tenantId,
        deleted_at: null
      },
      include: {
        profile: true,
        roles: {
          where: { deleted_at: null },
          include: {
            role: {
              include: {
                role_permissions: {
                  where: { deleted_at: null },
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find user by ID
 *
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const findUserById = async (id) => {
  try {
    return await prisma.user.findFirst({
      where: {
        id,
        deleted_at: null
      },
      include: {
        profile: true,
        tenant: true,
        facility: true
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new user
 *
 * @param {Object} data - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async (data) => {
  try {
    return await prisma.user.create({
      data,
      include: {
        profile: true
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new HttpError('errors.auth.user_exists', 409);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update user password
 *
 * @param {string} userId - User ID
 * @param {string} passwordHash - New password hash
 * @returns {Promise<Object>} Updated user
 */
const updateUserPassword = async (userId, passwordHash) => {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        updated_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.auth.user_not_found', 404);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create user session
 *
 * @param {Object} data - Session data
 * @returns {Promise<Object>} Created session
 */
const createSession = async (data) => {
  try {
    return await prisma.user_session.create({
      data
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find session by refresh token hash
 *
 * @param {string} refreshTokenHash - Refresh token hash
 * @returns {Promise<Object|null>} Session object or null
 */
const findSessionByRefreshToken = async (refreshTokenHash) => {
  try {
    return await prisma.user_session.findFirst({
      where: {
        refresh_token_hash: refreshTokenHash,
        revoked_at: null,
        deleted_at: null,
        expires_at: {
          gt: new Date()
        }
      },
      include: {
        user: {
          include: {
            profile: true,
            roles: {
              where: { deleted_at: null },
              include: {
                role: {
                  include: {
                    role_permissions: {
                      where: { deleted_at: null },
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Revoke user session
 *
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Updated session
 */
const revokeSession = async (sessionId) => {
  try {
    return await prisma.user_session.update({
      where: { id: sessionId },
      data: {
        revoked_at: new Date(),
        updated_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.auth.session_not_found', 404);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Revoke all user sessions
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
const revokeAllUserSessions = async (userId) => {
  try {
    return await prisma.user_session.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
        deleted_at: null
      },
      data: {
        revoked_at: new Date(),
        updated_at: new Date()
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create verification token
 *
 * @param {Object} data - Token data
 * @returns {Promise<Object>} Created token
 */
const createVerificationToken = async (data) => {
  try {
    return await prisma.verification_token.create({
      data
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find verification token by hash and type
 *
 * @param {string} tokenHash - Token hash
 * @param {string} type - Token type (EMAIL_VERIFICATION, PHONE_VERIFICATION, PASSWORD_RESET)
 * @returns {Promise<Object|null>} Token object or null
 */
const findVerificationToken = async (tokenHash, type) => {
  try {
    return await prisma.verification_token.findFirst({
      where: {
        token_hash: tokenHash,
        type,
        used_at: null,
        deleted_at: null,
        expires_at: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Mark verification token as used
 *
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object>} Updated token
 */
const markTokenAsUsed = async (tokenId) => {
  try {
    return await prisma.verification_token.update({
      where: { id: tokenId },
      data: {
        used_at: new Date(),
        updated_at: new Date()
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete expired verification tokens for user
 *
 * @param {string} userId - User ID
 * @param {string} type - Token type
 * @returns {Promise<Object>} Delete result
 */
const deleteExpiredTokens = async (userId, type) => {
  try {
    return await prisma.verification_token.updateMany({
      where: {
        user_id: userId,
        type,
        deleted_at: null
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date()
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update user status
 *
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated user
 */
const updateUserStatus = async (userId, status) => {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        status,
        updated_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.auth.user_not_found', 404);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find user by email
 *
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByEmail = async (email) => {
  try {
    return await prisma.user.findFirst({
      where: {
        email,
        deleted_at: null
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find user by phone
 *
 * @param {string} phone - User phone
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByPhone = async (phone) => {
  try {
    return await prisma.user.findFirst({
      where: {
        phone,
        deleted_at: null
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  findUserByEmailAndTenant,
  findUserById,
  findUserByEmail,
  findUserByPhone,
  createUser,
  updateUserPassword,
  updateUserStatus,
  createSession,
  findSessionByRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  createVerificationToken,
  findVerificationToken,
  markTokenAsUsed,
  deleteExpiredTokens
};
