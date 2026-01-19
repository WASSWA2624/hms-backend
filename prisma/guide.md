# Prisma Guide - HMS Backend

## Overview
This HMS backend uses **Prisma 7.x** with MySQL/MariaDB adapter pattern. The schema includes 100+ models covering all HMS modules.

## Database Connection
- **Config**: `prisma.config.js` (for CLI tools)
- **Runtime**: `src/prisma/client.js` (adapter pattern with connection pool)
- **URL**: Set `DATABASE_URL` in `.env` (see `env.template.txt`)

## Initial Setup (Already Completed)
✅ Database created: `hms_db`  
✅ Initial migration applied: `20260119113248_initial_schema`  
✅ Prisma Client generated

## Common Commands

### 1. Generate Prisma Client
After any schema changes, regenerate the client:
```sh
npx prisma generate
```

### 2. Create New Migration
When you modify `schema.prisma`:
```sh
npx prisma migrate dev --name <migration_name>
```
Example: `npx prisma migrate dev --name add_payment_status`

### 3. View Database (Prisma Studio)
Launch visual database browser:
```sh
npx prisma studio
```
Opens at `http://localhost:5555`

### 4. Reset Database (Development Only)
⚠️ Deletes all data and re-applies migrations:
```sh
npx prisma migrate reset
```

### 5. Validate Schema
Check schema for errors:
```sh
npx prisma validate
```

### 6. Format Schema
Auto-format `schema.prisma`:
```sh
npx prisma format
```

## Schema Structure

### Models by Module
- **Core**: tenant, facility, branch, department, unit, ward, room, bed
- **Identity**: user, user_profile, role, permission, api_key
- **Patient**: patient, patient_identifier, patient_allergy, consent
- **Scheduling**: appointment, provider_schedule, availability_slot
- **Clinical**: encounter, clinical_note, diagnosis, vital_sign, procedure
- **IPD**: admission, bed_assignment, discharge_summary
- **ICU/Theatre**: icu_stay, theatre_case, anesthesia_record
- **Lab**: lab_test, lab_order, lab_sample, lab_result
- **Radiology**: radiology_order, imaging_study, pacs_link
- **Pharmacy**: drug, pharmacy_order, dispense_log
- **Inventory**: inventory_item, stock_movement, purchase_order
- **Emergency**: emergency_case, triage_assessment, ambulance
- **Billing**: invoice, payment, insurance_claim
- **HR**: staff_profile, shift, payroll_run
- **Facilities**: housekeeping_task, maintenance_request, asset
- **Notifications**: notification, message, template
- **Reporting**: report_definition, kpi_snapshot
- **Compliance**: audit_log, phi_access_log, breach_notification
- **Integration**: integration, webhook_subscription

### Key Features
- **Soft Deletes**: All models have `deleted_at` field
- **Versioning**: `version` field for offline conflict resolution
- **Timestamps**: `created_at`, `updated_at` on all models
- **Multi-tenancy**: `tenant_id` on tenant-scoped models
- **Indexing**: Optimized indexes on foreign keys and filters

## Development Workflow

1. **Modify Schema**: Edit `prisma/schema.prisma`
2. **Validate**: Run `npx prisma validate`
3. **Create Migration**: Run `npx prisma migrate dev --name <name>`
4. **Generate Client**: Run `npx prisma generate`
5. **Test in Studio**: Run `npx prisma studio`

## Production Deployment

1. **Apply Migrations**:
```sh
npx prisma migrate deploy
```

2. **Generate Client**:
```sh
npx prisma generate
```

## Troubleshooting

### "Client out of sync"
Run: `npx prisma generate`

### "Migration failed"
1. Check database connection
2. Review migration SQL in `prisma/migrations/`
3. Fix schema errors and try again

### "Cannot find module @prisma/client"
Run: `npm install @prisma/client`

## Resources
- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma 7.x Adapter Pattern](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- Project Rules: `.cursor/rules/prisma.mdc`

---
