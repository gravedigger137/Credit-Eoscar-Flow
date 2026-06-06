# InfiniteArcadia Deployment Plan

## Targets

- Credit-Eoscar: Render or current Node/Docker host
- BrandonFintech API: Render, Railway, Fly.io, or Azure App Service
- BrandonFintech frontend: Cloudflare Pages
- AI gateway: Cloudflare Workers
- Databases: separate managed PostgreSQL databases
- DNS: Cloudflare

## DNS Records

- `infinitearcadia.com` -> parent site
- `app.infinitearcadia.com` -> Credit-Eoscar app
- `fintech.infinitearcadia.com` -> BrandonFintech Web
- `api.fintech.infinitearcadia.com` -> BrandonFintech API
- `ai.infinitearcadia.com` -> Cloudflare Worker

## Deployment Order

Use staging before production.

1. Create staging managed PostgreSQL databases.
2. Configure staging secrets on each host.
3. Deploy Credit-Eoscar staging and verify `/health`, `/ready`, and `/status/integrations`.
4. Deploy BrandonFintech API staging.
5. Apply BrandonFintech EF Core migrations to the staging database.
6. Configure Stripe test webhook endpoints.
7. Deploy BrandonFintech frontend staging to Cloudflare Pages.
8. Deploy Cloudflare Worker staging.
9. Configure staging DNS records.
10. Run all smoke tests.
11. Repeat the same order for production only after staging passes.

## Required Production Environment

Credit-Eoscar:

- `DATABASE_URL`
- `SESSION_SECRET`
- `PUBLIC_APP_URL`
- `OPENAI_API_KEY` or `LOCAL_MODEL_ENDPOINT`
- `CORS_ALLOWED_ORIGINS`
- `UPLOAD_MAX_BYTES`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- OAuth provider vars if enabled

BrandonFintech API:

- `ConnectionStrings__Postgres`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__Secret`
- `Stripe__SecretKey`
- `Stripe__WebhookSecret`
- `Cors__AllowedOrigins` or `CORS_ALLOWED_ORIGINS`

BrandonFintech Web:

- `VITE_API_BASE_URL`

Cloudflare Worker:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- Optional shared gateway auth secret

## Stripe Webhook Endpoints

Credit-Eoscar:

- `https://app.infinitearcadia.com/api/v1/stripe/webhook`

BrandonFintech:

- `https://api.fintech.infinitearcadia.com/api/v1/payments/stripe/webhook`

Use test mode first. Configure live mode only after smoke tests, event replay protection, and operational runbooks are complete.

## Test Bureau/Sandbox Setup

- Configure only sandbox/test bureau credentials in staging.
- Confirm each bureau environment reports `sandbox` or equivalent.
- Use synthetic test identities only.
- Do not pull live reports until the live bureau checklist is complete.

## Cloudflare DNS Checklist

- Add staging records first.
- Proxy frontend and Worker records through Cloudflare.
- Keep API proxying aligned with the host requirements.
- Confirm TLS mode is strict.
- Confirm redirects from apex and `www`.
- Cut production DNS only after staging smoke tests pass.

## Rollback Steps

1. Roll back the application deployment to the previous build.
2. Keep databases online; do not roll back data casually.
3. Disable Stripe webhook endpoint if payment events are unsafe.
4. Disable bureau pull routes or credentials if bureau behavior is unsafe.
5. Re-run health, auth, dashboard, payment, and admin smoke tests.

## Smoke Tests

Credit-Eoscar:

- `GET /health`
- `GET /ready`
- `GET /status/integrations`
- Login/logout
- Dashboard load
- Client list
- AI route with test-safe prompt
- Stripe test checkout or payment link
- Bureau status in sandbox only
- Upload test file with no PII

BrandonFintech:

- `GET /health`
- `GET /ready`
- Register
- Login
- Dashboard
- Create account with idempotency key
- Deposit with idempotency key
- Transfer
- Statement CSV
- PaymentIntent in Stripe test mode
- Stripe webhook with Stripe CLI
- Admin endpoint as normal user returns 403
- Admin endpoint as admin succeeds

AI Worker:

- `GET /health`
- `POST /ai/chat`
- Timeout/error path

## Do Not Deploy Yet

Do not deploy live bureau pulls until sandbox/test mode, consent, credential storage, and audit controls are verified.

Do not deploy BrandonFintech to real users until CORS is locked down, admin MFA exists, JWT rotation/revocation is planned, and ledger immutability controls are enforced.
