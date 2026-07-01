# Organizational Documents

## Overview
Entity and registration records for Infinite Arcadia, Credit-Eoscar, related companies, DBAs, and trade names.

## Purpose
Organize formation evidence, EIN letters, business registrations, tax accounts, NAICS records, official designee records, and state filing evidence.

## Architecture
Records should be linked through `document_room_items` and referenced by `collateral_assets` only when relevant.

## Dependencies
Formation documents, EIN notices, state records, DBA filings, tax account records, and current good-standing evidence.

## Folder Structure
Place metadata in Document Room and sensitive files in secure storage.

## Security
Mask EINs, tax IDs, addresses where needed, and account numbers.

## Maintenance
Review annually and after entity, officer, DBA, address, tax, or state filing changes.

## Related Documentation
`docs/Master-Asset-Register.md`, `docs/due-diligence/04_Corporate_Documents.md`.

## Required Documents
Formation certificates, EIN letters, DBA filings, state registrations, annual reports, tax account confirmations.

## Document Owner
Officer Task queue.

## Review Status
Draft - attorney/accountant review required.

## Version History
v0.1 - Initial section.
