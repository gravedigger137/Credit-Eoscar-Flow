# Staging Deployment Runbook

This runbook prepares staging only. Do not use live Stripe keys, live bureau APIs, production database credentials, or production customer data.

## 1. Staging Infrastructure

Create separate staging PostgreSQL databases:

- `credit_eoscar_staging`
- `brandonfintech_staging`

Use separate database users and passwords. Store credentials only in the hosting provider secret manager.

## 2. Staging Domains

Configure Cloudflare DNS:

- `staging.infinitearcadia.com` or `staging-app.infinitearcadia.com` -> Credit-Eoscar staging
- `staging-fintech.infinitearcadia.com` -> BrandonFintech Web staging
- `staging-api-fintech.infinitearcadia.com` -> BrandonFintech API staging
- `staging-ai.infinitearcadia.com` -> Cloudflare Worker staging

Use proxy/TLS according to the target host requirements. Confirm TLS mode is strict.

## 3. Credit-Eoscar Staging

Target: Render or current Node/Docker staging host.

Steps:

1. Create a staging web service from the Credit-Eoscar repo/branch.
2. Configure build command: `npm ci && npm run build`.
3. Configure start command: `npm start`.
4. Configure staging env vars from `.env.staging.example`.
5. Set `PUBLIC_APP_URL=https://staging-app.infinitearcadia.com`.
6. Set `CORS_ALLOWED_ORIGINS=https://staging-app.infinitearcadia.com,https://staging.infinitearcadia.com`.
7. Configure `DATABASE_URL` to the Credit-Eoscar staging database.
8. Configure `SESSION_SECRET` from the platform secret manager.
9. Configure Stripe test keys only.
10. Configure Plaid sandbox only if testing banking screens.
11. Configure bureau sandbox/test credentials only through the staging admin flow or future encrypted secret storage.
12. Deploy.
13. Verify `GET /health`, `GET /ready`, and `GET /status/integrations`.

## 4. BrandonFintech API Staging

Target: Render, Railway, Fly.io, or Azure.

Steps:

1. Create a staging API service from the BrandonFintech repo/branch.
2. Configure .NET 9 runtime.
3. Configure staging env vars from `BrandonFintech.Api/.env.staging.example`.
4. Set `ASPNETCORE_ENVIRONMENT=Staging`.
5. Set `ConnectionStrings__Postgres` to the BrandonFintech staging database.
6. Set `Jwt__Issuer=https://staging-api-fintech.infinitearcadia.com`.
7. Set `Cors__AllowedOrigins=https://staging-fintech.infinitearcadia.com`.
8. Configure Stripe test keys only.
9. Deploy API.
10. Apply EF Core migrations to the staging database.
11. Verify `GET /health` and `GET /ready`.

## 5. BrandonFintech Web Staging

Target: Cloudflare Pages.

Steps:

1. Create a Cloudflare Pages staging project or preview deployment.
2. Root directory: `BrandonFintech.Web`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Configure `VITE_API_BASE_URL=https://staging-api-fintech.infinitearcadia.com`.
6. Deploy.
7. Verify login/register and dashboard load against staging API.

## 6. Cloudflare Worker AI Gateway Staging

Target: Cloudflare Workers.

Steps:

1. Create a staging Worker or staging environment.
2. Configure variables from `cloudflare-worker/.dev.vars.staging.example`.
3. Use a staging Ollama tunnel URL or a staging model provider URL.
4. Do not point staging Worker at a developer-only localhost URL after deployment.
5. Deploy only after `wrangler deploy --dry-run` succeeds.
6. Verify `GET /health`.
7. Verify `POST /ai/chat` with non-PII test text.

## 7. Stripe Test Webhooks

Credit-Eoscar staging:

- `https://staging-app.infinitearcadia.com/api/v1/stripe/webhook`

BrandonFintech staging:

- `https://staging-api-fintech.infinitearcadia.com/api/v1/payments/stripe/webhook`

Rules:

- Use test mode only.
- Use `sk_test_*` and `whsec_*` staging values only.
- Tag Stripe objects with product metadata when available.
- Do not reuse production webhook secrets.

## 8. Bureau Sandbox/Test Mode

Rules:

- Do not use live bureau APIs.
- Use sandbox/test credentials only.
- Use synthetic identities only.
- Confirm bureau environment values are `sandbox` or provider equivalent.
- Do not store real SSNs, DOBs, or raw credit reports in staging.

## 9. Staging Deployment Order

1. Create staging databases.
2. Configure DNS records.
3. Deploy Credit-Eoscar staging.
4. Deploy BrandonFintech API staging.
5. Apply BrandonFintech migrations to staging.
6. Configure Stripe test webhooks.
7. Deploy BrandonFintech Web staging.
8. Deploy Cloudflare Worker staging.
9. Run staging smoke tests.
10. Do not promote to production until blockers are closed.

