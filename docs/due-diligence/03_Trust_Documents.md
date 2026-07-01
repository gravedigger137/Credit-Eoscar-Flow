# Trust Documents

## Overview
Trust records and asset-assignment evidence where applicable.

## Purpose
Track trust agreement records, schedules, trustee/officer records, assignment evidence, and professional review status.

## Architecture
Trust records should be separate from corporate records and mapped to `legal_instruments` only when source documents exist.

## Dependencies
Trust agreement, Schedule A, assignments, trustee records, and legal review.

## Folder Structure
Use Document Room categories `Trust` and `Lender Package` only after sensitive data is masked.

## Security
Do not expose SSNs, EINs, account numbers, beneficiary private data, or sensitive asset details.

## Maintenance
Update after any trust amendment, assignment, beneficiary update, or asset schedule change.

## Related Documentation
`docs/Master-Asset-Register.md`, `docs/due-diligence/08_Receivables_and_Collateral.md`.

## Required Documents
Trust agreement, Schedule A, assignment records, trustee records, attorney opinion if available.

## Document Owner
Officer Task queue.

## Review Status
Draft - attorney review required.

## Version History
v0.1 - Initial section.
