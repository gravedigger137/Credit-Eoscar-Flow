# Credit-Eoscar to BrandonFintech Merger Plan

## Overview

This document defines a safe merger path for making Credit-Eoscar a credit repair, e-OSCAR, Metro 2, onboarding, and credit-operations module inside the broader BrandonFintech platform. BrandonFintech remains the main fintech shell for banking-style accounts, ledger, payments, transfers, dashboard, and platform identity work. Credit-Eoscar remains the specialized credit workflow module.

This is a planning and integration-readiness document only. It does not merge databases, migrate production data, claim live bureau/e-OSCAR access, or change current production-blocker-remediated Credit-Eoscar security controls.

## Current Repo Inventory

### Credit-Eoscar-Flow

- Frontend: React, Vite, TypeScript, Wouter routing, existing Infinite Arcadia / Credit-Eoscar shell.
- Backend: Node.js, Express, session auth, versioned API support under `/api/v1`, legacy `/api` compatibility.
- Database: PostgreSQL with Drizzle schema and migrations.
- Core modules:
  - Public booking and consultation intake.
  - Client records with `onboarding` status.
  - Onboarding steps and automation.
  - Notifications and inbox feed.
  - Credit report parsing and dispute workflow support.
  - Metro 2 workflow support.
  - Bureau/e-OSCAR readiness routes and documentation.
  - Document Room, Asset Register, legal/accounting/compliance workflow docs.
  - Security hardening: RBAC, CSRF, MFA readiness, rate limiting, upload guardrails, status endpoints, secret handling, Docker/deployment docs.
- Confirmed working flow to preserve:
  - Public booking/signup works.
  - Client record auto-creates.
  - Client status becomes `onboarding`.
  - Admin dashboard shows the client.
  - Admin/system inbox receives onboarding notifications.
  - Notifications feed works.

### BrandonFintech

- Backend: .NET 9 modular solution.
- Frontend: React + Vite app in `BrandonFintech.Web`.
- Database: PostgreSQL with EF Core migrations.
- Core modules:
  - Auth/JWT and role-based admin access.
  - Users, accounts, ledger entries, payments, transfers, audit logs, idempotency keys.
  - Account creation, deposits, transfers, CSV statements.
  - Stripe PaymentIntent and webhook foundation.
  - Admin endpoints and dashboard/transactions frontend.
  - Cloudflare Worker / Ollama AI gateway scaffold.
- Current caution:
  - BrandonFintech has a local modified `BrandonFintech.Api/appsettings.Development.json`; do not overwrite or commit secrets from that repo.

## Target Unified Platform Architecture

BrandonFintech should become the primary platform shell, with Credit-Eoscar mounted as a credit module. The target architecture should look like this:

- BrandonFintech Web: main authenticated customer/admin portal.
- BrandonFintech API: platform identity, accounts, ledger, payments, transfers, audit, platform status.
- Credit-Eoscar module: credit repair, onboarding, disputes, bureau/e-OSCAR readiness, Metro 2, document room, credit automation, notifications.
- Shared AI gateway: isolated worker/service layer used by both products without sharing secrets directly with frontend code.
- Separate PostgreSQL databases in the near term:
  - BrandonFintech database owns financial accounts, ledger, payments, transfers, Stripe events, and financial audit logs.
  - Credit-Eoscar database owns credit clients, onboarding, disputes, documents, automation, bureau readiness, notifications, and credit workflow audit data.
- Later shared identity layer:
  - Use OIDC/SSO or an identity broker.
  - Do not directly share password tables between products.

Detailed architecture scaffolding now lives in:

- `docs/architecture/Unified-Platform-Architecture.md`
- `docs/architecture/unified-platform.mmd`
- `docs/shared-core/README.md`
- `docs/modules/Credit-Eoscar-Module.md`

## Phase 1 Implementation Scope

This phase is architecture-only scaffolding:

- Document current architecture and route boundaries.
- Document shared-core candidates.
- Document identity, customer/client, notification, payment, AI, and dashboard strategy.
- Keep Credit-Eoscar and BrandonFintech independently deployable.
- Do not move runtime code.
- Do not merge databases.
- Do not add cross-system writes.
- Do not change existing Credit-Eoscar booking, onboarding, notification, or security flows.

## Shared Component Candidates

| Component | Candidate Shared Form | Runtime Change Now |
| --- | --- | --- |
| Authentication | OIDC/SSO identity provider | No |
| Authorization | Shared permission vocabulary with product-local enforcement | No |
| Notifications | Event contracts and source-system tagging | No |
| Audit logging | Correlation IDs and event taxonomy | No |
| Email/SMS | Provider adapters behind a notification service | No |
| AI | Shared AI gateway with provider abstraction | No |
| Configuration | Secret-manager-backed naming conventions | No |
| Validation | Shared response and error standards | No |
| Customer model | Reference IDs, not table merge | No |

## BrandonFintech as Main Shell

BrandonFintech should provide the unified navigation and customer/admin entry point:

- Dashboard
- Accounts
- Transactions
- Payments
- Transfers
- Statements
- Credit Repair
- Credit Reports
- Disputes
- Metro 2
- Document Room
- Inbox
- Admin

The first integration phase should use deep links or embedded routes to Credit-Eoscar rather than moving all Credit-Eoscar code into the .NET solution.

## Credit-Eoscar as Credit Module

Credit-Eoscar should remain responsible for:

- Credit client intake and onboarding.
- Public consultation booking.
- Admin credit operations dashboard.
- Notifications/inbox for credit workflows.
- Credit report parsing.
- Dispute workflow support.
- Metro 2 workflow support.
- e-OSCAR readiness tracking.
- Bureau sandbox/live status tracking.
- Document Room and compliance workflow records.

Do not remove existing Credit-Eoscar routes until equivalent BrandonFintech routes are implemented, tested, and reversible.

## Shared Auth and Session Strategy

### Current State

- Credit-Eoscar uses Express session authentication with CSRF protection.
- BrandonFintech uses JWT bearer authentication.

### Target State

Use a shared identity provider or OIDC bridge later. Recommended path:

1. Keep both auth systems independent for staging.
2. Add a signed cross-system link strategy only after both apps are deployed behind approved HTTPS domains.
3. Introduce OIDC or a dedicated identity service.
4. Move customer/admin role mapping into the identity layer.
5. Require MFA for admin and high-risk roles across both systems.

Do not share password tables directly. Password stores encode different assumptions about hashing, session/JWT behavior, MFA state, recovery flows, roles, lockout, and audit scope.

### Compatibility Rules

- Credit-Eoscar session cookies and CSRF tokens remain intact.
- BrandonFintech JWT issuer, audience, signing key, roles, and expiration remain intact.
- Shared identity is a future adapter, not a direct database dependency.
- Admin MFA must be enforced per product until shared identity is proven.

## Shared Customer and Client Model

Use reference IDs instead of a merged table.

| Concept | BrandonFintech Owner | Credit-Eoscar Owner | Integration Key |
| --- | --- | --- | --- |
| Platform user | `Users` | optional linked staff/customer identity | `platform_user_id` |
| Financial account holder | `Users`, `Accounts` | no ownership | `platform_user_id` |
| Credit client | no ownership at first | `clients` | `credit_client_id` |
| Onboarding case | optional summary only | `onboarding_steps`, `clients` | `credit_onboarding_id` |
| Receivable/payment reference | `Payments`, ledger references | `receivable_readiness_records` | `payment_reference_id` |

Initial integration should add a mapping document and later a small linking table or service:

- `platform_user_id`
- `credit_client_id`
- `source_system`
- `created_at`
- `linked_by_admin_user_id`
- `audit_event_id`

No migration should copy SSNs, bureau data, credit reports, or financial ledger data between systems without a formal data-classification review.

## Shared Admin Dashboard Strategy

BrandonFintech should eventually show a unified admin dashboard with read-only summary cards from Credit-Eoscar:

- New credit onboarding leads.
- Credit clients in onboarding.
- Unread credit notifications.
- Dispute queues.
- Document review queues.
- Bureau/e-OSCAR readiness status.

Phase 1 should be read-only status cards or links. Write actions should remain inside Credit-Eoscar until RBAC, CSRF/session handling, audit logging, and cross-system authorization are designed.

## Shared Inbox and Notifications Strategy

Credit-Eoscar notifications are already part of the confirmed onboarding flow. Preserve them.

Target strategy:

1. Keep Credit-Eoscar notifications as source of truth for credit workflows.
2. Add a read-only notification summary endpoint or integration adapter.
3. BrandonFintech can display counts and link back to Credit-Eoscar.
4. Later, introduce a platform notification service with event types:
   - `credit.onboarding.created`
   - `credit.notification.created`
   - `payment.intent.created`
   - `ledger.entry.created`
   - `admin.review.required`

Do not move notification storage until both audit semantics and retention policies are aligned.

Initial read-only event names:

- `credit.booking.created`
- `credit.client.created`
- `credit.onboarding.started`
- `credit.notification.created`
- `credit.document.review_required`
- `finance.payment.created`
- `finance.transfer.completed`
- `admin.review.required`

## Shared Billing and Payments Strategy

Keep Stripe responsibilities separate until explicitly unified:

- BrandonFintech Stripe:
  - PaymentIntents
  - account funding tests
  - fintech payments workflow
  - payment webhooks for fintech objects
- Credit-Eoscar Stripe:
  - SaaS billing
  - subscriptions
  - customer checkout
  - payment links or service billing

If Stripe accounts are shared later, every event must include product metadata:

- `product=brandonfintech`
- `product=credit-eoscar`
- `customer_reference_id`
- `source_system`

Do not route both products through one webhook handler until product routing, replay protection, idempotency, and test mode behavior are proven.

Payment routing strategy:

- Consumer payments: BrandonFintech owns account/payment surfaces.
- Business payments: future BrandonFintech business module, not implemented.
- Subscription billing: Credit-Eoscar may own SaaS/service subscription billing if configured.
- Credit services: Credit-Eoscar billing remains product-specific.
- Banking services: BrandonFintech remains source of truth.
- Future lending: documentation and readiness only until regulated approvals exist.

Every future shared payment event must include `source_system`, `product`, `correlation_id`, and Stripe test/live environment metadata.

## Shared Database Strategy

Do not merge the databases in Phase 1.

Recommended phases:

1. Separate databases, separate migrations, separate backups.
2. Add cross-system reference IDs only.
3. Add read-only reporting views or API adapters.
4. Add event-driven synchronization for summaries.
5. Consider a data warehouse or reporting database for aggregate analytics.

Financial ledgers must remain isolated and immutable. Credit/PII/bureau data must remain isolated with stricter access boundaries.

## API Route Mapping

| Capability | Current Credit-Eoscar Route | Current BrandonFintech Route | Target Unified Route |
| --- | --- | --- | --- |
| Platform status | `/status`, `/status/security`, `/status/infrastructure`, `/status/integrations` | `/health`, `/ready`, `/api/v1/platform/status` | `/api/v1/platform/status` plus module status cards |
| Auth | `/api/v1/auth/*`, `/api/auth/*` | `/api/v1/auth/*` | shared OIDC later; no password-table merge |
| Credit booking | `/api/book-consultation` | none | `/api/v1/credit/book-consultation` via adapter later |
| Credit clients | `/api/v1/clients`, `/api/clients` | none | `/api/v1/credit/clients` |
| Notifications | `/api/v1/notifications`, `/api/notifications` | none | `/api/v1/notifications` with source-system tagging later |
| Onboarding | `/api/v1/onboarding/*`, `/api/onboarding/*` | none | `/api/v1/credit/onboarding/*` |
| Accounts | none | `/api/v1/accounts` | BrandonFintech remains source of truth |
| Payments | Credit billing routes | `/api/v1/payments/*` | separate product metadata and webhooks |
| Transfers | none | `/api/v1/transfers/*` | BrandonFintech remains source of truth |
| Admin | Credit admin/status/config routes | `/api/v1/admin/*` | unified admin shell with module RBAC |

## Frontend Route Mapping

| Target Navigation | Current Owner | Initial Behavior |
| --- | --- | --- |
| `/` dashboard | BrandonFintech | Main platform dashboard |
| `/accounts` | BrandonFintech | Existing accounts UI |
| `/payments` | BrandonFintech | Existing PaymentIntent test UI |
| `/transactions` | BrandonFintech | Existing transaction history UI |
| `/credit` | Credit-Eoscar | Link or embedded module entry |
| `/credit/clients` | Credit-Eoscar | Preserve current clients UI |
| `/credit/onboarding` | Credit-Eoscar | Preserve current onboarding behavior |
| `/credit/disputes` | Credit-Eoscar | Preserve current disputes UI |
| `/credit/metro2` | Credit-Eoscar | Preserve current Metro 2 UI |
| `/credit/document-room` | Credit-Eoscar | Preserve Document Room controls |
| `/inbox` | Credit-Eoscar first, platform later | Show summary/link first |
| `/admin` | Both | BrandonFintech shell with Credit-Eoscar module links |

## Migration Sequence

### Phase 0: Preserve Current Production-Ready Apps

- Keep Credit-Eoscar deployable as-is.
- Keep BrandonFintech deployable as-is.
- Do not alter Credit-Eoscar onboarding, booking, notifications, or security controls.

### Phase 1: Planning and Read-Only Linking

- Add this merger plan and unified platform documentation.
- Document route mapping and data ownership.
- Deploy both apps independently in staging.
- Add links from BrandonFintech to Credit-Eoscar only after domain routing is ready.

### Phase 2: Identity Strategy

- Select shared identity strategy: OIDC provider, internal identity broker, or managed auth.
- Map roles without copying password hashes.
- Require admin MFA across both products.

### Phase 3: Read-Only Module Integration

- BrandonFintech displays Credit-Eoscar read-only summary cards.
- Credit-Eoscar remains source of truth for credit workflows.
- Add integration tests for auth boundaries and no-secret responses.

### Phase 4: Event and Notification Integration

- Add event contracts.
- Add platform notification adapter.
- Keep audit logs in both systems with correlation IDs.

### Phase 5: Controlled Write Integration

- Only after RBAC, CSRF/JWT, audit, and idempotency alignment.
- Add one write workflow at a time.
- Keep rollback path to independent apps.

## Deployment Strategy

Recommended staging domains:

- `staging-app.infinitearcadia.com` for BrandonFintech Web.
- `staging-api-fintech.infinitearcadia.com` for BrandonFintech API.
- `staging-credit.infinitearcadia.com` for Credit-Eoscar.
- `staging-ai.infinitearcadia.com` for AI Worker.

Production target:

- BrandonFintech becomes the main app shell.
- Credit-Eoscar remains a separately deployed module until full integration is proven.

Each service needs independent:

- Environment variables.
- Database connection string.
- CORS allowlist.
- Secret manager entries.
- Health/readiness checks.
- Rollback target.

Staging validation must prove:

- Credit-Eoscar public booking still works.
- Credit-Eoscar onboarding and notifications still work.
- BrandonFintech auth/accounts/payments/transfers still work.
- Cross-app links do not bypass auth.
- No status endpoint exposes secret values.
- Rollback can disable module links without taking either app down.

## Rollback Plan

The safest rollback is to keep both apps independently deployable.

If integration fails:

1. Disable BrandonFintech links to Credit-Eoscar.
2. Keep Credit-Eoscar public booking and admin workflows running independently.
3. Roll BrandonFintech frontend to the previous deployment.
4. Do not roll back additive documentation-only commits unless they cause deployment issues.
5. Do not roll back database migrations without a dedicated migration rollback plan.
6. Keep Stripe, bureau, Plaid, and AI secrets isolated per product.

## Risks

- Auth mismatch: Express sessions and JWT bearer auth need a deliberate bridge.
- CSRF mismatch: Credit-Eoscar browser session routes need CSRF tokens; BrandonFintech JWT flows do not.
- Data duplication: platform users and credit clients can diverge without a mapping strategy.
- PII leakage: credit reports, SSNs, bureau data, and financial ledger data must not be copied casually.
- Stripe ambiguity: mixed product events can corrupt payment workflows if metadata/routing is weak.
- Admin overreach: a BrandonFintech admin must not automatically receive Credit-Eoscar high-risk permissions without review.
- Operational coupling: one app should not take the other down during early integration.

## Manual Tasks

- Confirm target staging domains.
- Confirm deployment providers for each service.
- Configure CORS allowlists for both apps.
- Decide shared identity provider or OIDC strategy.
- Define role mapping between BrandonFintech and Credit-Eoscar.
- Define support process for linked users/clients.
- Confirm data-retention and privacy policies for cross-system references.
- Enable and test admin MFA in both products before real-user launch.
- Confirm which Stripe account(s) are used for each product.

## External Dependencies

- Managed PostgreSQL databases for both products.
- Production secret manager.
- Stripe test keys and webhook secrets.
- Bureau sandbox credentials before any bureau live work.
- e-OSCAR authorization before any production e-OSCAR work.
- Plaid sandbox credentials if financial account linking is enabled.
- AI provider keys or local AI gateway configuration.
- Cloudflare DNS, Workers, Pages, or equivalent routing.
- Hosting platform configuration for BrandonFintech API and Credit-Eoscar API.

## Integration TODOs

- TODO: Define shared identity provider decision record.
- TODO: Define cross-system reference schema before writing any synchronization code.
- TODO: Add read-only Credit-Eoscar summary endpoint only after RBAC and response-shape review.
- TODO: Add BrandonFintech navigation link to Credit-Eoscar only after staging domains are stable.
- TODO: Add end-to-end staging smoke tests for booking, login, dashboard, account creation, credit onboarding, and notifications.
- TODO: Add a shared incident response and rollback drill for both products.
- TODO: Add module contract tests before any BrandonFintech runtime dependency on Credit-Eoscar.
- TODO: Define shared notification payloads and audit correlation IDs.

## Go / No-Go

Current state:

- Credit-Eoscar remains production-blocker-remediated and should not be weakened.
- BrandonFintech remains a separate MVP fintech platform.
- Unified platform is in planning/integration phase.

Go for:

- Documentation and staging integration planning.
- Independent staging deployment.
- Read-only cross-linking after domains and CORS are configured.

No-go for:

- Database merge.
- Shared password tables.
- Live bureau/e-OSCAR claims.
- Unified Stripe webhook without tested routing.
- Moving financial ledgers into Credit-Eoscar.
- Moving Credit-Eoscar PII/bureau data into BrandonFintech.
