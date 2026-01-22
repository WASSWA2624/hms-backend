# Hospital Management System (HMS) Backend API

A comprehensive backend API for a modern, modular Hospital Management System built with Node.js, Express.js, and Prisma.

## Overview

This backend provides RESTful APIs for managing clinical, operational, and administrative hospital workflows with a modular, multi-tenant architecture. It supports module-based subscriptions, customization requests, and flexible payments for both local and international deployments, while maintaining strict MVC patterns and clear separation of concerns.

## Core Capabilities

- Modular HMS modules (clinical, diagnostics, pharmacy, inventory, HR, billing)
- Multi-tenant support for multiple hospitals/branches
- Role-based access control (RBAC) and audit logging
- Subscription, per-module billing, and perpetual licensing options
- Multi-currency payments with local and international providers
- Customization and integration request workflows

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod
- **Real-time**: WebSockets (ws)

## Non-negotiable project rules (quick)

- **Module system**: CommonJS only (`require`/`module.exports`) — no ESM `import`/`export`
- **Architecture**: Route → Controller → Service → Repository → Prisma (no skipped layers)
- **Versioning**: All API module endpoints are under `/api/v1/*`
- **Health endpoints**: `GET /health`, `GET /ready`, `GET /live` (unversioned)
- **Validation**: Zod schemas only (no inline/manual validation)
- **Responses**: Use standardized response helpers from `src/lib/response/`

## Project Structure

The project follows a strict MVC architecture with modules organized by business domain. See `.cursor/rules/project-structure.mdc` for detailed structure.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MySQL database
- npm or yarn

### Installation

#### Quick Setup (PowerShell - Windows)

For Windows PowerShell users, use the automated setup script:

```powershell
.\setup.ps1
```

**Note:** If you encounter an execution policy error, run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Alternatively, you can bypass the execution policy for a single run:
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

This script will:
- Check prerequisites (Node.js, npm)
- Install dependencies
- Create `.env` from template
- Run Prisma migrations
- Generate Prisma client

#### Manual Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `env.template.txt` (local-only; per project rules it must be gitignored) and add required variables (see `dev-plan/P000_setup.mdc` for the authoritative list).
4. Copy `env.template.txt` to `.env` and configure:
   
   **Bash/Unix:**
   ```bash
   cp env.template.txt .env
   ```
   
   **PowerShell:**
   ```powershell
   Copy-Item env.template.txt .env
   ```
   
   **Cross-platform (Node.js):**
   ```bash
   node -e "require('fs').copyFileSync('env.template.txt', '.env')"
   ```
5. Update `.env` with your database credentials and other required variables.
   - Do **not** commit `.env`
6. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
7. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
8. (Optional) Create default user accounts:
   ```bash
   npm run setup:accounts
   ```
   This creates default accounts for all user types. See `scripts/README.md` for details.

### Development

Start the development server with auto-reload:
```bash
npm run dev
```

### Production

Start the production server:
```bash
npm start
```

## Import aliases

This repo uses runtime aliases (via `module-alias`) like `@lib/*`, `@config/*`, `@services/<module>/*`. These must be registered at the very top of `src/server.js` (per `.cursor/rules/import-aliases.mdc`).

## API Endpoints

All endpoints are prefixed with `/api/v1/`. See `.cursor/rules/api.mdc` for complete endpoint documentation.

### Health Check Endpoints

The following health check endpoints are available at the root level (not under `/api/v1/`):

- `GET /health` - Application health status (returns 200 if healthy, 503 if unhealthy)
- `GET /ready` - Readiness check (returns 200 if ready to serve traffic, 503 if not ready)
- `GET /live` - Liveness check (returns 200 if application process is alive)

These endpoints are public and do not require authentication. They are used for monitoring and container orchestration.

## Scripts

Utility scripts are located in the `scripts/` directory. See `scripts/README.md` for detailed documentation.

### Setup Default Accounts

Create default user accounts for all user types (SUPER_ADMIN, TENANT_ADMIN, DOCTOR, NURSE, etc.):

```bash
npm run setup:accounts
```

**⚠️ Security Note**: All accounts are created with a default password. Change passwords immediately after first login!

For more information, see `scripts/README.md`.

## Testing

Run tests:
```bash
npm test
```

## Project Rules

This project follows strict architectural and coding standards defined in `.cursor/rules/`. Key rules include:

- **MVC architecture**: Route → Controller → Service → Repository → Prisma
- **Module system**: CommonJS only (`require`/`module.exports`)
- **Import aliases**: All imports use aliases (no relative imports across modules)
- **Validation**: Zod schemas for all request inputs
- **Authentication**: JWT with RBAC (Role-Based Access Control)
- **Database**: Prisma ORM with MySQL, soft deletes for all resources
- **Audit logging**: All mutations create audit logs (non-blocking)
- **Response format**: Standardized JSON responses with consistent structure
- **Health checks**: Health, readiness, and liveness endpoints for monitoring
- **Error handling**: Centralized error middleware with sanitized logging
- **Rate limiting**: Configurable rate limits per endpoint/user
- **CORS**: Environment-aware CORS configuration

See `.cursor/rules/index.mdc` for the complete list of 24 rule files covering all aspects of the project.

## License

ISC

