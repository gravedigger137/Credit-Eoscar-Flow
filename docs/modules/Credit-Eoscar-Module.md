# Credit-Eoscar Module Boundary

## Overview

Credit-Eoscar is the credit operations module for the unified BrandonFintech platform. It must remain independently deployable until shared identity, route mapping, data ownership, CORS, audit logging, and rollback are proven in staging.

## Purpose

Define what Credit-Eoscar owns and what it must not take over from BrandonFintech.

## Owned Capabilities

- Public booking and consultation intake.
- User signup for Credit-Eoscar staff/admin workflows.
- Client creation.
- Onboarding pipeline.
- Admin dashboard visibility for credit clients.
- Admin notifications.
- System inbox and notifications feed.
- Client status tracking.
- Credit repair workflow support.
- Credit reports and uploads.
- Dispute workflow support.
- Metro 2 workflow support.
- e-OSCAR readiness tracking.
- Bureau sandbox/live readiness status.
- Tradeline workflows.
- Credit analytics.
- Document Room and credit compliance records.

## Capabilities Not Owned

- BrandonFintech accounts.
- BrandonFintech ledger.
- BrandonFintech transfers.
- BrandonFintech PaymentIntent funding flow.
- BrandonFintech idempotency table.
- BrandonFintech financial audit logs.
- Bank sweep programs.
- Card issuing.
- Lending approval.
- Regulated underwriting.
- Live bureau or e-OSCAR production transmissions without authorization.

## Required Preservation Tests

Before and after any integration step, verify:

- Public booking still reaches `/api/book-consultation`.
- Booking still creates a client.
- Client status remains `onboarding`.
- Onboarding steps initialize.
- Admin dashboard can list the new client.
- Notification is created for onboarding.
- Notifications feed still loads.
- Existing security controls still pass build and smoke checks.

## Integration Surfaces

Initial safe surfaces:

- Read-only module status.
- Read-only onboarding counts.
- Read-only unread notification count.
- Deep links from BrandonFintech to Credit-Eoscar.

Deferred surfaces:

- Cross-system writes.
- Shared inbox writes.
- Shared billing writes.
- Shared identity enforcement.
- Data synchronization.

## Module API Direction

Future canonical route family:

- `/api/v1/credit/book-consultation`
- `/api/v1/credit/clients`
- `/api/v1/credit/onboarding`
- `/api/v1/credit/disputes`
- `/api/v1/credit/metro2`
- `/api/v1/credit/e-oscar`
- `/api/v1/credit/reports`
- `/api/v1/credit/notifications`

Existing routes must remain until compatibility is intentionally retired.

## Rollback

If module integration fails:

1. Remove or disable BrandonFintech module links.
2. Keep Credit-Eoscar deployed independently.
3. Keep Credit-Eoscar database and workflows untouched.
4. Revert only integration-specific UI or routing changes.
5. Leave production security controls in place.
