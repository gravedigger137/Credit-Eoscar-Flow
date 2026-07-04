# Backup / Restore Compliance

## Purpose

Define compliance-oriented backup and restore readiness controls for databases, uploads, document room evidence, audit logs, and configuration records.

## Scope

Applies to Credit-Eoscar PostgreSQL, future BrandonFintech databases, uploaded documents, document-room files, audit logs, and platform configuration.

## Applicable Module

Infrastructure, Neon/PostgreSQL, uploads, Document Room, audit logs, admin operations, and deployment readiness.

## Required Controls

- Maintain documented backup schedule, retention, encryption, and access control.
- Test restore procedures before claiming restore readiness.
- Keep backups separate from application runtime credentials.
- Track backup verification and restore-drill evidence.
- Do not claim completed restore drills unless actually performed.

## Manual Tasks

- Configure managed database backups.
- Configure private file backup.
- Run and document restore drill.
- Assign backup owners and escalation contacts.

## External Dependencies

- Managed PostgreSQL provider.
- Private object storage, if used.
- Hosting provider backup tools.
- Secure credential management.

## Evidence Needed

- Backup configuration.
- Restore drill logs.
- Retention settings.
- Access-control records.
- Incident recovery notes.

## Status: Draft / Ready / Requires External Approval

Draft. Requires infrastructure configuration and verified restore drill.

## Disclaimer

This documentation is not legal advice and does not prove backups or restore procedures have been tested.

