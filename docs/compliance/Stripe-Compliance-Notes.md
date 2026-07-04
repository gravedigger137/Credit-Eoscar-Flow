# Stripe Compliance Notes

## Purpose

Document Stripe usage boundaries, test/live separation, webhook requirements, and compliance evidence expectations.

## Scope

Applies to Credit-Eoscar billing, BrandonFintech PaymentIntents, Stripe webhooks, metadata, refunds, disputes, and future subscription or marketplace workflows.

## Applicable Module

Credit-Eoscar payments, BrandonFintech payments, billing workflow, admin payment views, audit logs, and deployment configuration.

## Required Controls

- Keep Credit-Eoscar and BrandonFintech Stripe flows logically separated by product metadata and webhook endpoints.
- Use test mode until live keys, webhooks, and compliance checks are approved.
- Store Stripe keys and webhook secrets only in environment variables or platform secret managers.
- Verify webhook signatures and reject invalid events.
- Do not claim live payment capability until live credentials and endpoint tests are complete.

## Manual Tasks

- Configure test webhook endpoints.
- Confirm live mode readiness separately.
- Review product metadata conventions.
- Document refund, dispute, and reconciliation procedures.

## External Dependencies

- Stripe account.
- Stripe test and live API keys.
- Stripe webhook secrets.
- Legal/compliance review for product-specific payment terms.

## Evidence Needed

- Test webhook delivery logs.
- PaymentIntent or checkout test records.
- Webhook signature verification evidence.
- Product metadata examples.
- Reconciliation logs.

## Status: Draft / Ready / Requires External Approval

Draft. Test-mode only until live Stripe configuration and approval are complete.

## Disclaimer

This documentation is not legal, financial, or PCI advice and does not certify Stripe live-mode readiness.

