/**
 * Setup Default Accounts Script
 * 
 * Creates default accounts for all user types in the HMS system:
 * - SUPER_ADMIN: Platform-level administrator
 * - TENANT_ADMIN: Hospital/tenant-level administrator
 * - FACILITY_ADMIN: Facility-level administrator
 * - DOCTOR: Medical doctor
 * - NURSE: Nursing staff
 * - LAB_TECH: Laboratory technician
 * - PHARMACIST: Pharmacy staff
 * - RECEPTIONIST: Front desk staff
 * - BILLING: Billing and finance staff
 * - BIOMED: Biomedical engineering staff
 * - HOUSE_KEEPER: Housekeeping staff
 * - PATIENT: Patient user (example)
 * 
 * This script:
 * 1. Creates a default tenant (if none exists)
 * 2. Creates a default facility (optional)
 * 3. Creates default roles for the tenant
 * 4. Creates users for each role type
 * 5. Assigns roles to users
 * 6. Creates user profiles and staff profiles where applicable
 * 
 * Usage:
 *   node scripts/setup-default-accounts.js
 * 
 * Environment:
 *   - Requires DATABASE_URL in .env
 *   - Requires all environment variables from env.template.txt
 * 
 * Security:
 *   - All passwords are hashed using bcryptjs
 *   - Default passwords should be changed after first login
 *   - Passwords follow auth-security.mdc requirements (≥8 chars)
 * 
 * @module scripts/setup-default-accounts
 */

// Must be absolute first - register module aliases before any other requires
// This enables @app/*, @lib/*, @config/*, etc. to work at runtime
require('module-alias/register');
const path = require('path');

// Register global aliases for runtime resolution
try {
  const moduleAlias = require('module-alias');
  const prismaClientPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
  
  // Register base aliases first
  moduleAlias.addAliases({
    '@app': path.join(__dirname, '..', 'src', 'app'),
    '@lib': path.join(__dirname, '..', 'src', 'lib'),
    '@config': path.join(__dirname, '..', 'src', 'config'),
    '@middlewares': path.join(__dirname, '..', 'src', 'middlewares'),
    '@logs': path.join(process.cwd(), 'logs'),
    '@websockets': path.join(__dirname, '..', 'src', 'websockets'),
    '@modules': path.join(__dirname, '..', 'src', 'modules'),
    '@prisma/client': path.join(__dirname, '..', 'src', 'prisma', 'client.js')
  });
  
  // CRITICAL: Register @prisma/client/runtime LAST so it takes precedence
  const prismaRuntimePath = path.join(prismaClientPath, 'runtime');
  moduleAlias.addAlias('@prisma/client/runtime', prismaRuntimePath);
} catch (err) {
  console.error('Failed to register module aliases:', err);
  process.exit(1);
}

// Register module-scoped aliases
try {
  const { registerAllModuleAliases } = require('@lib/aliases');
  registerAllModuleAliases();
} catch (err) {
  console.warn('Failed to register module aliases (may not be critical):', err.message);
}

// Now import dependencies
const prisma = require('@prisma/client');
const { hashPassword } = require('@lib/crypto/hashPassword');
const { createAuditLog } = require('@lib/audit');

/**
 * Default password for all created accounts
 * WARNING: Change these passwords immediately after first login in production!
 */
const DEFAULT_PASSWORD = 'Demo@123!';

/**
 * Default tenant configuration
 */
const DEFAULT_TENANT = {
  name: 'Demo Tenant',
  slug: 'demo-tenant',
  is_active: true
};

/**
 * Default facility configuration
 */
const DEFAULT_FACILITY = {
  name: 'Demo Facility',
  facility_type: 'HOSPITAL',
  is_active: true
};

/**
 * User account definitions
 * Each entry defines a user account with role and profile information
 */
const USER_ACCOUNTS = [
  {
    // Platform-level super administrator
    email: 'superadmin@demo.com',
    phone: '+12345678901',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    profile: {
      first_name: 'Super',
      last_name: 'Administrator',
      gender: 'OTHER'
    },
    staffProfile: null // SUPER_ADMIN doesn't need staff profile
  },
  {
    // Hospital/tenant-level administrator
    email: 'tenantadmin@demo.com',
    phone: '+12345678902',
    role: 'TENANT_ADMIN',
    status: 'ACTIVE',
    profile: {
      first_name: 'Tenant',
      last_name: 'Administrator',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'ADM001',
      position: 'Tenant Administrator',
      hire_date: new Date()
    }
  },
  {
    // Facility-level administrator
    email: 'facilityadmin@demo.com',
    phone: '+12345678903',
    role: 'FACILITY_ADMIN',
    status: 'ACTIVE',
    profile: {
      first_name: 'Facility',
      last_name: 'Administrator',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'FAC001',
      position: 'Facility Administrator',
      hire_date: new Date()
    }
  },
  {
    // Medical doctor
    email: 'doctor@demo.com',
    phone: '+12345678904',
    role: 'DOCTOR',
    status: 'ACTIVE',
    profile: {
      first_name: 'John',
      last_name: 'Doctor',
      gender: 'MALE'
    },
    staffProfile: {
      staff_number: 'DOC001',
      position: 'Senior Physician',
      hire_date: new Date()
    }
  },
  {
    // Nursing staff
    email: 'nurse@demo.com',
    phone: '+12345678905',
    role: 'NURSE',
    status: 'ACTIVE',
    profile: {
      first_name: 'Jane',
      last_name: 'Nurse',
      gender: 'FEMALE'
    },
    staffProfile: {
      staff_number: 'NUR001',
      position: 'Registered Nurse',
      hire_date: new Date()
    }
  },
  {
    // Laboratory technician
    email: 'labtech@demo.com',
    phone: '+12345678906',
    role: 'LAB_TECH',
    status: 'ACTIVE',
    profile: {
      first_name: 'Lab',
      last_name: 'Technician',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'LAB001',
      position: 'Laboratory Technician',
      hire_date: new Date()
    }
  },
  {
    // Pharmacy staff
    email: 'pharmacist@demo.com',
    phone: '+12345678907',
    role: 'PHARMACIST',
    status: 'ACTIVE',
    profile: {
      first_name: 'Pharmacy',
      last_name: 'Staff',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'PHA001',
      position: 'Pharmacist',
      hire_date: new Date()
    }
  },
  {
    // Receptionist
    email: 'receptionist@demo.com',
    phone: '+12345678908',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    profile: {
      first_name: 'Reception',
      last_name: 'Staff',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'REC001',
      position: 'Receptionist',
      hire_date: new Date()
    }
  },
  {
    // Billing staff
    email: 'billing@demo.com',
    phone: '+12345678909',
    role: 'BILLING',
    status: 'ACTIVE',
    profile: {
      first_name: 'Billing',
      last_name: 'Staff',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'BIL001',
      position: 'Billing Officer',
      hire_date: new Date()
    }
  },
  {
    // Biomedical engineering staff
    email: 'biomed@demo.com',
    phone: '+12345678911',
    role: 'BIOMED',
    status: 'ACTIVE',
    profile: {
      first_name: 'Biomed',
      last_name: 'Engineer',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'BME001',
      position: 'Biomedical Engineer',
      hire_date: new Date()
    }
  },
  {
    // Housekeeping staff
    email: 'housekeeping@demo.com',
    phone: '+12345678912',
    role: 'HOUSE_KEEPER',
    status: 'ACTIVE',
    profile: {
      first_name: 'Housekeeping',
      last_name: 'Staff',
      gender: 'OTHER'
    },
    staffProfile: {
      staff_number: 'HKS001',
      position: 'Housekeeping Staff',
      hire_date: new Date()
    }
  },
  {
    // Patient user (example)
    email: 'patient@demo.com',
    phone: '+12345678910',
    role: 'PATIENT',
    status: 'ACTIVE',
    profile: {
      first_name: 'Patient',
      last_name: 'User',
      gender: 'OTHER'
    },
    staffProfile: null // Patients don't have staff profiles
  }
];

/**
 * Create or get default tenant
 * 
 * @returns {Promise<Object>} Tenant object
 */
async function createOrGetTenant() {
  // Check if tenant already exists
  const existingTenant = await prisma.tenant.findFirst({
    where: {
      slug: DEFAULT_TENANT.slug,
      deleted_at: null
    }
  });

  if (existingTenant) {
    console.log(`✓ Tenant already exists: ${existingTenant.name} (${existingTenant.id})`);
    return existingTenant;
  }

  // Create new tenant
  const tenant = await prisma.tenant.create({
    data: DEFAULT_TENANT
  });

  console.log(`✓ Created tenant: ${tenant.name} (${tenant.id})`);
  return tenant;
}

/**
 * Create or get default facility
 * 
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Facility object or null
 */
async function createOrGetFacility(tenantId) {
  // Check if facility already exists
  const existingFacility = await prisma.facility.findFirst({
    where: {
      tenant_id: tenantId,
      name: DEFAULT_FACILITY.name,
      deleted_at: null
    }
  });

  if (existingFacility) {
    console.log(`✓ Facility already exists: ${existingFacility.name} (${existingFacility.id})`);
    return existingFacility;
  }

  // Create new facility
  const facility = await prisma.facility.create({
    data: {
      ...DEFAULT_FACILITY,
      tenant_id: tenantId
    }
  });

  console.log(`✓ Created facility: ${facility.name} (${facility.id})`);
  return facility;
}

/**
 * Create or get role by name
 * 
 * @param {string} tenantId - Tenant ID
 * @param {string} roleName - Role name
 * @param {string|null} facilityId - Facility ID (optional)
 * @returns {Promise<Object>} Role object
 */
async function createOrGetRole(tenantId, roleName, facilityId = null) {
  // Check if role already exists
  const existingRole = await prisma.role.findFirst({
    where: {
      tenant_id: tenantId,
      facility_id: facilityId,
      name: roleName,
      deleted_at: null
    }
  });

  if (existingRole) {
    return existingRole;
  }

  // Create new role
  const role = await prisma.role.create({
    data: {
      tenant_id: tenantId,
      facility_id: facilityId,
      name: roleName,
      description: `Default ${roleName} role`
    }
  });

  console.log(`  ✓ Created role: ${roleName}`);
  return role;
}

/**
 * Create user account with profile and role assignment
 * 
 * @param {Object} accountDef - Account definition from USER_ACCOUNTS
 * @param {string} tenantId - Tenant ID
 * @param {string|null} facilityId - Facility ID (optional)
 * @returns {Promise<Object>} Created user object
 */
async function createUserAccount(accountDef, tenantId, facilityId) {
  const { email, phone, role, status, profile, staffProfile } = accountDef;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId,
      email: email,
      deleted_at: null
    }
  });

  if (existingUser) {
    console.log(`  ⚠ User already exists: ${email} (skipping)`);
    return existingUser;
  }

  // Hash password
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  // Create user
  const user = await prisma.user.create({
    data: {
      tenant_id: tenantId,
      facility_id: facilityId,
      email: email,
      phone: phone,
      password_hash: passwordHash,
      status: status
    }
  });

  console.log(`  ✓ Created user: ${email} (${user.id})`);

  // Create user profile
  if (profile) {
    await prisma.user_profile.create({
      data: {
        user_id: user.id,
        facility_id: facilityId,
        first_name: profile.first_name,
        middle_name: profile.middle_name || null,
        last_name: profile.last_name || null,
        gender: profile.gender || null,
        date_of_birth: profile.date_of_birth || null
      }
    });
    console.log(`    ✓ Created user profile`);
  }

  // Create staff profile if applicable
  if (staffProfile) {
    await prisma.staff_profile.create({
      data: {
        tenant_id: tenantId,
        user_id: user.id,
        staff_number: staffProfile.staff_number,
        position: staffProfile.position,
        hire_date: staffProfile.hire_date || new Date()
      }
    });
    console.log(`    ✓ Created staff profile`);
  }

  // Create or get role
  const roleObj = await createOrGetRole(tenantId, role, facilityId);

  // Assign role to user
  await prisma.user_role.create({
    data: {
      user_id: user.id,
      role_id: roleObj.id,
      tenant_id: tenantId,
      facility_id: facilityId
    }
  });
  console.log(`    ✓ Assigned role: ${role}`);

  // Create audit log
  try {
    await createAuditLog({
      action: 'USER_CREATED',
      entity: 'user',
      entity_id: user.id,
      user_id: user.id,
      tenant_id: tenantId,
      facility_id: facilityId,
      details: {
        email: email,
        role: role,
        created_by: 'setup-default-accounts.js'
      }
    });
  } catch (err) {
    // Non-critical, just log warning
    console.warn(`    ⚠ Failed to create audit log: ${err.message}`);
  }

  return user;
}

/**
 * Main setup function
 */
async function setupDefaultAccounts() {
  console.log('🚀 Starting default accounts setup...\n');

  try {
    // 1. Create or get tenant
    console.log('Step 1: Setting up tenant...');
    const tenant = await createOrGetTenant();
    console.log('');

    // 2. Create or get facility
    console.log('Step 2: Setting up facility...');
    const facility = await createOrGetFacility(tenant.id);
    console.log('');

    // 3. Create user accounts
    console.log('Step 3: Creating user accounts...');
    const createdUsers = [];
    
    for (const accountDef of USER_ACCOUNTS) {
      console.log(`\nCreating account: ${accountDef.email} (${accountDef.role})`);
      const user = await createUserAccount(accountDef, tenant.id, facility?.id || null);
      createdUsers.push({ email: user.email, role: accountDef.role });
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup completed successfully!\n');
    console.log('Summary:');
    console.log(`  Tenant: ${tenant.name} (${tenant.id})`);
    if (facility) {
      console.log(`  Facility: ${facility.name} (${facility.id})`);
    }
    console.log(`  Users created: ${createdUsers.length}`);
    console.log('\nDefault Accounts:');
    createdUsers.forEach(({ email, role }) => {
      console.log(`  - ${email} (${role})`);
    });
    console.log(`\n⚠️  IMPORTANT: Default password for all accounts: ${DEFAULT_PASSWORD}`);
    console.log('   Please change all passwords after first login!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
}

// Run setup if executed directly
if (require.main === module) {
  setupDefaultAccounts()
    .then(() => {
      console.log('\n✨ Setup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup script failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDefaultAccounts };
