# Dwolla Sandbox Administration Toolkit

This toolkit is for Dwolla sandbox administration only. It reads credentials from environment variables and refuses to run against the production Dwolla API.

## Required Environment

Set these in the current PowerShell session or in Render. Do not commit real values.

```powershell
$env:DWOLLA_ENV = "sandbox"
$env:DWOLLA_API_URL = "https://api-sandbox.dwolla.com"
$env:DWOLLA_KEY = "REPLACE_WITH_DWOLLA_SANDBOX_KEY"
$env:DWOLLA_SECRET = "REPLACE_WITH_DWOLLA_SANDBOX_SECRET"
$env:DWOLLA_WEBHOOK_SECRET = "REPLACE_WITH_RANDOM_SANDBOX_WEBHOOK_SECRET"
$env:DWOLLA_WEBHOOK_URL = "https://www.infinitearcadia.com/api/dwolla/webhooks"
$env:DWOLLA_DOCUMENT_UPLOADS_ENABLED = "false"
```

`SENSITIVE_CONFIG_ENCRYPTION_KEY` is required by the application for storing sensitive customer/provider data, but the toolkit does not need to print or inspect its value.

## Load

```powershell
. .\scripts\dwolla.ps1
```

## Validate Configuration

```powershell
Test-DwollaConfiguration
```

## OAuth Token Status

```powershell
Get-DwollaAccessToken
```

The command obtains an OAuth token using the sandbox client-credentials flow, caches it in memory only, and returns only status metadata such as token type, expiration, and a masked suffix. It never prints the full access token.

## API Root And Account

```powershell
Get-DwollaApiRoot
Get-DwollaAccount
```

## Webhook Subscriptions

List subscriptions:

```powershell
Get-DwollaWebhookSubscriptions
```

Create the Infinite Arcadia subscription only when missing:

```powershell
New-DwollaWebhookSubscription
```

Retrieve a subscription:

```powershell
Get-DwollaWebhookSubscription -SubscriptionIdOrUrl "GUID-HERE"
```

Delete a sandbox subscription only when intentionally cleaning up:

```powershell
Remove-DwollaWebhookSubscription -SubscriptionId "GUID-HERE" -Confirm
```

## Webhook Endpoint Probe

This sends an unsigned JSON request and expects the application to reject it with 401 or 403.

```powershell
Test-DwollaWebhookEndpoint
```

## Retry Failed Webhooks

```powershell
Retry-DwollaWebhook -WebhookId "GUID-HERE"
Get-DwollaWebhookRetries -WebhookId "GUID-HERE"
```

`Retry-DwollaWebhook` validates the webhook ID as a GUID and calls `POST /webhooks/{id}/retries` with an internally managed OAuth token. Do not paste Authorization headers into PowerShell.

Common errors:

- `401`: OAuth token is missing, expired, or invalid.
- `403`: credentials do not have permission to retry the webhook.
- `404`: webhook ID was not found in this sandbox account.
- `409`: Dwolla rejected the retry because the webhook state does not allow retry.

## Customers And Funding Sources

```powershell
Get-DwollaCustomers
Get-DwollaCustomer -CustomerIdOrUrl "CUSTOMER-ID-OR-URL"
Get-DwollaFundingSources -CustomerIdOrUrl "CUSTOMER-ID-OR-URL"
Get-DwollaFundingSource -FundingSourceIdOrUrl "FUNDING-SOURCE-ID-OR-URL"
```

Create a fictional sandbox customer only when deliberately testing:

```powershell
New-DwollaSandboxCustomer `
  -FirstName "Fictional" `
  -LastName "Sandbox" `
  -Email "fictional.sandbox@example.test" `
  -Address1 "99 Sandbox Way" `
  -City "Des Moines" `
  -State "IA" `
  -PostalCode "50309" `
  -DateOfBirth "1990-01-01" `
  -Last4Ssn "1234" `
  -FictionalDataOnly `
  -Confirm
```

Do not use real identity information.

## Transfers

This toolkit does not expose an unrestricted transfer execution command. It only creates a safe preview payload:

```powershell
New-DwollaSandboxTransferPreview `
  -SourceFundingSourceUrl "https://api-sandbox.dwolla.com/funding-sources/SOURCE-GUID" `
  -DestinationFundingSourceUrl "https://api-sandbox.dwolla.com/funding-sources/DESTINATION-GUID" `
  -Amount 10.00
```

The preview rejects production URLs and amounts above the conservative sandbox ceiling. No transfer is executed.

## Raw HTTP Is Not PowerShell

This is invalid PowerShell:

```text
POST https://api-sandbox.dwolla.com/webhooks/GUID/retries
Authorization: Bearer TOKEN
Accept: application/vnd.dwolla.v1.hal+json
```

Raw HTTP documentation must be translated into `Invoke-RestMethod`, `Invoke-WebRequest`, `curl.exe`, or the provided toolkit functions. Use:

```powershell
Retry-DwollaWebhook -WebhookId "GUID-HERE"
```

## Documentation References

- Dwolla authentication and request headers: https://developers.dwolla.com/docs/api-reference/api-fundamentals/making-requests-and-authentication
- Webhook subscriptions: https://developers.dwolla.com/docs/api-reference/webhook-subscriptions
- Webhooks and retries: https://developers.dwolla.com/docs/api-reference/webhooks
- Working with webhook signatures: https://developers.dwolla.com/docs/working-with-webhooks

