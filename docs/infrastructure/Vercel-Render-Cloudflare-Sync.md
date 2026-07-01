# Vercel Render Cloudflare Sync

## Purpose
Coordinate hosting and DNS across Vercel, Render, and Cloudflare.

## Scope
Frontend, API, DNS, SSL/TLS, environment variables, preview/staging, production promotion, and rollback.

## Owner
DevOps Agent.

## Human Review Required
Production env vars, domain aliases, and deployment promotions.

## Security Notes
Keep provider tokens in platform secrets and CI secrets only.

## Audit Requirements
Record deploy commit, env changes, DNS changes, and rollback.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`.

## Related Database Tables
Migration tables.

## Go/No-Go Criteria
Staging preview validated before production promotion.
