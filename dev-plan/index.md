# Backend API - Development Plan

This plan is chronological and additive. Foundational phases ensure a minimal, runnable server before any app-specific work. App-specific models, endpoints, modules, seed data, app WebSocket events, and locale expansion are last.

## Phases (Foundational)

1. **Phase 0: Setup** (`P000_setup.mdc`)
   - Scaffold project, initialize repo, install dependencies, set up environment variables.
2. **Phase 1: Core Utilities** (`P001_core.mdc`)
   - Error handling, response helpers, logging, validation, crypto, auth middleware, health checks.
3. **Phase 2: Prisma Foundation** (`P002_prisma.mdc`)
   - Prisma configuration and connectivity validation (no app models yet).
4. **Phase 3: Minimal App** (`P003_app.mdc`)
   - Minimal Express boot with health endpoints; server must run cleanly.
5. **Phase 4: i18n Base** (`P004_i18n.mdc`)
   - Locale detection, `en` locale, locale metadata in responses, i18n helpers.
6. **Phase 5: WebSocket Base** (`P005_ws.mdc`)
   - Base WebSocket server/gateway/auth/heartbeat, no app-specific events.
7. **Phase 6: Storage Base** (`P006_storage.mdc`)
   - Storage abstraction + provider switch, no app-specific storage logic.
8. **Phase 7: Testing & CI Base** (`P007_tests.mdc`)
   - Base tests, CI workflow, and mocks for external dependencies.
9. **Phase 8: Offline Support Base** (`P015_offline.mdc`)
   - Versioning, sync, idempotency, cache validation, conflict responses.

## Phases (Application-Specific)

10. **Phase 9: Models** (`P009_models.mdc`)
    - Define Prisma schema, run migrations, generate client.
11. **Phase 10: API Endpoints Reference** (`P010_api_endpoints.mdc`)
    - App-specific endpoint map for all HMS modules.
12. **Phase 11: API Modules** (`P011_modules.mdc`)
    - Implement modules in priority order (per `module-creation.mdc`).
13. **Phase 12: Seeder** (`P012_seeder.mdc`)
    - Faker-based seeding with dynamic record counts and `npm run seed`.
14. **Phase 13: WebSocket Features** (`P013_ws_features.mdc`)
    - App-specific WebSocket events and emissions.
15. **Phase 14: Locale Expansion** (`P014_locales.mdc`)
    - Add non-`en` locales and validate translations.
16. **Phase 15: Performance & Readiness Checks** (`P008_perf.mdc`)
    - Pagination enforcement, perf checks, and readiness verification.

## Current Implementation Snapshot (2026-02-12)

- Foundational phases are present and running in the current codebase.
- Phase 10 endpoint reference is in active use for module routing.
- Phase 11 module implementation status is **140/144 complete**.
- Pending module implementations: `invoice-item`, `payment`, `pharmacy-order-item`, `refund`.
- Module progress detail is maintained in `P011_modules.mdc`.

## References

- **Rules:** `hms-backend/.cursor/rules/*.mdc` (start from `index.mdc`).
- **Phases:** implementation order and status are tracked under `hms-backend/dev-plan/`.
- **Seeding:** seed scripts must be documented and maintained in `package.json`.

> Historical sequencing guardrail: before Phase 9, only system health endpoints are allowed.
