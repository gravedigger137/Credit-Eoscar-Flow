# Cloud Sync Runbook

## Purpose
Document Cloudflare, Render, Vercel, Neon, DNS, SSL/TLS, rollback, and staging-to-production promotion.

## Scope
Documentation and configuration templates only. No automatic deployment.

## Owner
DevOps Agent.

## Human Review Required
Production promotion, DNS changes, secret rotation, and database migrations.

## Security Notes
Use platform secrets. Do not commit API tokens or provider credentials.

## Audit Requirements
Record production changes, rollback events, and incident-related changes.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`.

## Related Database Tables
Migration tables and `audit_events`.

## Go/No-Go Criteria
Staging smoke tests must pass before production.
