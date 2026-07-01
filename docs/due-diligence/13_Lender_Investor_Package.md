# Lender and Investor Package

## Overview
Controlled package for lender or investor review.

## Purpose
Collect approved summaries and evidence after professional review. Lender visible defaults to false.

## Architecture
Package readiness is driven by `document_room_items.lender_visible_boolean`, `facility_readiness_checklist`, and `audit_events`.

## Dependencies
Approved documents, legal review, accountant review, security review, and manual admin confirmation.

## Folder Structure
Document Room category: `Lender Package`.

## Security
Share only approved and masked documents. Do not include secrets, credentials, or unnecessary PII.

## Maintenance
Version each package, record recipient, record date shared, and preserve audit history.

## Related Documentation
`docs/Credit-Facility-Readiness.md`, `docs/Go-Live-Checklist.md`.

## Required Documents
Executive overview, entity documents, financial reports, collateral schedules, receivable evidence, technology/security summary, compliance summary.

## Document Owner
Chief Admin Agent / Officer Task Agent.

## Review Status
Draft - attorney/accountant/security review required.

## Version History
v0.1 - Initial section.
