# Backend API - Development Plan

This plan is the backend execution contract for HMS. It must remain aligned with:
- `hms-frontend/write-up.md`
- `hms-backend/.cursor/rules/index.mdc` and all linked rule files
- `hms-backend/src/modules` and `hms-backend/src/app/router.js`

## Source-Of-Truth Order

When a conflict exists, resolve using this order:
1. `hms-backend/.cursor/rules/index.mdc` and linked backend rule files
2. `hms-frontend/dev-plan/*.md`
3. `hms-backend/dev-plan/*.mdc`
4. `hms-frontend/write-up.md`
5. Ticket/chat notes

## Phases (Foundational)

1. **Phase 0: Setup** (`P000_setup.mdc`)
   - Project/bootstrap setup, env and alias foundation, Prisma 7 scaffolding.
2. **Phase 1: Core Utilities** (`P001_core.mdc`)
   - Error/response/logging/audit/auth/rate-limit/health/config baseline.
3. **Phase 2: Prisma Foundation** (`P002_prisma.mdc`)
   - Prisma client, adapter, config and connectivity verification.
4. **Phase 3: Minimal App** (`P003_app.mdc`)
   - Minimal runnable Express app, health endpoints, versioning hooks.
5. **Phase 4: i18n Base** (`P004_i18n.mdc`)
   - Locale detection, response metadata, localized errors/messages.
6. **Phase 5: WebSocket Base** (`P005_ws.mdc`)
   - WS server/gateway/auth/rbac/heartbeat/test baseline.
7. **Phase 6: Storage Base** (`P006_storage.mdc`)
   - Storage service abstraction, provider switching, security controls.
8. **Phase 7: Testing and CI Base** (`P007_tests.mdc`)
   - Global test setup, module coverage, CI gates.
9. **Phase 8: Offline Support Base** (`P015_offline.mdc`)
   - Incremental sync, idempotency, conflict handling, cache validation.

## Phases (Application-Specific)

10. **Phase 9: Models** (`P009_models.mdc`)
    - Full HMS Prisma schema (160 modules), migrations, generation.
11. **Phase 10: API Endpoints Reference** (`P010_api_endpoints.mdc`)
    - Canonical `/api/v<version>` contract for all HMS modules.
12. **Phase 11: API Modules** (`P011_modules.mdc`)
    - Module-by-module implementation order and completion contract.
13. **Phase 12: Seeder** (`P012_seeder.mdc`)
    - Deterministic seeded data for all module groups.
14. **Phase 13: WebSocket Features** (`P013_ws_features.mdc`)
    - HMS-specific real-time events.
15. **Phase 14: Locale Expansion** (`P014_locales.mdc`)
    - Non-`en` locale rollout and parity checks.
16. **Phase 15: Performance and Readiness Checks** (`P008_perf.mdc`)
    - Performance thresholds, final rule audit, release readiness.

## Write-Up Coverage Matrix

Backend plan coverage for `hms-frontend/write-up.md`:

| Write-up scope | Backend plan owner |
|---|---|
| Section 5 (architecture, tenancy, offline, adaptability controls) | `P001_core.mdc`, `P003_app.mdc`, `P015_offline.mdc`, `P011_modules.mdc`, `P008_perf.mdc` |
| Section 6 (module groups 1-20 and 15A biomedical) | `P009_models.mdc`, `P010_api_endpoints.mdc`, `P011_modules.mdc`, `P012_seeder.mdc` |
| Section 7 (end-to-end workflow contracts) | `P010_api_endpoints.mdc`, `P011_modules.mdc`, `P013_ws_features.mdc`, `P015_offline.mdc` |
| Sections 9-11 (modules strategy, commercial flows, growth engine) | `P010_api_endpoints.mdc`, `P011_modules.mdc`, `P008_perf.mdc` |
| Sections 12-13 (data model, interoperability, compliance) | `P009_models.mdc`, `P010_api_endpoints.mdc`, `P011_modules.mdc`, `P001_core.mdc` |
| Sections 14-15 (NFRs, testing, quality gates) | `P007_tests.mdc`, `P008_perf.mdc`, `P015_offline.mdc` |
| Sections 18-20 (DoD, ops readiness, KPIs) | `P008_perf.mdc`, `P011_modules.mdc`, `P007_tests.mdc` |

## Rule Coverage Matrix

All rule files in `.cursor/rules` are mapped to at least one phase:

- Foundation rules (`architecture`, `project-structure`, `coding-standards`, `import-aliases`, `module-creation`): `P000`, `P001`, `P011`
- API and contracts (`api`, `api-versioning`, `response-format`, `validation`): `P001`, `P003`, `P010`, `P011`
- Security and reliability (`auth-security`, `cors`, `rate-limiting`, `health-checks`, `error-logging`, `constants-env`): `P000`, `P001`, `P003`, `P008`
- Data and platform (`prisma`, `storage`, `websockets`, `performance`, `offline-support`, `internationalization`): `P002`, `P004`, `P005`, `P006`, `P008`, `P009`, `P015`
- Governance (`compliance`, `documentation`, `testing`): `P001`, `P007`, `P008`, `P011`

## Current Implementation Snapshot (2026-02-17)

- Backend module directories in `src/modules`: **160**
- Planned atomic modules in `P011_modules.mdc`: **160**
- Module parity with write-up section 6: **aligned**
- Foundational phases are present and in use.
- Endpoint routing source of truth remains `P010_api_endpoints.mdc`.

## References

- Rules: `hms-backend/.cursor/rules/*.mdc` (start with `index.mdc`)
- Backend dev plan: `hms-backend/dev-plan/*.mdc`
- Frontend master contract: `hms-frontend/write-up.md`

Historical sequencing guardrail: before Phase 9, only system health endpoints are allowed.
