# Stock Ledger Workflow

## Purpose
Define stock ledger support workflow.

## Scope
Stockholder agreement, issuance agreement, cap table reference, stock ledger entry, certificate status, transfer restrictions, and audit history.

## Owner
Officer Task Agent.

## Human Review Required
Corporate counsel, securities counsel, tax review, and board/officer approval.

## Security Notes
Mask sensitive customer identifiers and do not expose private cap table data publicly.

## Audit Requirements
Stock ledger and cap table updates require high-risk confirmation and audit events.

## Related Routes
`/api/v1/document-room/equity-bonus`.

## Related Database Tables
`equity_bonus_records`, `audit_events`.

## Go/No-Go Criteria
No issuance without signed documents and approved records.
