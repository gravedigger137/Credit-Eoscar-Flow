# AI Agent Teams

## Purpose
Define two internal teams for each function: Team A for daily operations and Team B for review, QA, escalation, and after-hours monitoring.

## Scope
Agents assist with workflow, summaries, drafts, reminders, checklists, monitoring, coding tasks, document organization, and routing only.

## Owner
Chief Admin Agent.

## Human Review Required
All legal, accounting, banking, credit, insurance, securities, bureau, e-OSCAR, lender-facing, and deletion/export decisions.

## Security Notes
Agents must use tool allowlists, route allowlists, least privilege, no secret output, and no direct professional claims.

## Audit Requirements
Agent-generated changes to documents, assets, receivables, collateral, lender visibility, role changes, secrets/config, and exports require audit logs.

## Related Routes
`/api/v1/status/agents`, `/api/v1/document-room/audit-events`.

## Related Database Tables
`audit_events`, `document_room_items`.

## Go/No-Go Criteria
Agents are staging-safe as workflow metadata. They are not production-safe for autonomous high-risk actions.

## Agent Definition Schema
Each agent record includes `agent_name`, `department`, `team`, `purpose`, `allowed_actions`, `prohibited_actions`, `required_human_review`, `escalation_rules`, `audit_log_requirements`, `data_access_scope`, `schedule`, `related_routes`, `related_tables`, and `related_docs`.
