/**
 * Auth service
 *
 * @module modules/auth/services
 * @description Business logic for authentication operations.
 */

const authRepository = require('@repositories/auth/auth.repository');
const { hashPassword, comparePassword } = require('@lib/crypto');
const { generateToken, generateRefreshToken } = require('@lib/jwt');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const crypto = require('crypto');

/**
 * Login user
 *
 * @param {Object} data - Login data
 * @param {string} [data.email] - User email
 * @param {string} [data.phone] - User phone number (digits only)
 * @param {string} data.password - User password
 * @param {string} data.tenant_id - Tenant ID
 * @param {string} [data.ip_address] - IP address
 * @param {string} [data.user_agent] - User agent
 * @returns {Promise<Object>} Access token, refresh token, and user data
 */
const login = async (data) => {
  const { email, phone, password, tenant_id, ip_address, user_agent } = data;

  // Find user by email/phone and tenant
  const user = email
    ? await authRepository.findUserByEmailAndTenant(email, tenant_id)
    : await authRepository.findUserByPhoneAndTenant(phone, tenant_id);
  if (!user) {
    throw new HttpError('errors.auth.invalid_credentials', 401);
  }

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    throw new HttpError('errors.auth.account_inactive', 403);
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new HttpError('errors.auth.invalid_credentials', 401);
  }

  // Generate tokens
  const accessToken = generateToken({
    userId: user.id,
    tenantId: user.tenant_id,
    facilityId: user.facility_id,
    email: user.email,
    roles: user.roles?.map(ur => ur.role.name) || []
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const session = await authRepository.createSession({
    user_id: user.id,
    refresh_token_hash: refreshTokenHash,
    ip_address,
    user_agent,
    expires_at: expiresAt
  });

  // Create audit log
  await createAuditLog({
    action: 'USER_LOGIN',
    entity: 'user',
    entity_id: user.id,
    user_id: user.id,
    tenant_id: user.tenant_id,
    facility_id: user.facility_id,
    ip_address,
    user_agent,
    details: { session_id: session.id }
  });

  // Return response without sensitive data
  const { password_hash, ...userData } = user;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: userData
  };
};

/**
 * Register new user
 *
 * @param {Object} data - Registration data
 * @param {string} data.email - User email
 * @param {string} data.password - User password
 * @param {string} data.tenant_id - Tenant ID
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.phone] - User phone
 * @param {string} [data.ip_address] - IP address
 * @param {string} [data.user_agent] - User agent
 * @returns {Promise<Object>} Created user data
 */
const register = async (data) => {
  const { email, password, tenant_id, facility_id, phone, ip_address, user_agent } = data;

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const user = await authRepository.createUser({
    email,
    password_hash,
    tenant_id,
    facility_id,
    phone,
    status: 'PENDING' // Requires email verification
  });

  // Create audit log
  await createAuditLog({
    action: 'USER_REGISTERED',
    entity: 'user',
    entity_id: user.id,
    user_id: user.id,
    tenant_id,
    facility_id,
    ip_address,
    user_agent,
    details: { email, phone }
  });

  // Return response without sensitive data
  const { password_hash: _, ...userData } = user;

  return userData;
};

/**
 * Refresh access token
 *
 * @param {Object} data - Refresh data
 * @param {string} data.refresh_token - Refresh token
 * @param {string} [data.ip_address] - IP address
 * @param {string} [data.user_agent] - User agent
 * @returns {Promise<Object>} New access token and refresh token
 */
const refresh = async (data) => {
  const { refresh_token, ip_address, user_agent } = data;

  // Hash refresh token
  const refreshTokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');

  // Find session by refresh token
  const session = await authRepository.findSessionByRefreshToken(refreshTokenHash);
  if (!session) {
    throw new HttpError('errors.auth.refresh_token_invalid', 401);
  }

  // Check if user is active
  if (session.user.status !== 'ACTIVE') {
    throw new HttpError('errors.auth.account_inactive', 403);
  }

  // Revoke old session
  await authRepository.revokeSession(session.id);

  // Generate new tokens
  const accessToken = generateToken({
    userId: session.user.id,
    tenantId: session.user.tenant_id,
    facilityId: session.user.facility_id,
    email: session.user.email,
    roles: session.user.roles?.map(ur => ur.role.name) || []
  });

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  // Create new session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const newSession = await authRepository.createSession({
    user_id: session.user.id,
    refresh_token_hash: newRefreshTokenHash,
    ip_address,
    user_agent,
    expires_at: expiresAt
  });

  // Create audit log
  await createAuditLog({
    action: 'TOKEN_REFRESHED',
    entity: 'user_session',
    entity_id: newSession.id,
    user_id: session.user.id,
    tenant_id: session.user.tenant_id,
    facility_id: session.user.facility_id,
    ip_address,
    user_agent,
    details: { old_session_id: session.id }
  });

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken
  };
};

/**
 * Logout user
 *
 * @param {Object} data - Logout data
 * @param {string} data.user_id - User ID
 * @param {string} [data.refresh_token] - Refresh token (optional, for single session logout)
 * @param {string} [data.ip_address] - IP address
 * @param {string} [data.user_agent] - User agent
 * @returns {Promise<Object>} Logout result
 */
const logout = async (data) => {
  const { user_id, refresh_token, ip_address, user_agent } = data;

  if (refresh_token) {
    // Logout single session
    const refreshTokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const session = await authRepository.findSessionByRefreshToken(refreshTokenHash);
    
    if (session) {
      await authRepository.revokeSession(session.id);
      
      // Create audit log
      await createAuditLog({
        action: 'USER_LOGOUT',
        entity: 'user_session',
        entity_id: session.id,
        user_id,
        tenant_id: session.user.tenant_id,
        facility_id: session.user.facility_id,
        ip_address,
        user_agent,
        details: { type: 'single_session' }
      });
    }
  } else {
    // Logout all sessions
    await authRepository.revokeAllUserSessions(user_id);
    
    // Get user for audit log
    const user = await authRepository.findUserById(user_id);
    
    // Create audit log
    await createAuditLog({
      action: 'USER_LOGOUT_ALL',
      entity: 'user',
      entity_id: user_id,
      user_id,
      tenant_id: user?.tenant_id,
      facility_id: user?.facility_id,
      ip_address,
      user_agent,
      details: { type: 'all_sessions' }
    });
  }

  return { message: 'messages.auth.logout.success' };
};

/**
 * Change password (authenticated user)
 *
 * @param {Object} data - Change password data
 * @param {string} data.user_id - User ID
 * @param {string} data.old_password - Current password
 * @param {string} data.new_password - New password
 * @param {string} [data.ip_address] - IP address
 * @param {string} [data.user_agent] - User agent
 * @returns {Promise<Object>} Success message
 */
const changePassword = async (data) => {
  const { user_id, old_password, new_password, ip_address, user_agent } = data;

  // Get user
  const user = await authRepository.findUserById(user_id);
  if (!user) {
    throw new HttpError('errors.auth.user_not_found', 404);
  }

  // Verify old password
  const isPasswordValid = await comparePassword(old_password, user.password_hash);
  if (!isPasswordValid) {
    throw new HttpError('errors.auth.password_incorrect', 401);
  }

  // Hash new password
  const new_password_hash = await hashPassword(new_password);

  // Update password
  await authRepository.updateUserPassword(user_id, new_password_hash);

  // Revoke all sessions (force re-login)
  await authRepository.revokeAllUserSessions(user_id);

  // Create audit log
  await createAuditLog({
    action: 'PASSWORD_CHANGED',
    entity: 'user',
    entity_id: user_id,
    user_id,
    tenant_id: user.tenant_id,
    facility_id: user.facility_id,
    ip_address,
    user_agent,
    details: { sessions_revoked: true }
  });

  return { message: 'messages.auth.password_changed.success' };
};

/**
 * Get current user info
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
const getMe = async (userId) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new HttpError('errors.auth.user_not_found', 404);
  }

  // Return response without sensitive data
  const { password_hash, ...userData } = user;

  return userData;
};

/**
 * Verify email with token
 *
 * @param {Object} data - Verification data
 * @param {string} data.token - Verification token
 * @param {string} [data.email] - User email (optional)
 * @returns {Promise<Object>} Success message
 */
const verifyEmail = async (data) => {
  const { token, email } = data;

  // Hash token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find token
  const verificationToken = await authRepository.findVerificationToken(
    tokenHash,
    'EMAIL_VERIFICATION'
  );

  if (!verificationToken) {
    throw new HttpError('errors.auth.token_invalid', 400);
  }

  // If email provided, verify it matches
  if (email && verificationToken.user.email !== email) {
    throw new HttpError('errors.auth.token_invalid', 400);
  }

  // Mark token as used
  await authRepository.markTokenAsUsed(verificationToken.id);

  // Update user status to ACTIVE
  await authRepository.updateUserStatus(verificationToken.user_id, 'ACTIVE');

  // Create audit log
  await createAuditLog({
    action: 'EMAIL_VERIFIED',
    entity: 'user',
    entity_id: verificationToken.user_id,
    user_id: verificationToken.user_id,
    tenant_id: verificationToken.user.tenant_id,
    facility_id: verificationToken.user.facility_id,
    details: { email: verificationToken.user.email }
  });

  return { message: 'messages.auth.email_verified.success' };
};

/**
 * Verify phone with token
 *
 * @param {Object} data - Verification data
 * @param {string} data.token - Verification token
 * @param {string} data.phone - User phone
 * @returns {Promise<Object>} Success message
 */
const verifyPhone = async (data) => {
  const { token, phone } = data;

  // Hash token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find token
  const verificationToken = await authRepository.findVerificationToken(
    tokenHash,
    'PHONE_VERIFICATION'
  );

  if (!verificationToken) {
    throw new HttpError('errors.auth.token_invalid', 400);
  }

  // Verify phone matches
  if (verificationToken.user.phone !== phone) {
    throw new HttpError('errors.auth.token_invalid', 400);
  }

  // Mark token as used
  await authRepository.markTokenAsUsed(verificationToken.id);

  // Create audit log
  await createAuditLog({
    action: 'PHONE_VERIFIED',
    entity: 'user',
    entity_id: verificationToken.user_id,
    user_id: verificationToken.user_id,
    tenant_id: verificationToken.user.tenant_id,
    facility_id: verificationToken.user.facility_id,
    details: { phone: verificationToken.user.phone }
  });

  return { message: 'messages.auth.phone_verified.success' };
};

/**
 * Resend verification email or SMS
 *
 * @param {Object} data - Resend data
 * @param {string} [data.email] - User email
 * @param {string} [data.phone] - User phone
 * @param {string} data.type - Verification type (email or phone)
 * @returns {Promise<Object>} Success message
 */
const resendVerification = async (data) => {
  const { email, phone, type } = data;

  let user;
  let tokenType;
  let identifier;

  if (type === 'email') {
    if (!email) {
      throw new HttpError('errors.validation.email.required', 400);
    }
    user = await authRepository.findUserByEmail(email);
    tokenType = 'EMAIL_VERIFICATION';
    identifier = email;
  } else if (type === 'phone') {
    if (!phone) {
      throw new HttpError('errors.validation.phone.required', 400);
    }
    user = await authRepository.findUserByPhone(phone);
    tokenType = 'PHONE_VERIFICATION';
    identifier = phone;
  }

  if (!user) {
    throw new HttpError('errors.auth.user_not_found', 404);
  }

  // Check if user is already active
  if (user.status === 'ACTIVE') {
    throw new HttpError('errors.auth.already_verified', 400);
  }

  // Delete old tokens
  await authRepository.deleteExpiredTokens(user.id, tokenType);

  // Generate new token (6-digit code)
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Create new token
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes expiry

  await authRepository.createVerificationToken({
    user_id: user.id,
    token_hash: tokenHash,
    type: tokenType,
    expires_at: expiresAt
  });

  // TODO: Send verification email/SMS with token
  // This would integrate with an email/SMS service
  console.log(`Verification token for ${identifier}: ${token}`);

  // Create audit log
  await createAuditLog({
    action: 'VERIFICATION_RESENT',
    entity: 'user',
    entity_id: user.id,
    user_id: user.id,
    tenant_id: user.tenant_id,
    facility_id: user.facility_id,
    details: { type, identifier }
  });

  return { message: 'messages.auth.verification_sent.success' };
};

/**
 * Send forgot password email
 *
 * @param {Object} data - Forgot password data
 * @param {string} data.email - User email
 * @param {string} data.tenant_id - Tenant ID
 * @returns {Promise<Object>} Success message
 */
const forgotPassword = async (data) => {
  const { email, tenant_id } = data;

  // Find user
  const user = await authRepository.findUserByEmailAndTenant(email, tenant_id);

  // Don't reveal if user exists or not (security best practice)
  if (!user) {
    return { message: 'messages.auth.password_reset.email_sent' };
  }

  // Delete old password reset tokens
  await authRepository.deleteExpiredTokens(user.id, 'PASSWORD_RESET');

  // Generate reset token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Create token
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  await authRepository.createVerificationToken({
    user_id: user.id,
    token_hash: tokenHash,
    type: 'PASSWORD_RESET',
    expires_at: expiresAt
  });

  // TODO: Send password reset email with token
  // This would integrate with an email service
  console.log(`Password reset token for ${email}: ${token}`);

  // Create audit log
  await createAuditLog({
    action: 'PASSWORD_RESET_REQUESTED',
    entity: 'user',
    entity_id: user.id,
    user_id: user.id,
    tenant_id: user.tenant_id,
    facility_id: user.facility_id,
    details: { email }
  });

  return { message: 'messages.auth.password_reset.email_sent' };
};

/**
 * Reset password with token
 *
 * @param {Object} data - Reset password data
 * @param {string} data.token - Reset token
 * @param {string} data.new_password - New password
 * @returns {Promise<Object>} Success message
 */
const resetPassword = async (data) => {
  const { token, new_password } = data;

  // Hash token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find token
  const resetToken = await authRepository.findVerificationToken(
    tokenHash,
    'PASSWORD_RESET'
  );

  if (!resetToken) {
    throw new HttpError('errors.auth.token_invalid', 400);
  }

  // Hash new password
  const new_password_hash = await hashPassword(new_password);

  // Update password
  await authRepository.updateUserPassword(resetToken.user_id, new_password_hash);

  // Mark token as used
  await authRepository.markTokenAsUsed(resetToken.id);

  // Revoke all sessions (force re-login)
  await authRepository.revokeAllUserSessions(resetToken.user_id);

  // Create audit log
  await createAuditLog({
    action: 'PASSWORD_RESET',
    entity: 'user',
    entity_id: resetToken.user_id,
    user_id: resetToken.user_id,
    tenant_id: resetToken.user.tenant_id,
    facility_id: resetToken.user.facility_id,
    details: { sessions_revoked: true }
  });

  return { message: 'messages.auth.password_reset.success' };
};

module.exports = {
  login,
  register,
  verifyEmail,
  verifyPhone,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refresh,
  logout,
  getMe
};
