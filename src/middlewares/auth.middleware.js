/**
 * Authentication & Authorization Middleware
 * 
 * JWT authentication and RBAC enforcement per auth-security.mdc
 * - Step 1.18: JWT authentication, extracts user from token
 * - Step 1.19: RBAC enforcement (checks roles/permissions)
 * 
 * Per auth-security.mdc:
 * - JWT must be used for all protected routes
 * - Role-based access control must be enforced via middleware
 * - Controllers must not bypass RBAC checks
 */

const { verifyToken } = require('@lib/jwt');
const { HttpError } = require('@lib/errors');
const { normalizeRoleName } = require('@config/roles');

/**
 * Normalize decoded JWT payload into a consistent request user object.
 * This keeps compatibility with code that expects either snake_case or camelCase fields.
 *
 * @param {Object} decoded - Decoded JWT payload
 * @returns {Object} Normalized user context
 */
const normalizeUserContext = (decoded = {}) => {
  const userId = decoded.id || decoded.user_id || decoded.userId || null;
  const tenantId = decoded.tenant_id || decoded.tenantId || null;
  const facilityId = decoded.facility_id || decoded.facilityId || null;
  const branchId = decoded.branch_id || decoded.branchId || null;

  const rawRoles = Array.isArray(decoded.roles)
    ? decoded.roles
    : decoded.role
      ? [decoded.role]
      : [];
  const roles = rawRoles
    .map((role) => normalizeRoleName(role) || String(role || '').trim().toUpperCase())
    .filter(Boolean);

  const permissions = Array.isArray(decoded.permissions)
    ? decoded.permissions
    : [];
  const role = roles[0] || null;

  return {
    ...decoded,
    id: userId,
    user_id: userId,
    userId,
    tenant_id: tenantId,
    tenantId,
    facility_id: facilityId,
    facilityId,
    branch_id: branchId,
    branchId,
    role,
    roles,
    permissions
  };
};

/**
 * Extract JWT token from Authorization header
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  // Support "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return null;
};

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 * 
 * @returns {Function} Express middleware
 */
const authenticate = () => {
  return async (req, res, next) => {
    try {
      // Support idempotent auth middleware usage (global + route-level).
      if (req.user && (req.user.id || req.user.userId || req.user.user_id)) {
        req.user = normalizeUserContext(req.user);
        return next();
      }

      const token = extractToken(req);
      
      if (!token) {
        return next(new HttpError('errors.auth.missing_token', 401));
      }
      
      try {
        const decoded = verifyToken(token);
        req.user = normalizeUserContext(decoded);
        next();
      } catch (tokenError) {
        return next(new HttpError('errors.auth.invalid_token', 401));
      }
    } catch (err) {
      next(err);
    }
  };
};

/**
 * RBAC Authorization Middleware
 * Checks if user has required role or permission
 * 
 * @param {string|string[]} requiredRole - Required role(s) or permission(s)
 * @param {string} [type='role'] - Type of check: 'role' or 'permission'
 * @returns {Function} Express middleware
 */
const authorize = (requiredRole, type = 'role') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return next(new HttpError('errors.auth.unauthorized', 403));
      }
      
      if (type === 'role') {
        const userRoles = (req.user.roles || [req.user.role])
          .map((role) => normalizeRoleName(role) || String(role || '').toUpperCase())
          .filter(Boolean);
        const rolesArray = (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
          .map((role) => normalizeRoleName(role) || String(role || '').toUpperCase())
          .filter(Boolean);

        const hasRequiredRole = rolesArray.some((role) =>
          userRoles.some((userRole) => userRole === role)
        );
        
        if (!hasRequiredRole) {
          return next(new HttpError('errors.auth.insufficient_permissions', 403));
        }
      } else if (type === 'permission') {
        // Permission-based check
        const userPermissions = req.user.permissions || [];
        const permissionsArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        
        const hasRequiredPermission = permissionsArray.some(permission => 
          userPermissions.includes(permission)
        );
        
        if (!hasRequiredPermission) {
          return next(new HttpError('errors.auth.insufficient_permissions', 403));
        }
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Combined authentication and authorization middleware
 * 
 * @param {string|string[]} [requiredRole] - Optional required role(s)
 * @param {string} [type='role'] - Type of check: 'role' or 'permission'
 * @returns {Function[]} Array of Express middlewares
 */
const requireAuth = (requiredRole = null, type = 'role') => {
  const middlewares = [authenticate()];
  
  if (requiredRole) {
    middlewares.push(authorize(requiredRole, type));
  }
  
  return middlewares;
};

module.exports = {
  authenticate,
  authorize,
  requireAuth,
  normalizeUserContext
};

