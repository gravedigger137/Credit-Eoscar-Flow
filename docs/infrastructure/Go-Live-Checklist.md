# Infrastructure Go-Live Checklist

## Purpose
Infrastructure checklist for responsible go-live.

## Scope
Domains, Cloudflare DNS, Cloudflare Pages/Workers, Render, Vercel, Neon, GitHub, Stripe, Notion, HubSpot, SAM.gov tracking, TreasuryDirect tracking, Louisiana SOS tracking, and Mercedes-Benz EDI readiness.

## Owner
Incident Response Agent.

## Human Review Required
Production credentials, government/EDI access, live payments, and DNS cutover.

## Security Notes
No secret values in tickets, docs, or screenshots. Admin-only status endpoints require a valid admin session.

## Audit Requirements
Record go/no-go decision and blockers.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`, `/status/integrations`.

## Related Database Tables
`audit_events`.

## Go/No-Go Criteria
All critical checks pass or are explicitly blocked. Do not cut over production DNS until `SESSION_SECRET`, `SENSITIVE_CONFIG_ENCRYPTION_KEY`, production CORS origins, admin MFA, backup restore, and upload storage controls are verified.
