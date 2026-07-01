# Cloudflare

## Purpose
Document Cloudflare DNS, Pages, Workers, WAF, TLS, and AI gateway readiness.

## Scope
DNS and edge services only. No credentials in repo.

## Owner
Cloud Infrastructure Agent.

## Human Review Required
Production DNS, WAF, Worker routes, and secret changes.

## Security Notes
Use Cloudflare secrets and dashboard variables. Never commit API tokens.

## Audit Requirements
Record DNS, Worker route, and production secret changes.

## Related Routes
`/status/infrastructure`.

## Related Database Tables
None.

## Go/No-Go Criteria
Staging DNS and TLS verified; production requires rollback plan and access review.
