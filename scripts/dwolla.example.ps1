# Placeholder-only Dwolla sandbox environment example.
# Do not put real credentials in this committed file.

$env:DWOLLA_ENV = "sandbox"
$env:DWOLLA_API_URL = "https://api-sandbox.dwolla.com"
$env:DWOLLA_KEY = "REPLACE_WITH_DWOLLA_SANDBOX_KEY"
$env:DWOLLA_SECRET = "REPLACE_WITH_DWOLLA_SANDBOX_SECRET"
$env:DWOLLA_WEBHOOK_SECRET = "REPLACE_WITH_RANDOM_SANDBOX_WEBHOOK_SECRET"
$env:DWOLLA_WEBHOOK_URL = "https://www.infinitearcadia.com/api/dwolla/webhooks"
$env:DWOLLA_DOCUMENT_UPLOADS_ENABLED = "false"
$env:DWOLLA_DOCUMENT_MAX_BYTES = "10485760"

