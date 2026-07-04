# Shared Integration Contracts

## Overview

This document defines the safe planning contract for connecting Credit-Eoscar to the future BrandonFintech platform shell without merging databases, merging authentication systems, or moving sensitive data between products.

## Purpose

Provide a stable, documentation-only scaffold for shared event contracts, customer references, notification summaries, audit correlation, and integration smoke tests. These contracts are not active production integrations until implemented, secured, tested, and approved in staging.

## Scope

Applies to Credit-Eoscar, BrandonFintech, the future Infinite Arcadia platform shell, shared notifications, audit correlation, read-only module status, and future event-driven integration.

## Shared Event Envelope

Every future cross-system event should use an envelope similar to:

```json
{
  "eventId": "uuid",
  "eventType": "credit.onboarding.started",
  "sourceSystem": "credit-eoscar",
  "schemaVersion": "1.0",
  "correlationId": "uuid",
  "occurredAt": "2026-07-04T00:00:00Z",
  "actor": {
    "type": "system_or_user",
    "referenceId": "source-owned-id"
  },
  "subject": {
    "type": "credit_client",
    "referenceId": "source-owned-id"
  },
  "metadata": {
    "environment": "staging"
  }
}
```

Rules:

- Do not include SSNs, full account numbers, bureau files, report contents, payment credentials, passwords, tokens, or secrets.
- Include only references and non-sensitive summary metadata.
- Require idempotency, retry policy, audit logging, and dead-letter handling before production event publishing.

## Shared Customer Reference

Initial cross-system linking should use reference IDs only:

| Field | Owner | Notes |
| --- | --- | --- |
| `platformUserId` | BrandonFintech | Future shared identity or platform user reference |
| `creditClientId` | Credit-Eoscar | Credit client source-of-truth ID |
| `sourceSystem` | Both | `brandonfintech` or `credit-eoscar` |
| `correlationId` | Event producer | Used for support and audit lookup |
| `linkedByAdminUserId` | Product-local admin | Required for manual links |
| `linkedAt` | Product-local system | ISO timestamp |

Do not copy credit reports, SSNs, bureau data, financial ledgers, payment credentials, or customer documents into a shared link record.

## Notification Contract

Read-only notification summaries may use:

```json
{
  "notificationId": "source-owned-id",
  "sourceSystem": "credit-eoscar",
  "type": "credit.notification.created",
  "severity": "info",
  "title": "Onboarding review required",
  "createdAt": "2026-07-04T00:00:00Z",
  "link": "/credit/clients/source-owned-id"
}
```

Rules:

- Summary text must avoid sensitive personal, credit, bureau, or financial data.
- Write actions remain in the source product until shared RBAC, CSRF/JWT handling, and audit semantics are proven.
- Notification counts can be shared before full notification body replication.

## Shared Audit Event Contract

Audit correlation may use:

```json
{
  "auditEventId": "source-owned-id",
  "sourceSystem": "credit-eoscar",
  "correlationId": "uuid",
  "action": "credit.client.created",
  "actorUserId": "source-owned-id",
  "subjectType": "credit_client",
  "subjectId": "source-owned-id",
  "occurredAt": "2026-07-04T00:00:00Z",
  "riskLevel": "medium",
  "professionalReviewRequired": false
}
```

Rules:

- Do not replicate sensitive before/after values across products.
- Keep source-of-truth audit logs in the originating database.
- Use correlation IDs for support and incident response.

## Integration Smoke-Test Checklist

Before enabling any shared module link or event adapter in staging:

- Credit-Eoscar public booking still works.
- Booking creates a client with onboarding status.
- Admin dashboard shows the client.
- System inbox and notifications receive onboarding alerts.
- BrandonFintech auth, accounts, transfers, payments, and dashboard still build and pass smoke tests.
- Cross-app links do not bypass authentication.
- Status endpoints return safe metadata only.
- No `.env`, customer documents, uploads, PDFs, CSVs, ZIPs, `node_modules`, or `dist` files are staged.
- Rollback can disable links or event adapters without database rollback.

## Status

Ready as documentation scaffolding. Runtime event publishing, shared identity, shared notification writes, and shared customer-link records are not implemented.

## Security Notes

Keep BrandonFintech financial ledger data isolated. Keep Credit-Eoscar credit/PII/bureau data isolated. Use staging-only test data until legal, compliance, provider, and infrastructure review is complete.

## Related Documentation

- `MERGER_PLAN.md`
- `docs/UNIFIED_PLATFORM.md`
- `docs/architecture/Unified-Platform-Architecture.md`
- `docs/modules/Credit-Eoscar-Module.md`
- `docs/data/Cross-System-Reference-Map.md`

