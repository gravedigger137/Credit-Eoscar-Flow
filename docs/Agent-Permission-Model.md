# Agent Permission Model

## Purpose
Set permission boundaries for AI agents and automation.

## Scope
All internal agents, automation rules, monitoring checks, and workflow queues.

## Owner
Security Monitor Agent / Chief Admin Agent.

## Human Review Required
Legal approvals, accounting approvals, lender-visible status, receivable eligibility, collateral values, customer termination, refunds, production bureau/e-OSCAR transmission, data export, evidence deletion, admin overrides, role changes, and secret/config changes.

## Security Notes
Each agent must have tool allowlist, route allowlist, database scope, approval requirements, risk rating, audit logging, human override, and failure behavior.

## Audit Requirements
High-risk actions require before/after value, actor, timestamp, related document, reason, and confirmation text.

## Related Routes
`/api/v1/status/agents`, `/api/v1/document-room/controls`.

## Related Database Tables
`audit_events`.

## Go/No-Go Criteria
Staging-safe for metadata. Production requires enforced RBAC and approval workflow.
