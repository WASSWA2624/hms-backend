---
alwaysApply: true
---

# Backend Rules Index (Express.js)
All code must follow these 24 rules; noncompliance is invalid.

## 11–14. Security & Ops
- `auth-security.mdc`: JWT, RBAC, API keys, CSRF, hashing, sanitize.
- `cors.mdc`: CORS config, origins, security.
- `rate-limiting.mdc`: Rate limits, DDoS, abuse prevention.
- `health-checks.mdc`: Health/live/readiness endpoints.

## 15. Realtime
- `websockets.mdc`: WebSocket standards, events, auth, audit.

## 16. Database
- `prisma.mdc`: Prisma/ORM usage, DB ops.

## 17. Storage
- `storage.mdc`: Centralized storage, multi-provider, secure files.

## 18. Error & Logging
- `error-logging.mdc`: Error handling, logs, no leaks.

## 19–20. Compliance & Env
- `compliance.mdc`: GDPR, HIPAA, audit, encrypt.
- `constants-env.mdc`: Config/constants/env validation.

## 21–22. Docs & Tests
- `documentation.mdc`: JSDoc for routes/functions.
- `testing.mdc`: Jest tests, no prod DB.

## 23. Performance
- `performance.mdc`: Query limits, pagination, caching, optimize.

## 24–25. i18n & Offline
- `internationalization.mdc`: Multi-lang, locale, formatting, RTL.
- `offline-support.mdc`: Offline-first, sync, conflict resolution.

---