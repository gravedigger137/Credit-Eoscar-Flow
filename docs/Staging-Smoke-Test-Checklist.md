# Staging Smoke Test Checklist

Use test data only. Do not use real customer PII, live bureau data, live Stripe keys, or live payment cards.

## Credit-Eoscar

Health:

- `GET https://staging-app.infinitearcadia.com/health`
- Expected: `ok: true`

Readiness:

- `GET https://staging-app.infinitearcadia.com/ready`
- Expected: database ready or clear `503` if database is not configured

Integration status:

- `GET https://staging-app.infinitearcadia.com/status/integrations`
- Expected: configured/not_configured flags only, no secret values

Auth:

- Open `/login`.
- Register first staging admin if the database is empty.
- Log out.
- Log in again.
- Confirm dashboard loads.

AI/status:

- Open AI page.
- Send non-PII message such as `Summarize FCRA dispute workflow at a high level`.
- Confirm response or safe configured error.

Bureau sandbox readiness:

- Confirm bureau status route/page shows sandbox/test mode only.
- Confirm no live bureau pull is performed.
- Confirm synthetic identity data only.

## BrandonFintech API and Web

Health:

- `GET https://staging-api-fintech.infinitearcadia.com/health`
- Expected: `healthy`

Readiness:

- `GET https://staging-api-fintech.infinitearcadia.com/ready`
- Expected: `ready`

Register/login:

- Register a staging user.
- Confirm default account is returned with pending promotional credit.
- Login and capture JWT.
- Call `GET /api/v1/auth/me` with Bearer token.

Dashboard:

- Open `https://staging-fintech.infinitearcadia.com`.
- Log in.
- Confirm dashboard summary loads.

Account creation:

- `POST /api/v1/accounts`
- Include `Authorization: Bearer <token>`.
- Include `Idempotency-Key: staging-account-001`.
- Confirm account is created.
- Repeat same request and confirm no duplicate account.

Deposit:

- `POST /api/v1/accounts/{accountId}/deposit`
- Include `Idempotency-Key: staging-deposit-001`.
- Confirm available balance increases.
- Repeat same request and confirm it does not double-apply.

Transfer:

- Create or use two staging accounts.
- Deposit test balance into source account.
- `POST /api/v1/transfers/internal`
- Include `Idempotency-Key: staging-transfer-001`.
- Confirm balances and transfer history.

CSV statement:

- `GET /api/v1/accounts/{accountId}/statement.csv`
- Confirm `text/csv` response.
- Confirm no formula injection is possible in text fields.

Stripe test PaymentIntent:

- `POST /api/v1/payments/intents`
- Use Stripe test key only.
- Include `Idempotency-Key: staging-payment-001`.
- Confirm local payment record and test PaymentIntent are created.

Stripe test webhook:

- Configure Stripe CLI or Dashboard test webhook.
- Trigger `payment_intent.succeeded`.
- Confirm local payment status updates.
- Replay same test event and confirm replay is safely handled.

## Cloudflare Worker AI Gateway

Health:

- `GET https://staging-ai.infinitearcadia.com/health`
- Expected: healthy response

Chat:

- `POST https://staging-ai.infinitearcadia.com/ai/chat`
- Body: `{ "message": "Say hello from staging without using private data." }`
- Expected: JSON response or safe model-unavailable error

