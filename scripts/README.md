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
- **OPERATIONS**: Operations staff
- **HR**: Human resources staff
- **BIOMED**: Biomedical engineering staff
- **HOUSE_KEEPER**: Housekeeping staff
- **PATIENT**: Patient user (example)

#### What It Does

1. **Creates Default Tenant**: Creates a "Demo Tenant" tenant if none exists
2. **Creates Default Facility**: Creates a "Demo Facility" facility within the tenant
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
Demo@123!
```

**You MUST change all passwords immediately after first login in production!**

#### Default Accounts Created

| Email | Role | Description |
|-------|------|-------------|
| `superadmin@demo.com` | SUPER_ADMIN | Platform-level administrator |
| `tenantadmin@demo.com` | TENANT_ADMIN | Tenant administrator |
| `facilityadmin@demo.com` | FACILITY_ADMIN | Facility administrator |
| `doctor@demo.com` | DOCTOR | Medical doctor |
| `nurse@demo.com` | NURSE | Nursing staff |
| `labtech@demo.com` | LAB_TECH | Laboratory technician |
| `pharmacist@demo.com` | PHARMACIST | Pharmacy staff |
| `receptionist@demo.com` | RECEPTIONIST | Front desk staff |
| `billing@demo.com` | BILLING | Billing officer |
| `operations@demo.com` | OPERATIONS | Operations officer |
| `hr@demo.com` | HR | Human resources officer |
| `biomed@demo.com` | BIOMED | Biomedical engineer |
| `housekeeping@demo.com` | HOUSE_KEEPER | Housekeeping staff |
| `patient@demo.com` | PATIENT | Patient user |

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

### `clear-demo-data.js`

Clears all application data from the current database.

#### Purpose

- Removes all records from application tables
- Preserves Prisma migration metadata (`_prisma_migrations`)
- Useful before reseeding for clean demo environments

#### Usage

```bash
# Clear all application data
node scripts/clear-demo-data.js

# Preview tables without deleting
node scripts/clear-demo-data.js --dry-run
```

#### NPM Shortcut

```bash
npm run db:clear:demo
```

---

### `seed-demo-data.js`

Seeds demo data across seedable tables with a configurable per-table target.

#### Purpose

- Ensures base demo accounts via `setup-default-accounts.js`
- Seeds approximately 50 records per seedable table (where applicable)
- Skips direct seeding of `tenant`, `facility`, and `user` models

#### Usage

```bash
# Seed demo data (default target: 50/model)
node scripts/seed-demo-data.js

# Custom per-table target
DEMO_RECORDS_PER_TABLE=20 node scripts/seed-demo-data.js

# Skip running setup-default-accounts.js
node scripts/seed-demo-data.js --skip-default-accounts
```

#### NPM Shortcuts

```bash
npm run db:seed:demo
npm run db:reset:demo
```

`db:reset:demo` runs:
1. `db:clear:demo`
2. `db:seed:demo`

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
