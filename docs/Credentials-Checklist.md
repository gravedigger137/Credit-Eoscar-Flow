# Credentials Checklist

Use placeholder names only in documentation and code. Real values belong in Render, Cloudflare, Azure, Railway, Fly.io, Stripe, local user secrets, or another secret manager.

## Credit-Eoscar

Database:

- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `DB_POOL_MAX`
- `DB_IDLE_TIMEOUT_MS`
- `DB_CONNECTION_TIMEOUT_MS`

Session/auth:

- `SESSION_SECRET`
- `PUBLIC_APP_URL`
- `APP_URL`
- `CORS_ALLOWED_ORIGINS`
- `UPLOAD_MAX_BYTES`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Bureau developer credentials:

- `EQUIFAX_API_KEY`
- `EQUIFAX_API_SECRET`
- `EQUIFAX_CLIENT_ID`
- `EQUIFAX_MEMBER_ID`
- `EQUIFAX_ENVIRONMENT`
- `EXPERIAN_API_KEY`
- `EXPERIAN_API_SECRET`
- `EXPERIAN_CLIENT_ID`
- `EXPERIAN_MEMBER_ID`
- `EXPERIAN_ENVIRONMENT`
- `TRANSUNION_API_KEY`
- `TRANSUNION_API_SECRET`
- `TRANSUNION_CLIENT_ID`
- `TRANSUNION_MEMBER_ID`
- `TRANSUNION_ENVIRONMENT`
- `INNOVIS_API_KEY`
- `INNOVIS_API_SECRET`
- `INNOVIS_CLIENT_ID`
- `INNOVIS_MEMBER_ID`
- `INNOVIS_ENVIRONMENT`

The current Credit-Eoscar app also supports bureau credential storage through the `api_configs` table. That should be replaced or wrapped with encrypted secret storage before production bureau access.

Stripe billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `STRIPE_PRODUCT_ID`

Plaid:

- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV`

AI:

- `AI_PROVIDER`
- `AI_MODEL`
- `OPENAI_API_KEY`
- `LOCAL_MODEL_ENDPOINT`

## BrandonFintech

Database:

- `ConnectionStrings__Postgres`

JWT:

- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__Secret`

Stripe PaymentIntents:

- `Stripe__SecretKey`
- `Stripe__WebhookSecret`
- `Cors__AllowedOrigins`

Frontend:

- `VITE_API_BASE_URL`

## Cloudflare Worker AI Gateway

Worker variables:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `AI_GATEWAY_SHARED_SECRET`
- `ALLOWED_ORIGINS`

Cloudflare tunnel / AI:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_TUNNEL_TOKEN`
- `OLLAMA_TUNNEL_HOSTNAME`

Never commit `.env`, `.env.local`, `appsettings.Development.json` with secrets, Wrangler secrets, Stripe keys, Plaid keys, bureau credentials, OpenAI keys, or database passwords.
