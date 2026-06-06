# Staging Rollback Plan

## Frontend Rollback

Cloudflare Pages:

1. Open the Pages project.
2. Select the last known good deployment.
3. Promote or roll back to that deployment.
4. Re-run frontend smoke tests.

## API Rollback

Render/Railway/Fly/Azure:

1. Identify the last known good deployment.
2. Roll back the service to that deploy or redeploy the previous Git commit/tag.
3. Keep staging database online.
4. Re-run `/health`, `/ready`, auth, dashboard, and payment smoke tests.

## Database Migration Rollback

Preferred staging approach:

- Use forward fixes for non-destructive migration issues.
- Restore staging database from a pre-migration snapshot if a migration corrupts staging data.
- Do not manually edit migration history unless the database is disposable and the team agrees.

Before applying migrations:

1. Capture database snapshot.
2. Record current Git commit.
3. Record migration name/version.

Rollback:

1. Stop the affected app.
2. Restore the staging database snapshot.
3. Redeploy previous app commit/tag.
4. Re-run smoke tests.

## Disable Stripe Webhooks

1. Open Stripe Dashboard in test mode.
2. Disable the staging webhook endpoint.
3. Confirm no live endpoint is touched.
4. Re-enable only after webhook smoke tests pass.

## Disable Worker Routes

1. Roll back the Cloudflare Worker deployment to the previous version.
2. If needed, remove or repoint `staging-ai.infinitearcadia.com`.
3. Confirm apps fail safely when AI is unavailable.

## Restore Previous GitHub Commit or Tag

1. Identify the last known good commit or tag.
2. Deploy that commit through the hosting provider.
3. Do not force-push shared branches for rollback.
4. Create a follow-up fix branch from the failed commit for investigation.

