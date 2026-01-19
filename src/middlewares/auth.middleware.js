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
const rolesConfig = require('@config/roles');
const permissionsConfig = require('@config/permissions');

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
      // Extract token from Authorization header
      const token = extractToken(req);
      
      if (!token) {
        throw new HttpError('errors.auth.required', 401);
      }
      
      // Verify token
      const decoded = verifyToken(token);
      
      // Attach user info to request
      req.user = {
        id: decoded.id || decoded.user_id || decoded.userId,
        email: decoded.email,
        role: decoded.role,
        ...decoded
      };
      
      next();
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
      // Ensure user is authenticated
      if (!req.user) {
        throw new HttpError('errors.auth.required', 401);
      }
      
      const userRole = req.user.role;
      const roles = rolesConfig?.ROLES || rolesConfig || {};
      const rolePermissions = permissionsConfig?.ROLE_PERMISSIONS || permissionsConfig || {};
      
      // Convert single role to array
      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      if (type === 'role') {
        // Check if user has required role
        // Support both ROLES object and direct string comparison
        const roleValues = Object.values(roles);
        const hasRole = requiredRoles.includes(userRole) || 
                       (roleValues.length > 0 && requiredRoles.some((r) => roles[r] === userRole));
        
        if (!hasRole) {
          throw new HttpError('errors.auth.forbidden', 403);
        }
      } else if (type === 'permission') {
        // Check if user's role has required permission
        const userPermissions = rolePermissions[userRole] || [];
        const hasPermission = requiredRoles.some((perm) => userPermissions.includes(perm));
        
        if (!hasPermission) {
          throw new HttpError('errors.auth.forbidden', 403);
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
  requireAuth
};

