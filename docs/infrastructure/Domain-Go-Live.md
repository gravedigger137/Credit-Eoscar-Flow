# Domain Go-Live

## Purpose
Track domain readiness for Infinite Arcadia.

## Scope
`infinitearcadia.com`, `app.infinitearcadia.com`, `api.infinitearcadia.com`, `staging.infinitearcadia.com`, `staging-app.infinitearcadia.com`, and `staging-api.infinitearcadia.com`.

## Owner
Cloud Infrastructure Agent.

## Human Review Required
Production DNS changes and rollback.

## Security Notes
Use TLS, Cloudflare account protections, least privilege, and no secrets in DNS docs.

## Audit Requirements
Record DNS changes, actor, date, target, and rollback value.

## Related Routes
`/health`, `/ready`.

## Related Database Tables
None.

## Go/No-Go Criteria
Staging DNS verified before production cutover.
