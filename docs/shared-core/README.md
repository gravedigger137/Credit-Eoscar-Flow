# Shared Core Scaffolding

## Overview

This folder identifies shared-core candidates for the unified Infinite Arcadia / BrandonFintech platform. It is documentation scaffolding only. It does not move runtime code, weaken security, or change existing workflows.

## Purpose

Create a safe inventory of components that may become shared libraries or shared services after staging proof.

## Candidate Shared Components

| Component | Current Sources | Proposed Shared Shape | Migration Status |
| --- | --- | --- | --- |
| Authentication | Credit-Eoscar sessions, BrandonFintech JWT | OIDC/SSO identity provider | Design only |
| Authorization | Credit-Eoscar admin gates, BrandonFintech roles | Permission vocabulary and claims policy | Design only |
| MFA | Credit-Eoscar TOTP readiness, BrandonFintech admin MFA roadmap | Shared admin MFA enforcement policy | Design only |
| Notification Service | Credit-Eoscar notifications | Event-based notification service | Design only |
| Email Service | Provider not fully configured | Adapter with provider interface | Not implemented |
| SMS Service | Provider not fully configured | Adapter with provider interface | Not implemented |
| Audit Logging | Credit-Eoscar `audit_events`, BrandonFintech `AuditLogs` | Correlation ID and event taxonomy | Design only |
| Permissions | Product-local roles | Shared permission names and product-local enforcement | Design only |
| User Models | `users`, `Users` | Identity profile plus product-local account records | Design only |
| Client Models | Credit-Eoscar `clients` | Unified customer reference model | Design only |
| Configuration | Env vars, appsettings | Secret-manager-backed config conventions | Design only |
| Validation | Zod, DTO validation | Shared response and error conventions | Design only |
| Utilities | Security helpers, idempotency helpers | Cross-language patterns, not shared code yet | Design only |

## Non-Goals

- No shared password table.
- No database merge.
- No movement of Credit-Eoscar PII into BrandonFintech.
- No movement of BrandonFintech ledger data into Credit-Eoscar.
- No live integration claims.

## Proposed Package Boundaries

Future shared libraries may be split by runtime:

- `InfiniteArcadia.Contracts`: cross-system event and DTO contracts.
- `InfiniteArcadia.Identity`: OIDC/claims conventions.
- `InfiniteArcadia.Notifications`: event names and notification payloads.
- `InfiniteArcadia.Audit`: audit event taxonomy and correlation IDs.
- `InfiniteArcadia.Config`: environment variable and secret naming conventions.

These package names are placeholders for architecture planning, not implemented packages.

## Safe First Step

The first implementation step should be a read-only integration contract:

```json
{
  "sourceSystem": "credit-eoscar",
  "eventType": "credit.onboarding.created",
  "correlationId": "generated-by-source",
  "subjectType": "credit_client",
  "subjectId": "credit-client-id",
  "occurredAt": "ISO-8601 timestamp"
}
```

Do not publish events to production until authentication, authorization, retry behavior, audit logging, and error handling are tested in staging.
