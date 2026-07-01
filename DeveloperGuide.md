# Developer Guide

## Overview
This guide supports safe development inside the existing Credit-Eoscar architecture.

## Purpose
Keep implementation modular, typed, buildable, Docker-compatible, and environment-configured.

## Architecture
Prefer service modules for business logic, thin Express route handlers, shared types in `shared/schema.ts`, and reusable React components.

## Dependencies
Node.js 20, npm, PostgreSQL, Docker, TypeScript, Drizzle, Vite.

## Folder Structure
Use `server/*-service.ts` for business logic, `server/routes*.ts` for routing, `client/src/pages` for pages, and `docs` for operational documentation.

## Security
Never hardcode secrets. Use placeholders in examples. Keep sensitive test files out of git.

## Maintenance
Run `npm run check`, `npm run build`, and review generated migrations before commit.

## Related Documentation
`Architecture.md`, `API.md`, `Security.md`.
