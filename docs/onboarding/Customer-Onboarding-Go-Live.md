# Customer Onboarding Go-Live

## Purpose
Define customer onboarding launch gates.

## Scope
Waiting list, profile creation, MSA, order form, terms, privacy, consents, payment method, activation, invoice, service evidence, receivable review, and support routing.

## Owner
Customer Onboarding QA Agent.

## Human Review Required
Contracts, consents, payment disputes, service evidence, and receivable eligibility.

## Security Notes
Protect customer PII, credit data, and payment references.

## Audit Requirements
Record status changes, missing docs, and manual review.

## Related Routes
`/api/v1/clients`, `/api/v1/document-room/receivables`.

## Related Database Tables
`clients`, `onboarding_steps`, `document_room_items`, `receivable_readiness_records`.

## Go/No-Go Criteria
Customer is ready only after required agreements, consents, payment setup, service evidence, and review gates are complete.
