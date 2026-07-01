# Credit Facility Readiness

## Overview

This is a readiness framework for lender/investor due diligence. It is not an approved loan, bank facility, line of credit, receivables purchase agreement, or lender commitment.

## Purpose

Organize required lender documents, customer contracts, receivable evidence, collateral schedules, software/IP evidence, financial reports, attorney review flags, accountant review flags, and UCC/security documentation tracking.

## Architecture

The framework uses `document_room_items`, `legal_instruments`, `collateral_assets`, `receivable_readiness_records`, `facility_readiness_checklist`, and `audit_events`.

## Dependencies

Requires customer agreements, pricing/order forms, invoices, service completion evidence, payment terms, no dispute flag, manual admin review, financial reports, legal documents, and professional review.

## Folder Structure

- `docs/due-diligence/07_Credit_Facility_Readiness.md`
- `docs/due-diligence/08_Receivables_and_Collateral.md`
- `docs/Master-Asset-Register.md`

## Security

Do not show account numbers, customer PII, tax IDs, bureau credentials, Stripe keys, Plaid keys, database passwords, or lender private communications in repo docs.

## Maintenance

Update checklist status only after source documents are attached and reviewed. Lender visibility defaults to false and requires confirmation.

## Related Documentation

- `docs/Production-Security-Checklist.md`
- `docs/Go-Live-Checklist.md`
- `docs/Security-And-Audit-Controls.md`

## Eligibility Gates

A receivable must not be marked lender eligible unless the customer agreement exists, pricing/order form exists, invoice exists, service evidence exists, payment terms are clear, no dispute flag exists, and manual admin review is complete.
