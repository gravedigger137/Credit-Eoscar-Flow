# Security

## Overview
Security controls protect customer PII, credit data, documents, credentials, financial workflow data, and internal automation.

## Purpose
Define mandatory controls before customer onboarding or external due diligence.

## Architecture
Controls include environment-only configuration, secure sessions, security headers, CORS allowlists, centralized admin RBAC, rate limiting, masked config reads, encrypted stored sensitive config when `SENSITIVE_CONFIG_ENCRYPTION_KEY` is configured, upload guardrails, audit events, high-risk confirmation, and human review gates.

## Dependencies
Platform secrets, encrypted database backups, access reviews, incident response process, and secure upload storage.

## Folder Structure
Security docs live in `docs/Production-Security-Checklist.md`, `docs/Security-And-Audit-Controls.md`, `docs/Incident-Response-Runbook.md`, and `docs/security/`.

## Security
No hardcoded secrets, no credentials in docs, no raw SSNs or EINs in repo files, and no live bureau/e-OSCAR activity unless explicitly authorized. Admin-only route families are protected server-side; real-user production still requires MFA and CSRF protection.

## Maintenance
Run periodic access reviews, dependency checks, backup restores, and incident tabletop reviews.

## Related Documentation
`docs/Production-Blockers.md`, `docs/Go-Live-Checklist.md`, `docs/security/RBAC.md`, `docs/security/MFA.md`, `docs/security/CSRF.md`, `docs/security/Rate-Limiting.md`, `docs/security/Secret-Management.md`, `docs/security/Upload-Security.md`.
