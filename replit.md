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
- **Disputes (e-OSCAR)** — Create and track credit bureau disputes with status, method tracking (mail/e-OSCAR), tracking numbers. Admin bypass for auto-approval.
- **Credit Reports** — Import and analyze 3-bureau credit report pulls
- **Tradelines** — Manage authorized user tradeline placements and orders. Admin bypass for slot limits and auto-assignment.
- **AU Partners** — Cardholder partner roster with slot tracking, credit limits, payout/price, reporting bureaus. TradelineSupply.com highlighted as featured supplier with step-by-step guide. Admin bypass for partner access.
- **Revolving Credit / Credit Builders** — Enroll clients in builder loans, secured cards, revolving lines. Admin bypass for auto-enrollment.
- **Metro 2 Filings** — Full CDIA-compliant Metro 2 engine (moov-io spec), 426-byte header/base/trailer records, format converter (CSV/JSON/Metro 2), CDIA validator, submission log. Admin bypass for validation. Batch furnishing via `/api/metro2/batch-furnish`.
- **Bureau Uploads** — Per-bureau tabs with drag-and-drop upload zone, direct portal links
- **Bureau & Simulator** — Credit report PDF parser, 4-bureau API integrations (Equifax/Experian/TransUnion/Innovis), score simulator with 12 action types, auto-pull per client via `/api/bureau/auto-pull/:clientId`
- **AI Command Center** — GPT-4o powered chat, dispute letter generator, client analysis, Metro 2 validator
- **Trust Accounting** — QuickBooks-style trust fund management with 6-tab dashboard (Dashboard, Accounts, Ledger, Invoicing, Chart of Accounts, Reconcile). Double-entry ledger, P&L statements, professional invoice generation, chart of accounts (assets/liabilities/revenue/expenses), reconciliation. Admin bypass for billing holds.
- **Tools** — SSN verification (format/ITIN/test detection), AI skip tracing (comprehensive person search), credit checking (soft pull with scores/risk/AI analysis), paperwork automation worker (18 document types: FCRA/FDCPA/CROA letters, contracts, invoices, reports). Admin bypass for compliance and staff restrictions.
- **Automation** — 65 workflow types including 50 AI bot workers (GPT-4o powered) with full Bot Command Center in Settings. Core workflows (15): auto_dispute, client_onboarding, score_monitoring, follow_up, letter_generation, compliance_check, bureau_auto_pull, metro2_furnishing, full_pipeline, ai_credit_worker, tradeline_optimization, stale_dispute_check, payment_reminder, collection_response, client_graduation. AI Bots (50): Original 16 (bot_system_health, bot_banking_sync, bot_document_worker, bot_legal_compliance, bot_data_furnisher, bot_lender_outreach, bot_owner_briefing, bot_security_monitor, bot_accounting, bot_client_comms, bot_coder, bot_trust_law, bot_developer, bot_trainer, bot_credit_specialist, bot_maintenance) + 34 new GPT-4o bots across 8 categories (Operations, Financial, Legal, Credit, Client Services, Marketing, Data & Analytics, Development). New bots use `botChatWithAI()` in `server/ai.ts` with per-bot system prompts and structured JSON responses. Bot Command Center: per-bot toggle, schedule (hourly/daily/weekly/monthly), manual run, GPT-4o badge, action pipeline view, last run results, category filtering (8 categories). 5-minute scheduler, admin-only reseed endpoint (`POST /api/automation/seed`).
- **Billing** — Transaction ledger, Stripe Checkout integration, revenue tracking by service type, usage metering. Admin bypass for billing holds.
- **Inbox / Notifications** — Auto-generated alerts for disputes, payments, clients; live unread badge
- **Compliance** — CROA/FCRA/FDCPA audit log, bureau contact directory (all 6 bureaus). Admin bypass for compliance checks.
- **Banking & Lending** — Plaid bank account linking, balance tracking, transaction history, liability data. AI-powered loan pre-qualification, 12-lender directory (LendingClub, SoFi, Upstart, Avant, etc.), loan application management. Admin bypass for billing holds.
- **Crypto & DeFi** — MetaMask wallet connection, manual wallet CRUD, multi-chain support (Ethereum, Polygon, BNB, Arbitrum, Optimism, Avalanche, Base), DeFi protocol directory (Uniswap, Aave, Compound, Curve, Lido, MakerDAO, 1inch, Yearn). Etherscan links.
- **Automated Onboarding** — 12-step pipeline engine (welcome → identity → credit auth → documents → report pull → AI analysis → dispute plan → bank linking → payment → engagement letter → tradeline matching → complete). Book consultation auto-creates client and initializes pipeline.
- **Settings** — 10 admin override bypass switches for all page-level operations. Integrations tab: Plaid banking (client ID/secret/env with setup guide), 4-bureau API keys (Equifax/Experian/TransUnion/Innovis with developer portal links), e-OSCAR dispute API, Stripe payments, credit report provider (SmartCredit/IdentityIQ/MyFICO/Experian Connect). All forms save via `saveConfig.mutate()` to `api_configs` table.

## Admin Bypass System

Every major page displays an admin bypass banner when the corresponding setting is enabled in Settings. 10 bypass keys:
- `admin_bypass_partner_access` — Partners page
- `admin_bypass_dispute_approval` — Disputes page
- `admin_bypass_tradeline_limits` — Tradelines page
- `admin_bypass_billing_holds` — Billing + Trust Accounting pages
- `admin_bypass_credit_builder_enrollment` — Revolving Credit page
- `admin_bypass_compliance_checks` — Compliance + Tools pages
- `admin_bypass_metro2_validation` — Metro 2 page
- `admin_bypass_staff_restrictions` — Tools page
- `admin_auto_import_reports` — Bureau page
- `admin_auto_assign_tradelines` — Tradelines page

## Database Schema (shared/schema.ts)

Tables: `users`, `clients`, `disputes`, `credit_reports`, `tradelines`, `credit_lines`, `transactions`, `notifications`, `cardholder_partners`, `metro2_submissions`, `client_documents`, `api_configs`, `onboarding_steps`, `bank_accounts`, `crypto_wallets`, `loan_applications`, `ui_customization`

Key client fields: firstName, middleName, lastName, suffix, email, phone, ssn, dob, address, city, state, zip, previousAddress, idType, idNumber

Key dispute fields: bureau, accountName, reason, itemType, disputeMethod, trackingNumber, letterContent, eoscarReferenceId, bureauResponseDate

## Auto-Refresh

All data queries auto-refresh every 30 seconds and on window focus (staleTime: 15s, refetchInterval: 30s). Configured globally in `client/src/lib/queryClient.ts`.

## Social Media Login (OAuth)

Login page shows 9 social login providers: Google, Facebook, GitHub, X (Twitter), LinkedIn, Apple, Instagram, TikTok, Snapchat.
- OAuth backend: `server/oauth.ts` — Passport.js strategies for Google, Facebook, GitHub
- Routes: `/api/auth/{google|facebook|github}/callback`
- Provider status: `/api/auth/providers` (public, returns which providers are configured)
- To enable a provider, add its credentials as environment secrets (e.g. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Users table has `oauthProvider` and `oauthProviderId` columns for linking accounts

## Key File Locations

- `shared/schema.ts` — All DB tables, enums, insert schemas, and types
- `server/index.ts` — Express app entry with session middleware and auth guard
- `server/auth.ts` — Auth routes (login/register/logout/me) and requireAuth middleware
- `server/oauth.ts` — Passport.js OAuth strategies (Google, Facebook, GitHub)
- `server/routes.ts` — All API endpoints including Stripe checkout
- `server/storage.ts` — DatabaseStorage class (all CRUD operations)
- `server/ai.ts` — OpenAI integration (dispute letters, analysis, chat, Metro 2 validator)
- `server/metro2.ts` — CDIA-compliant Metro 2 file builder
- `client/src/App.tsx` — All route registrations with ProtectedRoute guards
- `client/src/hooks/use-auth.tsx` — AuthProvider context and useAuth hook
- `client/src/components/layout/Shell.tsx` — Sidebar with user info and logout
- `client/src/pages/login/index.tsx` — Login/register page with social login
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
- `server/onboarding-engine.ts` — 12-step automated client onboarding pipeline (welcome → identity → credit auth → docs → report pull → AI analysis → dispute plan → bank linking → payment → engagement letter → tradeline matching → complete)
- `server/plaid-client.ts` — Plaid banking API integration (link token, account sync, transactions, liabilities)
- `client/src/pages/banking/index.tsx` — Banking & Lending page (4 tabs: Bank Accounts, Loan Applications, Lender Directory, Overview)
- `client/src/pages/crypto/index.tsx` — Crypto & DeFi page (3 tabs: Wallets, DeFi Protocols, Chains)
- `client/src/pages/` — All 22 pages

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
GET          /api/onboarding/:clientId (get/initialize onboarding steps)
POST         /api/onboarding/:clientId/advance (advance onboarding step)
POST         /api/onboarding/:clientId/auto-advance (auto-advance next step)
GET          /api/onboarding-steps (list all 12 step definitions)
GET          /api/plaid/status (check if Plaid is configured)
POST         /api/plaid/create-link-token (Plaid Link token)
POST         /api/plaid/exchange-token (exchange public token + save accounts)
GET          /api/bank-accounts (all bank accounts)
GET          /api/bank-accounts/:clientId (client bank accounts)
POST         /api/bank-accounts/:id/sync (refresh balances from Plaid)
GET          /api/bank-accounts/:id/transactions (90-day transaction history)
GET          /api/bank-accounts/:id/liabilities (liability data)
GET          /api/crypto-wallets (all crypto wallets)
GET          /api/crypto-wallets/:clientId (client wallets)
POST         /api/crypto-wallets (add wallet)
DELETE       /api/crypto-wallets/:id (remove wallet)
GET          /api/loans (all loan applications)
GET          /api/loans/:clientId (client loan apps)
POST         /api/loans (create with AI pre-qualification)
PATCH        /api/loans/:id (update loan status)
GET          /api/lenders (12-lender directory)
GET          /api/ui-customization (read all UI settings)
POST         /api/ui-customization (save UI settings)
```

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection (auto-provided by Replit)
- `OPENAI_API_KEY` — For AI features (set, needs billing credits at platform.openai.com)
- `STRIPE_SECRET_KEY` — For live Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` — For Stripe webhook signature verification
- `SESSION_SECRET` — For session encryption (optional, has fallback)
- `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` — For Plaid bank integration (optional)

## Design System

- Institutional/financial aesthetic — Inter + Plus Jakarta Sans fonts
- Deep blues, glass-panel cards, dark mode
- CSS custom properties via TailwindCSS
- All amounts stored in cents (integer); ×100 on save, ÷100 on display
