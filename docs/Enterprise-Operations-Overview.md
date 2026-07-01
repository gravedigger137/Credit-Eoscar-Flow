# Enterprise Operations Overview

## Purpose
Define Infinite Arcadia / Credit-Eoscar as a workflow operating system for onboarding, compliance, legal-workflow support, accounting-workflow support, engineering, infrastructure, document room, asset register, and automation.

## Scope
Credit-Eoscar operations only. BrandonFintech remains a separate fintech system with isolated ledger/accounts/payments data.

## Owner
Chief Admin Agent with officer oversight.

## Human Review Required
Legal, accounting, credit, insurance, banking, securities, bureau, lender, and tax decisions.

## Security Notes
No secrets in docs or status endpoints. Use least privilege, audit logs, and platform secrets.

## Audit Requirements
Every high-risk workflow change requires `audit_events`.

## Related Routes
`/api/v1/status/agents`, `/api/v1/status/automation`, `/api/v1/document-room/summary`.

## Related Database Tables
`audit_events`, `document_room_items`, `facility_readiness_checklist`.

## Go/No-Go Criteria
Staging may proceed after build passes. Real users require RBAC hardening, privacy review, legal review, and tested backups.
