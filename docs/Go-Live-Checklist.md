# Go-Live Checklist

## Staging First

- Deploy Credit-Eoscar to staging.
- Deploy BrandonFintech API to staging.
- Deploy BrandonFintech Web to staging.
- Deploy Cloudflare Worker to staging.
- Use separate staging PostgreSQL databases.
- Use Stripe test mode.
- Use bureau sandbox/test mode only.
- Use non-production AI keys or local model tunnel.

## DNS

- `staging-app.infinitearcadia.com`
- `staging-fintech.infinitearcadia.com`
- `staging-api.fintech.infinitearcadia.com`
- `staging-ai.infinitearcadia.com`

Production DNS should not be cut over until staging smoke tests pass.

## Credit-Eoscar Smoke Tests

- `GET /health`
- `GET /ready`
- Admin login, then `GET /status/integrations`
- Admin login, then `GET /status/infrastructure`
- Admin login, then `GET /status/security`
- Login/logout
- Dashboard loads
- Client list loads
- Upload test file with no PII
- AI route with non-PII prompt
- Stripe test checkout or payment link
- Bureau status shows sandbox/test configuration

## BrandonFintech Smoke Tests

- `GET /health`
- `GET /ready`
- Register
- Login
- `GET /api/v1/auth/me`
- Dashboard
- Create account with `Idempotency-Key`
- Deposit with `Idempotency-Key`
- Duplicate deposit does not double-apply
- Transfer
- CSV statement export
- PaymentIntent in test mode
- Stripe CLI webhook in test mode
- Normal user receives 403 on admin endpoints
- Admin can access admin endpoints

## AI Worker Smoke Tests

- `GET /health`
- `POST /ai/chat`
- Missing model endpoint error path
- Timeout error path

## Production Gate

Do not launch to real users until every blocker in `Production-Blockers.md` is either fixed or formally accepted with compensating controls.

Security gate additions:

- `BOOTSTRAP_ADMIN_EMAILS` used only for first admin creation and removed afterward.
- `SENSITIVE_CONFIG_ENCRYPTION_KEY` configured before saving bureau or integration credentials.
- Admin MFA enabled and tested for all admin users.
- CSRF protection smoke-tested for JSON and multipart writes.
- Private upload storage and malware scanning configured.
- Distributed rate limiting configured for multi-instance production.
- Backup restore drill completed and documented.
