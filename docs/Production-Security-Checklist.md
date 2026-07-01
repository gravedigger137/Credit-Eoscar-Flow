# Production Security Checklist

## Network and Browser Security

- Lock CORS to exact production domains.
- Remove wildcard origins from production APIs.
- Set `CORS_ALLOWED_ORIGINS` for Credit-Eoscar.
- Set `Cors__AllowedOrigins` or `CORS_ALLOWED_ORIGINS` for BrandonFintech API.
- Use HTTPS only.
- Set secure cookies in production.
- Add security headers through the app or reverse proxy.

## CSRF

Credit-Eoscar uses cookie/session authentication. CSRF protection is implemented for state-changing browser routes.

Required:

- Keep CSRF tokens enabled.
- Strict allowed origins
- No state-changing GET endpoints
- Separate public webhook routes from browser-auth routes

## JWT Hardening

BrandonFintech uses JWT bearer auth.

Required:

- Long random `Jwt__Secret`
- Short access token lifetime
- Issuer and audience validation
- Zero or low clock skew
- Rotation plan
- Logout/revocation strategy for production
- HTTPS-only frontend/API

## Admin MFA

MFA readiness is implemented. All admin roles need MFA enabled and tested before real users:

- Credit-Eoscar admin and staff roles
- BrandonFintech admin role
- Promo credit release
- Ledger/payment admin operations
- Bureau credential management

## RBAC

- Centralized admin RBAC is implemented through `server/authorization.ts`.
- Admin-only route families include Document Room, Asset Register, Equity, admin overrides, configuration, automation controls, bureau credential configuration, monitoring configuration, UI customization, integration status, infrastructure status, agent status, and automation status.
- Real-user production still requires admin MFA and periodic role review.

## Rate Limiting and Login Lockout

- Keep login, API, upload, and admin rate limits enabled.
- Add Redis or platform distributed rate limiting for multi-instance production.
- Add IP and account-based lockout.
- Add webhook rate and payload limits.
- Add AI endpoint limits.

## Audit Logs

Audit:

- Login failures and admin login success
- Admin role changes
- Bureau credential changes
- Bureau pulls
- File uploads/downloads
- Stripe webhook events
- Payment status changes
- Deposits and transfers
- Promo credit releases
- Ledger writes

## Secret Management

- Use platform secrets only.
- Rotate secrets before launch.
- Do not log secret values.
- Sensitive app config values are encrypted at rest when `SENSITIVE_CONFIG_ENCRYPTION_KEY` is configured.
- Production refuses to save sensitive app config values without `SENSITIVE_CONFIG_ENCRYPTION_KEY`.
- Sensitive `/config/:key` reads return masked values.
- Prefer managed secret storage or encrypted columns with envelope encryption for any future credential tables.

## Upload Security

- Store uploads outside source control.
- Use antivirus/malware scanning through `MALWARE_SCAN_COMMAND` or provider integration.
- Enforce MIME and extension validation.
- Enforce magic-byte validation where practical.
- Enforce size limits.
- Archive uploads are disabled by default and require `ALLOW_ARCHIVE_UPLOADS=true`.
- Use private object storage for production.
- Audit all downloads.
- Remove any tracked PDFs before public deployment if they contain PII.

## PII and Bureau Data

- Encrypt sensitive fields where practical.
- Restrict bureau pulls to sandbox/test until production contracts are complete.
- Mask SSNs in logs and UI.
- Create retention and deletion rules.
- Restrict raw report access.
- Maintain consent records.

## Financial Data

- Keep BrandonFintech financial data isolated.
- Treat ledger entries as append-only.
- Never edit balances without a ledger entry.
- Require idempotency for all money-moving writes.
- Use audit logs for every balance-affecting action.

## Stripe Webhook Replay Protection

- Verify signatures.
- Store event IDs.
- Reject duplicate event processing.
- BrandonFintech currently suppresses immediate replay in memory; durable event persistence is still required before live mode.
- Use product metadata tags.
- Keep separate webhook endpoints per product.

## Backups and Recovery

- Managed PostgreSQL backups enabled.
- Point-in-time recovery where available.
- Restore drill before launch.
- Separate backup policies for credit and fintech DBs.
- Private backup access only.

## Monitoring and Alerts

- Health and readiness checks.
- Error tracking.
- Structured logs.
- Payment/webhook failure alerts.
- Bureau API failure alerts.
- Database connection alerts.
- Background automation failure alerts.

## Data Retention

- Define retention windows for credit reports, disputes, uploads, webhook events, audit logs, and AI prompts.
- Define deletion/export workflows for customer requests.
- Avoid retaining raw AI prompts containing PII unless explicitly required.
