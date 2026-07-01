# Affiliate Program Registry

## Purpose
Track affiliate and partner programs without implying approval.

## Scope
HubSpot, banking affiliates, fintech affiliates, software affiliates, SaaS affiliates, insurance affiliates, automotive affiliates, marketplace affiliates, referral programs, and vendor partners.

## Owner
Affiliate Program Agent.

## Human Review Required
Contracts, marketing restrictions, payout setup, tax forms, and regulated partner claims.

## Security Notes
Track program name, approval status, affiliate ID, contract file, commission structure, payout account reference, compliance notes, API readiness, webhook readiness, marketing restrictions, and tax form status. Mask account references.

## Audit Requirements
Record approval, contract, payout, API, webhook, and restriction changes.

## Related Routes
Future affiliate admin routes only.

## Related Database Tables
`document_room_items`, `audit_events`.

## Go/No-Go Criteria
Do not market participation until approved and contract terms are attached.
