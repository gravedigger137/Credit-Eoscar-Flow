# Bootstrap Administrators

## Overview

Bootstrap administrator assignment is a first-deployment procedure only.

## Purpose

Allow the initial trusted operator accounts to become administrators without hardcoding emails throughout the application.

## Architecture

The app reads a comma-separated `BOOTSTRAP_ADMIN_EMAILS` environment variable. During registration or OAuth first sign-in, matching emails are assigned the `admin` role. If the allow list is absent, local/development behavior can still assign the first user as admin.

## Dependencies

- `SESSION_SECRET`
- `DATABASE_URL`
- `BOOTSTRAP_ADMIN_EMAILS`
- Working registration or OAuth provider configuration

## Folder Structure

- `server/authorization.ts`
- `.env.example`
- `AdminGuide.md`

## Security

Use the deployment platform secret manager or environment-variable manager. Do not place real operator lists in public screenshots or tickets.

Initial bootstrap allow-list value:

```text
BOOTSTRAP_ADMIN_EMAILS=bgalloway17504@gmail.com,gravedigger137@icloud.com
```

After both admin accounts are created and verified:

1. Remove or clear `BOOTSTRAP_ADMIN_EMAILS` in production.
2. Redeploy or restart the service.
3. Confirm non-allow-listed users register as non-admin users.
4. Manage role changes through the approved admin procedure.

## Maintenance

- Review admin users before launch.
- Add MFA before real users.
- Record role changes in an audit trail.

## Related Documentation

- `docs/security/RBAC.md`
- `docs/security/Secret-Management.md`
- `docs/Go-Live-Checklist.md`

