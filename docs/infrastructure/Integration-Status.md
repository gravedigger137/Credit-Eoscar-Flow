# Integration Status

## Purpose
Document safe integration readiness checks.

## Scope
Configured/not-configured metadata for database, session, AI, Stripe, Plaid, bureau sandbox, OAuth, and infrastructure.

## Owner
API Monitor Agent.

## Human Review Required
Live mode enablement and credential rotation.

## Security Notes
Status endpoints must never expose secret values.

## Audit Requirements
Record production configuration changes.

## Related Routes
`/status/integrations`, `/status/infrastructure`, `/status/agents`, `/status/automation`.

## Related Database Tables
`api_configs`, `audit_events`.

## Go/No-Go Criteria
Staging requires configured test/sandbox values. Production requires live approval and professional review where applicable.
