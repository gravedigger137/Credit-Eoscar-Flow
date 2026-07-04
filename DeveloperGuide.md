# Developer Guide

## Overview
This guide supports safe development inside the existing Credit-Eoscar architecture.

## Purpose
Keep implementation modular, typed, buildable, Docker-compatible, and environment-configured.

## Architecture
Prefer service modules for business logic, thin Express route handlers, shared types in `shared/schema.ts`, and reusable React components.

For unified-platform work, do not move runtime code between Credit-Eoscar and BrandonFintech until the integration contract is documented, validated, and reversible. Start with docs, read-only links, route maps, and event contracts.

## Dependencies
Node.js 20, npm, PostgreSQL, Docker, TypeScript, Drizzle, Vite.

## Folder Structure
Use `server/*-service.ts` for business logic, `server/routes*.ts` for routing, `client/src/pages` for pages, and `docs` for operational documentation.

## Security
Never hardcode secrets. Use placeholders in examples. Keep sensitive test files out of git.

## Maintenance
Run `npm run check`, `npm run build`, and review generated migrations before commit.

Before any merger-related commit:

- Verify Credit-Eoscar booking/onboarding/notifications are not changed unless explicitly required.
- Verify BrandonFintech remains untouched unless the task specifically authorizes changes there.
- Keep shared-core work in documentation or contracts until staging proves the integration path.
- Do not commit `.env`, secrets, uploaded documents, or generated artifacts.

## Related Documentation
`Architecture.md`, `API.md`, `Security.md`, `MERGER_PLAN.md`, `docs/shared-core/README.md`, `docs/modules/Credit-Eoscar-Module.md`.
