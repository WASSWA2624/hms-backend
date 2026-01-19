/**
 * Permission Mappings
 * 
 * Permission mappings per auth-security.mdc
 * Maps roles to permission sets (role → permissions)
 */

const { ROLES } = require('@config/roles');

// Permission definitions (base)
const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  ADMIN_ALL: 'admin:all'
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.GUEST]: [],
  [ROLES.USER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.ADMIN_ALL,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE
  ]
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS
};

