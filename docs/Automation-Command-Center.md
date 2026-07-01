# Automation Command Center

## Purpose
Coordinate 24/7 monitoring, scheduled jobs, failed job queues, retries, escalation, handoff, manual review queues, onboarding tasks, document review, compliance tasks, accounting tasks, engineering tasks, and infrastructure tasks.

## Scope
Existing automation engine plus document-room and readiness workflows.

## Owner
Automation Scheduler Agent.

## Human Review Required
All high-risk actions and professional-review categories.

## Security Notes
Automation must not call live bureau APIs or change secrets unless explicitly approved.

## Audit Requirements
Failed runs, escalations, high-risk status changes, and manual overrides must be logged.

## Related Routes
`/api/v1/automation/rules`, `/api/v1/automation/runs`, `/api/v1/automation/stats`, `/api/v1/status/automation`.

## Related Database Tables
Automation engine tables, `audit_events`, `facility_readiness_checklist`.

## Go/No-Go Criteria
Staging-safe after build. Production requires alerting, RBAC, retry limits, and runbook coverage.

## Dashboard Metrics
Active agents, active automation rules, completed runs, failed runs, escalations pending, onboarding tasks pending, documents needing review, receivables needing review, infrastructure checks passing, and critical alerts.
