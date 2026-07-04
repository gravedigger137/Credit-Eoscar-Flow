# Staging Infrastructure Checklist

This checklist is for staging only. Do not use live Stripe keys, live bureau APIs, production database credentials, or real customer data.

## Recommended Simplest Staging Stack

Use the smallest stack that matches the future production shape without over-engineering staging:

- Credit-Eoscar: keep on InfiniteArcadia's current hosting pattern, preferably Render if that is already connected.
- BrandonFintech API: Render Docker or native .NET web service.
- BrandonFintech Web: Cloudflare Pages.
- AI Worker: Cloudflare Workers.
- Databases: two separate managed PostgreSQL staging databases, preferably Neon Launch/free-to-low-usage or Render Postgres if keeping API/database together is more important than lowest cost.
- DNS: Cloudflare.

Recommended first staging choice:

- Render for Credit-Eoscar.
- Render for BrandonFintech API.
- Neon for two staging PostgreSQL databases.
- Cloudflare Pages for BrandonFintech Web.
- Cloudflare Workers for the AI gateway.

Reasoning:

- Render keeps Node and .NET API deployment simple.
- Neon keeps the two databases separate and low-cost for intermittent staging.
- Cloudflare already owns DNS/frontend/Worker concerns.
- This avoids merging data and avoids adding Kubernetes or complex networking.

## PostgreSQL Provider Options

### Neon

Best for low-cost staging and branchable Postgres workflows.

Use for:

- `credit_eoscar_staging`
- `brandonfintech_staging`

Requirements:

- Separate projects or separate databases.
- Separate database users.
- SSL required.
- Connection strings stored only in platform secret managers.

### Render Postgres

Best if keeping app and database in one Render dashboard is more important than cost.

Use for:

- Credit-Eoscar staging database if Credit-Eoscar is on Render.
- BrandonFintech staging database if API is on Render.

Requirements:

- Separate databases for the two products.
- Backups/snapshots before migrations.
- Private networking where available.

### Railway Postgres

Good for fast staging setup and usage-based services.

Requirements:

- Separate Postgres service per product.
- Usage alert enabled.
- Connection strings stored in Railway variables only.

### Fly.io Postgres

Good when the API also runs on Fly.io and region control matters.

Requirements:

- Understand volume billing.
- Snapshot and volume cleanup process.
- Separate Postgres instances or databases per product.

## Cloudflare Pages Setup

Use for BrandonFintech Web staging.

Settings:

- Project root: `BrandonFintech.Web`
- Build command: `npm run build`
- Output directory: `dist`
- Environment: Preview or staging project
- Variable: `VITE_API_BASE_URL=https://staging-api-fintech.infinitearcadia.com`

Requirements:

- Do not store API secrets in Pages variables.
- Only browser-safe variables may be configured.
- Add custom domain `staging-fintech.infinitearcadia.com`.

## Cloudflare Worker Setup

Use for staging AI gateway.

Settings:

- Worker name: `brandonfintech-ai-gateway-staging`
- Route/domain: `staging-ai.infinitearcadia.com`
- Variables:
  - `OLLAMA_MODEL`
  - `OLLAMA_BASE_URL`
  - `ALLOWED_ORIGINS`
  - optional `AI_GATEWAY_SHARED_SECRET`

Requirements:

- Do not point deployed staging Worker at `localhost`.
- Use a Cloudflare Tunnel URL or a staging model provider URL.
- Do not send real PII in staging prompts.
- Use `wrangler deploy --dry-run` before deploy.

## Render Setup

Use for Credit-Eoscar and optionally BrandonFintech API.

Credit-Eoscar:

- Runtime: Node 20.
- Build command: `npm ci && npm run build`.
- Start command: `npm start`.
- Health check: `/ready`.
- Environment from `.env.staging.example`.

BrandonFintech API:

- Runtime: Docker or native .NET 9.
- Health check: `/ready`.
- Environment from `BrandonFintech.Api/.env.staging.example`.

Requirements:

- Use staging services, not production services.
- Store secrets in Render environment variables.
- Do not paste live keys.
- Configure `CORS_ALLOWED_ORIGINS` / `Cors__AllowedOrigins`.

## Railway Setup

Alternative for BrandonFintech API or staging databases.

Requirements:

- Create separate staging project.
- Add API service.
- Add separate PostgreSQL plugin/service.
- Configure variables from staging env templates.
- Enable spending alerts.
- Verify `/health` and `/ready`.

## Fly.io Setup

Alternative for BrandonFintech API.

Requirements:

- Create staging app.
- Set secrets through `fly secrets set`.
- Use managed/separate Postgres.
- Configure health checks.
- Confirm volume cleanup after test deployments.

## DNS Records Required

Create staging records in Cloudflare:

| Name | Target | Purpose |
| --- | --- | --- |
| `staging.infinitearcadia.com` | Parent staging host or redirect | Optional ecosystem staging entry |
| `staging-app.infinitearcadia.com` | Credit-Eoscar staging host | Credit product staging |
| `staging-fintech.infinitearcadia.com` | Cloudflare Pages | BrandonFintech Web staging |
| `staging-api-fintech.infinitearcadia.com` | API host | BrandonFintech API staging |
| `staging-ai.infinitearcadia.com` | Cloudflare Worker | AI gateway staging |

## SSL Requirements

- Cloudflare SSL mode should be Full Strict where possible.
- API hosts must serve HTTPS.
- Webhook endpoints must be HTTPS.
- OAuth callback URLs must use HTTPS.
- Do not use self-signed certificates for public staging domains.

## Secret Management Requirements

Store secrets only in provider secret managers:

- Render environment variables
- Railway variables
- Fly secrets
- Cloudflare Worker secrets/variables
- Cloudflare Pages variables for browser-safe values only

Never commit:

- `.env`
- live Stripe keys
- live bureau credentials
- Plaid secrets
- OpenAI keys
- database passwords
- JWT signing secrets
- session secrets

## Environment Variable Inventory

### Credit-Eoscar Staging

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
PUBLIC_APP_URL=https://staging-app.infinitearcadia.com
CORS_ALLOWED_ORIGINS=https://staging-app.infinitearcadia.com,https://staging.infinitearcadia.com
UPLOAD_MAX_BYTES=52428800
DATABASE_URL=STAGING_POSTGRES_CONNECTION_STRING
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000
SESSION_SECRET=REPLACE_WITH_STAGING_SECRET
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=REPLACE_WITH_STAGING_KEY_OR_EMPTY
LOCAL_MODEL_ENDPOINT=
STRIPE_SECRET_KEY=STRIPE_TEST_SECRET_KEY_PLACEHOLDER
STRIPE_WEBHOOK_SECRET=STRIPE_TEST_WEBHOOK_SECRET_PLACEHOLDER
PLAID_CLIENT_ID=REPLACE_WITH_SANDBOX_CLIENT_ID
PLAID_SECRET=REPLACE_WITH_SANDBOX_SECRET
PLAID_ENV=sandbox
GOOGLE_CLIENT_ID=REPLACE_WITH_STAGING_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=REPLACE_WITH_STAGING_GOOGLE_CLIENT_SECRET
FACEBOOK_APP_ID=REPLACE_WITH_STAGING_FACEBOOK_APP_ID
FACEBOOK_APP_SECRET=REPLACE_WITH_STAGING_FACEBOOK_APP_SECRET
GITHUB_CLIENT_ID=REPLACE_WITH_STAGING_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=REPLACE_WITH_STAGING_GITHUB_CLIENT_SECRET
```

### BrandonFintech API Staging

```text
ASPNETCORE_ENVIRONMENT=Staging
ASPNETCORE_URLS=http://0.0.0.0:8080
ConnectionStrings__Postgres=Host=STAGING_DB_HOST;Port=5432;Database=brandonfintech_staging;Username=STAGING_USER;Password=REPLACE_WITH_STAGING_PASSWORD;SSL Mode=Require;Trust Server Certificate=false
Jwt__Issuer=https://staging-api-fintech.infinitearcadia.com
Jwt__Audience=BrandonFintechStagingUsers
Jwt__Secret=REPLACE_WITH_LONG_RANDOM_STAGING_JWT_SECRET
Stripe__SecretKey=STRIPE_TEST_SECRET_KEY_PLACEHOLDER
Stripe__WebhookSecret=STRIPE_TEST_WEBHOOK_SECRET_PLACEHOLDER
Cors__AllowedOrigins=https://staging-fintech.infinitearcadia.com
```

### BrandonFintech Web Staging

```text
VITE_API_BASE_URL=https://staging-api-fintech.infinitearcadia.com
```

### Worker Staging

```text
OLLAMA_MODEL=tinyllama
OLLAMA_BASE_URL=https://staging-ollama-tunnel.example.com
AI_GATEWAY_SHARED_SECRET=REPLACE_WITH_STAGING_SHARED_SECRET
ALLOWED_ORIGINS=https://staging-app.infinitearcadia.com,https://staging-fintech.infinitearcadia.com
```

## Estimated Monthly Staging Cost

Low-traffic staging estimate:

- Cloudflare Pages: $0 for static staging frontend under free limits.
- Cloudflare Worker: $0 on free limits or $5/month for Workers Paid if staging needs higher limits.
- Neon Postgres: $0 to about $15/month for intermittent staging depending on usage.
- Render Credit-Eoscar web service: about $7/month for a small paid service, or free if acceptable for non-critical staging.
- Render BrandonFintech API web service: about $7/month for a small paid service, or free if acceptable for non-critical staging.

Recommended practical staging budget:

- Lowest-cost path: about $0-$20/month.
- More stable staging path: about $25-$45/month.
- Add more if using paid database tiers, persistent file storage, external AI APIs, or higher Worker usage.

Pricing changes frequently. Confirm final costs in each provider dashboard before enabling paid services.
