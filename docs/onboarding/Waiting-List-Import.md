# Waiting List Import

## Purpose
Define safe waiting-list import workflow.

## Scope
Lead import, deduplication, consent check, customer profile creation, and onboarding queue assignment.

## Owner
Customer Onboarding Agent.

## Human Review Required
Consent, marketing opt-in, PII handling, and service activation.

## Security Notes
Import only minimum necessary data and protect PII.

## Audit Requirements
Record import source, date, owner, and error count.

## Related Routes
`/api/v1/clients`, `/api/v1/book-consultation`.

## Related Database Tables
`clients`, `onboarding_steps`, `audit_events`.

## Go/No-Go Criteria
No import without consent source and duplicate handling.
