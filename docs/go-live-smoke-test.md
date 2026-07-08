# Go-Live Smoke Test

Run these checks after deploying the current `main` branch and before inviting production users.

## Access And Health

1. Open the production URL and confirm the homepage loads without a blank screen.
2. Log in as an admin user.
3. Open `/ready` and confirm it returns `ok: true`.
4. Open `/status/integrations` as an authenticated admin and confirm the response loads without exposing secret values.
5. Confirm browser console and network responses do not show API keys, client secrets, Plaid tokens, Stripe secrets, bureau credentials, database URLs, or private keys.

## Plaid

1. Go to Settings and open the Plaid configuration section.
2. Save Plaid config with the production-approved `clientId`, `secret`, `environment`, and products.
3. Confirm the save response masks the secret and never returns the full secret.
4. Run Test Connection and confirm the UI reports readiness or a clear missing-config error.
5. Go to the Banking/Lending Bypass dashboard.
6. Click Link Bank Account.
7. Select a client before starting Plaid Link.
8. Confirm the modal shows both Connect with Plaid and Add manually.
9. Click Connect with Plaid and confirm Plaid Link opens.
10. Complete a sandbox or production-approved Plaid flow.
11. Confirm linked accounts are created for the selected client.
12. Confirm linked account count increases.
13. Confirm available funds and current balances refresh from linked account balance data.

## Manual Bank Entry

1. Go to the Banking/Lending Bypass dashboard.
2. Click Link Bank Account.
3. Select a client.
4. Choose Add manually.
5. Enter institution, account name, account type, last 4 digits, current balance, available balance, and limit.
6. Save the account.
7. Confirm the account appears in the dashboard and counts/funds update.

## Bureau Provider Configuration

1. Go to Bureau APIs.
2. Confirm Experian settings load.
3. Save Experian sandbox or production-approved config.
4. Confirm the response masks credentials and never returns the full client secret.
5. Run the Experian test action and confirm it returns success or a clear not-configured/provider error.
6. Confirm Equifax settings load.
7. Save Equifax config.
8. Confirm missing provider secrets return clear errors and do not crash the app.
9. Confirm TransUnion and CBC Innovis status/test actions do not crash when not configured.

## e-OSCAR / Metro 2

1. Open `/status/integrations` as an authenticated admin.
2. Confirm the response includes `eoscarConfigured`, `metro2Ready`, and `bureauIntegrationsConfigured`.
3. Confirm the e-OSCAR status is readiness/configuration only.
4. Confirm the UI and responses do not claim live e-OSCAR production submission unless official documentation, credentials, and approval are present.

## Stripe

1. Confirm Stripe environment variables are configured only if payment flows are enabled.
2. Run the existing payment flow with approved Stripe test or live credentials.
3. Confirm webhook handling works for the configured mode.
4. Confirm no Stripe secret or webhook secret appears in browser console, network responses, or server logs.

## Final Pass

1. Confirm `/ready` still returns `ok: true`.
2. Confirm admin dashboard, onboarding, banking, bureau settings, Plaid settings, and payment routes still load.
3. Confirm server logs show no fatal runtime errors.
4. Confirm no secret values appear in logs or browser output.
