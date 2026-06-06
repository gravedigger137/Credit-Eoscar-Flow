# Staging Day Runbook

This runbook is for the first staging deployment day. Do not deploy production. Do not use live Stripe keys. Do not use live bureau APIs. Do not use real customer data.

## Prerequisites

- Git commits for both repos are reviewed and ready.
- Tracked uploaded documents are removed from Git or confirmed synthetic.
- Separate staging PostgreSQL databases exist.
- Staging DNS records are created or ready to create.
- Staging environment variables are prepared in provider secret managers.
- Stripe test mode webhook endpoints are ready.
- Bureau sandbox/test credentials are available if bureau readiness will be tested.
- Cloudflare Worker staging variables are prepared.
- Rollback owner and go/no-go owner are identified.

## Deployment Order

1. Confirm no production credentials are present in staging variables.
2. Create or verify `credit_eoscar_staging` database.
3. Create or verify `brandonfintech_staging` database.
4. Deploy Credit-Eoscar staging.
5. Verify Credit-Eoscar `/health`, `/ready`, and `/status/integrations`.
6. Deploy BrandonFintech API staging.
7. Apply BrandonFintech EF Core migrations to staging only.
8. Verify BrandonFintech `/health` and `/ready`.
9. Configure Stripe test webhooks.
10. Deploy BrandonFintech Web staging to Cloudflare Pages.
11. Deploy Cloudflare Worker staging.
12. Verify DNS and TLS for all staging domains.
13. Run smoke tests.
14. Record pass/fail results.

## What To Verify

Infrastructure:

- DNS resolves for all staging domains.
- TLS certificates are valid.
- API health checks pass.
- Database readiness checks pass.
- Worker dry-run completed before Worker deployment.

Configuration:

- Credit-Eoscar `PUBLIC_APP_URL` uses `https://staging-app.infinitearcadia.com`.
- Credit-Eoscar `CORS_ALLOWED_ORIGINS` includes only staging origins.
- BrandonFintech `Jwt__Issuer` uses the staging API domain.
- BrandonFintech `Cors__AllowedOrigins` uses the staging frontend domain.
- Stripe keys are `sk_test_*`.
- Stripe webhook secrets are test webhook secrets.
- Plaid environment is `sandbox`.
- Bureau environment is sandbox/test only.
- Worker `OLLAMA_BASE_URL` is not `localhost` after deployment.

## What To Test

Credit-Eoscar:

- `GET /health`
- `GET /ready`
- `GET /status/integrations`
- Register/login on staging.
- Dashboard loads.
- AI page responds or fails safely.
- Bureau status shows sandbox/test readiness only.
- Upload one synthetic non-PII test file.

BrandonFintech:

- `GET /health`
- `GET /ready`
- Register staging user.
- Login and call `/api/v1/auth/me`.
- Dashboard loads.
- Create account with `Idempotency-Key`.
- Deposit with `Idempotency-Key`.
- Repeat deposit and confirm it is not duplicated.
- Transfer between staging accounts.
- Export CSV statement.
- Create Stripe test PaymentIntent.
- Trigger Stripe test webhook.
- Confirm normal user cannot access admin endpoints.

Cloudflare Worker:

- `GET /health`
- `POST /ai/chat` with non-PII prompt.
- Confirm timeout/model unavailable errors are safe.

## Rollback Steps

Credit-Eoscar:

1. Roll back Render/current host to the previous deploy.
2. Disable Stripe test webhook endpoint if webhook behavior is unsafe.
3. Disable bureau sandbox credentials if bureau behavior is unsafe.
4. Re-run `/health` and `/ready`.

BrandonFintech API:

1. Roll back API host to previous deploy.
2. If migrations caused staging data issues, restore the pre-migration staging database snapshot.
3. Re-run `/health`, `/ready`, login, and dashboard tests.

BrandonFintech Web:

1. Roll back Cloudflare Pages to the previous deployment.
2. Confirm frontend points to the intended staging API.

Cloudflare Worker:

1. Roll back Worker deployment.
2. If needed, remove or disable the staging route.
3. Confirm apps fail safely when AI is unavailable.

Git:

1. Redeploy previous known-good commit or tag.
2. Do not force-push shared branches.
3. Open a follow-up fix branch for failed deployment investigation.

## Go/No-Go Criteria

Go for staging if:

- All health/readiness checks pass.
- DNS and TLS are valid.
- No live credentials are present.
- Stripe is test mode only.
- Bureau is sandbox/test mode only.
- Smoke tests pass for auth, dashboard, account/deposit/transfer, PaymentIntent, webhook, and Worker.
- Rollback path is confirmed.

No-go if:

- Any live credential is discovered.
- Any real bureau API would be called.
- Database migrations fail.
- Auth/login fails.
- PaymentIntent or webhook behavior is unsafe.
- CORS blocks expected staging frontend or allows unexpected origins.
- Worker exposes localhost-only configuration after deployment.

## Post-Staging Notes

- Record deployed commit SHAs.
- Record provider service names.
- Record database names.
- Record Stripe webhook endpoint IDs.
- Record any failed smoke tests and owners.
- Do not promote to production until production blockers are closed.

