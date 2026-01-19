# Backend API – Development Plan

This plan is chronological and additive. Foundational phases ensure a minimal, runnable server before any app-specific work. All app-specific aspects (models, endpoints, modules, seed data, app WS events, extra locales) are last.

## Phases (Foundational)

1. **Phase 0: Setup** (`P000_setup.mdc`)
   - Scaffold project, initialize repo, install dependencies, set up environment variables.
2. **Phase 1: Core Utilities** (`P001_core.mdc`)
   - Error handling, response helpers, logging, validation, crypto, auth middleware, health checks.
3. **Phase 2: Prisma Foundation** (`P002_prisma.mdc`)
   - Prisma configuration, connectivity validation, no data models yet.
4. **Phase 3: Minimal App** (`P003_app.mdc`)
   - Minimal Express app boot with health endpoints; server must run cleanly.
5. **Phase 4: i18n Base** (`P004_i18n.mdc`)
   - Locale detection, `en` locale, locale metadata in responses, i18n helpers.
6. **Phase 5: WebSocket Base** (`P005_ws.mdc`)
   - Base WS server/gateway/auth/heartbeat, no app-specific events.
7. **Phase 6: Storage Base** (`P006_storage.mdc`)
   - Storage abstraction + provider switch, no app-specific storage logic.
8. **Phase 7: Testing & CI Base** (`P007_tests.mdc`)
   - Base tests, CI workflow, mocks for external dependencies.
9. **Phase 8: Offline Support Base** (`P015_offline.mdc`)
   - Versioning, sync, idempotency, cache validation, conflict responses.
---

## Phases (Application-Specific)

9. **Phase 9: Models** (`P009_models.mdc`)
    - Define full Prisma schema, run migrations, generate client.
10. **Phase 10: API Endpoints Reference** (`P010_api_endpoints.mdc`)
    - App-specific endpoint map for modules.
11. **Phase 11: API Modules** (`P011_modules.mdc`)
    - Implement modules in priority order (per `module-creation.mdc`).
12. **Phase 12: Seeder** (`P012_seeder.mdc`)
    - Faker-based seeding with dynamic record counts and `npm run seed`.
13. **Phase 13: WebSocket Features** (`P013_ws_features.mdc`)
    - App-specific WS events and emissions.
14. **Phase 14: Locale Expansion** (`P014_locales.mdc`)
    - Add non-`en` locales and validate translations.
15. **Phase 15: Performance & Readiness Checks** (`P008_perf.mdc`)
    - Pagination enforcement, perf checks, readiness verification.

---

## References

- **Rules:** `.cursor/rules/*.mdc` (generic, cross-app only)
- **Phases:** All logic/endpoints managed via this plan (`backend/dev-plan`)
- **Seeding:** Script must be documented and maintained in `package.json`

> Only health endpoints are allowed before Phase 9. The app/server must run without errors before any app-specific phases begin.
