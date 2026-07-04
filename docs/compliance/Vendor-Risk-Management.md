# Vendor Risk Management

## Purpose

Define vendor risk controls for providers handling customer data, payment data, credit data, identity data, infrastructure, email/SMS, AI, or compliance workflows.

## Scope

Applies to Stripe, Cloudflare, Render, Vercel, Neon, GitHub, AI providers, email/SMS providers, bureau providers, identity providers, storage vendors, and future partner services.

## Applicable Module

Infrastructure, payments, identity, uploads, AI workflows, credit workflows, notifications, and compliance operations.

## Required Controls

- Maintain vendor inventory with data categories, risk level, owner, contract status, and security evidence.
- Do not store vendor credentials in code or documentation.
- Review high-risk vendors before production use.
- Track API readiness, webhook readiness, SLA notes, and data-processing terms where applicable.
- Keep pending integrations clearly marked pending.

## Manual Tasks

- Collect vendor security documents.
- Review contracts and data-processing terms.
- Assign vendor owners.
- Schedule periodic vendor reviews.

## External Dependencies

- Vendor documentation.
- Legal/compliance review.
- Platform secret managers.

## Evidence Needed

- Vendor inventory.
- Security questionnaires or reports.
- Contract status.
- Data-flow notes.
- Review approvals.

## Status: Draft / Ready / Requires External Approval

Draft. Requires vendor evidence collection and review before production reliance.

## Disclaimer

This documentation is not legal advice and does not certify any vendor as approved.

