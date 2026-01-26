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
      const token = extractToken(req);
      
      if (!token) {
        return next(new HttpError('errors.auth.missing_token', 401));
      }
      
      try {
        const decoded = verifyToken(token);
        req.user = decoded;
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
        const userRoles = req.user.roles || [req.user.role];
        const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        
        const hasRequiredRole = rolesArray.some(role => 
          userRoles.some(userRole => 
            String(userRole).toUpperCase() === String(role).toUpperCase()
          )
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
  requireAuth
};

