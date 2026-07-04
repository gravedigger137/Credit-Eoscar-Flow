# Security Controls Matrix

## Purpose

Provide a central control matrix for production security, compliance readiness, and go-live review.

## Scope

Applies to authentication, authorization, sessions, MFA, CSRF, rate limiting, uploads, secrets, logging, sensitive data, backups, monitoring, vendor risk, and incident response.

## Applicable Module

Credit-Eoscar application, admin dashboard, Document Room, uploads, integrations, infrastructure, and BrandonFintech integration planning.

## Required Controls

| Control Area | Required Control | Evidence |
| --- | --- | --- |
| Authentication | Secure password hashing, session handling, reset workflow | Auth tests and config |
| Authorization | RBAC and admin route protection | Protected route review |
| Sensitive data | Masking, encryption where supported, log filtering | Data inventory and samples |
| Uploads | Type, size, authorization, audit logging | Upload test evidence |
| Secrets | Environment variables and platform secrets | Secret scan and env examples |
| Monitoring | Health/readiness/status endpoints | Endpoint checks |
| Backups | Backup schedule and restore drill | Provider config and restore logs |
| Vendors | Vendor inventory and review | Vendor risk records |

## Manual Tasks

- Assign owners for each control.
- Collect current evidence.
- Mark gaps in the Compliance Gap Register.
- Review before staging and production deployment.

## External Dependencies

- Hosting and database providers.
- Secret manager.
- Monitoring provider.
- Legal/compliance review.

## Evidence Needed

- Control evidence artifacts.
- Review notes.
- Test results.
- Approval records.
- Gap register updates.

## Status: Draft / Ready / Requires External Approval

Ready as a matrix template; evidence collection remains required.

## Disclaimer

This documentation is not legal advice and does not certify security or regulatory compliance.

