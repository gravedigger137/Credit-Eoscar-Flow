# Production Checklist

## Overview
Production launch requires staging validation, security review, professional review, and operational readiness.

## Purpose
Prevent unsafe launch with missing secrets, unreviewed legal/accounting workflows, or unverified integrations.

## Architecture
Checklist maps to health/readiness/status endpoints, deployment docs, security docs, and due-diligence binder controls.

## Dependencies
Staging environment, managed PostgreSQL, secrets configured, `BOOTSTRAP_ADMIN_EMAILS` used only during first deployment, backups verified, CORS configured, smoke tests passed.

## Folder Structure
Use `docs/Go-Live-Checklist.md`, `docs/Production-Readiness-Go-No-Go.md`, and `docs/Staging-Smoke-Test-Checklist.md`.

## Security
No live Stripe or bureau credentials until test mode is verified and production approval is explicit. Admin route families require admin role, sensitive stored config should be encrypted with `SENSITIVE_CONFIG_ENCRYPTION_KEY`, and uploads require extension/MIME validation.

## Maintenance
Run before every production deployment. Confirm `BOOTSTRAP_ADMIN_EMAILS` is removed after initial admin creation and that admin MFA, CSRF, private upload storage, and monitoring are complete before real users.

## Related Documentation
`DEPLOYMENT.md`, `Security.md`, `DisasterRecovery.md`, `docs/security/RBAC.md`, `docs/security/Bootstrap-Administrators.md`.
