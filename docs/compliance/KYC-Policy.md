# KYC Policy

## Purpose

Define Know Your Customer readiness controls for identity collection, verification workflow support, risk review, record retention, and escalation.

## Scope

Applies to customer onboarding, credit-service customers, future BrandonFintech platform users, payment workflows, account-related workflows, and regulated-service readiness.

## Applicable Module

Customer onboarding, Credit-Eoscar client records, BrandonFintech identity planning, Document Room, compliance queues, audit logs, and future shared identity services.

## Required Controls

- Collect only required identity information for the specific workflow.
- Mask sensitive identifiers in UI and logs.
- Use role-based access for identity evidence.
- Track consent, authorization, verification status, review notes, and reviewer identity.
- Require manual escalation for mismatches, fraud indicators, sanctions hits, or incomplete records.
- Do not represent KYC as complete without configured provider checks or documented manual review.

## Manual Tasks

- Select verification provider or approved manual procedure.
- Define accepted evidence types.
- Define retention and deletion policy.
- Review high-risk customers before activation.

## External Dependencies

- Identity verification provider, if used.
- Sanctions screening provider, if used.
- Legal/compliance review.

## Evidence Needed

- Consent records.
- Verification result records.
- Review notes.
- Audit logs.
- Provider configuration evidence.

## Status: Draft / Ready / Requires External Approval

Draft. Requires provider configuration and compliance approval before production use.

## Disclaimer

This documentation is not legal advice and does not certify that any customer has passed KYC.

