# Monitoring

## Overview

Credit-Eoscar exposes safe operational metadata for health, readiness, liveness, security, infrastructure, integrations, agents, and automation.

## Purpose

Support staging and production monitoring without exposing credentials or private data.

## Architecture

Endpoints:

- `GET /live`
- `GET /health`
- `GET /ready`
- `GET /status`
- `GET /api/v1/status`
- `GET /status/security`
- `GET /status/infrastructure`
- `GET /status/integrations`
- `GET /status/agents`
- `GET /status/automation`

Administrative status endpoints require an admin session.

## Dependencies

- PostgreSQL for `/ready`.
- Platform logs.
- Optional OpenTelemetry/exporter configuration.
- Error tracking provider if used.

## Folder Structure

- `server/index.ts`
- `docs/Incident-Response-Runbook.md`
- `docs/security/Rate-Limiting.md`

## Security

Status responses return configured/not-configured metadata only. They must not return secret values, tokens, credentials, raw environment variables, or customer data.

## Maintenance

Production still requires external monitoring/alerting configuration, log retention policy, and on-call notification routing.

## Related Documentation

- `Infrastructure.md`
- `docs/infrastructure/Go-Live-Checklist.md`

