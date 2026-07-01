# Insurance and Risk

## Overview
Insurance policies, risk controls, IUL records if applicable, business continuity, incident response, and vendor risk.

## Purpose
Organize insurance and operational-risk evidence without assuming coverage, cash value, or assignment status.

## Architecture
Insurance records are `collateral_assets` with supporting `document_room_items` when documents exist.

## Dependencies
Carrier records, policy declarations, riders, beneficiary records, assignments, proof of coverage, risk reviews.

## Folder Structure
Document Room category: `Insurance and Risk`.

## Security
Mask policy numbers, beneficiary private data, account numbers, and health or financial data.

## Maintenance
Review at renewal, assignment, beneficiary update, rider change, or lender disclosure.

## Related Documentation
`docs/Master-Asset-Register.md`, `docs/DisasterRecovery.md`.

## Required Documents
Policy declarations, riders, assignment records, beneficiary evidence, risk assessments, continuity plan.

## Document Owner
Officer Task Agent / Security Monitor Agent.

## Review Status
Draft - attorney/accountant/insurance review required.

## Version History
v0.1 - Initial section.
