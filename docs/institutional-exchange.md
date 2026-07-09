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

Additional adapters follow the same naming pattern:

`INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_ENABLED`, `INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_ENDPOINT`, and `INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_CREDENTIAL_REF`.

## Production Approval Boundary

Direct network submission for Fedwire, FedNow, RTP, SWIFT, SEPA, TreasuryDirect, ACH, Dwolla, card networks, and bank integrations requires the appropriate contracts, credentials, partner enrollment, network eligibility, and regulatory approvals. This module provides the secure architecture and guardrails for those integrations; it does not assert that any external approval has been granted.
