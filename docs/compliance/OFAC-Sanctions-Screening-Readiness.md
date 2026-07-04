# OFAC / Sanctions Screening Readiness

## Purpose

Define readiness controls for sanctions screening, match review, escalation, and evidence retention.

## Scope

Applies to customer onboarding, business onboarding, vendors, payment workflows, receivables review, trust-accounting metadata, and partner-readiness workflows.

## Applicable Module

Credit-Eoscar onboarding, BrandonFintech future identity/payment workflows, compliance review queues, audit logs, and admin escalation workflows.

## Required Controls

- Use a configured sanctions-screening provider or approved manual process before claiming screening is complete.
- Track search terms, match status, reviewer, decision, and evidence without exposing sensitive personal data.
- Require escalation for potential matches.
- Prevent automated approval of high-risk matches.
- Do not expose provider secrets or raw sensitive results in logs.

## Manual Tasks

- Select provider or manual process.
- Define match-resolution procedure.
- Assign escalation owners.
- Retain evidence under the data-retention policy.

## External Dependencies

- Sanctions-screening provider or official list review process.
- Legal/compliance review.
- Secure storage and audit logging.

## Evidence Needed

- Screening configuration.
- Match reports.
- Reviewer decisions.
- Escalation records.
- Audit trail.

## Status: Draft / Ready / Requires External Approval

Draft. Requires configured screening process and compliance approval.

## Disclaimer

This documentation is not legal advice and does not certify sanctions-screening completion for any person or entity.

