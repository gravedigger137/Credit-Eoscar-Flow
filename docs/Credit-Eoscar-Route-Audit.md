# Credit-Eoscar Route and API Audit

This audit covers the current Express route surface. Most product routes are mounted under both `/api/v1` and `/api` for compatibility.

## Auth Routes

| Path | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `POST /api/v1/auth/register` | Create user; first user becomes admin | `SESSION_SECRET`, database | Public | Partially safe | Add invite/admin-only staff creation after first user; add CSRF; add distributed lockout |
| `POST /api/v1/auth/login` | Session login | `SESSION_SECRET`, database | Public | Partially safe | Add distributed rate limit, MFA for admins, CSRF/origin checks |
| `POST /api/v1/auth/logout` | Destroy session | Session cookie | Public/current session | Partially safe | Add CSRF |
| `GET /api/v1/auth/me` | Return current user | Session cookie | Optional/current session | Safe with caveats | Ensure no sensitive fields are returned |
| `GET /api/v1/auth/has-users` | Setup flow state | Database | Public | Safe for setup | Consider hiding after production setup |
| `GET /api/v1/auth/providers` | OAuth provider availability | OAuth env vars | Public | Safe | Returns booleans only |
| `GET /api/v1/auth/{google,facebook,github}` | OAuth start/callback | OAuth client credentials | Public callback | Partially safe | Verify redirect domains and production callback URLs |

## AI Routes

| Path | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `POST /api/v1/ai/dispute-letter` | Generate dispute letter | `OPENAI_API_KEY` or AI provider | Auth required by gate | Needs hardening | PII minimization, prompt logging policy, rate limits |
| `POST /api/v1/ai/analyze-client` | Analyze credit profile | AI provider | Auth required | Needs hardening | Data minimization, role checks |
| `POST /api/v1/ai/chat` | General AI chat | AI provider | Auth required | Needs hardening | Prompt injection controls, limits |
| `POST /api/v1/ai/validate-metro2` | Validate Metro 2 record | AI provider | Auth required | Needs hardening | Payload validation and audit |

## Credit and Client Routes

| Path group | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `/dashboard/stats` | Product dashboard counts | Database | Auth required | Partially safe | Role scope by tenant/org |
| `/clients*` | Client CRUD and documents | Database, uploads | Auth required | Needs hardening | RBAC, PII masking, audit logs |
| `/disputes*` | Dispute CRUD and letters | Database, AI optional | Auth required | Needs hardening | RBAC, audit logs, compliance review |
| `/reports*` | Credit reports and analysis | Database, AI optional | Auth required | Needs hardening | Raw report access controls |
| `/tradelines*` | Tradeline management | Database | Auth required | Needs hardening | Compliance review and role checks |
| `/credit-lines*` | Credit-builder products | Database, Stripe optional | Auth required | Needs hardening | Product/legal review |
| `/metro2*` | Metro 2 generation/upload/validation | Database, AI optional | Auth required | Needs hardening | Strict validation and audit trail |

## Bureau Routes

| Path | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `GET /bureaus` | Static bureau metadata | None | Auth required | Safe | None |
| `GET /bureau/status` | Config status | Bureau config records | Auth required | Partially safe | Admin-only |
| `POST /bureau/configure` | Save bureau credentials | Bureau credentials | Auth required | Not production-ready | Admin-only, encrypted secrets, no plaintext table storage |
| `POST /bureau/pull-report` | Pull bureau report | Bureau credentials | Auth required | Do not enable live by default | Sandbox gate, consent, audit, role checks |
| `GET /bureau/status-all` | All bureau status | Bureau config records | Auth required | Partially safe | Admin-only |
| `POST /bureau/auto-pull/:clientId` | Automated bureau pull | Bureau credentials, PII | Auth required | Do not enable live by default | Consent, sandbox gate, admin/staff role checks |

## Automation Routes

| Path group | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `/automation/rules*` | CRUD automation rules | Database, AI/provider integrations | Auth required | Needs hardening | Admin-only, approval workflow |
| `/automation/runs*` | Run history | Database | Auth required | Partially safe | Tenant and role scoping |
| `/automation/seed`, `/automation/reseed` | Seed default automation | Database | Auth required | Not safe for broad production access | Admin-only and disabled in production unless explicitly allowed |

## Stripe Routes

| Path | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `POST /stripe/webhook` | Stripe billing webhook | `STRIPE_WEBHOOK_SECRET` | Public webhook | Partially safe | Store event IDs for replay protection |
| `POST /stripe/create-checkout` | Create Checkout Session | `STRIPE_SECRET_KEY` | Auth required | Partially safe | Product metadata, customer mapping, role/tenant scope |
| `POST /stripe/create-payment-link` | Create payment link | `STRIPE_SECRET_KEY` | Auth required | Partially safe | Prefer managed products/prices |

## Plaid and Banking Routes

| Path group | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `/plaid/status` | Plaid config status | Plaid env vars | Auth required | Safe | None |
| `/plaid/create-link-token` | Create Plaid link token | `PLAID_CLIENT_ID`, `PLAID_SECRET` | Auth required | Needs hardening | Tenant/user scoping |
| `/plaid/exchange-token` | Exchange public token | Plaid credentials | Auth required | Needs hardening | Encrypt access tokens, audit |
| `/bank-accounts*` | Store/sync bank accounts | Plaid tokens | Auth required | Needs hardening | Encrypt tokens, role scope |

## Upload Routes

| Path group | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `/clients/:clientId/documents` | Upload/list client docs | Local uploads storage | Auth required | Needs hardening | Private object storage, malware scan, PII retention |
| `/documents/:id/download` | Download document | Upload storage | Auth required | Needs hardening | Authorization by client/org and audit |
| `/credit-report/parse*` | Parse uploaded report | Upload parser, AI optional | Auth required | Needs hardening | File scanning, PII controls |

## Admin and Configuration Routes

| Path group | Purpose | Credentials | Auth/role | Production status | Hardening needed |
| --- | --- | --- | --- | --- | --- |
| `/admin-overrides` | Environment/config status | Env vars, config records | Auth required | Needs hardening | Admin-only |
| `/config/:key`, `/config` | Read/write app config | Database config records | Auth required | Not production-ready for broad access | Admin-only, encrypted values, audit |
| `/settings` frontend flows | Credential entry UI | Bureau/Plaid/Stripe values | Auth required | Needs hardening | Never store secrets in browser globals; admin-only |

