# Open-Source Stack

## Purpose
Document the open-source-first operating posture for Infinite Arcadia / Credit-Eoscar.

## Scope
Application code, infrastructure, automation, documentation, and development workflow.

## Owner
Engineering Agent.

## Human Review Required
License exceptions, proprietary integrations, regulated workflows, and production dependency changes.

## Security Notes
Open source does not remove the need for secret management, dependency review, and access control.

## Audit Requirements
Material dependency and license changes should be logged in release notes.

## Related Routes
`/health`, `/ready`, `/status/infrastructure`.

## Related Database Tables
None.

## Go/No-Go Criteria
Build passes, licenses reviewed, secrets absent, and production blockers documented.

## Stack Overview
- React, Vite, TypeScript
- Node.js, Express
- PostgreSQL, Drizzle ORM
- Docker, Docker Compose
- Cloudflare DNS/Pages/Workers, Render/Vercel options, Neon PostgreSQL option
- OpenAI-compatible or local AI provider through environment configuration
