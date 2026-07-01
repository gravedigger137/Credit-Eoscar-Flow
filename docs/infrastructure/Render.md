# Render

## Purpose
Document Render API hosting for Credit-Eoscar or BrandonFintech API services.

## Scope
Render web services, environment variables, health checks, and rollback.

## Owner
DevOps Agent.

## Human Review Required
Production service creation, live env vars, and database migration release.

## Security Notes
Set secrets in Render Dashboard or secret groups. Do not commit values.

## Audit Requirements
Record deploys, rollbacks, env changes, and incidents.

## Related Routes
`/health`, `/ready`.

## Related Database Tables
Migration tables.

## Go/No-Go Criteria
Service must bind to `0.0.0.0:$PORT`, pass `/ready`, and have stable `SESSION_SECRET`.
