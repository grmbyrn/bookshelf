# Bookshelf

A reading tracker: search for books, shelve them, track progress toward a yearly goal.
Work in progress — see [ROADMAP.md](ROADMAP.md).

**Live:** https://bookshelf-five-topaz.vercel.app · **API:** https://bookshelf-ne4f.onrender.com/api/health

> The API is on Render's free tier and sleeps after 15 minutes idle — the first request can take ~50s.

## Stack

- **Client** — React 19, TypeScript, Vite, TanStack Query, React Router, React Hook Form + Zod
- **Server** — Express 5, TypeScript, Drizzle ORM, PostgreSQL 17
- **Monorepo** — npm workspaces (`client`, `server`, `shared`)

## Running locally

Requires Node 22+ and Docker.

```bash
# 1. Start Postgres (creates the bookshelf and bookshelf_test databases)
docker compose up -d

# 2. Install dependencies (from the repo root)
npm install

# 3. Configure the server
cp server/.env.example server/.env
cp server/.env.test.example server/.env.test

# 4. Create the database tables
npm run db:migrate -w server
cd server && DATABASE_URL=postgres://postgres:postgres@localhost:5432/bookshelf_test npm run db:migrate && cd ..

# 5. Start both apps
npm run dev
```

Client on http://localhost:5173, API on http://localhost:3001.
Check it's working: `curl http://localhost:3001/api/health → {"status":"ok","database":"connected"}`

## Decisions & tradeoffs

- npm workspaces over separate repos — the client and server share Zod schemas and types; separate repos mean copy-paste and drift.
- Drizzle over Prisma — SQL-shaped queries and migrations you can read, with no separate schema language or generated client.
- Session cookies over JWTs — httpOnly cookies can't be read by JavaScript, and sessions can be revoked server-side.
- `shared` compiles to `dist` over exporting TypeScript source — the server builds with `tsc` and `rootDir: src`, so importing source across the workspace boundary escapes `rootDir` and breaks the production build on Render rather than locally.
- `shared` builds through npm's `prepare` hook over an explicit build step — `npm ci` runs it automatically, so there is one command to forget on Render and in CI instead of two.
- Login validates only that a password was entered, not the register rules — rules change over time, and enforcing today's rules at login would lock out an account whose password predates them.
- Tests truncate between cases rather than rolling back a transaction — Supertest drives the real app, which takes its own connection from the pool, so a transaction opened in the test would be invisible to the code under test.
- The reset discovers tables from `pg_tables` rather than a hardcoded list, and refuses any database whose name doesn't end in `_test` — Drizzle's migration ledger lives in a separate schema, so it's excluded for free.
- Vitest runs test files serially (`fileParallelism: false`) — one test database shared by every file means parallel files would truncate each other mid-test.
