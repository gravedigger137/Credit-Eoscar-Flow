# NACHA Readiness

## Purpose

Document ACH/NACHA readiness controls for future bank-transfer workflows.

## Scope

Applies to future ACH debit, ACH credit, recurring payment, account verification, customer authorization, and return-handling workflows.

## Applicable Module

BrandonFintech future payments, Credit-Eoscar billing readiness, customer authorization, audit logs, and admin payment operations.

## Required Controls

- Do not initiate ACH without approved payment processor or bank partner.
- Store customer authorizations, revocations, and payment-method references securely.
- Track return codes, disputes, retries, and refund actions.
- Require role-based access and audit logs for payment actions.
- Keep ACH readiness separate from current Stripe PaymentIntent testing.

## Manual Tasks

- Select ACH provider or bank partner.
- Approve authorization templates.
- Define return and retry procedures.
- Complete partner compliance requirements.

## External Dependencies

- ACH processor or bank partner.
- Legal/compliance review.
- Secure payment method storage or tokenization provider.

## Evidence Needed

- Provider approval.
- Signed authorizations.
- Return/dispute records.
- Processor configuration evidence.
- Audit logs.

## Status: Draft / Ready / Requires External Approval

Draft. Requires provider approval and legal/compliance review.

## Disclaimer

This documentation is not legal advice and does not authorize ACH origination.

