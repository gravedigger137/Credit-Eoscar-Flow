# Equity Issuance Compliance Boundaries

## Purpose
Prevent unsafe or misleading equity program claims.

## Scope
Customer equity interest inquiries and shareholder bonus workflow.

## Owner
Legal Review Queue Agent.

## Human Review Required
All securities, tax, corporate, cap table, shareholder, and transfer-restriction decisions.

## Security Notes
Do not treat signup as stock issuance. Do not market guaranteed ownership.

## Audit Requirements
Every status change requires audit history.

## Related Routes
`/api/v1/document-room/equity-bonus`.

## Related Database Tables
`equity_bonus_records`, `audit_events`.

## Go/No-Go Criteria
Issuance blocked until attorney-reviewed plan, board approval, stock ledger workflow, tax review, and customer disclosure exist.
