# Local Development Setup

This guide helps you run CreditRepair Pro locally on your machine (no Replit).

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download))
- **npm** or **yarn** (comes with Node.js)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/gravedigger137/Credit-Eoscar-Flow.git
cd Credit-Eoscar-Flow
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database (PostgreSQL)
DATABASE_URL=postgres://user:password@localhost:5432/creditrepair

# OpenAI (for AI features - GPT-4o)
OPENAI_API_KEY=sk-...

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Session encryption
SESSION_SECRET=generate-a-secure-random-string-here

# Server port
PORT=5000
```

#### Database Setup Options

**Option A: Local PostgreSQL**
```bash
# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Create database
createdb creditrepair

# Connection string
postgres://localhost/creditrepair
```

**Option B: Cloud PostgreSQL** (recommended for production)
- [Neon](https://neon.tech) - Free PostgreSQL hosting
- [Railway](https://railway.app) - $5/month PostgreSQL
- [Render](https://render.com) - Free tier available
- [Supabase](https://supabase.com) - Free PostgreSQL + auth

### 3. Initialize Database

```bash
npm run db:push
```

This creates all tables in PostgreSQL using Drizzle ORM.

### 4. Start Development Server

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend (optional, if not using `npm run dev`):**
```bash
npm run dev:client
```

Open **http://localhost:5000** in your browser.

### 5. First Login

When you first access the app:
1. Go to `/login`
2. Since no users exist, you'll see a **setup form**
3. Create the first admin account
4. After that, registration is locked (only admins can add staff)

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run backend (Express) + frontend (Vite) together |
| `npm run dev:client` | Run frontend only on port 5000 |
| `npm run dev` | Run backend on port 5000 |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | Type-check TypeScript |
| `npm run db:push` | Sync database schema with PostgreSQL |

## Project Structure

```
Credit-Eoscar-Flow/
├── client/              # React frontend (Vite)
│   └── src/
│       ├── pages/       # 20 feature pages
│       ├── components/  # shadcn/ui + custom
│       ├── hooks/       # useAuth, useQuery
│       └── App.tsx      # Main router
├── server/              # Express backend
│   ├── index.ts         # Express app
│   ├── auth.ts          # Authentication routes
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database CRUD
│   ├── ai.ts            # OpenAI integration
│   ├── metro2.ts        # Metro 2 file builder
│   └── [more modules]
├── shared/              # Shared code
│   └── schema.ts        # Database schema + types
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example         # Environment template
```

## Debugging

### VS Code Setup

1. Install **Thunder Client** or **REST Client** extension for API testing
2. Use built-in **Debugger** (Ctrl+Shift+D)
3. Breakpoints work on both frontend and backend

### Common Issues

**Port 5000 already in use?**
```bash
# Kill process on port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# Or change PORT in .env
PORT=3000
```

**Database connection error?**
- Check `DATABASE_URL` in `.env`
- Make sure PostgreSQL is running
- Verify credentials

**TypeScript errors?**
```bash
npm run check
```

## Deployment

### Option 1: Render (Recommended)
1. Push to GitHub
2. Connect repo at [render.com](https://render.com)
3. Add environment variables
4. Deploy

### Option 2: Railway
1. Connect GitHub repo at [railway.app](https://railway.app)
2. Add PostgreSQL plugin
3. Set environment variables
4. Auto-deploys on push

### Option 3: Heroku (Legacy)
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:standard-0
git push heroku main
```

### Option 4: Docker
```bash
docker build -t creditrepair .
docker run -p 5000:5000 creditrepair
```

## API Documentation

See `replit.md` for complete API route list and features.

## Next Steps

- 👤 [Setup authentication](./server/auth.ts)
- 💾 [Understand database schema](./shared/schema.ts)
- 🎨 [Explore UI components](./client/src/components)
- 🤖 [Configure OpenAI integration](./server/ai.ts)
- 💳 [Setup Stripe webhooks](./server/routes.ts)

---

**Questions?** Check `replit.md` for architecture details or open an issue on GitHub.
