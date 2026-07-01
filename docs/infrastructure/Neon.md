# Neon

## Purpose
Document managed PostgreSQL option for staging and production.

## Scope
Neon projects, branches, pooled connection strings, backups, and restore planning.

## Owner
Cloud Infrastructure Agent.

## Human Review Required
Production database creation, migration, restore, and branch promotion.

## Security Notes
Store connection strings only in platform secrets. Restrict access where supported.

## Audit Requirements
Record migrations, branch creation, restore events, and credential rotation.

## Related Routes
`/ready`, `/status/infrastructure`.

## Related Database Tables
All application tables.

## Go/No-Go Criteria
Staging branch ready, backups configured, migration tested, restore path documented.
