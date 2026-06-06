# Incident Response Runbook

## Severity Levels

- Sev 1: secret exposure, unauthorized financial mutation, live bureau data exposure, payment processing outage.
- Sev 2: authentication outage, admin privilege issue, webhook processing failure, database degradation.
- Sev 3: frontend outage, AI gateway degraded, non-sensitive background job failure.

## Immediate Actions

1. Stop the affected deployment or roll back to the last known good release.
2. Preserve logs and timestamps.
3. Disable affected credentials in the provider console if exposure is suspected.
4. Rotate impacted secrets.
5. Block affected routes at the edge if needed.
6. Notify internal owners.

## Secret Exposure

- Rotate the exposed secret immediately.
- Invalidate sessions or JWTs if auth secrets are involved.
- Rotate database passwords if a connection string is exposed.
- Rotate Stripe, Plaid, bureau, OpenAI, and Cloudflare credentials in their provider consoles.
- Search logs and source control for the exposed value without printing it in tickets.

## Stripe Incident

- Disable the affected webhook endpoint if duplicate or fraudulent events are suspected.
- Verify event IDs in Stripe Dashboard.
- Compare local payment records with Stripe event history.
- Reconcile before retrying fulfillment.

## Bureau Data Incident

- Disable bureau pull routes.
- Confirm whether sandbox or live credentials were used.
- Preserve audit logs.
- Notify legal/compliance owner before contacting external parties.

## BrandonFintech Ledger Incident

- Stop money-moving endpoints.
- Export audit logs and ledger entries.
- Compare account balances to ledger totals.
- Do not manually edit ledger entries.
- Correct through explicit compensating entries only after review.

## Rollback

- Revert application deployment to the previous known good build.
- Do not roll back databases without a recovery plan.
- For migrations, prefer forward fixes unless a restore drill has been validated.
- After rollback, run health, auth, dashboard, payment, and admin smoke tests.

## Post-Incident Review

- Timeline.
- Root cause.
- Systems affected.
- Data affected.
- Customer impact.
- Remediation completed.
- Preventive tasks.

