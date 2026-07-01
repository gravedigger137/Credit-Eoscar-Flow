# Security and Audit Controls

## Purpose
Define controls for secrets, PII, uploads, AI workflows, document room, asset register, receivable readiness, and high-risk approvals.

## Scope
All Credit-Eoscar workflows and shared Infinite Arcadia documentation.

## Owner
Security Monitor Agent.

## Human Review Required
Legal, accounting, compliance, banking, credit, insurance, lender, and production bureau decisions.

## Security Notes
Use environment variables, platform secret managers, CORS allowlists, security headers, centralized admin RBAC, upload guardrails, masked secret reads, encrypted sensitive app config, and least privilege.

## Audit Requirements
Audit events must capture user, timestamp, action, before value, after value, related document, reason/note, high-risk flag, and confirmation text where required.

## Related Routes
`/api/v1/document-room/audit-events`, `/api/v1/document-room/controls`.

## Related Database Tables
`audit_events`, `document_room_items`, `collateral_assets`, `receivable_readiness_records`.

## Go/No-Go Criteria
Real users require admin MFA, CSRF protection, tested backup restore, monitoring, upload storage hardening with malware scanning, and incident response readiness.
