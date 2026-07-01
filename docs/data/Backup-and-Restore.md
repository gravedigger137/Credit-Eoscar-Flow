# Backup and Restore

## Purpose
Document backup schedule, restore process, and incident recovery.

## Scope
PostgreSQL, uploads/evidence, deployment artifacts, and configuration snapshots without secret exposure.

## Owner
Incident Response Agent.

## Human Review Required
Production restore, data deletion, or data-retention exceptions.

## Security Notes
Encrypt backups and restrict access. Do not store secrets in backup docs.

## Audit Requirements
Record backup failures, restore tests, restores, and retention changes.

## Related Routes
`/ready`, `/status/infrastructure`.

## Related Database Tables
All production tables.

## Go/No-Go Criteria
Production requires tested restore and documented RPO/RTO.

## Backup Procedure

1. Enable managed PostgreSQL automated backups.
2. Enable point-in-time recovery where the provider supports it.
3. Back up private upload/object storage separately from the database.
4. Export deployment configuration names, not secret values.
5. Store backup access in the platform secret manager or provider IAM.

## Restore Procedure

1. Declare incident and freeze destructive administrative actions.
2. Identify restore target timestamp.
3. Restore PostgreSQL into a separate recovery database first.
4. Validate schema, row counts, representative customer records, and `/ready`.
5. Restore private upload storage snapshot or object versions.
6. Promote only after officer/admin approval.
7. Record restore evidence and decision in audit/incident records.

## Retention

- Staging: short retention is acceptable with no real PII.
- Production: define retention with legal/compliance review.
- Bureau reports and PII documents require a specific retention/deletion policy.

## Restore Drill Checklist

- Restore test database completed.
- Application connects to restored database.
- Sample document metadata matches private storage object.
- Admin login tested.
- `/ready` tested.
- Findings recorded.

No restore drill was executed by this documentation update.
