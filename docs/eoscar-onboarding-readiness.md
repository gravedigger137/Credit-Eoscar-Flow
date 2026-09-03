# e-OSCAR Onboarding Readiness

Status: Prepared, not submitted
Prepared from official public e-OSCAR pages and the current Credit-Eoscar-Flow repository state on 2026-09-03.

This document is an onboarding package and gap tracker. It is not a legal approval, bureau approval, e-OSCAR approval, production access claim, or authorization to transmit consumer information.

## Official Pages Inspected

- e-OSCAR Web App login and registration entry: https://www.e-oscar-web.net/
- Current Registration Portal page reached: https://www.e-oscar-web.net/prweb/PRAuth/app/eoscar/rfWkDJ82oAQZTw1OM02yyvvPaBCKC7Fh*/!STANDARD
- API Services by e-OSCAR overview: https://www.e-oscar.org/services-by-e-oscar
- API Services by e-OSCAR developer guide: https://www.e-oscar.org/copy-of-api-services-developers
- CRA contacts page referenced by the registration gate: https://www.e-oscar.org/cra-contacts

## Exact Registration Gate Reached

Page title: Registration Portal.

The public registration gate shows the e-OSCAR-web System Terms of Use effective September 25, 2025. It states that clicking Accept creates a legally binding contract between the registrant company and Online Data Exchange, LLC, and that the clicker represents authority to bind the company.

Visible required controls before additional company fields are exposed:

- Payment acknowledgement checkbox: payment is required upon submission of an e-OSCAR registration request.
- Company Type dropdown:
  - Select...
  - Data Furnisher (DF)
  - Mortgage Reporting Company (MRC)
- Access Code text field: access code provided by a Consumer Reporting Agency.
- Decline button.
- Accept button, currently disabled until required prerequisites are completed.

No company profile, contact, API, Stage, Production, Operator Admin, or API Operator form fields were available before the Terms/payment/access-code gate.

## Application Fields And Current Answers

| Field | Current value | Evidence or blocker |
| --- | --- | --- |
| Legal organization name | REQUIRES OWNER INPUT | Not present in verified repo docs. Do not infer from product or GitHub account. |
| DBA, if applicable | REQUIRES OWNER INPUT | Not present in verified repo docs. |
| Business address | REQUIRES OWNER INPUT | Not present in verified repo docs. |
| Primary contact | REQUIRES OWNER INPUT | Not present in verified repo docs. |
| Technical contact | REQUIRES OWNER INPUT | Not present in verified repo docs. |
| Compliance contact | REQUIRES OWNER INPUT | Not present in verified repo docs. |
| Registration ID / Registration Number | REQUIRES OWNER INPUT | Official Terms say OLDE assigns a 7-digit Registration Number after registration acceptance and payment. None is present in repo docs. |
| Company Type | REQUIRES OWNER INPUT | Registration page defaults to Data Furnisher (DF), but choosing DF or MRC is a business/legal representation and requires owner confirmation. |
| Access Code | REQUIRES OWNER INPUT | Registration page requires a CRA-provided access code. |
| Intended API use | Future Services by e-OSCAR integration for authorized ACDV/AUD workflow handling after registration, CRA/furnisher approval, Stage testing, and Production approval. | Supported by repo readiness docs and official API overview. Do not claim live access. |
| Furnisher/servicer role | REQUIRES OWNER INPUT | e-OSCAR Terms define Data Furnisher status by Consumer Information furnishing relationship. Repo name and roadmap are not enough. |
| CRA relationships | REQUIRES OWNER INPUT | No verified Experian, Equifax, TransUnion, Innovis, or other CRA approval is present. |
| Expected ACDV volume | REQUIRES OWNER INPUT | Required for API pricing/tier planning; no verified volume data in repo. |
| Stage testing contact | REQUIRES OWNER INPUT | Not present in repo. |
| Production contact | REQUIRES OWNER INPUT | Not present in repo. |
| Operator Admin | REQUIRES OWNER INPUT | Not present. Must be created/approved only by authorized owner action. |
| API Operator roles | REQUIRES OWNER INPUT | Official developer guide says each API operator has exactly one role. Exact role options were not visible before registration/login. Stop before creating any API Operator. |
| Security architecture | Repo has session auth, RBAC docs, MFA readiness, CSRF docs, rate limiting, secret management docs, Dockerized deployment, and PostgreSQL persistence. Owner must confirm production controls and WISP. | README, docs, Docker files, and compliance docs. |
| IP/network configuration if required | REQUIRES OWNER INPUT | Not visible in public registration gate and no verified production e-OSCAR allowlist values are in repo. |
| Application name | Credit-Eoscar-Flow | Verified repository name and package name. |
| Backend architecture | Node.js, Express, TypeScript, versioned JSON APIs under /api/v1, PostgreSQL with Drizzle schema and migrations, Docker/Docker Compose support. | README, package.json, Dockerfile, docker-compose.yml. |
| Hosting environment | REQUIRES OWNER INPUT | Repo has deployment plans and staging examples, but no verified current e-OSCAR-configured deployment was available in this inspection. |
| Data encryption | Sensitive stored configuration should use SENSITIVE_CONFIG_ENCRYPTION_KEY; secrets are expected through environment/platform secret managers. Owner must confirm production encryption posture and key custody. | README and env examples. |
| Secret management | Environment variables and platform secret managers only. Do not commit e-OSCAR credentials, bureau credentials, passwords, tokens, or PII. | README and compliance docs. |
| Audit logging | REQUIRES OWNER INPUT for production evidence. Repo docs reference audit records/logging needs and route audit hardening. | Existing docs are readiness scaffolding, not proof of production operation. |
| PII handling | No consumer PII should be transmitted, logged, or included in support tickets without redaction. Owner must confirm WISP, privacy procedures, and approval gates. | Official developer guide support-ticket requirements and repo security docs. |
| Retention policy | REQUIRES OWNER INPUT | e-OSCAR Terms describe e-OSCAR archive timing; Credit-Eoscar local retention policy and evidence are not verified here. |
| Incident response contact | REQUIRES OWNER INPUT | Not present in verified repo docs. |
| Testing status | No live Stage or Production test performed. Current repo status is readiness-only. | No credentials or approved access were available. |
| Unresolved requirements | See checklist below. | External authorization and owner inputs are still required. |

## Repo Cross-Reference

Existing Credit-Eoscar-Flow evidence:

- `docs/Credit-Eoscar-Route-Audit.md` lists product routes and marks many auth, bureau, AI, upload, admin, and configuration routes as partially safe or needing hardening. It does not establish e-OSCAR approval or live API operation.
- `docs/eoscar-metro2-readiness.md` states that the repository contains local e-OSCAR terminology and readiness scaffolding only, and that live e-OSCAR submission, authentication, transport, certification, and approval workflows are not implemented.
- `server/eoscar-metro2-readiness.ts` defines typed readiness contracts and requires `EOSCAR_API_BASE_URL`, `EOSCAR_CLIENT_ID`, `EOSCAR_CLIENT_SECRET`, and `EOSCAR_ENVIRONMENT`, but reports live workflow readiness as requiring official documentation before submission is implemented.
- `.env.example` and `.env.staging.example` contain e-OSCAR placeholders only. No secrets or real endpoints are present.
- `docs/compliance/E-Oscar-Readiness.md` says production use requires approved credentials, authorization, provider validation, bureau/provider agreements, legal/compliance review, and secure credential management.

Classification: D. e-OSCAR code exists but no live credentials/configuration exist.

The app cannot currently be treated as Stage-connected or Production-connected. It does not currently prove it can receive, view, process, or submit real ACDV transactions through Services by e-OSCAR.

## Official API Requirements Captured Publicly

Public official e-OSCAR API pages say Services by e-OSCAR requires both contractual and technical prerequisites before API work begins. The overview describes a sequential 7-stage roadmap and cost components including a one-time setup fee, monthly API service fee, and optional Stage data loads.

The developer guide highlights these required technical controls:

- After an API user is created in the e-OSCAR UI, `/changePwd` must be called within 24 hours.
- `/authRequest` must not be called before every API call; authenticate once per session, store/reuse the token, and reauthenticate only when needed.
- Each API Operator is assigned exactly one role.
- ACDV handling must follow the required sequence. Skipping `/view` between `/find` and `/submit` can leave the ACDV in `PENDING-SENDREQUEST` and cause `/submit` rejection.
- Support requests should include Registration ID, endpoint URL, redacted request body, complete response/error, environment, and steps already taken.

## Required Documents And Evidence

| Document or evidence | Do we have it? | Notes |
| --- | --- | --- |
| CRA-provided e-OSCAR access code | No | Required at the public registration gate. Contact the applicable CRA using the official CRA contacts page. |
| Owner/legal authority to accept e-OSCAR Terms | No | Required before clicking Accept. Do not accept without explicit owner approval. |
| Payment authorization for registration fee | No | The portal states payment is required upon registration submission. |
| Legal organization profile | No | Legal name, DBA, address, tax/billing contact, primary contact, technical contact, and compliance contact are required owner inputs. |
| Bureau/furnisher relationship evidence | No | Required before claiming Data Furnisher status or CRA relationships. |
| e-OSCAR Registration Number | No | Assigned after accepted registration and payment; do not fabricate. |
| Operator Admin designation | No | Must be supplied/approved by owner. |
| API Operator role selection | No | Exact role options were not visible before login/registration. Stop before creating any API Operator. |
| Temporary API Operator password | No | If generated later, stop immediately and complete `/changePwd` within 24 hours only with approval. |
| Written Information Security Policy / Information Security Program | Partial internal docs only | Repo has security and compliance readiness docs, but owner must confirm formal WISP/ISP, GLBA safeguards, responsible contact, and production evidence. |
| Incident response procedure/contact | Partial internal docs only | Repo includes incident-response documentation, but the application field/contact is owner input. |
| Data retention policy | Partial internal docs only | e-OSCAR archive timing is official; local retention and archive obligations require owner/legal confirmation. |
| Stage/UAT test plan or Stage enrollment materials | No | API overview mentions Stage data loads and staged implementation; exact enrollment form was not visible before registration/login. |
| Services by e-OSCAR contracts / middleware documentation | No | Public API overview references contract and middleware requirements; exact documents must come from e-OSCAR/OLDE or CRA after contact/registration. |

## Stage And Production Readiness

Stage access can be prepared but not requested from the public registration gate without owner inputs and the CRA access code. Based on the API overview, Stage appears to be part of the official sequential API implementation path, and optional ongoing Stage data loads may apply.

Production access cannot be requested or activated from the current state. Production requires owner authorization, e-OSCAR/OLDE approval, CRA/furnisher approval where applicable, completed API credential lifecycle, required testing/certification, and explicit approval before cutover.

## Implementation Gaps For Developers

The repo should not call live Services by e-OSCAR until official credentials and documentation are available. Before real Stage testing, implement or verify:

- `EOSCAR_ENV=stage|production` or a mapped equivalent using the official environment names.
- `EOSCAR_BASE_URL` or `EOSCAR_API_BASE_URL` for official Stage/Production endpoints.
- Approved API Operator identifier and secret-store-backed password handling.
- Registration ID configuration if required by the official API.
- Secure token cache with expiry handling.
- Authentication mutex/lock so concurrent work cannot spam `/authRequest`.
- `/changePwd` utility that is never auto-triggered in Production and is only used after approved temp-password generation.
- ACDV state machine enforcing `/find`, `/view`, required intermediate operations, and `/submit` order.
- Submit blocked until required prior steps are recorded.
- Handling for `PENDING-SENDREQUEST` and rejected submission states.
- Idempotency protection, safe retry rules, structured error handling, audit trail, and PII-safe logs.
- Stage/Production isolation and explicit manual approval gates before Production use.

## Safe Next Action

The exact current advance action is the Registration Portal `Accept` button after the required payment acknowledgement and CRA access code are supplied. Clicking it would accept the Terms of Use on behalf of the company and likely advance the registration workflow. Do not click it until an authorized owner approves the Terms, fee, company type, and CRA access code.
