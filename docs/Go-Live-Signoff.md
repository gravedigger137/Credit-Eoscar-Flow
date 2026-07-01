# Go-Live Signoff

## Purpose
Final signoff checklist for staging and production.

## Scope
Customer onboarding, governance, infrastructure, security, integrations, document room, equity framework, and due diligence.

## Owner
Chief Admin Agent / Officer Task Agent.

## Human Review Required
Attorney, accountant, security, compliance, and officer signoff.

## Security Notes
Do not go live with unresolved critical secret, PII, RBAC, backup, or production integration blockers.

## Audit Requirements
Record go/no-go decision, approvers, date, blockers, and rollback plan.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`, `/status/integrations`.

## Related Database Tables
`audit_events`, migration tables.

## Go/No-Go Criteria
Staging may proceed after build and migration smoke tests. Real users require RBAC, professional review, backups, monitoring, and production secret/config review.
