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

Credit-Eoscar uses cookie/session authentication, so production needs CSRF protection for state-changing routes.

Required:

- CSRF tokens or same-site plus origin verification
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

All admin roles need MFA before real users:

- Credit-Eoscar admin and staff roles
- BrandonFintech admin role
- Promo credit release
- Ledger/payment admin operations
- Bureau credential management

## Rate Limiting and Login Lockout

- Keep login rate limits.
- Add distributed rate limiting for production.
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
- Do not store bureau credentials in plaintext application tables.
- Prefer managed secret storage or encrypted columns with envelope encryption.

## Upload Security

- Store uploads outside source control.
- Use antivirus/malware scanning.
- Enforce MIME and extension validation.
- Enforce size limits.
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
