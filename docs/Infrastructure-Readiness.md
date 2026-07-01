# Infrastructure Readiness

## Purpose
Define safe metadata checks for Cloudflare DNS, Cloudflare Pages, Cloudflare Workers, Vercel, Render, Neon, PostgreSQL, Stripe test mode, bureau sandbox APIs, GitHub, object storage, email, OpenAI, and Ollama/local AI.

## Scope
Status only. No deployment and no credential disclosure.

## Owner
Cloud Infrastructure Agent.

## Human Review Required
Production DNS changes, live keys, bureau live mode, Stripe live mode, and database migrations.

## Security Notes
Status endpoints return configured/not-configured, environment, last check time, status, and error summary without secret values.

## Audit Requirements
Secret/config changes and production promotion require audit logs.

## Related Routes
`/status/infrastructure`, `/api/v1/status/infrastructure`, `/status/integrations`.

## Related Database Tables
None required for read-only status; audit events should record config changes when implemented.

## Go/No-Go Criteria
Staging requires test credentials and DNS. Production requires backup, rollback, monitoring, and security review.
