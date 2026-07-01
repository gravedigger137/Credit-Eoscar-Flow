# API Reference

## Overview
Credit-Eoscar exposes JSON APIs under `/api/v1` and legacy `/api` compatibility paths.

## Purpose
Document important routes for operations, health, document room, automation, and integration status.

## Architecture
Express routers mount auth, AI, credit, automation, client, upload, and document-room routes.

## Dependencies
Authenticated session is required for protected routes. Public-safe status endpoints do not expose secrets.

## Folder Structure
Routes live in `server/routes.ts`, `server/routes/*.ts`, and service logic lives in `server/*-service.ts`.

## Security
Protected routes require session authentication. High-risk document-room changes require confirmation and audit events.

## Maintenance
Update when adding or changing routes.

## Related Documentation
`DeveloperGuide.md`, `AdminGuide.md`.

## Key Routes

- `GET /health`
- `GET /ready`
- `GET /status/integrations`
- `GET /status/infrastructure`
- `GET /status/agents`
- `GET /status/automation`
- `GET /api/v1/document-room/summary`
- `GET /api/v1/document-room/items`
- `POST /api/v1/document-room/items`
- `PATCH /api/v1/document-room/items/:id`
- `GET /api/v1/document-room/collateral-assets`
- `POST /api/v1/document-room/collateral-assets`
- `GET /api/v1/document-room/receivables`
- `POST /api/v1/document-room/receivables`
- `GET /api/v1/document-room/facility-checklist`
- `GET /api/v1/document-room/audit-events`
