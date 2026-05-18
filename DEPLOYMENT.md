# Credit Eoscar Flow Deployment

This app is now configured to run without Replit-specific agents, domains, or deployment links. It ships as a Node/Express backend, Vite/React frontend, PostgreSQL database, and Docker infrastructure.

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
npm run build
npm start
```

`npm run check` is available for type-checking, but the exported codebase currently has existing model/type drift in automation and credit workflow modules. The production build uses the transpiled server bundle and succeeds independently.

## Required Production Environment

`DATABASE_URL` must point to your PostgreSQL database.

`SESSION_SECRET` must be a long random value and must stay stable between deploys.

`PUBLIC_APP_URL` must be your real public URL, for example `https://app.yourdomain.com`. OAuth callbacks and Stripe checkout redirects use this value.

## Optional Services

Set `OPENAI_API_KEY` for AI features.

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for billing.

Set `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` for banking.

Set OAuth client IDs/secrets only for providers you want enabled. Provider callback URLs should be:

```text
https://app.yourdomain.com/api/auth/google/callback
https://app.yourdomain.com/api/auth/facebook/callback
https://app.yourdomain.com/api/auth/github/callback
```

## Health Checks

`GET /health` checks that the web process is alive.

`GET /ready` checks that the web process can query PostgreSQL.

## Enterprise Infrastructure Path

For a hardened production deployment, run this container behind a TLS reverse proxy or load balancer, use a managed PostgreSQL instance with backups, store secrets in your platform secret manager, mount `/app/uploads` to durable object storage or a persistent volume, and run `npm run db:push` as a controlled release step before starting new app instances.
