# Internal Audit Workflow

## Purpose
Provide recurring internal audit procedure.

## Scope
Weekly operations, monthly security/access, quarterly disaster recovery, and pre-launch go-live audits.

## Owner
Internal Audit Agent / Security Monitor Agent.

## Human Review Required
Control exceptions, data exposure, legal/accounting issues, and customer-impacting findings.

## Security Notes
Do not include raw secrets or customer PII in audit reports.

## Audit Requirements
Every audit should include scope, evidence, findings, severity, owner, due date, and closure status.

## Related Routes
`/status/infrastructure`, `/status/integrations`, `/api/v1/document-room/audit-events`.

## Related Database Tables
`audit_events`.

## Go/No-Go Criteria
No production launch with unresolved critical audit findings.
