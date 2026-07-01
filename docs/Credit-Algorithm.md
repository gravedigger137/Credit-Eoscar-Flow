# Proprietary Credit Decisioning & Simulation Algorithm

## Overview

The Credit-Eoscar proprietary score is an internal platform score used for workflow prioritization and operational readiness. The internal range is 0-650, where 650 is the highest achievable internal Credit-Eoscar score.

## Purpose

The score supports customer readiness, automation routing, dispute prioritization, internal analytics, progress tracking, receivable readiness review, compliance gate logic, and audit event prioritization.

## Architecture

The algorithm may use credit report parsing logic, score simulation rules, dispute prioritization, tradeline optimization, bureau data normalization, receivable eligibility scoring, onboarding readiness scoring, risk flags, audit trail scoring, automation routing, and AI prompt workflows.

## Dependencies

Inputs may include customer profile data, credit report metadata, tradeline attributes, dispute workflow state, onboarding state, receivable evidence, compliance flags, and audit history. Outputs must remain internal workflow signals.

## Folder Structure

Related code is currently in `server/score-simulator.ts`, `server/credit-predictor.ts`, `server/tradeline-processor.ts`, `server/credit-report-parser.ts`, and automation workflow files.

## Security

This score is not a FICO Score, VantageScore, bureau score, consumer credit score, certified score model, regulated underwriting model, guaranteed approval model, or adverse-action decision engine. Do not expose model internals, prompts, or customer PII outside approved access controls.

## Maintenance

Every material algorithm change requires version history, test notes, change approval, bias/fairness review notes, audit logging, and compliance review before production use.

## Related Documentation

- `docs/Master-Asset-Register.md`
- `docs/Security-And-Audit-Controls.md`
- `docs/Production-Readiness-Go-No-Go.md`

## Required Documentation

- Algorithm overview
- Data inputs
- Data outputs
- Decision rules
- Human review points
- Audit log requirements
- Bias/fairness review note
- Version history
- Change approval process
- Testing and validation records
