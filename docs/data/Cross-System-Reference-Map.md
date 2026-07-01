# Cross-System Reference Map

## Purpose
Define future reference IDs without merging databases.

## Scope
Credit-Eoscar and BrandonFintech integration planning.

## Owner
Data Quality Agent.

## Human Review Required
Any new sync process or customer-data sharing.

## Security Notes
Use opaque IDs and minimum necessary metadata.

## Audit Requirements
Record export/import and sync events.

## Related Routes
Future sync endpoints only; none approved yet.

## Related Database Tables
`clients`, `receivable_readiness_records`, BrandonFintech payments/transfers.

## Go/No-Go Criteria
No production sync until data-processing agreement, privacy review, and access controls are complete.

## Reference IDs
- `customer_reference_id`
- `invoice_reference_id`
- `payment_reference_id`
- `receivable_reference_id`
- `audit_event_reference_id`
