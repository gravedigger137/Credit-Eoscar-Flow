# Database Readiness

## Purpose
Track PostgreSQL readiness, migrations, backups, restore testing, and data isolation.

## Scope
Credit-Eoscar database and separate BrandonFintech database.

## Owner
DevOps Agent / Data Quality Agent.

## Human Review Required
Production migrations, restores, and data exports.

## Security Notes
Connection strings stay in secrets. Backups must be encrypted and access-controlled.

## Audit Requirements
Record migrations, restore tests, and data access exceptions.

## Related Routes
`/ready`.

## Related Database Tables
All application tables and migration history.

## Go/No-Go Criteria
Migration tested on staging, backup verified, restore path documented.
