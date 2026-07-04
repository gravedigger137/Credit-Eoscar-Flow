# Unified Infinite Arcadia / BrandonFintech Platform

## Overview

Infinite Arcadia is the parent ecosystem. BrandonFintech is the target main fintech platform shell. Credit-Eoscar is the credit repair, onboarding, e-OSCAR readiness, Metro 2, credit workflow, and compliance operations module.

This document describes the intended unified platform without claiming that regulated banking, lending, bureau, e-OSCAR, Treasury, or partner integrations are complete.

## Banking

BrandonFintech owns banking-style product surfaces:

- User accounts.
- Internal accounts.
- Available and pending balances.
- Ledger entries.
- Internal transfers.
- CSV statements.
- Admin views.

Boundary: BrandonFintech is not a licensed bank. Any bank sweep, deposit, card, ACH, Treasury, or custodial program requires approved partners, contracts, compliance review, and production credentials before being represented as live.

## Lending

Lending should remain a future regulated workflow, not an implied active product.

Allowed planning scope:

- Customer readiness.
- Document completeness.
- Receivable evidence review.
- Internal risk support.
- Lender package preparation.

Not allowed without approvals:

- Loan approval.
- Adverse-action decisions.
- Underwriting as a regulated lender.
- Claims of approved credit facilities.
- Claims of bank partnership or sweep program availability.

## Payments

BrandonFintech currently owns PaymentIntent-style fintech payment workflows. Credit-Eoscar may separately own SaaS billing, subscriptions, or service payments.

Rules:

- Keep product metadata on every Stripe workflow.
- Keep webhook handlers separate until routing is proven.
- Use test mode first.
- Never commit Stripe secrets.
- Do not imply live payments are configured unless live keys, webhooks, and smoke tests are complete.

## Credit Repair

Credit-Eoscar owns credit repair workflow support:

- Intake and onboarding.
- Credit client records.
- Credit report parsing support.
- Dispute workflow support.
- Notifications and admin inbox.
- Document review queues.
- Compliance boundaries.

Boundary: Credit-Eoscar supports workflows. It is not a credit bureau, law firm, CPA firm, lender, or e-OSCAR operator.

## e-OSCAR

Credit-Eoscar can track e-OSCAR readiness and workflow tasks.

Do not claim production e-OSCAR access unless:

- Authorization is approved.
- Credentials are configured in a secret manager.
- Sandbox/test flows are complete.
- Production transmission controls are reviewed.
- Audit logging and human approval gates are active.

## Metro 2

Credit-Eoscar owns Metro 2 workflow support and internal tooling.

Boundaries:

- Generated files and workflow outputs require human review.
- Production furnishing is not enabled by documentation alone.
- Furnisher obligations, data accuracy, consent, disputes, and compliance review must be satisfied before live use.

## Trust Accounting

Credit-Eoscar includes trust-accounting metadata and workflow support. BrandonFintech owns financial account ledger mechanics.

Boundaries:

- Do not commingle trust metadata with BrandonFintech financial ledgers.
- Do not treat workflow balances as bank balances.
- Legal/accounting review is required before real trust-accounting operations.

## AI Automation

AI can support:

- Drafting.
- Summaries.
- Task routing.
- Monitoring.
- Code review.
- Document organization.
- Internal alerts.
- Credit workflow prioritization.

AI must not:

- Act as a lawyer, CPA, lender, fiduciary, bank, broker, underwriter, public official, or compliance officer.
- Approve legal documents.
- Approve accounting treatment.
- Approve lending or credit decisions.
- Trigger production bureau/e-OSCAR transmission without human approval.
- Expose secrets or customer PII in prompts or logs.

## Client Portal

Target client portal capabilities:

- BrandonFintech shell for account, transaction, payment, and dashboard experiences.
- Credit-Eoscar module for onboarding, credit repair status, documents, dispute workflow visibility, and notifications.

Phase 1 should use links or separate module routing. A full merged portal should wait until shared identity, CORS, session/JWT boundaries, and role mapping are implemented.

## Compliance Boundaries

Required boundaries:

- Separate financial ledger ownership.
- Separate credit/PII/bureau data ownership.
- Admin MFA for high-risk operations.
- RBAC for admin and module routes.
- CSRF protection for session-auth state changes.
- Idempotency for money-moving actions.
- Audit logs for status changes, uploads, document decisions, lender visibility, receivable eligibility, and financial events.
- No secrets in Git.
- No fake integrations, credentials, approvals, partnerships, collateral values, or lender status.

## Module Ownership

| Module | Owner | Source of Truth |
| --- | --- | --- |
| Platform shell | BrandonFintech | BrandonFintech Web/API |
| Auth now | Separate per app | Existing auth systems |
| Auth target | Shared identity provider | Future OIDC/SSO |
| Accounts | BrandonFintech | BrandonFintech database |
| Ledger | BrandonFintech | BrandonFintech database |
| Payments | BrandonFintech for fintech; Credit-Eoscar for SaaS billing | Product-specific Stripe metadata |
| Credit clients | Credit-Eoscar | Credit-Eoscar database |
| Onboarding | Credit-Eoscar | Credit-Eoscar database |
| Disputes | Credit-Eoscar | Credit-Eoscar database |
| Metro 2 | Credit-Eoscar | Credit-Eoscar database |
| e-OSCAR readiness | Credit-Eoscar | Credit-Eoscar database |
| Document Room | Credit-Eoscar | Credit-Eoscar database |
| Notifications | Credit-Eoscar first, platform later | Credit-Eoscar until event adapter exists |

## Safe Integration Principle

The first production-safe step is not a code merge. It is a staged ecosystem integration:

1. Keep both apps healthy and independently deployable.
2. Document ownership and boundaries.
3. Add staging domains and CORS rules.
4. Add shared identity design.
5. Add read-only links and summaries.
6. Add event-based sync only after audit and rollback are proven.
