# Consent Tracking

## Purpose

Define controls for capturing, storing, versioning, and auditing customer consents and revocations.

## Scope

Applies to privacy acceptance, terms acceptance, credit report authorization, dispute authorization, payment authorization, electronic communications, and e-signature readiness.

## Applicable Module

Customer onboarding, Document Room, public signup, support inbox, payments, credit workflows, and audit logs.

## Required Controls

- Track consent type, version, customer, timestamp, source, scope, and revocation status.
- Link consent records to the related document template and customer record.
- Preserve audit logs for consent creation, update, and revocation.
- Prevent use of expired or revoked consent.
- Mask sensitive data in consent metadata.

## Manual Tasks

- Define required consent types by workflow.
- Approve consent language with counsel.
- Configure revocation workflows.
- Periodically audit active consents.

## External Dependencies

- Legal review.
- E-signature or consent capture provider, if used.
- Secure storage.

## Evidence Needed

- Consent records.
- Template version history.
- Revocation logs.
- Audit logs.
- Reviewer notes.

## Status: Draft / Ready / Requires External Approval

Draft. Requires legal review and workflow configuration before production reliance.

## Disclaimer

This documentation is not legal advice and does not determine whether a consent is legally sufficient.

