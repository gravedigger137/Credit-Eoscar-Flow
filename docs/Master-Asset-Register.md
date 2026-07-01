# Master Asset Register

## Overview

This register organizes assets identified for Infinite Arcadia / Credit-Eoscar diligence. It is a documentation and workflow register only. It does not prove ownership, lien priority, valuation, lender eligibility, or transfer effectiveness.

## Purpose

Track Asset ID, category, description, current owner, assigned entity, supporting documentation, assignment status, attorney review, accountant review, lender visibility, audit history, and version history.

## Architecture

The operational database tables are `collateral_assets`, `document_room_items`, and `audit_events`. Supporting evidence should be linked through the document room.

## Dependencies

Requires supporting documents, board/officer approvals where applicable, attorney review, accountant review for valuations, and manual lender-visibility approval.

## Folder Structure

Related docs live under `docs/due-diligence/`, `docs/Credit-Facility-Readiness.md`, and `docs/Credit-Algorithm.md`.

## Security

Mask account numbers, EINs, SSNs, tax IDs, wallet secrets, banking credentials, API keys, and customer PII. Do not expose bureau, Plaid, Stripe, OpenAI, database, or cloud credentials.

## Maintenance

Review monthly and whenever assets are assigned, pledged, superseded, sold, licensed, deprecated, or made lender-visible.

## Related Documentation

- `docs/due-diligence/08_Receivables_and_Collateral.md`
- `docs/due-diligence/05_Intellectual_Property.md`
- `docs/Security-And-Audit-Controls.md`

## Register Fields

| Field | Requirement |
| --- | --- |
| Asset ID | Stable internal ID |
| Category | Business, Software, IP, Financial Account, Digital Asset, Domain, Insurance, Music, Contract Right, Government Record |
| Description | Plain factual description |
| Current Owner | Review-required if not proven by source document |
| Assigned Entity | Review-required if assignment document is missing |
| Supporting Documentation | Document room item, source file, registration, contract, or board record |
| Assignment Status | Missing, draft, pending review, complete |
| Attorney Review | Required by default |
| Accountant Review | Required for values, receivables, financial statements, and insurance values |
| Lender Visible | False by default; manual admin confirmation required |
| Audit History | Every material change must create `audit_events` record |
| Version History | Version each update with date, owner, and reason |

## Business Assets

| Asset ID | Asset | Description | Current Owner | Assigned Entity | Review |
| --- | --- | --- | --- | --- | --- |
| BUS-001 | Infinite Arcadia | Parent platform/brand and ecosystem identity | Attorney review required | Attorney review required | Attorney/accountant |
| BUS-002 | Credit-Eoscar | Credit repair, bureau, dispute, automation product | Attorney review required | Attorney review required | Attorney/accountant |
| BUS-003 | BrandonFintech | Fintech/accounts/transfers/ledger/payments product | Attorney review required | Separate BrandonFintech entity boundary | Attorney/accountant |
| BUS-004 | FOREIGN EXQUISITE RENTAL SOLUTIONS INCORPORATED | Business interest listed by user | Source document required | Attorney review required | Attorney/accountant |
| BUS-005 | Brandon Keith Galloway LLC | Business interest listed by user | Source document required | Attorney review required | Attorney/accountant |
| BUS-006 | Trade Names and DBAs | Trade names and assumed names | Filing evidence required | Attorney review required | Attorney |
| BUS-007 | Goodwill | Business goodwill and market reputation | Not valued | Not assigned | Accountant |
| BUS-008 | Customer Relationships | Customer lists and relationships | Privacy review required | Not assigned | Attorney |
| BUS-009 | Business Records | Operating, governance, customer, finance, and compliance records | Custody review required | Not assigned | Attorney/accountant |

## Software Assets

| Asset ID | Asset | Description | Review |
| --- | --- | --- | --- |
| SW-001 | BrandonFintech | .NET fintech app with accounts, ledger, transfers, payments, Stripe, admin, idempotency, and React frontend | Attorney/security |
| SW-002 | Credit-Eoscar | React/Express/PostgreSQL credit operations platform | Attorney/security |
| SW-003 | Infinite Arcadia Platform | Parent ecosystem architecture and integration framework | Attorney/security |
| SW-004 | AI Automation Engine | Automation and AI workflow engine | Compliance/security |
| SW-005 | AI Agents | Workflow support agents subject to human review | Compliance/security |
| SW-006 | Automation Rules | Scheduled/event/manual workflow rules | Compliance/security |
| SW-007 | Cloudflare Workers | AI gateway and edge worker infrastructure | Security |
| SW-008 | Cloudflare Pages | Frontend hosting target | Security |
| SW-009 | Render Infrastructure | API hosting target | Security |
| SW-010 | Neon Databases | Managed PostgreSQL target | Security |
| SW-011 | GitHub Repositories | Source control and CI/CD records | Security |
| SW-012 | Source Code | Application source code and build scripts | Attorney/security |
| SW-013 | API Gateway | API routing and worker gateway pattern | Security |
| SW-014 | Metro 2 Engine | Metro 2 workflow tooling | Compliance |
| SW-015 | Bureau Integration Layer | Bureau sandbox/live integration layer | Compliance/security |
| SW-016 | Score Simulator | Internal scenario simulation tooling | Compliance |
| SW-017 | Report Parser | Credit report parsing workflow | Compliance/security |
| SW-018 | Credit Algorithm | Proprietary internal 0-650 Credit-Eoscar score workflow | Compliance/attorney |
| SW-019 | Documentation | Operational, deployment, security, onboarding, and due-diligence docs | Attorney/accountant |
| SW-020 | Build Pipelines and CI/CD | Build and deployment workflow records | Security |

## Intellectual Property

| Asset ID | Asset | Description | Boundary |
| --- | --- | --- | --- |
| IP-001 | Proprietary Credit Decisioning & Simulation Algorithm | Trust-owned proprietary software logic for analysis, prioritization, simulation, routing, readiness, receivable review, and audit tracking | Internal platform metric only; not FICO, VantageScore, bureau score, underwriting model, or adverse-action engine |
| IP-002 | Proprietary Workflows | Credit, onboarding, document, compliance, and automation workflows | Attorney review required |
| IP-003 | Trade Secrets | Non-public logic, prompts, processes, and routing rules | Access-controlled |
| IP-004 | Software Architecture | Application architecture and service boundaries | Security review required |
| IP-005 | Prompt Libraries | AI prompt workflows related to credit operations | Human review required |
| IP-006 | Underwriting Logic | Listed as a business-method category only; do not use for regulated lending without counsel | Professional review required |
| IP-007 | Automation Logic | Automation and routing logic | Audit required |
| IP-008 | Business Methods | Operating methods and procedures | Attorney review required |
| IP-009 | Copyright Registrations | Registered copyright listed in Schedule A | Source record required before public claim |
| IP-010 | Logos, Branding, Trademarks, Designs | Brand assets and marks | Registration/source evidence required |

## Financial Accounts

Track without account numbers: Cash App Business, Revolut Business, SoFi Savings, SoFi Checking, Stripe, PayPal, Square, and Go2Bank. Supporting documents must mask account numbers and credentials.

## Digital Assets

Track GitHub, Cloudflare, Render, Neon, Shopify, WordPress, YouTube, cryptocurrency wallet records, NFTs, digital tokens, API accounts, cloud infrastructure, social media accounts, marketing accounts, Notion, affiliate program accounts, vendor portals, and API integration records. Never store seed phrases or API secrets in the repo.

## Domains

Known configured domain: `InfiniteArcadia.com`. Additional domains must be added only when found in source records or DNS/provider evidence.

## Insurance

Indexed Universal Life (IUL) records require carrier, face amount, cash value tracked separately, riders, assignments, beneficiary, and supporting documentation. Do not assume cash value.

## Music Assets

Track the licensed music catalog described in Schedule A after source documentation is attached. Catalog items require title, rights type, licensor, license term, permitted uses, restrictions, royalty obligations, and attorney review.

## Contract Rights

Track customer agreements, MSAs, subscription agreements, software licenses, licensing agreements, vendor agreements, affiliate agreements, merchant agreements, receivables, and payment rights. Receivable eligibility requires manual review.

## Integration and Reference Materials

Track Mercedes-Benz EDI readiness materials, VDA 4938 / EDIFACT readiness, CONTRL / APERAK acknowledgement planning, government-record tracking references, TreasuryDirect tracking references, SAM.gov tracking references, Louisiana SOS tracking references, and automotive partner reference materials as readiness records only. Do not claim supplier, government, affiliate, brokerage, bureau, or EDI production access without approved source documents and credentials.

## Government Records

Track EIN letters, formation documents, business registrations, trust records, corporate records, and compliance records. Mask sensitive numbers in public or repo documentation.
