# Credit-Eoscar Deployment

## Overview

Credit-Eoscar deploys as a Node/Express API with a Vite/React frontend, PostgreSQL database, Drizzle schema, Docker support, health checks, readiness checks, and safe integration status endpoints.

## Purpose

Provide a controlled staging-first deployment path without exposing credentials, skipping migrations, or claiming live bureau/lender capability before authorization and professional review.

## Architecture

The app builds the frontend into `dist/public` and bundles the server into `dist/index.cjs`. Production runs `npm start`. Docker and Docker Compose remain available for local and self-hosted execution.

## Dependencies

- Node.js 20+
- PostgreSQL 16+
- Docker and Docker Compose for containerized local execution
- `DATABASE_URL`
- `SESSION_SECRET`
- `SENSITIVE_CONFIG_ENCRYPTION_KEY`
- `PUBLIC_APP_URL`
- `CORS_ALLOWED_ORIGINS`
- Optional sandbox/test credentials for Stripe, Plaid, OpenAI/local AI, OAuth, and bureau integrations

## Folder Structure

- `Dockerfile` and `docker-compose.yml`: containerized execution
- `server/index.ts`: health, readiness, status endpoints, API mounting
- `db/migrations`: migration history
- `docs/Deployment-Plan.md`: ecosystem deployment plan
- `docs/Staging-Deployment-Runbook.md`: staging deployment instructions
- `docs/infrastructure/`: provider-specific notes

## Security

Use test/sandbox keys for staging. Do not commit `.env`, API keys, database passwords, bureau credentials, Stripe keys, Plaid keys, OpenAI keys, private keys, SSNs, EINs, account numbers, or customer PII. Store secrets in the deployment platform secret manager. Configure `BOOTSTRAP_ADMIN_EMAILS` only for first admin creation, then remove it.

## Maintenance

Run type-check, build, migration review, smoke tests, and rollback-plan review before deployment. Tag release candidates and preserve migration history.

## Related Documentation

- `docs/Staging-Day-Runbook.md`
- `docs/Staging-Rollback-Plan.md`
- `docs/Production-Readiness-Go-No-Go.md`
- `docs/infrastructure/Deployment-Matrix.md`

## Local Setup

1. Install Node.js 20+ and PostgreSQL 16+, or use Docker.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL`, `SESSION_SECRET`, and `PUBLIC_APP_URL`.
4. Install dependencies:

```bash
npm install
```

5. Create/update database tables:

```bash
npm run db:push
```

6. Start development:

```bash
npm run dev
```

The app runs at `http://localhost:5000`.

## Docker Compose

For a complete local stack with PostgreSQL:

```bash
docker compose up --build
```

Then, in a second terminal, push the schema into the running database:

```bash
docker compose run --rm app npm run db:push
```

## Production Build

```bash
npm run check
npm run build
npm start
```

## Required Production Environment

`DATABASE_URL` must point to your PostgreSQL database.

`SESSION_SECRET` must be a long random value and must stay stable between deploys.

`PUBLIC_APP_URL` must be your real public URL, for example `https://app.infinitearcadia.com`. OAuth callbacks and Stripe checkout redirects use this value.

`CORS_ALLOWED_ORIGINS` should include only approved domains.

`SENSITIVE_CONFIG_ENCRYPTION_KEY` must be a 32-byte UTF-8 value or 32-byte base64 value. It protects sensitive values saved into the app configuration table.

`BOOTSTRAP_ADMIN_EMAILS` should be set only during first deployment, for example `bgalloway17504@gmail.com,gravedigger137@icloud.com`, then removed after those accounts exist.

`MFA_ENFORCE_ADMIN=true` should be enabled after every admin has completed TOTP setup and recovery-code storage.

`MALWARE_SCAN_COMMAND` should point to a scanner executable in production if uploads contain customer PII or bureau documents.

## Optional Services

Set `OPENAI_API_KEY` or `LOCAL_MODEL_ENDPOINT` for AI features.

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for billing in test mode first.

Set `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` for banking workflows in sandbox/development first.

Set OAuth client IDs/secrets only for providers you want enabled. Provider callback URLs should be:

```text
https://app.infinitearcadia.com/api/auth/google/callback
https://app.infinitearcadia.com/api/auth/facebook/callback
https://app.infinitearcadia.com/api/auth/github/callback
```

## Health and Status Checks

`GET /health` checks that the web process is alive.

`GET /ready` checks that the web process can query PostgreSQL.

`GET /status/integrations` returns safe configured/not-configured integration metadata and requires an admin session.

`GET /status/infrastructure` returns safe configured/not-configured infrastructure metadata and requires an admin session.

`GET /status/agents` returns AI operations team definitions and review boundaries and requires an admin session.

`GET /status/automation` returns automation readiness metadata and requires an admin session.

## Enterprise Infrastructure Path

For a hardened production deployment, run this container behind TLS, use managed PostgreSQL with backups, store secrets in platform secrets, mount `/app/uploads` to durable object storage or a persistent volume, and run migrations as a controlled release step before starting new app instances.
