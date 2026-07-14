<# 
Credit-Eoscar Dwolla sandbox administration toolkit.

Security posture:
- Reads credentials from environment variables only.
- Enforces Dwolla sandbox API usage.
- Never prints secrets or OAuth tokens.
- Keeps OAuth tokens in memory only.
- Provides transfer preview generation only; it does not execute transfers.
#>

Set-StrictMode -Version 2.0

$script:DwollaState = @{
  Config = $null
  AccessToken = $null
  TokenType = $null
  TokenExpiresAt = $null
  TokenSuffix = $null
}

function Protect-DwollaSensitiveText {
  param(
    [Parameter(ValueFromPipeline = $true)]
    [AllowNull()]
    [string]$Text
  )

  process {
    if ($null -eq $Text) { return $null }
    $safe = [string]$Text
    $secretNames = @(
      "DWOLLA_KEY",
      "DWOLLA_SECRET",
      "DWOLLA_WEBHOOK_SECRET",
      "SENSITIVE_CONFIG_ENCRYPTION_KEY",
      "DATABASE_URL"
    )
    foreach ($name in $secretNames) {
      $value = [Environment]::GetEnvironmentVariable($name)
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        $safe = $safe.Replace($value, "[redacted]")
      }
    }
    $safe = $safe -replace '(?i)(Authorization\s*:\s*Bearer\s+)[A-Za-z0-9._~+/\-=]+', '$1[redacted]'
    $safe = $safe -replace '(?i)("?(access_token|client_secret|secret|ssn|fullSSN|full_ssn|encryptedFullSSN|encrypted_full_ssn)"?\s*[:=]\s*"?)[^",\r\n}]+' , '$1[redacted]'
    $safe = $safe -replace '\b\d{3}-?\d{2}-?\d{4}\b', '[redacted-ssn]'
    return $safe
  }
}

function Reset-DwollaToolkitState {
  $script:DwollaState.Config = $null
  $script:DwollaState.AccessToken = $null
  $script:DwollaState.TokenType = $null
  $script:DwollaState.TokenExpiresAt = $null
  $script:DwollaState.TokenSuffix = $null
}

function Get-DwollaEnvironmentValue {
  param([Parameter(Mandatory = $true)][string]$Name)
  return [Environment]::GetEnvironmentVariable($Name)
}

function Get-DwollaDefaultApiUrl {
  param([string]$Environment)
  if (($Environment -eq "production")) { return "https://api.dwolla.com" }
  return "https://api-sandbox.dwolla.com"
}

function Import-DwollaEnvironment {
  [CmdletBinding()]
  param()

  $environment = (Get-DwollaEnvironmentValue "DWOLLA_ENV")
  if ([string]::IsNullOrWhiteSpace($environment)) { $environment = "sandbox" }
  $environment = $environment.Trim().ToLowerInvariant()

  $apiUrl = Get-DwollaEnvironmentValue "DWOLLA_API_URL"
  if ([string]::IsNullOrWhiteSpace($apiUrl)) {
    $apiUrl = Get-DwollaDefaultApiUrl -Environment $environment
  }
  $apiUrl = $apiUrl.Trim().TrimEnd("/")

  $config = [pscustomobject]@{
    Environment = $environment
    ApiUrl = $apiUrl
    TokenUrl = "$apiUrl/token"
    KeyPresent = -not [string]::IsNullOrWhiteSpace((Get-DwollaEnvironmentValue "DWOLLA_KEY"))
    SecretPresent = -not [string]::IsNullOrWhiteSpace((Get-DwollaEnvironmentValue "DWOLLA_SECRET"))
    WebhookSecretPresent = -not [string]::IsNullOrWhiteSpace((Get-DwollaEnvironmentValue "DWOLLA_WEBHOOK_SECRET"))
    WebhookUrl = Get-DwollaEnvironmentValue "DWOLLA_WEBHOOK_URL"
    DocumentUploadsEnabled = Get-DwollaEnvironmentValue "DWOLLA_DOCUMENT_UPLOADS_ENABLED"
    DocumentMaxBytes = Get-DwollaEnvironmentValue "DWOLLA_DOCUMENT_MAX_BYTES"
    PrivateUploadStorage = Get-DwollaEnvironmentValue "PRIVATE_UPLOAD_STORAGE"
    SensitiveConfigEncryptionKeyPresent = -not [string]::IsNullOrWhiteSpace((Get-DwollaEnvironmentValue "SENSITIVE_CONFIG_ENCRYPTION_KEY"))
    PublicAppUrl = Get-DwollaEnvironmentValue "PUBLIC_APP_URL"
    CorsAllowedOrigins = Get-DwollaEnvironmentValue "CORS_ALLOWED_ORIGINS"
    ViteApiBaseUrl = Get-DwollaEnvironmentValue "VITE_API_BASE_URL"
  }

  $script:DwollaState.Config = $config
  return $config
}

function Get-DwollaConfig {
  if ($null -eq $script:DwollaState.Config) {
    return Import-DwollaEnvironment
  }
  return $script:DwollaState.Config
}

function Assert-DwollaSandbox {
  $config = Get-DwollaConfig
  if ($config.Environment -ne "sandbox") {
    throw "Dwolla toolkit refuses to run outside sandbox. Set DWOLLA_ENV=sandbox."
  }
  $uri = [Uri]$config.ApiUrl
  if ($uri.Scheme -ne "https" -or $uri.Host -ne "api-sandbox.dwolla.com") {
    throw "Dwolla toolkit refuses non-sandbox API URL. Set DWOLLA_API_URL=https://api-sandbox.dwolla.com."
  }
}

function Assert-DwollaSandboxUrl {
  param([Parameter(Mandatory = $true)][string]$Url)
  $uri = [Uri]$Url
  if ($uri.Scheme -ne "https" -or $uri.Host -ne "api-sandbox.dwolla.com") {
    throw "Only https://api-sandbox.dwolla.com URLs are allowed by this toolkit."
  }
}

function Assert-DwollaGuid {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Name
  )
  $parsed = [Guid]::Empty
  if (-not [Guid]::TryParse($Value, [ref]$parsed)) {
    throw "$Name must be a valid GUID."
  }
}

function Test-DwollaConfiguration {
  [CmdletBinding()]
  param([switch]$ThrowOnError)

  $config = Import-DwollaEnvironment
  $issues = New-Object System.Collections.Generic.List[string]

  if ($config.Environment -ne "sandbox") { [void]$issues.Add("DWOLLA_ENV must be sandbox for this toolkit.") }
  try { Assert-DwollaSandbox } catch { [void]$issues.Add($_.Exception.Message) }
  if (-not $config.KeyPresent) { [void]$issues.Add("DWOLLA_KEY is missing.") }
  if (-not $config.SecretPresent) { [void]$issues.Add("DWOLLA_SECRET is missing.") }
  if (-not $config.WebhookSecretPresent) { [void]$issues.Add("DWOLLA_WEBHOOK_SECRET is missing.") }
  if ([string]::IsNullOrWhiteSpace($config.WebhookUrl)) { [void]$issues.Add("DWOLLA_WEBHOOK_URL is missing.") }
  if (($config.DocumentUploadsEnabled) -and ($config.DocumentUploadsEnabled.Trim().ToLowerInvariant() -ne "false")) {
    [void]$issues.Add("DWOLLA_DOCUMENT_UPLOADS_ENABLED must remain false until persistent private storage is verified.")
  }
  if ($config.ViteApiBaseUrl -and -not [string]::IsNullOrWhiteSpace($config.ViteApiBaseUrl)) {
    [void]$issues.Add("VITE_API_BASE_URL should usually be unset or empty for same-origin production.")
  }

  $result = [pscustomobject]@{
    Ok = ($issues.Count -eq 0)
    Environment = $config.Environment
    ApiUrl = $config.ApiUrl
    KeyPresent = $config.KeyPresent
    SecretPresent = $config.SecretPresent
    WebhookSecretPresent = $config.WebhookSecretPresent
    WebhookUrlPresent = -not [string]::IsNullOrWhiteSpace($config.WebhookUrl)
    DocumentUploadsEnabled = $config.DocumentUploadsEnabled
    SensitiveConfigEncryptionKeyPresent = $config.SensitiveConfigEncryptionKeyPresent
    Issues = @($issues)
  }

  if ($ThrowOnError -and -not $result.Ok) {
    throw ("Dwolla configuration is not ready: " + ($issues -join "; "))
  }
  return $result
}

function Get-DwollaTokenStatus {
  [pscustomobject]@{
    Obtained = -not [string]::IsNullOrWhiteSpace($script:DwollaState.AccessToken)
    TokenType = $script:DwollaState.TokenType
    ExpiresAt = $script:DwollaState.TokenExpiresAt
    MaskedSuffix = $script:DwollaState.TokenSuffix
  }
}

function Invoke-DwollaTokenRequest {
  Assert-DwollaSandbox
  $key = Get-DwollaEnvironmentValue "DWOLLA_KEY"
  $secret = Get-DwollaEnvironmentValue "DWOLLA_SECRET"
  if ([string]::IsNullOrWhiteSpace($key) -or [string]::IsNullOrWhiteSpace($secret)) {
    throw "DWOLLA_KEY and DWOLLA_SECRET are required to obtain a Dwolla sandbox access token."
  }
  $config = Get-DwollaConfig
  $body = "client_id=$([Uri]::EscapeDataString($key))&client_secret=$([Uri]::EscapeDataString($secret))&grant_type=client_credentials"
  try {
    $response = Invoke-WebRequest -Method Post -Uri $config.TokenUrl -Body $body -ContentType "application/x-www-form-urlencoded" -UseBasicParsing
    $payload = $response.Content | ConvertFrom-Json
    if (-not $payload.access_token) { throw "Dwolla token response did not include an access token." }
    $expiresIn = 3600
    if ($payload.expires_in) { $expiresIn = [int]$payload.expires_in }
    $script:DwollaState.AccessToken = [string]$payload.access_token
    $script:DwollaState.TokenType = [string]$payload.token_type
    $script:DwollaState.TokenExpiresAt = (Get-Date).ToUniversalTime().AddSeconds([Math]::Max(60, $expiresIn))
    $token = [string]$payload.access_token
    if ($token.Length -ge 6) {
      $script:DwollaState.TokenSuffix = "***" + $token.Substring($token.Length - 6)
    } else {
      $script:DwollaState.TokenSuffix = "***"
    }
    return $script:DwollaState.AccessToken
  } catch {
    $message = Protect-DwollaSensitiveText $_.Exception.Message
    throw "Dwolla OAuth token request failed: $message"
  }
}

function Get-DwollaBearerToken {
  param([switch]$ForceRefresh)
  if (-not $ForceRefresh -and $script:DwollaState.AccessToken -and $script:DwollaState.TokenExpiresAt) {
    if ((Get-Date).ToUniversalTime().AddSeconds(60) -lt $script:DwollaState.TokenExpiresAt) {
      return $script:DwollaState.AccessToken
    }
  }
  return Invoke-DwollaTokenRequest
}

function Get-DwollaAccessToken {
  [CmdletBinding()]
  param([switch]$Refresh)
  [void](Get-DwollaBearerToken -ForceRefresh:$Refresh)
  return Get-DwollaTokenStatus
}

function Join-DwollaQuery {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [hashtable]$Query
  )
  if ($null -eq $Query -or $Query.Count -eq 0) { return $Path }
  $pairs = @()
  foreach ($key in $Query.Keys) {
    $value = $Query[$key]
    if ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
      $pairs += "$([Uri]::EscapeDataString([string]$key))=$([Uri]::EscapeDataString([string]$value))"
    }
  }
  if ($pairs.Count -eq 0) { return $Path }
  if ($Path.Contains("?")) { return "$Path&$($pairs -join '&')" }
  return "$Path?$($pairs -join '&')"
}

function Resolve-DwollaUri {
  param([Parameter(Mandatory = $true)][string]$Path)
  $config = Get-DwollaConfig
  if ($Path -match '^https://') {
    Assert-DwollaSandboxUrl -Url $Path
    return $Path
  }
  if ($Path -eq "/") { return $config.ApiUrl }
  return "$($config.ApiUrl)/$($Path.TrimStart('/'))"
}

function Get-DwollaHeaderValue {
  param(
    [Parameter(Mandatory = $true)]$Headers,
    [Parameter(Mandatory = $true)][string]$Name
  )
  if ($null -eq $Headers) { return $null }
  foreach ($key in $Headers.Keys) {
    if ([string]::Equals([string]$key, $Name, [System.StringComparison]::OrdinalIgnoreCase)) {
      $value = $Headers[$key]
      if ($value -is [array]) { return ($value -join ",") }
      return [string]$value
    }
  }
  return $null
}

function ConvertFrom-DwollaResponseBody {
  param([AllowNull()][string]$Content)
  if ([string]::IsNullOrWhiteSpace($Content)) { return $null }
  try { return ($Content | ConvertFrom-Json) } catch { return $Content }
}

function New-DwollaHttpResult {
  param($Response)
  $location = Get-DwollaHeaderValue -Headers $Response.Headers -Name "Location"
  $requestId = Get-DwollaHeaderValue -Headers $Response.Headers -Name "X-Request-Id"
  if (-not $requestId) { $requestId = Get-DwollaHeaderValue -Headers $Response.Headers -Name "Dwolla-Correlation-Id" }
  [pscustomobject]@{
    StatusCode = [int]$Response.StatusCode
    Location = $location
    RequestId = $requestId
    Body = ConvertFrom-DwollaResponseBody -Content $Response.Content
    RawBody = $Response.Content
  }
}

function New-DwollaSanitizedException {
  param(
    [Parameter(Mandatory = $true)][string]$Message,
    [AllowNull()][object]$StatusCode
  )
  $ex = New-Object System.Exception (Protect-DwollaSensitiveText $Message)
  if ($null -ne $StatusCode) { $ex.Data["StatusCode"] = [int]$StatusCode }
  return $ex
}

function Get-DwollaExceptionResponse {
  param([AllowNull()][object]$ErrorObject)

  if ($null -eq $ErrorObject) { return $null }

  $exception = $null
  if ($ErrorObject -is [System.Management.Automation.ErrorRecord]) {
    $exception = $ErrorObject.Exception
  } elseif ($ErrorObject -is [System.Exception]) {
    $exception = $ErrorObject
  } else {
    $exceptionProperty = $ErrorObject.PSObject.Properties["Exception"]
    if ($null -ne $exceptionProperty) { $exception = $exceptionProperty.Value }
  }

  while ($null -ne $exception) {
    $responseProperty = $exception.PSObject.Properties["Response"]
    if ($null -ne $responseProperty -and $null -ne $responseProperty.Value) {
      return $responseProperty.Value
    }
    $exception = $exception.InnerException
  }

  return $null
}

function Get-DwollaErrorStatusCode {
  param([AllowNull()][object]$ErrorObject)

  $response = Get-DwollaExceptionResponse -ErrorObject $ErrorObject
  if ($null -eq $response) { return $null }

  $statusProperty = $response.PSObject.Properties["StatusCode"]
  if ($null -eq $statusProperty -or $null -eq $statusProperty.Value) { return $null }

  $statusCode = $statusProperty.Value
  try { return [int]$statusCode } catch {}

  $valueProperty = $statusCode.PSObject.Properties["value__"]
  if ($null -ne $valueProperty -and $null -ne $valueProperty.Value) {
    try { return [int]$valueProperty.Value } catch {}
  }

  return $null
}

function Get-DwollaErrorResponseText {
  param([AllowNull()][object]$ErrorObject)

  $response = Get-DwollaExceptionResponse -ErrorObject $ErrorObject
  if ($null -eq $response) { return $null }

  try {
    $contentProperty = $response.PSObject.Properties["Content"]
    if ($null -ne $contentProperty -and $null -ne $contentProperty.Value) {
      $content = $contentProperty.Value
      if ($content -is [string]) { return $content }
      $readMethod = $content.PSObject.Methods["ReadAsStringAsync"]
      if ($null -ne $readMethod) {
        $task = $content.ReadAsStringAsync()
        $awaiterMethod = $task.PSObject.Methods["GetAwaiter"]
        if ($null -ne $awaiterMethod) {
          return $task.GetAwaiter().GetResult()
        }
        return $task.Result
      }
    }
  } catch {}

  try {
    $streamMethod = $response.PSObject.Methods["GetResponseStream"]
    if ($null -ne $streamMethod) {
      $stream = $response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        return $reader.ReadToEnd()
      }
    }
  } catch {}

  return $null
}

function Invoke-DwollaWebRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [hashtable]$Headers,
    [AllowNull()][string]$Body,
    [AllowNull()][string]$ContentType
  )

  try {
    if (-not [string]::IsNullOrEmpty($Body)) {
      if (-not [string]::IsNullOrWhiteSpace($ContentType)) {
        return Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -Body $Body -ContentType $ContentType -UseBasicParsing
      }
      return Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -Body $Body -UseBasicParsing
    }
    return Invoke-WebRequest -Method $Method -Uri $Uri -Headers $Headers -UseBasicParsing
  } catch {
    $statusCode = Get-DwollaErrorStatusCode -ErrorObject $_
    $responseText = Get-DwollaErrorResponseText -ErrorObject $_
    $message = $_.Exception.Message
    if ($responseText) { $message = "$message $responseText" }
    throw (New-DwollaSanitizedException -Message $message -StatusCode $statusCode)
  }
}

function Invoke-DwollaApi {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "DELETE", "PATCH")][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [AllowNull()][object]$Body,
    [switch]$NoRetry
  )

  Assert-DwollaSandbox
  $uri = Resolve-DwollaUri -Path $Path
  $token = Get-DwollaBearerToken
  $headers = @{
    Accept = "application/vnd.dwolla.v1.hal+json"
    Authorization = "Bearer $token"
  }
  $jsonBody = $null
  $contentType = $null
  if ($null -ne $Body) {
    $jsonBody = $Body | ConvertTo-Json -Depth 12 -Compress
    $contentType = "application/vnd.dwolla.v1.hal+json"
  }

  try {
    $response = Invoke-DwollaWebRequest -Method $Method -Uri $uri -Headers $headers -Body $jsonBody -ContentType $contentType
    return New-DwollaHttpResult -Response $response
  } catch {
    $statusCode = $_.Exception.Data["StatusCode"]
    if (-not $NoRetry -and $statusCode -eq 401) {
      Reset-DwollaToolkitState
      [void](Import-DwollaEnvironment)
      return Invoke-DwollaApi -Method $Method -Path $Path -Body $Body -NoRetry
    }
    throw $_
  }
}

function Get-DwollaApiRoot {
  Invoke-DwollaApi -Method GET -Path "/"
}

function Get-DwollaAccount {
  [CmdletBinding()]
  param([string]$AccountUrl)
  if ([string]::IsNullOrWhiteSpace($AccountUrl)) {
    $root = Get-DwollaApiRoot
    $AccountUrl = $root.Body._links.account.href
  }
  if ([string]::IsNullOrWhiteSpace($AccountUrl)) { throw "Dwolla API root did not expose an account link." }
  Invoke-DwollaApi -Method GET -Path $AccountUrl
}

function Get-DwollaCustomers {
  [CmdletBinding()]
  param(
    [int]$Limit,
    [int]$Offset,
    [string]$Search,
    [string]$Email
  )
  $query = @{}
  if ($Limit) { $query.limit = $Limit }
  if ($Offset) { $query.offset = $Offset }
  if ($Search) { $query.search = $Search }
  if ($Email) { $query.email = $Email }
  Invoke-DwollaApi -Method GET -Path (Join-DwollaQuery -Path "/customers" -Query $query)
}

function Get-DwollaCustomer {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$CustomerIdOrUrl)
  if ($CustomerIdOrUrl -match '^https://') {
    Invoke-DwollaApi -Method GET -Path $CustomerIdOrUrl
  } else {
    Invoke-DwollaApi -Method GET -Path "/customers/$CustomerIdOrUrl"
  }
}

function Get-DwollaFundingSources {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$CustomerIdOrUrl)
  if ($CustomerIdOrUrl -match '^https://') {
    Invoke-DwollaApi -Method GET -Path "$($CustomerIdOrUrl.TrimEnd('/'))/funding-sources"
  } else {
    Invoke-DwollaApi -Method GET -Path "/customers/$CustomerIdOrUrl/funding-sources"
  }
}

function Get-DwollaFundingSource {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$FundingSourceIdOrUrl)
  if ($FundingSourceIdOrUrl -match '^https://') {
    Invoke-DwollaApi -Method GET -Path $FundingSourceIdOrUrl
  } else {
    Invoke-DwollaApi -Method GET -Path "/funding-sources/$FundingSourceIdOrUrl"
  }
}

function Get-DwollaWebhookSubscriptions {
  Invoke-DwollaApi -Method GET -Path "/webhook-subscriptions"
}

function Get-DwollaWebhookSubscription {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$SubscriptionIdOrUrl)
  if ($SubscriptionIdOrUrl -match '^https://') {
    Invoke-DwollaApi -Method GET -Path $SubscriptionIdOrUrl
  } else {
    Assert-DwollaGuid -Value $SubscriptionIdOrUrl -Name "SubscriptionId"
    Invoke-DwollaApi -Method GET -Path "/webhook-subscriptions/$SubscriptionIdOrUrl"
  }
}

function Get-DwollaEmbeddedItems {
  param($Body, [Parameter(Mandatory = $true)][string[]]$Names)
  if ($null -eq $Body) { return @() }
  $embeddedProperty = $Body.PSObject.Properties["_embedded"]
  if ($null -eq $embeddedProperty) { return @() }
  $embedded = $embeddedProperty.Value
  if ($null -eq $embedded) { return @() }
  foreach ($name in $Names) {
    $property = $embedded.PSObject.Properties[$name]
    if ($null -eq $property) { continue }
    $items = $property.Value
    if ($items) { return @($items) }
  }
  return @()
}

function Get-DwollaResourceId {
  param([AllowNull()][string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return $null }
  return (($Url.TrimEnd("/") -split "/")[-1])
}

function New-DwollaWebhookSubscription {
  [CmdletBinding()]
  param(
    [string]$Url,
    [switch]$Force
  )

  Assert-DwollaSandbox
  $config = Get-DwollaConfig
  if ([string]::IsNullOrWhiteSpace($Url)) { $Url = $config.WebhookUrl }
  if ([string]::IsNullOrWhiteSpace($Url)) { throw "DWOLLA_WEBHOOK_URL is required." }
  if (-not $config.WebhookSecretPresent) { throw "DWOLLA_WEBHOOK_SECRET is required to create a webhook subscription." }

  $existing = Get-DwollaWebhookSubscriptions
  $subscriptions = Get-DwollaEmbeddedItems -Body $existing.Body -Names @("webhook-subscriptions", "webhookSubscriptions")
  foreach ($subscription in $subscriptions) {
    if ($subscription.url -eq $Url -and -not $Force) {
      $href = $subscription._links.self.href
      return [pscustomobject]@{
        Created = $false
        SubscriptionId = Get-DwollaResourceId -Url $href
        SubscriptionUrl = $Url
        Paused = $subscription.paused
        ResourceUrl = $href
        Message = "Matching webhook subscription already exists; no duplicate created."
      }
    }
  }

  $response = Invoke-DwollaApi -Method POST -Path "/webhook-subscriptions" -Body @{
    url = $Url
    secret = (Get-DwollaEnvironmentValue "DWOLLA_WEBHOOK_SECRET")
  }
  if ($response.StatusCode -ne 201 -and $response.StatusCode -ne 200) {
    throw "Dwolla webhook subscription create returned HTTP $($response.StatusCode)."
  }
  if ([string]::IsNullOrWhiteSpace($response.Location)) {
    throw "Dwolla webhook subscription create did not return a Location header."
  }
  $created = Get-DwollaWebhookSubscription -SubscriptionIdOrUrl $response.Location
  return [pscustomobject]@{
    Created = $true
    SubscriptionId = Get-DwollaResourceId -Url $response.Location
    SubscriptionUrl = $created.Body.url
    Paused = $created.Body.paused
    ResourceUrl = $response.Location
    Message = "Webhook subscription created."
  }
}

function Remove-DwollaWebhookSubscription {
  [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
  param([Parameter(Mandatory = $true)][string]$SubscriptionId)
  Assert-DwollaSandbox
  Assert-DwollaGuid -Value $SubscriptionId -Name "SubscriptionId"
  if ($PSCmdlet.ShouldProcess($SubscriptionId, "Delete Dwolla sandbox webhook subscription")) {
    Invoke-DwollaApi -Method DELETE -Path "/webhook-subscriptions/$SubscriptionId"
  }
}

function Get-DwollaWebhookRetries {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$WebhookId)
  Assert-DwollaGuid -Value $WebhookId -Name "WebhookId"
  Invoke-DwollaApi -Method GET -Path "/webhooks/$WebhookId/retries"
}

function Retry-DwollaWebhook {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$WebhookId)
  Assert-DwollaSandbox
  Assert-DwollaGuid -Value $WebhookId -Name "WebhookId"
  try {
    $response = Invoke-DwollaApi -Method POST -Path "/webhooks/$WebhookId/retries"
    return [pscustomobject]@{
      Ok = $true
      WebhookId = $WebhookId
      StatusCode = $response.StatusCode
      Location = $response.Location
      Message = "Webhook retry requested."
    }
  } catch {
    $statusCode = $_.Exception.Data["StatusCode"]
    $hint = switch ($statusCode) {
      401 { "OAuth token is missing, expired, or invalid." }
      403 { "Dwolla credentials do not have permission to retry this webhook." }
      404 { "Webhook ID was not found in this sandbox account." }
      409 { "Dwolla rejected the retry because the webhook state does not allow retry." }
      default { "Review the sanitized Dwolla error and the webhook ID." }
    }
    throw (New-DwollaSanitizedException -Message ("Retry-DwollaWebhook failed. $hint " + $_.Exception.Message) -StatusCode $statusCode)
  }
}

function Get-DwollaEvents {
  [CmdletBinding()]
  param(
    [int]$Limit,
    [int]$Offset
  )
  $query = @{}
  if ($Limit) { $query.limit = $Limit }
  if ($Offset) { $query.offset = $Offset }
  Invoke-DwollaApi -Method GET -Path (Join-DwollaQuery -Path "/events" -Query $query)
}

function Get-DwollaEvent {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$EventIdOrUrl)
  if ($EventIdOrUrl -match '^https://') {
    Invoke-DwollaApi -Method GET -Path $EventIdOrUrl
  } else {
    Assert-DwollaGuid -Value $EventIdOrUrl -Name "EventId"
    Invoke-DwollaApi -Method GET -Path "/events/$EventIdOrUrl"
  }
}

function Test-DwollaWebhookEndpoint {
  [CmdletBinding()]
  param([string]$Url)
  $config = Get-DwollaConfig
  if ([string]::IsNullOrWhiteSpace($Url)) { $Url = $config.WebhookUrl }
  if ([string]::IsNullOrWhiteSpace($Url)) { throw "DWOLLA_WEBHOOK_URL is required to test the webhook endpoint." }

  try {
    $response = Invoke-WebRequest -Method POST -Uri $Url -ContentType "application/json" -Body "{}" -UseBasicParsing
    return [pscustomobject]@{
      Url = $Url
      StatusCode = [int]$response.StatusCode
      RejectsUnsignedWebhook = $false
      Message = "Endpoint accepted an unsigned webhook request; this is not expected."
    }
  } catch {
    $statusCode = Get-DwollaErrorStatusCode -ErrorObject $_
    return [pscustomobject]@{
      Url = $Url
      StatusCode = $statusCode
      RejectsUnsignedWebhook = ($statusCode -eq 401 -or $statusCode -eq 403)
      Message = "Endpoint rejected unsigned webhook request."
    }
  }
}

function New-DwollaSandboxCustomer {
  [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
  param(
    [Parameter(Mandatory = $true)][string]$FirstName,
    [Parameter(Mandatory = $true)][string]$LastName,
    [Parameter(Mandatory = $true)][string]$Email,
    [Parameter(Mandatory = $true)][string]$Address1,
    [Parameter(Mandatory = $true)][string]$City,
    [Parameter(Mandatory = $true)][string]$State,
    [Parameter(Mandatory = $true)][string]$PostalCode,
    [Parameter(Mandatory = $true)][string]$DateOfBirth,
    [Parameter(Mandatory = $true)][string]$Last4Ssn,
    [string]$Address2,
    [string]$CorrelationId,
    [switch]$FictionalDataOnly
  )
  Assert-DwollaSandbox
  if (-not $FictionalDataOnly) { throw "New-DwollaSandboxCustomer requires -FictionalDataOnly." }
  if ($Last4Ssn -notmatch '^\d{4}$') { throw "Last4Ssn must contain exactly four digits." }

  $body = @{
    firstName = $FirstName
    lastName = $LastName
    email = $Email
    type = "personal"
    address1 = $Address1
    city = $City
    state = $State
    postalCode = $PostalCode
    dateOfBirth = $DateOfBirth
    ssn = $Last4Ssn
  }
  if ($Address2) { $body.address2 = $Address2 }
  if ($CorrelationId) { $body.correlationId = $CorrelationId }

  if ($PSCmdlet.ShouldProcess($Email, "Create fictional Dwolla sandbox customer")) {
    Invoke-DwollaApi -Method POST -Path "/customers" -Body $body
  }
}

function Get-DwollaTransfer {
  [CmdletBinding()]
  param([Parameter(Mandatory = $true)][string]$TransferIdOrUrl)
  if ($TransferIdOrUrl -match '^https://') {
    Invoke-DwollaApi -Method GET -Path $TransferIdOrUrl
  } else {
    Assert-DwollaGuid -Value $TransferIdOrUrl -Name "TransferId"
    Invoke-DwollaApi -Method GET -Path "/transfers/$TransferIdOrUrl"
  }
}

function New-DwollaSandboxTransferPreview {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][string]$SourceFundingSourceUrl,
    [Parameter(Mandatory = $true)][string]$DestinationFundingSourceUrl,
    [Parameter(Mandatory = $true)][decimal]$Amount,
    [string]$Currency = "USD",
    [decimal]$MaxAmount = 5000.00,
    [string]$CorrelationId
  )
  Assert-DwollaSandboxUrl -Url $SourceFundingSourceUrl
  Assert-DwollaSandboxUrl -Url $DestinationFundingSourceUrl
  if ($Amount -le 0) { throw "Amount must be greater than zero." }
  if ($Amount -gt $MaxAmount) { throw "Amount exceeds sandbox preview ceiling of $MaxAmount." }
  if ($Currency -ne "USD") { throw "Only USD sandbox preview payloads are supported." }

  $body = @{
    _links = @{
      source = @{ href = $SourceFundingSourceUrl }
      destination = @{ href = $DestinationFundingSourceUrl }
    }
    amount = @{
      currency = $Currency
      value = ("{0:0.00}" -f $Amount)
    }
  }
  if ($CorrelationId) { $body.correlationId = $CorrelationId }

  return [pscustomobject]@{
    Execute = $false
    SandboxOnly = $true
    Method = "POST"
    Url = "$(Get-DwollaDefaultApiUrl -Environment 'sandbox')/transfers"
    Body = $body
    Message = "Preview only. No Dwolla transfer was executed."
  }
}
