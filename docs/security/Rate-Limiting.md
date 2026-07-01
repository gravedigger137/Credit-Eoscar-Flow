# Rate Limiting

## Overview

Credit-Eoscar includes rate-limiting policies for auth, password reset readiness, API traffic, uploads, and admin routes.

## Purpose

Reduce brute-force, abuse, upload flooding, and admin endpoint scraping risk.

## Architecture

- `server/rate-limit.ts` provides centralized middleware.
- Current runtime uses local memory buckets.
- `REDIS_URL` is recognized as distributed-rate-limit configuration readiness, but a Redis client adapter must be wired before multi-instance production can claim distributed enforcement.

## Dependencies

- Environment variables for limits.
- Redis or platform-native rate limiting before multi-instance production.

## Folder Structure

- `server/rate-limit.ts`
- `server/auth.ts`
- `server/index.ts`
- `server/routes.ts`

## Security

Configured policy groups:

- `auth`
- `passwordReset`
- `api`
- `upload`
- `admin`

The `/status/security` endpoint reports active policy metadata without exposing secrets.

## Maintenance

Tune limits in staging with realistic traffic. For production with more than one app instance, add Redis or platform WAF/API gateway rate limiting.

## Related Documentation

- `docs/Production-Security-Checklist.md`
- `docs/security/Secret-Management.md`

