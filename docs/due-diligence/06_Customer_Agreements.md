# Customer Agreements

## Overview
Customer contracts, MSAs, order forms, terms acceptance, privacy acceptance, authorizations, and service records.

## Purpose
Support onboarding readiness and receivable evidence without fabricating contracts, signatures, or payment history.

## Architecture
Customer documents link to `document_room_items`, `clients`, `onboarding_steps`, and `receivable_readiness_records`.

## Dependencies
Signed MSA, order form, terms acceptance, privacy acceptance, authorizations, payment method evidence, invoice, and service evidence.

## Folder Structure
Document Room categories: `Customer Contracts` and `Receivables`.

## Security
Protect customer PII, payment data, credit data, and authorization records.

## Maintenance
Review before service activation, invoice generation, receivable eligibility, and lender-visible changes.

## Related Documentation
`docs/Customer-Onboarding-Command-Center.md`, `docs/Onboarding.md`.

## Required Documents
MSA, order form, terms, privacy policy, consent/authorization forms, payment method confirmation, invoice, service completion evidence.

## Document Owner
Customer Onboarding Agent / Legal Workflow Agent.

## Review Status
Draft - attorney review required.

## Version History
v0.1 - Initial section.
