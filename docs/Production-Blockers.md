# Production Blockers

## Safe for Staging

The ecosystem is suitable for staging with test data when:

- Separate staging databases are used for Credit-Eoscar and BrandonFintech.
- Stripe is in test mode only.
- Bureau integrations are sandbox/test only.
- Cloudflare Worker uses a staging AI endpoint.
- No real SSNs, bureau reports, payment cards, or bank accounts are used.
- Secrets are stored in platform secret managers.

## Not Safe for Real Users Yet

Credit-Eoscar is not ready for real credit repair customers until:

- CSRF protection is added for cookie/session writes.
- RBAC is enforced per route group.
- Bureau credentials are moved out of plaintext app config storage or encrypted.
- Upload storage is moved to private object storage with malware scanning.
- Raw credit reports and PII have access controls, retention, and audit policies.

BrandonFintech is not ready for real users until:

- Admin MFA is implemented.
- CORS is locked to production domains.
- JWT rotation/revocation strategy exists.
- Stripe webhook event IDs are durably persisted.
- Ledger immutability is enforced at the data layer.
- Idempotency writes are made transactionally safe for concurrent first requests.

## Before Live Bureau Access

- Signed bureau agreements are complete.
- Sandbox pulls are verified.
- Consent capture is implemented.
- Credential storage is hardened.
- Bureau pulls are admin/staff role restricted.
- Full audit logging exists for every pull.
- Raw bureau payload retention is defined.

## Before Live Stripe

- Test webhooks pass replay and failure cases.
- Webhook event IDs are stored durably.
- Product metadata tags are required.
- Credit-Eoscar and BrandonFintech use separate webhook endpoints.
- Live keys are rotated into platform secrets.
- Refund, dispute, and failed payment handling are documented.

## Before Treasury or Connect

- Do not implement Treasury, cards, ACH, Connect payouts, or KYC/KYB until compliance and Stripe eligibility are confirmed.
- Business onboarding, KYB, risk checks, support workflows, and financial account architecture must be documented and approved first.

