# Data Ownership

## Purpose
Define database responsibilities across Credit-Eoscar and BrandonFintech.

## Scope
Separate product databases with future read-only references.

## Owner
Data Quality Agent.

## Human Review Required
Any cross-system sync, export, or customer-data sharing.

## Security Notes
Do not merge credit/PII/bureau data with fintech ledger/payment data.

## Audit Requirements
Cross-system references and exports require audit logs.

## Related Routes
`/api/v1/document-room/*`, BrandonFintech `/api/v1/*`.

## Related Database Tables
Credit-Eoscar: `clients`, `disputes`, `document_room_items`, `receivable_readiness_records`. BrandonFintech: `Users`, `Accounts`, `LedgerEntries`, `Payments`, `Transfers`.

## Go/No-Go Criteria
Only read-only reference IDs until SSO/OIDC and data-sharing policies are approved.
