# Secret Management

## Overview

Secrets must live in environment variables or platform secret managers, not source code or documentation.

## Purpose

Prevent credential leakage for database access, sessions, Stripe, Plaid, bureau credentials, OAuth, SMTP, AI providers, private keys, and certificates.

## Architecture

- Runtime environment variables are loaded by the hosting platform.
- `.env.example` contains placeholders only.
- `.env` and `.env.*` are ignored except example files.
- Sensitive values saved through the API config storage path are encrypted with AES-256-GCM when `SENSITIVE_CONFIG_ENCRYPTION_KEY` is configured.
- Client SSNs and Plaid access tokens are encrypted at write time when `SENSITIVE_CONFIG_ENCRYPTION_KEY` is configured.
- Sensitive config reads through `/api/v1/config/:key` return masked values instead of raw secrets.

## Dependencies

- Platform secret manager.
- `SENSITIVE_CONFIG_ENCRYPTION_KEY` for encrypted stored configuration.
- Deployment controls that prevent `.env` files from being committed.

## Folder Structure

- `.env.example`
- `server/secret-store.ts`
- `server/storage.ts`
- `docs/security/Credential-Rotation.md`

## Security

Required production secrets:

- `DATABASE_URL`
- `SESSION_SECRET`
- `SENSITIVE_CONFIG_ENCRYPTION_KEY`
- `CORS_ALLOWED_ORIGINS`
- `MFA_ENFORCE_ADMIN`
- Optional integration secrets only when approved and tested: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLAID_SECRET`, OAuth client secrets, bureau sandbox credentials, AI provider keys.

Do not log, screenshot, email, or paste secret values into tickets. Status endpoints may return configured/not-configured metadata only.

## Maintenance

- Rotate all staging secrets before production.
- Rotate immediately after suspected exposure.
- Keep separate staging and production secrets.
- Use least-privilege service accounts where supported.

## Related Documentation

- `docs/security/Credential-Rotation.md`
- `docs/Credentials-Checklist.md`
- `docs/Production-Security-Checklist.md`
