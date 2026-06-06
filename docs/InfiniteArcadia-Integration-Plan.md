# InfiniteArcadia Integration Plan

## Parent Platform Vision

InfiniteArcadia should be the parent brand, domain, identity surface, navigation shell, and shared operations layer for multiple financial-adjacent products. The ecosystem should feel unified to users, but each product must keep its regulated or sensitive data boundaries isolated.

The goal is one ecosystem, not one shared database.

## Product Roles

### Credit-Eoscar

Credit-Eoscar is the credit repair, bureau, dispute, Metro 2, automation, compliance, reporting, and client operations product.

It owns:

- Credit repair clients and disputes
- Credit report uploads and parsing
- Bureau API configuration and bureau pulls
- Metro 2 workflows
- Credit automation rules and runs
- Credit business billing and usage reporting
- Credit-product admin operations

### BrandonFintech

BrandonFintech by InfiniteArcadia is the fintech accounts, transfers, immutable ledger, payments, deposits, statements, and financial admin product.

It owns:

- Users and JWT authentication for the fintech app
- Accounts and balances
- Ledger entries
- Internal transfers
- PaymentIntents and Stripe payment status
- Idempotency keys for money-moving endpoints
- Audit logs
- CSV statements
- Fintech admin operations

### Shared AI Gateway

The Cloudflare Worker/Ollama gateway should become the shared AI boundary. Product apps should call the gateway, not local model runtimes directly.

The gateway should:

- Hide model provider details
- Avoid exposing OpenAI, local model, or tunnel credentials to browsers
- Support safe request logging without storing raw PII by default
- Provide routing for local Ollama, hosted OpenAI-compatible providers, or future managed AI
- Enforce timeouts and payload limits

## Recommended Domains

- `infinitearcadia.com` - parent brand and public site
- `app.infinitearcadia.com` - Credit-Eoscar app
- `fintech.infinitearcadia.com` - BrandonFintech frontend
- `api.fintech.infinitearcadia.com` - BrandonFintech API
- `ai.infinitearcadia.com` - AI gateway Worker

Optional later:

- `api.credit.infinitearcadia.com` - separate Credit-Eoscar API if the frontend/API are split
- `status.infinitearcadia.com` - public uptime/status page

## Database Strategy

Use separate managed PostgreSQL databases:

- Credit-Eoscar database for credit repair, PII, bureau, and automation data
- BrandonFintech database for accounts, ledger, payments, transfers, and audit logs

Do not merge BrandonFintech financial tables into Credit-Eoscar.

Do not store credit bureau data in BrandonFintech.

Use separate database users, separate backup policies, separate connection strings, and separate restore drills.

## Shared Identity Strategy

Short term:

- Keep Credit-Eoscar session auth separate.
- Keep BrandonFintech JWT auth separate.
- Link products through navigation and domain branding only.

Medium term:

- Introduce SSO/OIDC through a dedicated identity provider.
- Use external identity IDs to map users into each app.
- Do not copy password hashes between products.

Long term:

- Parent InfiniteArcadia identity service issues OIDC tokens.
- Each product keeps local authorization roles and product-specific permissions.
- Admin elevation is product-specific and requires MFA.

## Why Password Tables Should Not Be Shared

Password tables encode application-specific assumptions: hashing parameters, lockout policy, MFA state, recovery flows, role defaults, and session/JWT behavior. Sharing password tables couples releases and increases blast radius if either product is compromised.

Use SSO/OIDC claims instead of direct password-table sharing.

## Why Financial Ledgers Must Remain Isolated

BrandonFintech ledger data is a financial source of truth. It must remain append-only, auditable, and isolated from credit repair workflows. Credit-Eoscar should never write directly to account balances, ledger entries, transfers, payment records, or idempotency records.

If Credit-Eoscar needs fintech data, it should call BrandonFintech APIs with scoped service credentials and read-only permissions.

## Stripe Split

Credit-Eoscar Stripe role:

- SaaS subscriptions
- Credit-repair billing
- Usage billing
- Payment links or checkout sessions

BrandonFintech Stripe role:

- PaymentIntents
- Account funding flows
- Fintech payment status tracking
- Future Connect/Treasury eligibility work

Use separate webhook endpoints. Add product metadata to all Stripe objects. Do not share one webhook handler unless an explicit router is built and tested.

## Safe AI Routing

Credit-Eoscar AI use cases include dispute letter generation, credit analysis, Metro 2 validation, and workflow automation.

BrandonFintech AI use cases should be limited to support, summarization, and operations assistance until stronger financial controls exist. AI should not directly approve transfers, release promotional credit, mutate ledger entries, or make bureau pulls.

All AI calls should pass through the shared gateway with:

- PII minimization
- Prompt injection guidance
- Request size limits
- Timeouts
- Per-product audit records
- Model/provider allowlists

