# Stripe Architecture and Treasury Roadmap

## Stripe Product Split

Credit-Eoscar Stripe is for:

- SaaS subscriptions
- Credit repair billing
- Payment links
- Checkout sessions
- Usage billing

BrandonFintech Stripe is for:

- PaymentIntents
- Funding workflows
- Payment status updates
- Future Connect/Treasury preparation

## Webhook Rules

- Use separate webhook endpoints per product.
- Store Stripe event IDs before production replay handling.
- Verify signatures on every webhook.
- Add metadata to every Stripe object:
  - `product=credit-eoscar`
  - `product=brandonfintech`
  - `environment=test|live`
  - local entity IDs where safe
- Do not share one webhook handler unless an explicit product router is built, tested, and monitored.

## Test Mode First

1. Configure test keys.
2. Configure test webhook endpoints.
3. Run Stripe CLI tests.
4. Validate local records update correctly.
5. Validate duplicate events are safe.
6. Only then configure live keys.

## Treasury Readiness Roadmap

Future phases only. Do not implement Treasury code yet.

### Phase 1: Compliance Foundation

- Business entity profile
- Terms of service
- Privacy policy
- Customer consent records
- Audit log retention
- Support escalation workflows

### Phase 2: Stripe Connect

- Evaluate Connect account model.
- Add onboarding flows.
- Add account status tracking.
- Add webhook coverage for account updates.
- Keep Connect data separate from Credit-Eoscar.

### Phase 3: KYC/KYB

- Identity verification provider selection.
- Business verification.
- Sanctions and risk checks.
- Document collection and retention controls.
- Manual review workflows.

### Phase 4: Financial Account Architecture

- Define account owner model.
- Define internal ledger vs external account mapping.
- Define reconciliation reports.
- Add immutable ledger enforcement.
- Add operational exception handling.

### Phase 5: Treasury Eligibility

- Apply for Stripe Treasury only after Stripe confirms eligibility.
- Complete business onboarding.
- Confirm permitted use cases.
- Build sandbox-only flows first.
- Add compliance review before live access.

### Phase 6: Issuing and Cards

- Evaluate Stripe Issuing after Treasury readiness.
- Add cardholder controls.
- Add spend controls.
- Add dispute and card lifecycle workflows.
- Add fraud monitoring.

