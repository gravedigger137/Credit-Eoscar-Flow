# Architecture

## Overview
Infinite Arcadia / Credit-Eoscar is a modular React, Express, PostgreSQL, Drizzle, Docker-ready platform for credit operations, automation, onboarding, due diligence, and compliance workflow support.

## Purpose
Document system components, boundaries, APIs, data ownership, agent workflow support, and production-readiness responsibilities.

## Architecture
The frontend lives in `client/src`, the API and service layer live in `server`, shared Drizzle schema lives in `shared/schema.ts`, and migrations live in `db/migrations`. Credit-Eoscar owns credit/onboarding/document/compliance data. BrandonFintech owns fintech ledgers/payments in a separate database.

For the unified platform path, BrandonFintech is the main fintech shell and Credit-Eoscar is the credit module. The current implementation keeps both apps independently deployable and connected only by documented integration boundaries. See `docs/architecture/Unified-Platform-Architecture.md`.

## Dependencies
Node.js 20, PostgreSQL, Drizzle, React, Vite, Docker, Stripe/Plaid/OpenAI/bureau integrations when configured by environment.

## Folder Structure
`client/src/pages` contains screens, `client/src/components` contains UI, `server` contains routes/services/integrations, `docs` contains runbooks and readiness docs.

## Security
No secrets in code. Use CORS allowlists, session secret validation, security headers, audit events, human review gates, and platform secret managers.

## Maintenance
Run `npm run check`, `npm run build`, and migration review before release.

## Related Documentation
`Infrastructure.md`, `Security.md`, `DeveloperGuide.md`, `docs/data/Data-Ownership.md`, `MERGER_PLAN.md`, `docs/UNIFIED_PLATFORM.md`, `docs/architecture/Unified-Platform-Architecture.md`.
