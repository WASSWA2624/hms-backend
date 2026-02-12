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
const { sendEmail } = require('@lib/notifications');
const env = require('@config/env');
const crypto = require('crypto');

const EMAIL_VERIFICATION_TOKEN_TYPE = 'EMAIL_VERIFICATION';
const PHONE_VERIFICATION_TOKEN_TYPE = 'PHONE_VERIFICATION';
const PASSWORD_RESET_TOKEN_TYPE = 'PASSWORD_RESET';
const EMAIL_VERIFICATION_EXPIRY_MINUTES = 15;

const hashToken = (value) =>
  crypto.createHash('sha256').update(String(value || '')).digest('hex');

const resolveAccountStatusErrorKey = (status) => {
  if (status === 'PENDING') return 'errors.auth.account_pending';
  if (status === 'SUSPENDED') return 'errors.auth.account_suspended';
  return 'errors.auth.account_inactive';
};

const resolveFacilityTypeLabel = (facilityType) => {
  const normalized = String(facilityType || '').trim().toUpperCase();
  if (normalized === 'HOSPITAL') return 'Hospital';
  if (normalized === 'CLINIC') return 'Clinic / Medical Centre';
  if (normalized === 'LAB') return 'Diagnostic Centre / Lab';
  if (normalized === 'PHARMACY') return 'Pharmacy';
  return 'Healthcare Facility';
};

const getBaseAppUrl = () => String(env.APP_PUBLIC_URL || '').replace(/\/+$/, '');

const buildVerifyEmailLink = (token, email) =>
  `${getBaseAppUrl()}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

const createEmailVerificationTokens = async (userId) => {
  await authRepository.deleteExpiredTokens(userId, EMAIL_VERIFICATION_TOKEN_TYPE);

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const linkToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

  await Promise.all([
    authRepository.createVerificationToken({
      user_id: userId,
      token_hash: hashToken(code),
      type: EMAIL_VERIFICATION_TOKEN_TYPE,
      expires_at: expiresAt,
    }),
    authRepository.createVerificationToken({
      user_id: userId,
      token_hash: hashToken(linkToken),
      type: EMAIL_VERIFICATION_TOKEN_TYPE,
      expires_at: expiresAt,
    }),
  ]);

  return { code, linkToken, expiresAt };
};

const buildVerificationEmailMessage = ({
  email,
  adminName,
  facilityName,
  facilityType,
  code,
  verifyLink,
  plainPassword,
}) => {
  const safeAdminName = String(adminName || 'there').trim() || 'there';
  const safeFacilityName = String(facilityName || 'your facility').trim() || 'your facility';
  const typeLabel = resolveFacilityTypeLabel(facilityType);
  const passwordLine = plainPassword
    ? `Temporary record (not recommended): Password used during signup: ${plainPassword}\n`
    : '';

  const subject = 'Confirm your Hospital Management System account';
  const text =
    `Hello ${safeAdminName},\n\n` +
    `Thanks for registering ${safeFacilityName} (${typeLabel}) on Hospital Management System.\n\n` +
    `Your email verification code: ${code}\n` +
    `This code expires in ${EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes.\n\n` +
    `You can also verify by clicking this link:\n` +
    `${verifyLink}\n\n` +
    `If you did not request this account, ignore this email.\n\n` +
    passwordLine +
    `Regards,\nHospital Management System`;

  const htmlPasswordLine = plainPassword
    ? `<p><strong>Temporary record (not recommended):</strong> Password used during signup: <code>${plainPassword}</code></p>`
    : '';
  const html =
    `<p>Hello ${safeAdminName},</p>` +
    `<p>Thanks for registering <strong>${safeFacilityName}</strong> (${typeLabel}) on Hospital Management System.</p>` +
    `<p>Your email verification code: <strong>${code}</strong></p>` +
    `<p>This code expires in <strong>${EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes</strong>.</p>` +
    `<p><a href="${verifyLink}">Verify email now</a></p>` +
    `<p>If you did not request this account, ignore this email.</p>` +
    htmlPasswordLine +
    `<p>Regards,<br/>Hospital Management System</p>`;

  return { subject, text, html };
};

const sendVerificationEmail = async ({
  email,
  adminName,
  facilityName,
  facilityType,
  code,
  linkToken,
  plainPassword,
}) => {
  const verifyLink = buildVerifyEmailLink(linkToken, email);
  const includePassword = Boolean(env.ALLOW_PLAINTEXT_PASSWORD_EMAIL);
  const payload = buildVerificationEmailMessage({
    email,
    adminName,
    facilityName,
    facilityType,
    code,
    verifyLink,
    plainPassword: includePassword ? plainPassword : null,
  });

  return sendEmail({
    to: email,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
};

/**
 * Identify users by identifier (email or phone)
 * Returns list of tenants the user belongs to (without password verification)
 *
 * @param {Object} data - Identify data
 * @param {string} data.identifier - User email or phone
 * @returns {Promise<Object>} List of users with tenant info
 */
const identify = async (data) => {
  const { identifier } = data;

  // Find all users with matching identifier
  const users = await authRepository.findUsersByIdentifier(identifier);

  if (users.length === 0) {
    // Don't reveal if user exists (security best practice)
    return { users: [] };
  }

  // Format response with tenant info
  const tenantInfo = users.map(user => ({
    tenant_id: user.tenant_id,
    tenant_name: user.tenant?.name || '',
    tenant_slug: user.tenant?.slug || null
  }));

  // Deduplicate tenants (same user might have multiple entries)
  const uniqueTenants = tenantInfo.filter((tenant, index, self) =>
    index === self.findIndex(t => t.tenant_id === tenant.tenant_id)
  );

  return { users: uniqueTenants };
};

/**
 * Login user
 *
 * @param {Object} data - Login data
 * @param {string} [data.email] - User email
 * @param {string} [data.phone] - User phone number (digits only)
 * @param {string} data.password - User password
 * @param {string} [data.tenant_id] - Tenant ID (optional if single user found)
 * @param {string} [data.facility_id] - Facility ID (optional)
 * @param {string} [data.ip_address] - IP address
 * @param {string} [data.user_agent] - User agent
 * @returns {Promise<Object>} Access token, refresh token, user data, and facility info
 */
const login = async (data) => {
  const { email, phone, password, tenant_id, facility_id, ip_address, user_agent } = data;

  let user;

  if (tenant_id) {
    // Validate tenant_id format (basic UUID check)
    if (!/^[a-f0-9-]+$/i.test(tenant_id)) {
      // Log suspicious activity
      await createAuditLog({
        action: 'LOGIN_INVALID_TENANT',
        entity: 'user',
        entity_id: 'unknown',
        user_id: null,
        tenant_id: null,
        facility_id: null,
        ip_address,
        user_agent,
        details: { suspicious: true, tenant_id }
      });
      throw new HttpError('errors.auth.invalid_credentials', 401);
    }

    // Find user by email/phone and tenant
    user = email
      ? await authRepository.findUserByEmailAndTenant(email, tenant_id)
      : await authRepository.findUserByPhoneAndTenant(phone, tenant_id);
  } else {
    // If no tenant_id provided, find user by identifier only
    // This assumes single user (should be handled by identify endpoint first)
    const identifier = email || phone;
    const users = await authRepository.findUsersByIdentifier(identifier);
    
    if (users.length === 0) {
      throw new HttpError('errors.auth.invalid_credentials', 401);
    }
    
    if (users.length > 1) {
      // Multiple users found - tenant selection required
      throw new HttpError('errors.auth.multiple_tenants', 400);
    }
    
    user = users[0];
  }

  if (!user) {
    throw new HttpError('errors.auth.invalid_credentials', 401);
  }

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    throw new HttpError(resolveAccountStatusErrorKey(user.status), 403);
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    // Log failed login attempt
    await createAuditLog({
      action: 'LOGIN_FAILED_INVALID_PASSWORD',
      entity: 'user',
      entity_id: user.id,
      user_id: user.id,
      tenant_id: user.tenant_id,
      facility_id: null,
      ip_address,
      user_agent,
      details: { reason: 'invalid_password' }
    });
    throw new HttpError('errors.auth.invalid_credentials', 401);
  }

  // Get user's accessible facilities
  const facilities = await authRepository.getUserFacilities(user.id, user.tenant_id);
  const hasMultipleFacilities = facilities.length > 1;

  // If facility_id provided, verify user has access to it
  let selectedFacilityId = facility_id || user.facility_id;
  if (selectedFacilityId && facilities.length > 0) {
    const hasAccess = facilities.some(f => f.id === selectedFacilityId);
    if (!hasAccess) {
      // Log unauthorized facility access attempt
      await createAuditLog({
        action: 'LOGIN_FAILED_FACILITY_ACCESS',
        entity: 'user',
        entity_id: user.id,
        user_id: user.id,
        tenant_id: user.tenant_id,
        facility_id: null,
        ip_address,
        user_agent,
        details: { reason: 'unauthorized_facility', requested_facility_id: selectedFacilityId }
      });
      throw new HttpError('errors.auth.unauthorized_facility', 403);
    }
  } else if (!selectedFacilityId && facilities.length === 1) {
    // Auto-select if only one facility
    selectedFacilityId = facilities[0].id;
  }

  // If multiple facilities and none selected, return facility selection requirement
  if (hasMultipleFacilities && !selectedFacilityId) {
    return {
      requires_facility_selection: true,
      facilities: facilities.map(f => ({
        id: f.id,
        name: f.name,
        facility_type: f.facility_type
      })),
      tenant_id: user.tenant_id
    };
  }

  // Generate tokens
  const accessToken = generateToken({
    userId: user.id,
    tenantId: user.tenant_id,
    facilityId: selectedFacilityId,
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
    facility_id: selectedFacilityId,
    ip_address,
    user_agent,
    details: { session_id: session.id }
  });

  // Return response without sensitive data
  const { password_hash, ...userData } = user;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: userData,
    requires_facility_selection: false
  };
};

/**
 * Register facility owner (self-serve onboarding)
 *
 * @param {Object} data - Registration data
 * @param {string} data.email - User email
 * @param {string} data.password - User password
 * @param {string} data.facility_name - Facility/business name
 * @param {string} data.admin_name - Admin display name
 * @param {string} data.facility_type - Facility type enum
 * @param {string} [data.phone] - User phone
 * @param {string} [data.ip_address] - IP address
 * @param {string} [data.user_agent] - User agent
 * @returns {Promise<Object>} Created user data (tenant admin)
 */
const register = async (data) => {
  const {
    email,
    password,
    facility_name,
    admin_name,
    facility_type,
    phone,
    ip_address,
    user_agent,
  } = data;

  const normalizedEmail = String(email || '').trim().toLowerCase();

  // Hash password
  const password_hash = await hashPassword(password);

  // Bootstrap tenant/facility and create owner user with ADMIN role in one transaction.
  const user = await authRepository.registerFacilityOwner({
    email: normalizedEmail,
    phone,
    password_hash,
    facility_name,
    admin_name,
    facility_type,
    status: 'PENDING',
  });
  if (!user) {
    throw new HttpError('errors.database.unexpected', 500);
  }

  // Create verification code + link tokens (same 15 minute expiry window).
  const verification = await createEmailVerificationTokens(user.id);

  // Best-effort notification: registration should still succeed even if email is delayed.
  await sendVerificationEmail({
    email: normalizedEmail,
    adminName: admin_name,
    facilityName: facility_name,
    facilityType: facility_type,
    code: verification.code,
    linkToken: verification.linkToken,
    plainPassword: password,
  });

  // Create audit log
  await createAuditLog({
    action: 'USER_REGISTERED',
    entity: 'user',
    entity_id: user.id,
    user_id: user.id,
    tenant_id: user.tenant_id,
    facility_id: user.facility_id,
    ip_address,
    user_agent,
    details: {
      email: normalizedEmail,
      phone,
      facility_name,
      facility_type,
      admin_name,
      role: 'ADMIN',
      self_serve: true,
      verification_expires_in_minutes: EMAIL_VERIFICATION_EXPIRY_MINUTES,
    }
  });

  // Return response without sensitive data
  const { password_hash: _, ...userData } = user;

  return {
    user: userData,
    verification: {
      email: normalizedEmail,
      expires_in_minutes: EMAIL_VERIFICATION_EXPIRY_MINUTES,
    },
  };
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

  // Find session by refresh token with validation
  const session = await authRepository.findSessionByRefreshToken(refreshTokenHash);
  if (!session) {
    throw new HttpError('errors.auth.refresh_token_invalid', 401);
  }

  // Validate session is not expired
  if (session.expires_at && new Date() > new Date(session.expires_at)) {
    await authRepository.revokeSession(session.id);
    throw new HttpError('errors.auth.session_expired', 401);
  }

  // Validate session is not revoked
  if (session.revoked_at) {
    throw new HttpError('errors.auth.session_revoked', 401);
  }

  // Check if user is active
  if (session.user.status !== 'ACTIVE') {
    throw new HttpError(resolveAccountStatusErrorKey(session.user.status), 403);
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
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

  // Hash token
  const tokenHash = hashToken(token);

  // Find token
  const verificationToken = await authRepository.findVerificationToken(
    tokenHash,
    EMAIL_VERIFICATION_TOKEN_TYPE
  );

  if (!verificationToken) {
    throw new HttpError('errors.auth.token_invalid', 400);
  }

  // If email provided, verify it matches
  if (normalizedEmail && verificationToken.user.email !== normalizedEmail) {
    throw new HttpError('errors.auth.token_invalid', 400);
  }

  if (verificationToken.user.status === 'ACTIVE') {
    throw new HttpError('errors.auth.already_verified', 400);
  }

  // Mark token as used
  await authRepository.markTokenAsUsed(verificationToken.id);
  // Invalidate any other active email verification token for this user.
  await authRepository.deleteExpiredTokens(
    verificationToken.user_id,
    EMAIL_VERIFICATION_TOKEN_TYPE
  );

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
  const tokenHash = hashToken(token);

  // Find token
  const verificationToken = await authRepository.findVerificationToken(
    tokenHash,
    PHONE_VERIFICATION_TOKEN_TYPE
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
  let normalizedEmail = null;
  let normalizedPhone = null;

  if (type === 'email') {
    if (!email) {
      throw new HttpError('errors.validation.email.required', 400);
    }
    normalizedEmail = String(email).trim().toLowerCase();
    user = await authRepository.findUserByEmail(normalizedEmail);
    tokenType = EMAIL_VERIFICATION_TOKEN_TYPE;
    identifier = normalizedEmail;
  } else if (type === 'phone') {
    if (!phone) {
      throw new HttpError('errors.validation.phone.required', 400);
    }
    normalizedPhone = String(phone).replace(/[^\d]/g, '');
    user = await authRepository.findUserByPhone(normalizedPhone);
    tokenType = PHONE_VERIFICATION_TOKEN_TYPE;
    identifier = normalizedPhone;
  }

  if (!user) {
    throw new HttpError('errors.auth.user_not_found', 404);
  }

  // Check if user is already active
  if (user.status === 'ACTIVE') {
    throw new HttpError('errors.auth.already_verified', 400);
  }

  if (type === 'email') {
    const tokens = await createEmailVerificationTokens(user.id);
    await sendVerificationEmail({
      email: normalizedEmail || user.email,
      adminName:
        user.profile?.first_name ||
        user.profile?.last_name ||
        user.email ||
        'Admin',
      facilityName: user.facility?.name || user.tenant?.name || 'your facility',
      facilityType: user.facility?.facility_type || 'OTHER',
      code: tokens.code,
      linkToken: tokens.linkToken,
      plainPassword: null,
    });
  } else {
    await authRepository.deleteExpiredTokens(user.id, tokenType);
    const token = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    await authRepository.createVerificationToken({
      user_id: user.id,
      token_hash: hashToken(token),
      type: tokenType,
      expires_at: expiresAt,
    });
  }

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
  await authRepository.deleteExpiredTokens(user.id, PASSWORD_RESET_TOKEN_TYPE);

  // Generate reset token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  // Create token
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  await authRepository.createVerificationToken({
    user_id: user.id,
    token_hash: tokenHash,
    type: PASSWORD_RESET_TOKEN_TYPE,
    expires_at: expiresAt
  });

  // TODO: Send password reset email with token via email provider.

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
  const tokenHash = hashToken(token);

  // Find token
  const resetToken = await authRepository.findVerificationToken(
    tokenHash,
    PASSWORD_RESET_TOKEN_TYPE
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
  identify,
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
