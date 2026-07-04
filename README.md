# Infinite Arcadia / Credit-Eoscar

## Overview

Credit-Eoscar is the Infinite Arcadia credit-operations platform for customer onboarding, credit workflow support, document organization, automation, compliance queues, billing workflow, trust-accounting metadata, and due-diligence preparation.

It is not a bank, lender, law firm, CPA firm, credit bureau, e-OSCAR operator, or approved credit facility. Legal, accounting, tax, banking, credit, securities, insurance, lender-facing, and bureau-facing decisions require qualified professional review.

## Unified Platform Direction

Credit-Eoscar is planned to become the credit repair, onboarding, e-OSCAR readiness, Metro 2, document-room, and credit-operations module inside the larger BrandonFintech platform. BrandonFintech should remain the main fintech shell for accounts, ledger, payments, transfers, dashboard, and platform identity work.

This direction is documented in `MERGER_PLAN.md` and `docs/UNIFIED_PLATFORM.md`. It is not a completed code merge. Credit-Eoscar and BrandonFintech should stay independently deployable until shared identity, route mapping, database ownership, CORS, audit logging, and rollback procedures are proven in staging.

Architecture scaffolding for the integration lives in:

- `docs/architecture/Unified-Platform-Architecture.md`
- `docs/architecture/unified-platform.mmd`
- `docs/shared-core/README.md`
- `docs/modules/Credit-Eoscar-Module.md`

## Purpose

The platform organizes truthful records and workflows for:

- Customer onboarding and service readiness
- Credit report analysis and dispute workflow support
- Document room and lender/investor due-diligence packets
- Asset register and collateral-readiness tracking
- Receivable-readiness review
- AI-assisted operations with human approval gates
- Safe staging/production deployment readiness

## Architecture

- Frontend: React, Vite, TypeScript, existing Infinite Arcadia / Credit-Eoscar UI components
- Backend: Node.js, Express, versioned JSON APIs under `/api/v1`
- Database: PostgreSQL with Drizzle schema and migrations
- Authentication: Express session auth with rate limiting on sensitive auth routes
- Automation: Existing automation engine with human review requirements for high-risk workflows
- Integrations: Stripe, Plaid, OpenAI/local AI, bureau clients, Cloudflare/Render/Vercel/Neon readiness docs

## Dependencies

- Node.js 20+
- PostgreSQL 16+
- Docker and Docker Compose for local full-stack execution
- Environment variables from `.env.example`
- Platform secret managers for production credentials

## Folder Structure

- `client/src`: React frontend
- `server`: Express API, services, integrations, automation
- `shared/schema.ts`: Drizzle schema and shared types
- `db/migrations`: database migrations
- `docs`: production, staging, due-diligence, infrastructure, operations, and security docs
- `uploads`: local development upload storage; production must use durable storage or persistent volume

## Security

Do not commit `.env`, credentials, SSNs, EINs, bureau credentials, Stripe keys, Plaid keys, OpenAI keys, database passwords, or customer PII documents. Store secrets only in platform secret managers. Admin route families use centralized RBAC, bootstrap administrators are configured through `BOOTSTRAP_ADMIN_EMAILS`, and sensitive stored config should be encrypted with `SENSITIVE_CONFIG_ENCRYPTION_KEY`. Document templates are drafts and require attorney review.

## Maintenance

Run these before handoff:

```bash
npm run check
npm run build
```

Use migrations for schema changes. Review `docs/Production-Readiness-Go-No-Go.md` before staging or production changes.

## Related Documentation

- `docs/Master-Asset-Register.md`
- `docs/Credit-Facility-Readiness.md`
- `docs/Credit-Algorithm.md`
- `docs/due-diligence/00_Master_Index.md`
- `docs/Enterprise-Operations-Overview.md`
- `docs/Security-And-Audit-Controls.md`
- `docs/security/RBAC.md`
- `docs/security/Secret-Management.md`
- `docs/security/MFA.md`
- `docs/security/CSRF.md`
- `docs/security/Rate-Limiting.md`
- `docs/Monitoring.md`
