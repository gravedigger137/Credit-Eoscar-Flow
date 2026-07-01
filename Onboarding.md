# Onboarding

## Overview
Customer onboarding tracks a lead through customer profile, agreements, authorizations, payment setup, service activation, invoice generation, service evidence, and receivable review.

## Purpose
Ensure customers are not activated or represented as receivable-ready without required evidence.

## Architecture
Onboarding uses `clients`, `onboarding_steps`, `client_documents`, `document_room_items`, and `receivable_readiness_records`.

## Dependencies
MSA, order form, terms, privacy policy, authorizations, payment method, invoice, service completion evidence, and manual review.

## Folder Structure
Onboarding code lives in `server/onboarding-engine.ts` and UI pages under `client/src/pages`.

## Security
Protect PII, authorization records, credit data, and payment records.

## Maintenance
Review incomplete onboarding tasks daily.

## Related Documentation
`docs/Customer-Onboarding-Command-Center.md`, `docs/due-diligence/06_Customer_Agreements.md`.
