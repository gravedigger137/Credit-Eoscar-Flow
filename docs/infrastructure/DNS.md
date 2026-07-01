# DNS

## Purpose
Document Infinite Arcadia DNS records for staging and production.

## Scope
Cloudflare-managed DNS records and TLS routing.

## Owner
Cloud Infrastructure Agent.

## Human Review Required
Production domain cutover and rollback.

## Security Notes
Use proxied records where appropriate and verify TLS.

## Audit Requirements
Record record changes, time, actor, and rollback target.

## Related Routes
`/health`, `/ready`.

## Related Database Tables
None.

## Go/No-Go Criteria
Staging records pass smoke tests before production changes.

## Records
- `infinitearcadia.com` - parent production site
- `app.infinitearcadia.com` - Credit-Eoscar production app
- `fintech.infinitearcadia.com` - BrandonFintech Web
- `api.fintech.infinitearcadia.com` - BrandonFintech API
- `ai.infinitearcadia.com` - AI Worker
- `staging.infinitearcadia.com` - staging parent/app
- `staging-fintech.infinitearcadia.com` - staging fintech web
- `staging-api-fintech.infinitearcadia.com` - staging fintech API
- `staging-ai.infinitearcadia.com` - staging AI Worker
