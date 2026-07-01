# Dependency Policy

## Purpose
Define dependency selection, review, maintenance, and license awareness.

## Scope
Runtime dependencies, dev dependencies, Docker images, and hosted platform integrations.

## Owner
Code Review Agent.

## Human Review Required
New paid/proprietary SDKs, non-permissive licenses, cryptography packages, payment/bureau/government integrations, and production dependency updates.

## Security Notes
Use lockfiles, review advisories, avoid abandoned packages, and never store credentials in package scripts.

## Audit Requirements
Record dependency upgrades in `CHANGELOG.md`.

## Related Routes
None.

## Related Database Tables
None.

## Go/No-Go Criteria
`npm run check` and `npm run build` pass after dependency changes.

## License Awareness
MIT-compatible and permissive open-source packages are preferred. GPL/AGPL/commercial-license dependencies require explicit review.
