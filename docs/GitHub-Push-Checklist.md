# GitHub Push Checklist

## Purpose
Prepare safe GitHub push without exposing secrets.

## Scope
Pre-commit checks, validation, secret scan, build, and release notes.

## Owner
Code Review Agent.

## Human Review Required
Commit approval and remote push.

## Security Notes
Verify no `.env`, private keys, real API keys, SSNs, account numbers, uploaded PII, `node_modules`, `dist`, or build artifacts are staged.

## Audit Requirements
Record validation commands and results in release notes.

## Related Routes
None.

## Related Database Tables
None.

## Go/No-Go Criteria
Do not push until `npm run check`, `npm run build`, and hygiene scan pass.
