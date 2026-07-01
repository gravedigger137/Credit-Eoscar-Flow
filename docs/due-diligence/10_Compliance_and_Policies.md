# Compliance and Policies

## Overview
Compliance policies, consumer-credit workflow boundaries, privacy, terms, dispute-process controls, bureau/e-OSCAR readiness, and audit requirements.

## Purpose
Make compliance controls reviewable without implying legal advice or live bureau authorization.

## Architecture
Compliance workflow links to `audit_events`, onboarding records, disputes, document room records, and status endpoints.

## Dependencies
Terms, privacy policy, authorization forms, dispute workflows, CROA/FCRA review, bureau sandbox configuration, and attorney review.

## Folder Structure
Document Room category: `Compliance`.

## Security
Protect consumer credit data and customer PII. Use sandbox/test APIs unless live authorization is documented.

## Maintenance
Review before production bureau access, e-OSCAR transmission, customer launch, and major workflow changes.

## Related Documentation
`docs/Production-Security-Checklist.md`, `docs/Security-And-Audit-Controls.md`.

## Required Documents
Privacy policy, terms, authorization forms, compliance checklist, incident response policy, data retention policy.

## Document Owner
Compliance Workflow Agent.

## Review Status
Draft - attorney/compliance review required.

## Version History
v0.1 - Initial section.
