# CreditRepair Pro

A professional credit repair business management platform for credit repair agencies.

## Architecture

**Stack:** React (Vite) + Express.js + PostgreSQL (Drizzle ORM) + TailwindCSS + shadcn/ui

**Key tech:**
- Frontend: React 18, TanStack Query, Wouter routing, shadcn/ui components
- Backend: Express.js, Drizzle ORM with node-postgres
- Database: PostgreSQL (Replit-managed), all schema in `shared/schema.ts`
- Payments: Stripe (webhook-ready, awaits STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env secrets)

## Features

- **Dashboard** — Live stats (active clients, disputes, tradelines, revenue)
- **Clients** — Full client management with add/edit/delete and credit score tracking
- **Disputes (e-OSCAR)** — Create and track credit bureau disputes with status updates
- **Credit Reports** — Import and analyze 3-bureau credit report pulls
- **Tradelines** — Manage authorized user tradeline placements and orders
- **Revolving Credit / Credit Builders** — Enroll clients in builder loans, secured cards, revolving lines (Self/Kikoff/Credit Strong style)
- **Billing** — Transaction ledger, revenue tracking by service type, Stripe configuration
- **Inbox / Notifications** — Auto-generated alerts for disputes, payments, clients; live unread badge
- **Compliance** — CROA/FCRA/FDCPA audit log, bureau contact directory (all 6 bureaus)
- **Settings** — AI automation toggles, cybersecurity controls (MFA, AES-256, IP allowlisting), Stripe & e-OSCAR config

## Database Schema (shared/schema.ts)

Tables: `users`, `clients`, `disputes`, `credit_reports`, `tradelines`, `credit_lines`, `transactions`, `notifications`, `api_configs`

Enums: `client_status`, `dispute_status`, `bureau`, `tradeline_status`, `credit_line_status`, `notification_type`, `transaction_status`

## Key File Locations

- `shared/schema.ts` — All DB tables, enums, insert schemas, and types
- `server/routes.ts` — All API endpoints
- `server/storage.ts` — DatabaseStorage class (all CRUD operations)
- `server/db.ts` — Drizzle + pg pool connection
- `client/src/App.tsx` — All route registrations
- `client/src/components/layout/Shell.tsx` — Sidebar with live notification badge
- `client/src/pages/` — All 10 pages (dashboard, clients, disputes, reports, tradelines, credit-lines, billing, notifications, compliance, settings)

## API Routes

```
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
GET/POST     /api/notifications
PATCH        /api/notifications/:id/read
POST         /api/notifications/mark-all-read
GET          /api/notifications/unread-count
GET          /api/dashboard/stats
GET          /api/bureaus
GET/POST     /api/config/:key
POST         /api/stripe/webhook
POST         /api/stripe/create-payment-link
```

## Business Model

Revenue streams tracked in `transactions` table:
- `tradeline` — Authorized user tradeline placement fees ($500-$2,000 per tradeline)
- `credit_line` — Credit builder product enrollment
- `retainer` — Monthly credit repair retainer
- `report` — Credit report pull fees
- `consultation` — One-time consultation fees

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection (auto-provided by Replit)
- `STRIPE_SECRET_KEY` — For live Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` — For Stripe webhook verification

## Design System

- Institutional/financial aesthetic — Inter + Plus Jakarta Sans fonts
- Deep blues, glass-panel cards
- CSS custom properties via TailwindCSS
- Dark mode compatible
