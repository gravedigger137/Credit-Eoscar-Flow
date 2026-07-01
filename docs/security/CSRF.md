# CSRF Protection

## Overview

Credit-Eoscar uses cookie/session authentication, so state-changing browser requests require CSRF validation.

## Purpose

Prevent cross-site request forgery against authenticated staff sessions.

## Architecture

- `server/csrf.ts` issues a session-bound CSRF token.
- `GET /api/v1/auth/csrf` and `GET /api/auth/csrf` return the token.
- State-changing requests must include `X-CSRF-Token`.
- `client/src/lib/queryClient.ts` automatically attaches the token for shared API calls.
- Direct multipart/public form calls use the same CSRF-aware fetch wrapper.

## Dependencies

- Stable session storage.
- Secure cookies in production.
- Correct `CORS_ALLOWED_ORIGINS`.

## Folder Structure

- `server/csrf.ts`
- `server/index.ts`
- `client/src/lib/queryClient.ts`

## Security

Only Stripe webhook routes are exempt because Stripe cannot send browser CSRF tokens and uses signature verification instead. GET, HEAD, and OPTIONS are safe-method exempt.

## Maintenance

Every future state-changing route must either use the shared frontend API helper or explicitly send `X-CSRF-Token`. Do not add CSRF exemptions without documenting why the caller cannot use a session token.

## Related Documentation

- `docs/security/RBAC.md`
- `docs/Production-Security-Checklist.md`

