# Receivables and Collateral

## Overview
Receivables, payment rights, contract rights, software assets, databases, domains, copyrights, trade names, accounts, general intangibles, proceeds, and supporting evidence.

## Purpose
Track collateral-readiness metadata without claiming lender eligibility, perfection, valuation, or enforceability.

## Architecture
Use `collateral_assets`, `receivable_readiness_records`, `document_room_items`, and `audit_events`.

## Dependencies
Customer contracts, invoices, service evidence, dispute checks, valuation evidence, legal review, accountant review, and manual admin approval.

## Folder Structure
Document Room categories: `Receivables`, `IP Assets`, `Finance`, and `Lender Package`.

## Security
Mask customer PII, account data, contract pricing if confidential, and financial account numbers.

## Maintenance
Review before every lender-visible change and after each receivable status update.

## Related Documentation
`docs/Master-Asset-Register.md`, `docs/Credit-Facility-Readiness.md`.

## Required Documents
Contract, invoice, service evidence, payment terms, dispute status, collateral support, valuation support, assignment/security documents.

## Document Owner
Receivables Readiness Agent / Asset Register Agent.

## Review Status
Draft - attorney/accountant review required.

## Version History
v0.1 - Initial section.
