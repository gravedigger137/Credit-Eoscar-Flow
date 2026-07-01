# 24/7 Operations Runbook

## Purpose
Coordinate monitoring, escalation, incident response, failed jobs, onboarding queues, document review, compliance review, accounting review, and infrastructure alerts.

## Scope
Staging and production operations.

## Owner
Incident Response Agent.

## Human Review Required
Any user-impacting incident, data exposure, legal/accounting escalation, production credential change, or live integration issue.

## Security Notes
Do not paste secrets or PII into tickets, logs, AI tools, or public channels.

## Audit Requirements
Log incidents, decisions, mitigations, rollbacks, and postmortem action items.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`, `/status/automation`.

## Related Database Tables
`audit_events`.

## Go/No-Go Criteria
Operations are staging-ready after build and smoke tests. Real users require monitoring, alerting, backups, and tested incident response.
