# Credential Rotation

## Overview

Credential rotation is required before go-live, after staff changes, and after any suspected exposure.

## Purpose

Replace secrets safely without downtime or data loss.

## Architecture

Secrets are rotated in the hosting platform first, then the service is redeployed or restarted. Database, Stripe, Plaid, OAuth, bureau, SMTP, AI, and encryption credentials each require provider-specific validation.

## Dependencies

- Access to hosting platform secret manager.
- Provider admin access.
- Rollback plan.
- Smoke-test checklist.

## Folder Structure

- `docs/security/Secret-Management.md`
- `docs/Staging-Smoke-Test-Checklist.md`
- `docs/Incident-Response-Runbook.md`

## Security

Never rotate by committing secrets. Never paste old or new values into Git history. If `SENSITIVE_CONFIG_ENCRYPTION_KEY` changes, existing encrypted API config values must be re-encrypted through a controlled migration or manually re-entered after rotation.

## Maintenance

Recommended minimum rotation:

- Session secret: before production and after suspected session compromise.
- Stripe/Plaid/OAuth/API keys: before production and after access-team changes.
- Database passwords: before production and quarterly where supported.
- Bureau credentials: according to provider contract and after any operator access change.
- Encryption key: only through a planned re-encryption procedure.

## Related Documentation

- `docs/security/Secret-Management.md`
- `DisasterRecovery.md`
- `docs/Go-Live-Checklist.md`

