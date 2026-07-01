# Internal Audit AI Team

## Purpose
Define AI support for internal audit workflows.

## Scope
Compliance, infrastructure, accounting support, documentation, receivables, automation, cybersecurity, access controls, asset register, document room, equity/shareholder bonus tracking, and affiliate tracking.

## Owner
Internal Audit Agent.

## Human Review Required
Audit conclusions, financial assertions, legal/compliance determinations, and production signoff.

## Security Notes
Audit agents may summarize and flag issues but must not delete evidence or alter records without approval.

## Audit Requirements
All findings, escalations, overrides, and closure decisions must be recorded.

## Related Routes
`/api/v1/document-room/audit-events`, `/api/v1/status/infrastructure`.

## Related Database Tables
`audit_events`, `document_room_items`, `collateral_assets`, `receivable_readiness_records`, `equity_bonus_records`.

## Go/No-Go Criteria
Real-user launch requires closed critical findings or accepted risk by officers and professionals.
