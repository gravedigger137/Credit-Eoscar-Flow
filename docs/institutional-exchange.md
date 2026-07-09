# Institutional Exchange & Financial Network Integration Layer

## Purpose

The Institutional Exchange module provides a secure, plugin-based routing layer for approved financial transactions, instrument packages, and settlement events. It is designed for institutional partner adapters without assuming direct access to regulated payment networks.

## Implemented Components

- Institution Exchange Engine
- Institution Registry
- Financial Network Registry
- Instrument Registry
- Settlement Engine
- Payment Rail Manager
- Treasury/Government integration registry boundaries
- Partner Connector Framework
- Routing Decision Engine
- Compliance Validation Layer
- Settlement Audit Engine
- Institution Credential Vault
- Retry queue and worker entrypoint
- Connector health monitoring

## Adapter Contract

Each connector implements:

- `Validate()`
- `Authenticate()`
- `DiscoverCapabilities()`
- `Submit()`
- `GetStatus()`
- `Cancel()`
- `Retry()`
- `Health()`
- `MapResponse()`
- `MapErrors()`

## Supported Adapter Codes

- `stripe`
- `dwolla`
- `ach`
- `wire`
- `fedwire`
- `fednow`
- `rtp`
- `swift`
- `sepa`
- `card_networks`
- `treasury_direct`
- `baas`
- `federal_reserve_services`

## Safety Model

Adapters do not claim network access by default. If credentials, enrollment, endpoint allowlisting, or partner approval are missing, connector responses return explicit non-submitted statuses:

- `not_configured`
- `requires_enrollment`
- `credentials_missing`
- `endpoint_not_allowlisted`
- `validation_failed`

This prevents false success for Fedwire, FedNow, RTP, SWIFT, SEPA, TreasuryDirect, ACH, Dwolla, banking, card network, and future provider connections.

## Database Tables

The migration `db/migrations/0004_institutional_exchange.sql` creates:

- `financial_networks`
- `institution_registry`
- `institution_credentials`
- `institution_capabilities`
- `payment_rails`
- `instrument_types`
- `instruments`
- `instrument_documents`
- `instrument_collateral`
- `instrument_parties`
- `instrument_assignments`
- `exchange_requests`
- `exchange_routes`
- `exchange_attempts`
- `exchange_results`
- `settlement_events`
- `routing_rules`
- `connector_health`

The existing `audit_events` table is reused for institutional exchange audit history.

The migration `db/migrations/0005_dwolla_bank_account_links.sql` adds Dwolla and Plaid linkage fields to `bank_accounts` so Plaid-linked accounts can be converted into Dwolla exchanges/funding sources without storing manual routing and account numbers.

## API Routes

Admin-gated routes are available under both `/api/institutional-exchange` and `/api/v1/institutional-exchange`:

- `GET /health`
- `GET /dashboard`
- `GET /networks`
- `GET /payment-rails`
- `GET /instrument-types`
- `GET /institutions`
- `POST /institutions`
- `GET /institutions/:institutionId/credentials`
- `POST /credentials`
- `GET /instruments`
- `POST /instruments`
- `GET /exchange-requests`
- `POST /exchange-requests`
- `POST /exchange-requests/:exchangeRequestId/route`
- `POST /exchange-requests/:exchangeRequestId/process`
- `GET /settlement-events`
- `GET /connector-health`
- `POST /connector-health/refresh`
- `GET /routing-rules`
- `POST /routing-rules`
- `GET /retry-queue`
- `POST /retry-queue/process`
- `GET /audit-timeline`

Dwolla connector routes are admin-gated and available under both `/api/dwolla` and `/api/v1/dwolla`:

- `POST /customer`
- `GET /customer/:id`
- `POST /exchange`
- `POST /funding-source`
- `GET /funding-sources/:customerId`
- `POST /transfer`
- `GET /transfer/:id`
- `GET /health`

## Dwolla Connector

The Dwolla connector uses `dwolla-v2` and the existing sensitive configuration storage/encryption helpers. `DWOLLA_KEY` and `DWOLLA_SECRET` are treated as sensitive values and must never be returned unmasked by health or configuration routes.

Supported operations:

- create and retrieve customers
- create exchanges from a Plaid processor token
- create funding sources from a Dwolla exchange
- create funding sources manually when Plaid linkage is unavailable
- list funding sources for a customer
- create and retrieve transfers
- report health/configuration status
- verify webhook signatures when `DWOLLA_WEBHOOK_SECRET` is configured

Plaid integration behavior:

- If a selected bank account has a stored Plaid access token and Plaid account ID, the connector requests a Plaid processor token for Dwolla.
- The processor token is submitted to Dwolla as an Exchange.
- The Exchange URL is then used to create the Dwolla funding source.
- Manual routing/account-number funding source creation remains available as a fallback when no Plaid-linked account is selected.

The connector returns explicit non-success statuses for missing credentials, missing enrollment configuration, or non-allowlisted endpoints. It does not claim ACH or Dwolla production access unless the required credentials and partner configuration are present.

## Environment Variables

Required for production credential encryption:

- `SENSITIVE_CONFIG_ENCRYPTION_KEY`

Optional institutional exchange settings:

- `INSTITUTIONAL_EXCHANGE_WORKER_ENABLED`
- `INSTITUTIONAL_EXCHANGE_WORKER_INTERVAL_MS`
- `INSTITUTIONAL_EXCHANGE_ALLOWED_ENDPOINTS`
- `INSTITUTIONAL_EXCHANGE_STRIPE_ENABLED`
- `INSTITUTIONAL_EXCHANGE_STRIPE_ENDPOINT`
- `INSTITUTIONAL_EXCHANGE_STRIPE_CREDENTIAL_REF`
- `INSTITUTIONAL_EXCHANGE_DWOLLA_ENABLED`
- `INSTITUTIONAL_EXCHANGE_DWOLLA_ENDPOINT`
- `INSTITUTIONAL_EXCHANGE_DWOLLA_CREDENTIAL_REF`
- `INSTITUTIONAL_EXCHANGE_ACH_ENABLED`
- `INSTITUTIONAL_EXCHANGE_ACH_ENDPOINT`
- `INSTITUTIONAL_EXCHANGE_ACH_CREDENTIAL_REF`

Dwolla connector settings:

- `DWOLLA_KEY`
- `DWOLLA_SECRET`
- `DWOLLA_ENV`
- `DWOLLA_API_URL`
- `DWOLLA_PLAID_EXCHANGE_PARTNER_HREF`
- `DWOLLA_WEBHOOK_SECRET`

Additional adapters follow the same naming pattern:

`INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_ENABLED`, `INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_ENDPOINT`, and `INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_CREDENTIAL_REF`.

## Production Approval Boundary

Direct network submission for Fedwire, FedNow, RTP, SWIFT, SEPA, TreasuryDirect, ACH, Dwolla, card networks, and bank integrations requires the appropriate contracts, credentials, partner enrollment, network eligibility, and regulatory approvals. This module provides the secure architecture and guardrails for those integrations; it does not assert that any external approval has been granted.
