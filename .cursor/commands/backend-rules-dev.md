# Backend Rules Dev Command Contract

This file is the shared execution contract for `.cursor/commands/dev-phase-*.mdc`.

## Source-Of-Truth Order (Mandatory)

Use this exact precedence, aligned with `hms-backend/dev-plan/index.md`:
1. `hms-backend/.cursor/rules/index.mdc` and linked canonical rule files.
2. `hms-frontend/dev-plan/*.md`.
3. Selected file in `hms-backend/dev-plan/*.mdc`.
4. `hms-frontend/write-up.md`.
5. Ticket/chat notes.

## Mandatory Preflight

- Read `hms-backend/.cursor/rules/index.mdc` and any canonical ownership files it points to.
- Read the selected phase file completely, including supplemental compliance and write-up gates.
- Confirm chronology against `.cursor/commands/index-backend-phases.mdc`.
- If endpoints are touched, enforce `dev-plan/P010_api_endpoints.mdc` sections 0-28.
- If modules are touched, enforce the 8-step module lifecycle from `module-creation.mdc`.

## Non-Negotiable Contracts

- All `.cursor/rules/*.mdc` files are mandatory; no phase command can weaken them.
- Foundational phases (0-8) remain framework/platform baseline only.
- App phases (9-15) must not regress completed foundational contracts.
- Selected step IDs only: do not auto-expand to unselected siblings.
- Write-up alignment sections declared inside each selected phase file are acceptance gates.

## Required Completion Report Fields

- Selected IDs implemented.
- Rule compliance checks performed.
- Chronology/dependency checks performed.
- Write-up alignment sections/gates validated.
- Any intentionally deferred out-of-scope work.

## Canonical Role Catalog

Role names must stay aligned with `.cursor/rules/index.mdc`:
`SUPER_ADMIN`, `TENANT_ADMIN`, `FACILITY_ADMIN`, `DOCTOR`, `NURSE`, `LAB_TECH`, `PHARMACIST`, `RECEPTIONIST`, `BILLING`, `OPERATIONS`, `HR`, `PATIENT`, `BIOMED`, `HOUSE_KEEPER`, `OTHER`.
