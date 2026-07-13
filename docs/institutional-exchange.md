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

Dwolla verified-customer onboarding routes are available under both `/api/dwolla` and `/api/v1/dwolla`. Client actors are limited to matching client records by email, while administrators retain access through the existing RBAC middleware:

- `POST /customers/verified`
- `GET /customers/:customerId`
- `PATCH /customers/:customerId`
- `GET /customers/:customerId/verification`
- `POST /customers/:customerId/retry`
- `POST /customers/:customerId/documents`
- `POST /webhooks`

The admin-only timeline route is available under both `/api/admin/dwolla` and `/api/v1/admin/dwolla`:

- `GET /customers/:customerId/timeline`

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

### Verified Customer Onboarding

Verified customer onboarding extends the existing Dwolla connector. The local profile uses existing client fields for name, email, phone, birth date, and address where available. Dwolla-specific status fields are stored on `clients`, and full SSN values are encrypted with the existing sensitive configuration encryption system before persistence.

Security behavior:

- full SSN is never returned by API responses
- encrypted full SSN is never returned by API responses
- full SSN input is cleared in the browser after submission
- audit events store only status, client IDs, Dwolla customer IDs, and whether sensitive data was provided
- webhook events are deduplicated by Dwolla event ID
- older webhook timestamps cannot overwrite newer local verification state
- document uploads are validated for file type, size, and signature

Supported normalized verification states:

- `pending`
- `verified`
- `retry`
- `kba`
- `document`
- `suspended`
- `failed`

### Webhook Setup

Configure the Dwolla webhook URL to point to:

`/api/dwolla/webhooks`

The route verifies `X-Request-Signature-SHA-256` using `DWOLLA_WEBHOOK_SECRET` before persisting or auditing the event. Duplicate deliveries return success without applying state changes again.

Supported internal customer topics:

- `customer_created`
- `customer_verified`
- `customer_reverification_needed`
- `customer_verification_document_needed`
- `customer_verification_document_uploaded`
- `customer_verification_document_approved`
- `customer_verification_document_failed`
- `customer_suspended`

### Document Upload Requirements

Dwolla verification documents are accepted as PDF, JPG, JPEG, or PNG up to `DWOLLA_DOCUMENT_MAX_BYTES`. Files are written outside public web directories under `DWOLLA_PRIVATE_UPLOAD_DIR`.

For production live document submission, configure private storage through `PRIVATE_UPLOAD_STORAGE` and set `DWOLLA_DOCUMENT_UPLOADS_ENABLED=true`. If private production storage is not configured, the API records the upload metadata and returns a clear storage-configuration blocker instead of claiming the document was submitted to Dwolla.

### Sandbox Procedure

1. Configure sandbox Dwolla credentials and `DWOLLA_ENV=sandbox`.
2. Configure `DWOLLA_WEBHOOK_SECRET` and register `DWOLLA_WEBHOOK_URL` in the Dwolla dashboard.
3. Submit a verified customer from the client profile dialog with required identity fields.
4. Complete sandbox verification, retry, or document-required paths in Dwolla.
5. Confirm `/api/dwolla/customers/:customerId/verification` shows the normalized status and timeline.
6. Upload a test verification document only when private storage and document upload submission are configured.

### Production Activation Blockers

- Dwolla production account approval and verified-customer permissions
- production `DWOLLA_KEY` and `DWOLLA_SECRET`
- production `DWOLLA_WEBHOOK_SECRET`
- production webhook registration for `DWOLLA_WEBHOOK_URL`
- `SENSITIVE_CONFIG_ENCRYPTION_KEY`
- private identity-document storage configuration
- compliance review for verified customer onboarding copy, retention, and KYC workflows
- operational review for document handling, audit retention, and webhook monitoring

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
- `DWOLLA_WEBHOOK_URL`
- `DWOLLA_DOCUMENT_UPLOADS_ENABLED`
- `DWOLLA_DOCUMENT_MAX_BYTES`
- `DWOLLA_PRIVATE_UPLOAD_DIR`

Additional adapters follow the same naming pattern:

`INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_ENABLED`, `INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_ENDPOINT`, and `INSTITUTIONAL_EXCHANGE_<CONNECTOR_CODE>_CREDENTIAL_REF`.

## Production Approval Boundary

Direct network submission for Fedwire, FedNow, RTP, SWIFT, SEPA, TreasuryDirect, ACH, Dwolla, card networks, and bank integrations requires the appropriate contracts, credentials, partner enrollment, network eligibility, and regulatory approvals. This module provides the secure architecture and guardrails for those integrations; it does not assert that any external approval has been granted.
