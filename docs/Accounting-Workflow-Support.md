# Accounting Workflow Support

## Purpose
Support invoice review, receivable review, payment reconciliation, trust-accounting review, cashflow reports, and aging reports.

## Scope
Workflow support only. No CPA opinion or valuation conclusion.

## Owner
Accounting Workflow Agent.

## Human Review Required
Accountant review required for financial reports, receivable schedules, valuations, IUL cash value, and collateral values.

## Security Notes
Mask account numbers, tax IDs, customer PII, and payment details.

## Audit Requirements
Receivable eligibility, collateral value, and financial-report disclosure changes require audit logs.

## Related Routes
`/api/v1/document-room/receivables`, `/api/v1/trust-accounting`, `/api/v1/billing`.

## Related Database Tables
`transactions`, `receivable_readiness_records`, `collateral_assets`, trust accounting tables.

## Go/No-Go Criteria
Production requires accountant-reviewed reporting and reconciliation controls.
