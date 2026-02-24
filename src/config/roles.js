/**
 * Canonical role catalog
 *
 * Per .cursor/rules/index.mdc and backend-rules-dev.md:
 * SUPER_ADMIN, TENANT_ADMIN, FACILITY_ADMIN, DOCTOR, NURSE, LAB_TECH,
 * PHARMACIST, RECEPTIONIST, BILLING, OPERATIONS, HR, PATIENT, BIOMED,
 * HOUSE_KEEPER, AMBULANCE_OPERATOR, OTHER.
 */
const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  FACILITY_ADMIN: 'FACILITY_ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  LAB_TECH: 'LAB_TECH',
  PHARMACIST: 'PHARMACIST',
  RECEPTIONIST: 'RECEPTIONIST',
  BILLING: 'BILLING',
  OPERATIONS: 'OPERATIONS',
  HR: 'HR',
  PATIENT: 'PATIENT',
  BIOMED: 'BIOMED',
  HOUSE_KEEPER: 'HOUSE_KEEPER',
  AMBULANCE_OPERATOR: 'AMBULANCE_OPERATOR',
  OTHER: 'OTHER'
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

// Legacy aliases are normalized at runtime for backward compatibility.
const LEGACY_ROLE_ALIASES = Object.freeze({
  ADMIN: ROLES.TENANT_ADMIN,
  SYSTEM_ADMIN: ROLES.SUPER_ADMIN,
  PLATFORM_ADMIN: ROLES.SUPER_ADMIN,
  AMBULANCE_DRIVER: ROLES.AMBULANCE_OPERATOR,
  EMT: ROLES.AMBULANCE_OPERATOR,
  PARAMEDIC: ROLES.AMBULANCE_OPERATOR,
  USER: ROLES.OTHER,
  GUEST: ROLES.OTHER
});

const normalizeRoleName = (role) => {
  const normalized = String(role || '').trim().toUpperCase();
  if (!normalized) return null;
  if (LEGACY_ROLE_ALIASES[normalized]) return LEGACY_ROLE_ALIASES[normalized];
  if (ROLE_VALUES.includes(normalized)) return normalized;
  return null;
};

const isCanonicalRole = (role) => normalizeRoleName(role) !== null;

const ELEVATED_ROLES = Object.freeze([ROLES.SUPER_ADMIN]);

// Numeric hierarchy used by optional permission inheritance policies.
const ROLE_HIERARCHY = Object.freeze({
  [ROLES.OTHER]: 0,
  [ROLES.PATIENT]: 1,
  [ROLES.HOUSE_KEEPER]: 2,
  [ROLES.RECEPTIONIST]: 3,
  [ROLES.BILLING]: 4,
  [ROLES.OPERATIONS]: 5,
  [ROLES.AMBULANCE_OPERATOR]: 6,
  [ROLES.LAB_TECH]: 7,
  [ROLES.PHARMACIST]: 8,
  [ROLES.BIOMED]: 9,
  [ROLES.NURSE]: 10,
  [ROLES.DOCTOR]: 11,
  [ROLES.HR]: 12,
  [ROLES.FACILITY_ADMIN]: 13,
  [ROLES.TENANT_ADMIN]: 14,
  [ROLES.SUPER_ADMIN]: 15
});

module.exports = {
  ROLES,
  ROLE_VALUES,
  ROLE_HIERARCHY,
  ELEVATED_ROLES,
  LEGACY_ROLE_ALIASES,
  normalizeRoleName,
  isCanonicalRole
};

