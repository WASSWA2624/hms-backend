/**
 * Role Definitions
 * 
 * Role definitions per auth-security.mdc
 * Defines available base roles for core access control
 */

// Base roles
const ROLES = {
  GUEST: 'GUEST',
  USER: 'USER',
  ADMIN: 'ADMIN'
};

// Role hierarchy (for permission inheritance)
const ROLE_HIERARCHY = {
  [ROLES.GUEST]: 0,
  [ROLES.USER]: 1,
  [ROLES.ADMIN]: 2
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY
};

