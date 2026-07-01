# Engineering Workflow Support

## Purpose
Track coding tasks, code review, deployment readiness, incident follow-up, API monitoring, and infrastructure status.

## Scope
Engineering workflow and operational readiness only.

## Owner
Engineering Agent / Code Review Agent.

## Human Review Required
Production deployment, database migrations, security exceptions, and secret/config changes.

## Security Notes
No hardcoded secrets, no production data in tests, no unreviewed dependency upgrades.

## Audit Requirements
Deployment, rollback, secret rotation, and incident changes require audit records.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`, `/api/v1/status/automation`.

## Related Database Tables
`audit_events`, migration tables.

## Go/No-Go Criteria
Build and smoke tests must pass before staging promotion.
