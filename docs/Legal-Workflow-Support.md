# Legal Workflow Support

## Purpose
Organize MSA, order form, privacy policy, terms, trust documents, corporate documents, security agreement, promissory note, and lender package review queues.

## Scope
Workflow support only. No legal advice.

## Owner
Legal Workflow Agent.

## Human Review Required
Attorney review is required for legal documents, approvals, lender package release, and legal conclusions.

## Security Notes
Mark templates draft - attorney review required.

## Audit Requirements
Legal document approval, superseding, lender visibility, and deletion of evidence require audit logs.

## Related Routes
`/api/v1/document-room/legal-instruments`, `/api/v1/document-room/items`.

## Related Database Tables
`legal_instruments`, `document_room_items`, `audit_events`.

## Go/No-Go Criteria
Production legal workflows require attorney-reviewed templates and retention policy.
