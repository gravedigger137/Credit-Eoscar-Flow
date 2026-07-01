# Disaster Recovery

## Overview
Disaster recovery covers database restore, app rollback, DNS rollback, secret rotation, evidence preservation, and incident response.

## Purpose
Minimize downtime and data loss without hiding incidents or altering audit history.

## Architecture
Use managed PostgreSQL backups, release tags, platform rollback tools, persistent uploads storage, and audit-event preservation.

## Dependencies
Backup provider, source-control tags, deployment platform history, DNS access, incident contacts, and tested restore procedure.

## Folder Structure
Runbooks live in `docs/Incident-Response-Runbook.md`, `docs/Staging-Rollback-Plan.md`, and `docs/data/Backup-and-Restore.md`.

## Security
Rotate secrets after suspected exposure. Preserve forensic logs. Do not delete evidence unless legal/compliance review approves retention action. If `SENSITIVE_CONFIG_ENCRYPTION_KEY` is rotated, encrypted app configuration values must be re-entered or re-encrypted through a controlled procedure.

## Maintenance
Test restore and rollback quarterly.

## Related Documentation
`Security.md`, `Infrastructure.md`, `docs/security/Credential-Rotation.md`.
