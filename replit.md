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
- **Metro 2 Filings** — CDIA-compliant Metro 2 file generator/downloader, submission log
- **Bureau Uploads** — Per-bureau tabs with drag-and-drop upload zone, direct portal links
- **AI Command Center** — GPT-4o powered chat, dispute letter generator, client analysis, Metro 2 validator
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
- `client/src/pages/` — All 15 pages

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
