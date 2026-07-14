$ErrorActionPreference = "Stop"

. "$PSScriptRoot\..\dwolla.ps1"

function Set-TestDwollaEnvironment {
  $env:DWOLLA_ENV = "sandbox"
  $env:DWOLLA_API_URL = "https://api-sandbox.dwolla.com"
  $env:DWOLLA_KEY = "REPLACE_WITH_TEST_KEY"
  $env:DWOLLA_SECRET = "REPLACE_WITH_TEST_SECRET"
  $env:DWOLLA_WEBHOOK_SECRET = "REPLACE_WITH_TEST_WEBHOOK_SECRET"
  $env:DWOLLA_WEBHOOK_URL = "https://www.infinitearcadia.com/api/dwolla/webhooks"
  $env:DWOLLA_DOCUMENT_UPLOADS_ENABLED = "false"
  $env:VITE_API_BASE_URL = ""
  Reset-DwollaToolkitState
}

function Clear-TestDwollaEnvironment {
  "DWOLLA_ENV","DWOLLA_API_URL","DWOLLA_KEY","DWOLLA_SECRET","DWOLLA_WEBHOOK_SECRET","DWOLLA_WEBHOOK_URL","DWOLLA_DOCUMENT_UPLOADS_ENABLED","VITE_API_BASE_URL" | ForEach-Object {
    Remove-Item "Env:\$_" -ErrorAction SilentlyContinue
  }
  Reset-DwollaToolkitState
}

function New-TestResponse {
  param(
    [int]$StatusCode = 200,
    [AllowNull()][object]$Content = "{}",
    [hashtable]$Headers = @{}
  )
  [pscustomobject]@{
    StatusCode = $StatusCode
    Content = $Content
    Headers = $Headers
  }
}

function Test-Throws {
  param([scriptblock]$ScriptBlock)
  $threw = $false
  try {
    & $ScriptBlock
  } catch {
    $threw = $true
  }
  return $threw
}

Describe "Dwolla PowerShell toolkit" {
  BeforeEach {
    Set-TestDwollaEnvironment
  }

  AfterEach {
    Clear-TestDwollaEnvironment
  }

  It "reports missing required variables" {
    Remove-Item Env:\DWOLLA_KEY -ErrorAction SilentlyContinue
    $result = Test-DwollaConfiguration
    $result.Ok | Should Be $false
    ($result.Issues -join ";") | Should Match "DWOLLA_KEY"
  }

  It "rejects production mode" {
    $env:DWOLLA_ENV = "production"
    $env:DWOLLA_API_URL = "https://api.dwolla.com"
    Test-Throws { Test-DwollaConfiguration -ThrowOnError } | Should Be $true
  }

  It "rejects production API URLs" {
    $env:DWOLLA_API_URL = "https://api.dwolla.com"
    Test-Throws { Assert-DwollaSandbox } | Should Be $true
  }

  It "constructs the OAuth request without exposing credentials" {
    $script:tokenUri = $null
    $script:tokenBody = $null
    Mock Invoke-WebRequest {
      $script:tokenUri = $Uri
      $script:tokenBody = $Body
      return New-TestResponse -Content '{"access_token":"sandbox-token-abcdef","expires_in":3600,"token_type":"bearer"}'
    }
    $status = Get-DwollaAccessToken
    $status.Obtained | Should Be $true
    $status.MaskedSuffix | Should Be "***abcdef"
    $script:tokenUri | Should Be "https://api-sandbox.dwolla.com/token"
    $script:tokenBody | Should Match "grant_type=client_credentials"
    $script:tokenBody | Should Match "client_id="
    $script:tokenBody | Should Match ("client_" + "secret=")
    Assert-MockCalled Invoke-WebRequest -Times 1
  }

  It "caches the OAuth token in memory" {
    $script:tokenCalls = 0
    Mock Invoke-WebRequest {
      $script:tokenCalls++
      return New-TestResponse -Content '{"access_token":"sandbox-token-cache","expires_in":3600,"token_type":"bearer"}'
    }
    [void](Get-DwollaAccessToken)
    [void](Get-DwollaAccessToken)
    $script:tokenCalls | Should Be 1
  }

  It "refreshes the OAuth token when requested" {
    $script:tokenCalls = 0
    Mock Invoke-WebRequest {
      $script:tokenCalls++
      return New-TestResponse -Content ('{"access_token":"sandbox-token-refresh-' + $script:tokenCalls + '","expires_in":3600,"token_type":"bearer"}')
    }
    [void](Get-DwollaAccessToken)
    [void](Get-DwollaAccessToken -Refresh)
    $script:tokenCalls | Should Be 2
  }

  It "serializes webhook subscription payload and extracts Location" {
    $script:webhookPostBody = $null
    Mock Invoke-WebRequest {
      if ($Uri -match "/token$") {
        return New-TestResponse -Content '{"access_token":"sandbox-token-abcdef","expires_in":3600,"token_type":"bearer"}'
      }
      if ($Method -eq "GET" -and $Uri -match "/webhook-subscriptions$") {
        return New-TestResponse -Content '{"_embedded":{"webhook-subscriptions":[]}}'
      }
      if ($Method -eq "POST" -and $Uri -match "/webhook-subscriptions$") {
        $script:webhookPostBody = $Body
        return New-TestResponse -StatusCode 201 -Content "" -Headers @{ Location = "https://api-sandbox.dwolla.com/webhook-subscriptions/11111111-1111-1111-1111-111111111111" }
      }
      if ($Method -eq "GET" -and $Uri -match "11111111-1111-1111-1111-111111111111$") {
        return New-TestResponse -Content '{"id":"11111111-1111-1111-1111-111111111111","url":"https://www.infinitearcadia.com/api/dwolla/webhooks","paused":false}'
      }
      throw "Unexpected URI $Uri"
    }
    $result = New-DwollaWebhookSubscription
    $result.Created | Should Be $true
    $result.Paused | Should Be $false
    $script:webhookPostBody | Should Match "https://www.infinitearcadia.com/api/dwolla/webhooks"
  }

  It "prevents duplicate webhook subscriptions" {
    Mock Invoke-WebRequest {
      if ($Uri -match "/token$") {
        return New-TestResponse -Content '{"access_token":"sandbox-token-abcdef","expires_in":3600,"token_type":"bearer"}'
      }
      return New-TestResponse -Content '{"_embedded":{"webhook-subscriptions":[{"url":"https://www.infinitearcadia.com/api/dwolla/webhooks","paused":false,"_links":{"self":{"href":"https://api-sandbox.dwolla.com/webhook-subscriptions/22222222-2222-2222-2222-222222222222"}}}]}}'
    }
    $result = New-DwollaWebhookSubscription
    $result.Created | Should Be $false
    Assert-MockCalled Invoke-WebRequest -Times 2
  }

  It "builds webhook retry URL and rejects invalid webhook IDs" {
    Test-Throws { Retry-DwollaWebhook -WebhookId "not-a-guid" } | Should Be $true
    $script:retryMethod = $null
    $script:retryUri = $null
    Mock Invoke-WebRequest {
      if ($Uri -match "/token$") {
        return New-TestResponse -Content '{"access_token":"sandbox-token-abcdef","expires_in":3600,"token_type":"bearer"}'
      }
      $script:retryMethod = $Method
      $script:retryUri = $Uri
      return New-TestResponse -StatusCode 201 -Content "" -Headers @{ Location = "https://api-sandbox.dwolla.com/webhooks/33333333-3333-3333-3333-333333333333/retries/1" }
    }
    $result = Retry-DwollaWebhook -WebhookId "33333333-3333-3333-3333-333333333333"
    $result.Ok | Should Be $true
    $script:retryMethod | Should Be "POST"
    $script:retryUri | Should Be "https://api-sandbox.dwolla.com/webhooks/33333333-3333-3333-3333-333333333333/retries"
  }

  It "handles empty 201 responses with Location headers" {
    Mock Invoke-WebRequest {
      if ($Uri -match "/token$") {
        return New-TestResponse -Content '{"access_token":"sandbox-token-abcdef","expires_in":3600,"token_type":"bearer"}'
      }
      return New-TestResponse -StatusCode 201 -Content "" -Headers @{ Location = "https://api-sandbox.dwolla.com/example/location" }
    }
    $result = Invoke-DwollaApi -Method POST -Path "/example" -Body @{ test = "ok" }
    $result.StatusCode | Should Be 201
    $result.Location | Should Be "https://api-sandbox.dwolla.com/example/location"
    $result.Body | Should Be $null
  }

  It "decodes UTF-8 byte array HAL JSON response bodies" {
    $json = '{"_links":{"account":{"href":"https://api-sandbox.dwolla.com/accounts/44444444-4444-4444-4444-444444444444"}}}'
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $result = New-DwollaHttpResult -Response (New-TestResponse -Content $bytes)

    $result.RawBody | Should Be $json
    $result.Body._links.account.href | Should Be "https://api-sandbox.dwolla.com/accounts/44444444-4444-4444-4444-444444444444"
  }

  It "trims UTF-8 BOM from byte array JSON response bodies" {
    $json = '{"status":"bom"}'
    $bytes = [byte[]](@(0xEF, 0xBB, 0xBF) + [System.Text.Encoding]::UTF8.GetBytes($json))
    $result = New-DwollaHttpResult -Response (New-TestResponse -Content $bytes)

    $result.RawBody | Should Be $json
    $result.Body.status | Should Be "bom"
  }

  It "parses char array JSON response bodies" {
    $chars = [char[]]'{"status":"chars"}'
    $result = New-DwollaHttpResult -Response (New-TestResponse -Content $chars)

    $result.RawBody | Should Be '{"status":"chars"}'
    $result.Body.status | Should Be "chars"
  }

  It "parses string JSON response bodies" {
    $result = New-DwollaHttpResult -Response (New-TestResponse -Content '{"status":"ok"}')

    $result.RawBody | Should Be '{"status":"ok"}'
    $result.Body.status | Should Be "ok"
  }

  It "treats empty byte array response bodies as null" {
    $emptyBytes = New-Object byte[] 0
    $result = New-DwollaHttpResult -Response (New-TestResponse -Content $emptyBytes)

    $result.RawBody | Should Be $null
    $result.Body | Should Be $null
  }

  It "returns decoded raw text for non-JSON byte array response bodies" {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("not json")
    $result = New-DwollaHttpResult -Response (New-TestResponse -Content $bytes)

    $result.RawBody | Should Be "not json"
    $result.Body | Should Be "not json"
  }

  It "returns already-parsed response bodies unchanged" {
    $parsed = [pscustomobject]@{ status = "parsed"; ok = $true }
    $body = ConvertFrom-DwollaResponseBody -Content $parsed
    $result = New-DwollaHttpResult -Response (New-TestResponse -Content $parsed)

    $body.status | Should Be "parsed"
    $body.ok | Should Be $true
    $result.Body.status | Should Be "parsed"
    $result.Body.ok | Should Be $true
    $result.RawBody | Should Match '"status":"parsed"'
  }

  It "omits body and content type for GET requests with null ContentType" {
    $script:requestParameters = $null

    try {
      function Invoke-WebRequest {
        param(
          [string]$Method,
          [string]$Uri,
          [hashtable]$Headers,
          [AllowNull()][string]$Body,
          [AllowNull()][string]$ContentType,
          [switch]$UseBasicParsing
        )
        $script:requestParameters = @{
          Method = $Method
          Body = $Body
          ContentType = $ContentType
          HasBody = $PSBoundParameters.ContainsKey("Body")
          HasContentType = $PSBoundParameters.ContainsKey("ContentType")
        }
        return New-TestResponse -Content "{}"
      }

      [void](Invoke-DwollaWebRequest -Method GET -Uri "https://api-sandbox.dwolla.com/customers" -Headers @{} -Body $null -ContentType $null)
    } finally {
      Remove-Item Function:\Invoke-WebRequest -ErrorAction SilentlyContinue
    }

    $script:requestParameters.Method | Should Be "GET"
    $script:requestParameters.HasBody | Should Be $false
    $script:requestParameters.HasContentType | Should Be $false
  }

  It "omits body and content type for GET requests with empty ContentType" {
    $script:requestParameters = $null

    try {
      function Invoke-WebRequest {
        param(
          [string]$Method,
          [string]$Uri,
          [hashtable]$Headers,
          [AllowNull()][string]$Body,
          [AllowNull()][string]$ContentType,
          [switch]$UseBasicParsing
        )
        $script:requestParameters = @{
          Method = $Method
          Body = $Body
          ContentType = $ContentType
          HasBody = $PSBoundParameters.ContainsKey("Body")
          HasContentType = $PSBoundParameters.ContainsKey("ContentType")
        }
        return New-TestResponse -Content "{}"
      }

      [void](Invoke-DwollaWebRequest -Method GET -Uri "https://api-sandbox.dwolla.com/customers" -Headers @{} -Body $null -ContentType "")
    } finally {
      Remove-Item Function:\Invoke-WebRequest -ErrorAction SilentlyContinue
    }

    $script:requestParameters.Method | Should Be "GET"
    $script:requestParameters.HasBody | Should Be $false
    $script:requestParameters.HasContentType | Should Be $false
  }

  It "keeps JSON content type for POST requests with a body" {
    $script:requestParameters = $null

    try {
      function Invoke-WebRequest {
        param(
          [string]$Method,
          [string]$Uri,
          [hashtable]$Headers,
          [AllowNull()][string]$Body,
          [AllowNull()][string]$ContentType,
          [switch]$UseBasicParsing
        )
        $script:requestParameters = @{
          Method = $Method
          Body = $Body
          ContentType = $ContentType
          HasBody = $PSBoundParameters.ContainsKey("Body")
          HasContentType = $PSBoundParameters.ContainsKey("ContentType")
        }
        return New-TestResponse -Content "{}"
      }

      [void](Invoke-DwollaWebRequest -Method POST -Uri "https://api-sandbox.dwolla.com/customers" -Headers @{} -Body '{"test":"ok"}' -ContentType "application/vnd.dwolla.v1.hal+json")
    } finally {
      Remove-Item Function:\Invoke-WebRequest -ErrorAction SilentlyContinue
    }

    $script:requestParameters.Method | Should Be "POST"
    $script:requestParameters.HasBody | Should Be $true
    $script:requestParameters.HasContentType | Should Be $true
    $script:requestParameters.Body | Should Be '{"test":"ok"}'
    $script:requestParameters.ContentType | Should Be "application/vnd.dwolla.v1.hal+json"
  }

  It "omits content type for requests with a body and no ContentType" {
    $script:requestParameters = $null

    try {
      function Invoke-WebRequest {
        param(
          [string]$Method,
          [string]$Uri,
          [hashtable]$Headers,
          [AllowNull()][string]$Body,
          [AllowNull()][string]$ContentType,
          [switch]$UseBasicParsing
        )
        $script:requestParameters = @{
          Method = $Method
          Body = $Body
          ContentType = $ContentType
          HasBody = $PSBoundParameters.ContainsKey("Body")
          HasContentType = $PSBoundParameters.ContainsKey("ContentType")
        }
        return New-TestResponse -Content "{}"
      }

      [void](Invoke-DwollaWebRequest -Method POST -Uri "https://api-sandbox.dwolla.com/customers" -Headers @{} -Body '{"test":"ok"}' -ContentType $null)
    } finally {
      Remove-Item Function:\Invoke-WebRequest -ErrorAction SilentlyContinue
    }

    $script:requestParameters.Method | Should Be "POST"
    $script:requestParameters.HasBody | Should Be $true
    $script:requestParameters.HasContentType | Should Be $false
    $script:requestParameters.Body | Should Be '{"test":"ok"}'
  }

  It "sanitizes generic exceptions that do not expose Response" {
    Mock Invoke-WebRequest {
      throw (New-Object System.Exception "plain network failure")
    }
    $caught = $false
    try {
      Invoke-DwollaWebRequest -Method GET -Uri "https://api-sandbox.dwolla.com/" -Headers @{} -Body $null -ContentType $null
    } catch {
      $caught = $true
      $_.Exception.Message | Should Match "plain network failure"
      $_.Exception.Message | Should Not Match "property 'Response'"
    }
    $caught | Should Be $true
  }

  It "endpoint probe handles generic exceptions that do not expose Response" {
    Mock Invoke-WebRequest {
      throw (New-Object System.Exception "connection refused")
    }
    $result = Test-DwollaWebhookEndpoint -Url "https://www.infinitearcadia.com/api/dwolla/webhooks"
    $result.StatusCode | Should Be $null
    $result.RejectsUnsignedWebhook | Should Be $false
    $result.Message | Should Match "Endpoint rejected unsigned webhook request"
  }

  It "verifies token, root, account, and webhook subscription commands with mocked API calls" {
    $script:seenUris = New-Object System.Collections.Generic.List[string]
    Mock Invoke-WebRequest {
      [void]$script:seenUris.Add([string]$Uri)
      if ($Uri -match "/token$") {
        return New-TestResponse -Content '{"access_token":"sandbox-token-abcdef","expires_in":3600,"token_type":"bearer"}'
      }
      if ($Method -eq "GET" -and $Uri -eq "https://api-sandbox.dwolla.com") {
        return New-TestResponse -Content '{"_links":{"account":{"href":"https://api-sandbox.dwolla.com/accounts/44444444-4444-4444-4444-444444444444"}}}'
      }
      if ($Method -eq "GET" -and $Uri -eq "https://api-sandbox.dwolla.com/accounts/44444444-4444-4444-4444-444444444444") {
        return New-TestResponse -Content '{"id":"44444444-4444-4444-4444-444444444444","name":"Sandbox Account"}'
      }
      if ($Method -eq "GET" -and $Uri -eq "https://api-sandbox.dwolla.com/webhook-subscriptions") {
        return New-TestResponse -Content '{"_embedded":{"webhook-subscriptions":[]}}'
      }
      throw "Unexpected URI $Uri"
    }

    (Get-DwollaAccessToken).Obtained | Should Be $true
    (Get-DwollaApiRoot).Body._links.account.href | Should Be "https://api-sandbox.dwolla.com/accounts/44444444-4444-4444-4444-444444444444"
    (Get-DwollaAccount).Body.id | Should Be "44444444-4444-4444-4444-444444444444"
    (Get-DwollaWebhookSubscriptions).Body._embedded."webhook-subscriptions".Count | Should Be 0
    $script:seenUris.Contains("https://api-sandbox.dwolla.com/token") | Should Be $true
    (($script:seenUris | Where-Object { $_ -match '^https://api-sandbox\.dwolla\.com/?$' }).Count -gt 0) | Should Be $true
    $script:seenUris.Contains("https://api-sandbox.dwolla.com/webhook-subscriptions") | Should Be $true
  }

  It "redacts secrets and authorization values" {
    $text = 'Authorization: Bearer abcdef123456 "client_secret":"test-secret" "ssn":"123-45-6789"'
    $safe = Protect-DwollaSensitiveText $text
    $safe | Should Not Match "abcdef123456"
    $safe | Should Not Match "test-secret"
    $safe | Should Not Match "123-45-6789"
  }

  It "builds transfer previews without execution" {
    $preview = New-DwollaSandboxTransferPreview `
      -SourceFundingSourceUrl "https://api-sandbox.dwolla.com/funding-sources/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" `
      -DestinationFundingSourceUrl "https://api-sandbox.dwolla.com/funding-sources/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" `
      -Amount 10.00
    $preview.Execute | Should Be $false
    $preview.Body.amount.value | Should Be "10.00"
  }

  It "rejects production URLs in transfer preview" {
    Test-Throws { New-DwollaSandboxTransferPreview `
      -SourceFundingSourceUrl "https://api.dwolla.com/funding-sources/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" `
      -DestinationFundingSourceUrl "https://api-sandbox.dwolla.com/funding-sources/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" `
      -Amount 10.00 } | Should Be $true
  }

  It "requires explicit fictional-data acknowledgement before creating sandbox customers" {
    Test-Throws { New-DwollaSandboxCustomer `
      -FirstName "Test" `
      -LastName "Customer" `
      -Email "test@example.test" `
      -Address1 "1 Test Way" `
      -City "Des Moines" `
      -State "IA" `
      -PostalCode "50309" `
      -DateOfBirth "1990-01-01" `
      -Last4Ssn "1234" `
      -Confirm:$false } | Should Be $true
  }
}
