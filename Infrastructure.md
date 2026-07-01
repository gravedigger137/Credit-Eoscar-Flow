# Infrastructure

## Overview
The platform is Docker-ready and can run on Render, Vercel, Cloudflare Pages/Workers, and managed PostgreSQL such as Neon.

## Purpose
Document hosting targets, network boundaries, DNS, SSL, database, object storage, monitoring, and rollback responsibilities.

## Architecture
Credit-Eoscar API serves the Express backend and production static frontend. Cloudflare can manage DNS, Pages, Workers, WAF, and TLS. Render can host the API. Neon can host PostgreSQL.

## Dependencies
Docker, PostgreSQL, platform secret manager, DNS provider, TLS certificates, persistent uploads storage, and backup tooling.

## Folder Structure
See `docs/infrastructure/` for provider-specific runbooks.

## Security
Enforce TLS, secure cookies in production, CORS allowlists, private database networking where available, admin-only status endpoints, and no secret values in status responses.

## Maintenance
Review DNS, certificates, backups, platform secrets, and dependency updates before each staging/production promotion.

## Related Documentation
`docs/infrastructure/Deployment-Matrix.md`, `docs/Infrastructure-Readiness.md`, `DEPLOYMENT.md`, `docs/security/Secret-Management.md`.
