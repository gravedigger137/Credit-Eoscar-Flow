# Admin Guide

## Overview
Admins manage clients, documents, automation, compliance queues, billing workflow, trust-accounting metadata, and due-diligence records.

## Purpose
Explain safe administrative operations and professional review boundaries.

## Architecture
Admin workflows use existing authenticated UI pages and the Document Room page at `/document-room`. Server-side admin route families are protected by centralized RBAC in `server/authorization.ts`.

## Dependencies
Authenticated staff session, role policy, source documents, and review queues.

## Folder Structure
Admin screens live under `client/src/pages`; backend routes live under `/api/v1`.

## Security
High-risk actions require confirmation and audit logging. Do not mark lender visible or receivable eligible without manual review. Bootstrap administrator emails are configured with `BOOTSTRAP_ADMIN_EMAILS` only during first deployment, then removed. Admin MFA is still required before real-user production.

## Maintenance
Review audit history, failed automation runs, onboarding queues, and readiness checklists weekly.

## Related Documentation
`docs/Officer-Workflow-Support.md`, `docs/Automation-Command-Center.md`, `docs/security/RBAC.md`, `docs/security/Bootstrap-Administrators.md`.
