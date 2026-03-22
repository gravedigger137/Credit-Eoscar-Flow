# CreditRepair Pro

A professional credit repair business management platform for credit repair agencies.

## Architecture

**Stack:** React (Vite) + Express.js + PostgreSQL (Drizzle ORM) + TailwindCSS + shadcn/ui

**Key tech:**
- Frontend: React 18, TanStack Query, Wouter routing, shadcn/ui components
- Backend: Express.js, Drizzle ORM with node-postgres
- Database: PostgreSQL (Replit-managed), all schema in `shared/schema.ts`
- Auth: express-session + bcryptjs, session store in PostgreSQL (connect-pg-simple)
- Payments: Stripe Checkout Sessions (real checkout via STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET)
- AI: OpenAI GPT-4o (dispute letters, client analysis, chat, Metro 2 validation)

## Auth System

- **First-user bootstrap:** When no users exist, `/login` shows a setup form that creates the first admin account. After that, registration is locked — only admins can create new staff accounts.
- **Login page:** `/login` — bcrypt (12 rounds) password hashing, session regeneration on login (prevents session fixation)
- **Session:** express-session with PostgreSQL session store (7-day cookie), `trust proxy` enabled for secure cookies behind TLS
- **Rate limiting:** 10 login attempts per IP per 15-minute window
- **Protected routes:** All `/api/*` routes require auth except `/api/auth/*` and `/api/stripe/webhook`
- **Role-based access:** Config endpoints (`/api/config`) restricted to admin role only
- **Frontend:** `AuthProvider` context wraps app, `ProtectedRoute` component redirects unauthenticated users to `/login`
- **Logout:** Session destruction + cookie clearing + redirect to `/login`
- **Files:** `server/auth.ts` (auth routes + middleware + rate limiter), `client/src/hooks/use-auth.tsx` (context), `client/src/pages/login/index.tsx`

## Features

- **Dashboard** — Live stats (active clients, disputes, tradelines, revenue)
- **Clients** — Full client management with add/edit/delete, credit score tracking, PII (SSN, DOB, ID verification), document uploads (PDF/image/Word)
- **Disputes (e-OSCAR)** — Create and track credit bureau disputes with status, method tracking (mail/e-OSCAR), tracking numbers
- **Credit Reports** — Import and analyze 3-bureau credit report pulls
- **Tradelines** — Manage authorized user tradeline placements and orders
- **AU Partners** — Cardholder partner roster with slot tracking, credit limits, payout/price, reporting bureaus
- **Revolving Credit / Credit Builders** — Enroll clients in builder loans, secured cards, revolving lines
- **Metro 2 Filings** — Full CDIA-compliant Metro 2 engine (moov-io spec), 426-byte header/base/trailer records, format converter (CSV/JSON/Metro 2), CDIA validator, submission log
- **Bureau Uploads** — Per-bureau tabs with drag-and-drop upload zone, direct portal links
- **AI Command Center** — GPT-4o powered chat, dispute letter generator, client analysis, Metro 2 validator
- **Post-Upload AI Pipeline** — When a credit report (PDF/XML/TXT) is uploaded for a client, the Consumer Credit Specialist AI automatically: 1) parses the report, 2) updates client scores, 3) analyzes every negative item with FCRA/FDCPA legal citations, 4) creates dispute letters for each item across all 3 bureaus. Manual trigger via `POST /api/clients/:id/auto-analyze`. Deduplication by creditor+bureau prevents duplicate disputes.
- **Tradeline AI Processor** — AI-driven tradeline optimization engine: per-client partner matching with score-weighted ranking, batch parallel processing for all active clients, credit behavior analysis (risk segmentation, readiness scoring, behavioral indicators), GPT-4o strategic placement recommendations. APIs: `GET /api/tradelines/optimize/:clientId`, `POST /api/tradelines/batch-optimize`, `GET /api/tradelines/behavior/:clientId`, `POST /api/tradelines/ai-strategy/:clientId`. Automation: `tradeline_optimization` workflow in automation engine with weekly scheduling.
- **Billing** — Transaction ledger, Stripe Checkout integration, revenue tracking by service type
- **Inbox / Notifications** — Auto-generated alerts for disputes, payments, clients; live unread badge
- **Compliance** — CROA/FCRA/FDCPA audit log, bureau contact directory (all 6 bureaus)
- **Settings** — AI automation toggles, cybersecurity controls, Stripe & e-OSCAR config

## Database Schema (shared/schema.ts)

Tables: `users`, `clients`, `disputes`, `credit_reports`, `tradelines`, `credit_lines`, `transactions`, `notifications`, `cardholder_partners`, `metro2_submissions`, `client_documents`, `api_configs`

Key client fields: firstName, middleName, lastName, suffix, email, phone, ssn, dob, address, city, state, zip, previousAddress, idType, idNumber

Key dispute fields: bureau, accountName, reason, itemType, disputeMethod, trackingNumber, letterContent, eoscarReferenceId, bureauResponseDate

## Key File Locations

- `shared/schema.ts` — All DB tables, enums, insert schemas, and types
- `server/index.ts` — Express app entry with session middleware and auth guard
- `server/auth.ts` — Auth routes (login/register/logout/me) and requireAuth middleware
- `server/routes.ts` — All API endpoints including Stripe checkout
- `server/storage.ts` — DatabaseStorage class (all CRUD operations)
- `server/ai.ts` — OpenAI integration (dispute letters, analysis, chat, Metro 2 validator)
- `server/metro2.ts` — CDIA-compliant Metro 2 file builder
- `client/src/App.tsx` — All route registrations with ProtectedRoute guards
- `client/src/hooks/use-auth.tsx` — AuthProvider context and useAuth hook
- `client/src/components/layout/Shell.tsx` — Sidebar with user info and logout
- `client/src/pages/login/index.tsx` — Login/register page
- `server/credit-report-parser.ts` — PDF credit report parser (pdf-parse) — auto-extracts accounts, scores, negative items from EQ/EX/TU reports
- `server/bureau-clients.ts` — Bureau API clients: EquifaxClient (@flexbase/equifax-node-client), ExperianClient (experian-node), TransUnionClient (TUNA XML)
- `server/score-simulator.ts` — FICO score impact simulator — estimates score changes from repair actions (remove collection, pay down, add AU, etc.)
- `server/credit-predictor.ts` — 6-factor FICO credit score predictor with approval odds + default risk prediction (payment behavior, bill-to-pay ratio, spending trend, overleverage)
- `server/credit-monitor.ts` — Automated credit monitoring with score change detection, XML report parsing, alert deduplication
- `server/financial-calculator.ts` — Fintech calculator engine: loan amortization, debt payoff (avalanche/snowball), credit repair ROI, compound interest, DTI analysis
- `client/src/pages/calculators/index.tsx` — Financial Calculators page (4 tabs: Loan, Debt Payoff, Repair ROI, DTI)
- `server/tradeline-processor.ts` — AI-driven tradeline optimization engine: partner matching, batch processing, behavior analysis, GPT-4o strategy
- `server/financial-reports.ts` — Sales reports, revenue forecasting, credit sales POS, credit factor snapshots (priyaranjan756/Creditshelf + francheska-guzman/credit-report patterns)
- `client/src/pages/bureau/index.tsx` — Bureau & Score Simulator page (3 tabs: Report Parser, Score Simulator, Bureau APIs) — 4 bureaus: EQ/EX/TU + CBC/Innovis
- `client/src/pages/analytics/index.tsx` — Financial Analytics page (4 tabs: Credit Predictor, Sales Reports, Revenue Forecast, Credit Sales POS)
- `server/usage-metering.ts` — Usage-based event tracking and billing (openmeterio/openmeter patterns) — tracks bureau pulls, disputes, AI calls, etc.
- `server/trust-accounting.ts` — Double-entry trust accounting ledger with reconciliation (moov-io/accounts + CGAccounting patterns)
- `client/src/pages/trust-accounting/index.tsx` — Trust Accounting page (3 tabs: Accounts, Ledger, Reconcile)
- `server/automation-engine.ts` — Full automation engine with 14 workflow types, scheduled runner, event-driven triggers, run history tracking
- `client/src/pages/automation/index.tsx` — Automation page (3 tabs: Rules, Run History, Workflows) — create/toggle/execute automation rules
- `client/src/pages/` — All 20 pages

## API Routes

```
POST         /api/auth/register
POST         /api/auth/login
POST         /api/auth/logout
GET          /api/auth/me
GET/POST     /api/clients
GET/PATCH/DELETE /api/clients/:id
GET/POST     /api/disputes
PATCH/DELETE /api/disputes/:id
GET/POST     /api/reports
PATCH        /api/reports/:id
GET/POST     /api/tradelines
PATCH/DELETE /api/tradelines/:id
GET/POST     /api/credit-lines
PATCH/DELETE /api/credit-lines/:id
GET/POST     /api/transactions
PATCH        /api/transactions/:id
POST         /api/stripe/webhook (unprotected — Stripe signature verification)
POST         /api/stripe/create-checkout
POST         /api/stripe/create-payment-link
GET/POST     /api/notifications
PATCH        /api/notifications/:id/read
POST         /api/notifications/mark-all-read
GET          /api/notifications/unread-count
GET          /api/dashboard/stats
GET          /api/bureaus
GET/POST     /api/config/:key
GET/POST     /api/partners
PATCH/DELETE /api/partners/:id
GET/POST     /api/metro2
POST         /api/metro2/generate-file
POST         /api/ai/chat
POST         /api/ai/dispute-letter
POST         /api/ai/analyze-client
POST         /api/ai/validate-metro2
POST         /api/credit-report/parse (upload PDF → auto-extract accounts/scores)
POST         /api/credit-report/parse-text (paste raw text → parse)
POST         /api/bureau/pull-report (pull from EQ/EX/TU APIs)
GET          /api/bureau/status (check which bureaus are configured)
POST         /api/bureau/configure (save bureau API credentials)
POST         /api/score-simulator/simulate (run score simulation)
POST         /api/score-simulator/recommend (auto-recommend repair actions)
POST         /api/clients/:id/parse-report (upload report + auto-update client scores)
POST         /api/credit-predictor/analyze (6-factor creditworthiness prediction)
POST         /api/credit-predictor/analyze-client/:id (predict + save snapshot)
GET          /api/credit-factors/:clientId/history (factor history over time)
GET          /api/financial-reports/sales?period=monthly (sales report by period)
GET          /api/financial-reports/client/:id (client financial summary)
GET          /api/financial-reports/forecast (revenue forecasting)
GET/POST     /api/credit-sales (credit sales POS - deferred payments)
POST         /api/credit-sales/:id/payment (record payment on credit sale)
GET/POST     /api/credit-monitor/config (monitoring alert thresholds)
POST         /api/credit-monitor/scan (scan all clients for score changes → alerts)
GET          /api/credit-monitor/history/:clientId (score history timeline)
POST         /api/credit-report/parse-xml (parse MISMO/TUNA XML credit reports)
POST         /api/credit-predictor/default-risk (default probability prediction)
GET          /api/trust-accounts (all client trust accounts)
GET          /api/trust-accounts/summary (total trust funds, revenue, expenses, net income)
GET          /api/trust-accounts/reconcile (trust fund reconciliation)
GET          /api/trust-accounts/:clientId (single client trust account)
GET          /api/trust-accounts/:clientId/balance (trust balance)
POST         /api/trust-accounts/:clientId/deposit (record trust deposit)
POST         /api/trust-accounts/:clientId/withdraw (record trust withdrawal)
GET/POST     /api/ledger (general ledger entries)
GET          /api/usage/summary (usage event summary by type)
GET          /api/usage/report?period=monthly (usage billing report with costs)
GET          /api/usage/events (recent usage events)
GET          /api/usage/client/:clientId (client usage history)
GET          /api/usage/pricing (unit pricing table)
POST         /api/usage/record (manually record usage event)
GET          /api/automation/rules (list all automation rules)
GET/POST     /api/automation/rules/:id (get/create/update automation rule)
DELETE       /api/automation/rules/:id (delete automation rule)
PATCH        /api/automation/rules/:id/toggle (enable/disable rule)
POST         /api/automation/rules/:id/execute (manually run automation rule)
GET          /api/automation/runs (run history)
GET          /api/automation/stats (automation dashboard stats)
GET          /api/automation/workflow-types (available workflow types)
POST         /api/automation/seed (load default automation rules)
POST         /api/calculator/loan (loan amortization + payment schedule)
POST         /api/calculator/debt-payoff (avalanche/snowball debt payoff plan)
POST         /api/calculator/repair-roi (credit repair investment ROI)
POST         /api/calculator/compound-interest (compound interest projections)
POST         /api/calculator/dti (debt-to-income ratio analysis)
GET          /api/bureau/status-all (all 4 bureaus: EQ/EX/TU/Innovis)
```

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection (auto-provided by Replit)
- `OPENAI_API_KEY` — For AI features (set, needs billing credits at platform.openai.com)
- `STRIPE_SECRET_KEY` — For live Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` — For Stripe webhook signature verification
- `SESSION_SECRET` — For session encryption (optional, has fallback)

## Design System

- Institutional/financial aesthetic — Inter + Plus Jakarta Sans fonts
- Deep blues, glass-panel cards, dark mode
- CSS custom properties via TailwindCSS
- All amounts stored in cents (integer); ×100 on save, ÷100 on display
