# Password Reset Readiness

## Overview

Password reset remains an external-service-dependent production workflow.

## Purpose

Define the secure reset requirements without faking email/SMS delivery or account recovery approval.

## Architecture

Required production design:

- One-time reset token.
- Token hash stored server-side.
- Short expiration window.
- Rate-limited request endpoint.
- No account enumeration.
- Email provider delivery through platform secrets.
- Audit event for request and completion.
- Forced session invalidation after password change.

## Dependencies

- Email provider or identity provider.
- Verified sender domain.
- Token storage table or external identity system.
- Incident/account recovery policy.

## Folder Structure

- Future server route under `/api/v1/auth/password-reset`.
- Future migration for password reset token hashes if not delegated to an identity provider.

## Security

Do not implement password reset with plaintext tokens, long-lived links, unverified email delivery, or account-existence responses.

## Maintenance

Password reset is a remaining manual/external dependency before real-user production unless authentication is delegated to a production identity provider.

## Related Documentation

- `docs/security/Rate-Limiting.md`
- `docs/security/Secret-Management.md`
- `docs/Production-Blockers.md`

