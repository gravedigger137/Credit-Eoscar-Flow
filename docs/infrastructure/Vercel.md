# Vercel

## Purpose
Document optional Vercel deployment path for frontend/static or compatible services.

## Scope
Vercel preview/production deployments and CI/CD notes.

## Owner
DevOps Agent.

## Human Review Required
Production promotion and env var changes.

## Security Notes
Use Vercel project secrets. CI requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` only in CI secrets.

## Audit Requirements
Record promotions, rollbacks, and production alias changes.

## Related Routes
`/health`, `/ready` when proxying API.

## Related Database Tables
None.

## Go/No-Go Criteria
Preview deployment validated before production promotion.
