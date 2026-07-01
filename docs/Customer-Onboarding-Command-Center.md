# Customer Onboarding Command Center

## Purpose
Track waiting list import, profile creation, MSA, order form, terms, privacy, consent forms, payment method, service activation, invoice, service evidence, receivable review, and support routing.

## Scope
Customer readiness workflow only.

## Owner
Customer Onboarding Agent.

## Human Review Required
Contract status, authorization sufficiency, service completion evidence, payment disputes, and receivable eligibility.

## Security Notes
Protect PII, credit data, authorizations, payment references, and documents.

## Audit Requirements
Customer contract status, receivable eligibility, lender visibility, and evidence deletion require audit logs.

## Related Routes
`/api/v1/clients`, `/api/v1/documents`, `/api/v1/document-room/receivables`.

## Related Database Tables
`clients`, `onboarding_steps`, `client_documents`, `receivable_readiness_records`.

## Go/No-Go Criteria
No customer is service-ready until agreements, authorizations, payment setup, and required review are complete.
