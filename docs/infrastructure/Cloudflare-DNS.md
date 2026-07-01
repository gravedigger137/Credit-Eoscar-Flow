# Cloudflare DNS

## Purpose
Document Cloudflare DNS setup and safety checks.

## Scope
Records, proxy status, SSL/TLS, WAF, redirects, and rollback.

## Owner
Cloud Infrastructure Agent.

## Human Review Required
Production cutover and WAF/security policy changes.

## Security Notes
Protect Cloudflare API tokens and account access with MFA.

## Audit Requirements
Record all DNS and access changes.

## Related Routes
`/status/infrastructure`.

## Related Database Tables
None.

## Go/No-Go Criteria
DNS, TLS, health checks, and rollback target documented.
