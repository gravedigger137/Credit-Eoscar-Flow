# Role-Based Access Control

## Overview

Credit-Eoscar uses centralized server-side RBAC for production-sensitive administrative functionality.

## Purpose

Keep permission decisions in one authorization layer instead of scattering role checks through controllers and route handlers.

## Architecture

- `server/authorization.ts` owns administrator role detection, bootstrap allow-list handling, user sanitization, and reusable middleware.
- `server/index.ts` routes admin-sensitive path families through `requireAdmin`.
- `server/auth.ts` and `server/oauth.ts` assign bootstrap administrator privileges from `BOOTSTRAP_ADMIN_EMAILS`.
- Public health checks remain public: `/health` and `/ready`.
- Administrative status endpoints require an authenticated admin session.
- `MFA_ENFORCE_ADMIN=true` requires MFA verification for MFA-enabled admin accounts before admin routes can be used.

## Dependencies

- PostgreSQL user table with `role`.
- Stable `SESSION_SECRET`.
- `BOOTSTRAP_ADMIN_EMAILS` configured only during initial deployment bootstrap.

## Folder Structure

- `server/authorization.ts`
- `server/auth.ts`
- `server/oauth.ts`
- `server/index.ts`
- `AdminGuide.md`
- `docs/security/Bootstrap-Administrators.md`

## Security

Protected admin route families include:

- `/api/v1/document-room`
- `/api/v1/admin-overrides`
- `/api/v1/config`
- `/api/v1/ui-customization`
- `/api/v1/automation`
- `/api/v1/bureau/configure`
- `/api/v1/credit-monitor/config`
- `/api/v1/status/integrations`
- `/api/v1/status/infrastructure`
- `/api/v1/status/agents`
- `/api/v1/status/automation`
- `/api/v1/status/security`

Unauthorized authenticated users receive `403`. Unauthenticated users receive `401`.

## Maintenance

- Remove `BOOTSTRAP_ADMIN_EMAILS` after initial admin users exist and a manual admin-management procedure is established.
- Review admin users before every production deployment.
- Add MFA before real-user production.
- Keep all new admin routes behind `requireAdmin` or the central admin path gate.

## Related Documentation

- `docs/security/Bootstrap-Administrators.md`
- `docs/Security-And-Audit-Controls.md`
- `docs/Production-Security-Checklist.md`
