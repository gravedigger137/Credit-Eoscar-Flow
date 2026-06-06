# DNS Plan

## Current Production

- `infinitearcadia.com` - current public parent/production site
- `www.infinitearcadia.com` - production alias if configured

Do not repoint current production records during staging preparation.

## Staging Domains

Recommended staging records:

- `staging.infinitearcadia.com` - optional parent staging shell
- `staging-app.infinitearcadia.com` - Credit-Eoscar staging app
- `staging-fintech.infinitearcadia.com` - BrandonFintech Web staging
- `staging-api-fintech.infinitearcadia.com` - BrandonFintech API staging
- `staging-ai.infinitearcadia.com` - Cloudflare Worker AI gateway staging

## Future Production Domains

- `app.infinitearcadia.com` - Credit-Eoscar production app
- `fintech.infinitearcadia.com` - BrandonFintech Web production
- `api.fintech.infinitearcadia.com` - BrandonFintech API production
- `ai.infinitearcadia.com` - production AI gateway

## Cloudflare Checklist

- Use proxied records where compatible with the host.
- Confirm TLS mode is Full Strict.
- Confirm staging and production records point to different services.
- Keep staging CORS allowlists separate from production.
- Use separate Stripe webhook endpoints per staging/production domain.
- Do not expose raw database, Ollama, or internal service hosts publicly unless explicitly tunneled and protected.

