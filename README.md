# Bookshelf

A reading tracker: search for books, shelve them, track progress toward a yearly goal.
Work in progress — see [ROADMAP.md](ROADMAP.md).

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
