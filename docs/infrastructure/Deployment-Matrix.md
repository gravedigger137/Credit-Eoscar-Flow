# Deployment Matrix

## Purpose
Map each service to the recommended staging and production host.

## Scope
Credit-Eoscar, BrandonFintech, AI Worker, and databases.

## Owner
DevOps Agent.

## Human Review Required
Production promotion and live credential setup.

## Security Notes
Separate environment variables and databases by app and environment.

## Audit Requirements
Record deploy targets, version, commit, and smoke-test results.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`.

## Related Database Tables
Migration tables and `audit_events`.

## Go/No-Go Criteria
Each row must pass staging smoke tests before production.

| Component | Staging Target | Production Target |
| --- | --- | --- |
| Credit-Eoscar | Render or existing host | Render/current host |
| BrandonFintech API | Render/Railway/Fly/Azure | Render/Railway/Fly/Azure |
| BrandonFintech Web | Cloudflare Pages | Cloudflare Pages |
| AI Worker | Cloudflare Workers | Cloudflare Workers |
| Credit DB | Managed PostgreSQL/Neon branch | Managed PostgreSQL |
| Fintech DB | Separate managed PostgreSQL | Separate managed PostgreSQL |
