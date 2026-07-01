# Customer Shareholder Bonus Program

## Purpose
Define an optional, compliance-gated customer equity interest inquiry and review workflow.

## Scope
Interest tracking, eligibility review, attorney review, board/officer approval, stockholder agreement, issuance agreement, cap table, stock ledger, transfer restrictions, tax review, disclosure, and signed acceptance.

## Owner
Equity Program Workflow Agent.

## Human Review Required
Securities attorney, tax professional, board/officer approval, and corporate records review.

## Security Notes
Do not promise equity to signups. Do not mark a customer as shareholder without approvals and documentation.

## Audit Requirements
Approving eligibility, issuing shares, changing approved shares, certificate issued, stockholder agreement signed, cap table update, and shareholder status require audit events.

## Related Routes
`/api/v1/document-room/equity-bonus`.

## Related Database Tables
`equity_bonus_records`, `audit_events`.

## Go/No-Go Criteria
Not safe for production issuance until counsel approves plan documents and controls.
