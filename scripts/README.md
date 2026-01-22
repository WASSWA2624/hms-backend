# Scripts Directory

This directory contains utility scripts for database setup, maintenance, and development tasks.

## Available Scripts

### `setup-default-accounts.js`

Creates default user accounts for all user types in the HMS system.

#### Purpose

This script initializes the system with default accounts for:
- **SUPER_ADMIN**: Platform-level administrator (manages multiple hospitals)
- **TENANT_ADMIN**: Hospital/tenant-level administrator
- **FACILITY_ADMIN**: Facility-level administrator
- **DOCTOR**: Medical doctor
- **NURSE**: Nursing staff
- **LAB_TECH**: Laboratory technician
- **PHARMACIST**: Pharmacy staff
- **RECEPTIONIST**: Front desk staff
- **BILLING**: Billing and finance staff
- **PATIENT**: Patient user (example)

#### What It Does

1. **Creates Default Tenant**: Creates a "Default Hospital" tenant if none exists
2. **Creates Default Facility**: Creates a "Main Hospital" facility within the tenant
3. **Creates Roles**: Creates custom roles for each user type (if they don't exist)
4. **Creates Users**: Creates user accounts with:
   - Hashed passwords (bcryptjs)
   - User profiles (name, gender, etc.)
   - Staff profiles (for staff members)
   - Role assignments
   - Audit logs

#### Usage

```bash
# From project root
node scripts/setup-default-accounts.js
```

#### Prerequisites

- Database must be initialized (migrations applied)
- `.env` file must be configured with `DATABASE_URL`
- Prisma client must be generated (`npx prisma generate`)

#### Default Credentials

**⚠️ SECURITY WARNING**: All accounts are created with the default password:
```
ChangeMe123!
```

**You MUST change all passwords immediately after first login in production!**

#### Default Accounts Created

| Email | Role | Description |
|-------|------|-------------|
| `superadmin@hospital.com` | SUPER_ADMIN | Platform-level administrator |
| `admin@hospital.com` | TENANT_ADMIN | Hospital administrator |
| `facilityadmin@hospital.com` | FACILITY_ADMIN | Facility administrator |
| `doctor@hospital.com` | DOCTOR | Medical doctor |
| `nurse@hospital.com` | NURSE | Nursing staff |
| `labtech@hospital.com` | LAB_TECH | Laboratory technician |
| `pharmacist@hospital.com` | PHARMACIST | Pharmacy staff |
| `receptionist@hospital.com` | RECEPTIONIST | Front desk staff |
| `billing@hospital.com` | BILLING | Billing officer |
| `patient@hospital.com` | PATIENT | Patient user |

#### Account Details

Each account includes:
- **Email**: Unique email address
- **Phone**: Unique phone number (format: +123456789XX)
- **Status**: ACTIVE (ready to use)
- **User Profile**: First name, last name, gender
- **Staff Profile**: Staff number, position, hire date (for staff roles)
- **Role Assignment**: Appropriate role assigned via `user_role` table

#### Idempotency

The script is **idempotent** - it can be run multiple times safely:
- Existing tenants/facilities are reused
- Existing users are skipped (not recreated)
- New users are created only if they don't exist

#### Customization

To customize the accounts, edit the constants in `setup-default-accounts.js`:

```javascript
// Change default password
const DEFAULT_PASSWORD = 'YourSecurePassword123!';

// Change tenant details
const DEFAULT_TENANT = {
  name: 'Your Hospital Name',
  slug: 'your-hospital-slug',
  is_active: true
};

// Modify USER_ACCOUNTS array to add/remove/modify accounts
```

#### Troubleshooting

**Error: "Prisma client not found"**
- Run `npx prisma generate` first

**Error: "Invalid DATABASE_URL"**
- Check your `.env` file has a valid `DATABASE_URL`
- Format: `mysql://user:password@host:port/database`

**Error: "Module alias not found"**
- Ensure you're running from the project root
- Check that `node_modules` is installed (`npm install`)

**Users not created**
- Check database connection
- Verify migrations are applied (`npx prisma migrate status`)
- Check console output for specific errors

#### Security Notes

- All passwords are hashed using bcryptjs (10 salt rounds)
- Passwords follow auth-security.mdc requirements (≥8 characters)
- Audit logs are created for each user creation
- Default passwords should be changed immediately after setup

#### Related Documentation

- [Prisma Guide](../prisma/guide.md)
- [Authentication & Security Rules](../.cursor/rules/auth-security.mdc)
- [Project Structure](../.cursor/rules/project-structure.mdc)

---

## Adding New Scripts

When adding new scripts to this directory:

1. **Follow the structure**: Use module aliases registration pattern (see `setup-default-accounts.js`)
2. **Add documentation**: Document purpose, usage, prerequisites, and examples
3. **Update this README**: Add your script to the "Available Scripts" section
4. **Follow project rules**: Ensure compliance with all `.cursor/rules/*.mdc` files
5. **Handle errors**: Use try/catch and proper error messages
6. **Clean up**: Always disconnect Prisma client in finally blocks

### Script Template

```javascript
/**
 * Script Name
 * 
 * Brief description of what the script does
 * 
 * Usage:
 *   node scripts/script-name.js
 * 
 * @module scripts/script-name
 */

// Register module aliases (required)
require('module-alias/register');
const path = require('path');

// ... alias registration code ...

// Import dependencies
const prisma = require('@prisma/client');

async function main() {
  try {
    // Script logic here
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
```
