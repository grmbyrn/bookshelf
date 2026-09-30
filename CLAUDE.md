# Bookshelf — working notes for Claude

A reading tracker, built as a portfolio project. Read [ROADMAP.md](ROADMAP.md) for the plan and
[docs/phase-0.md](docs/phase-0.md) for what already exists and why. Phase 0 is complete and deployed.

## Workflow

- One branch per unit of work: `feat/`, `fix/`, `chore/`, `refactor/`, `test/`, `docs/`.
- Conventional commit messages with those same prefixes.
- PR for everything, CI must be green, then squash-merge and delete the branch.
- Read `git diff --staged` before committing and `gh pr diff` before merging.
- Tick the ROADMAP checkbox in the same commit as the work, so the roadmap and the repo agree.
- Multi-commit PRs need an explicit `--title`; `--fill` uses the branch name and makes a poor history.

## Commands

```bash
npm run dev            # both apps: client :5173, server :3001
npm run lint           # ESLint, both workspaces
npm run typecheck      # tsc, both workspaces
npm test               # Vitest + Supertest (server), against bookshelf_test
docker compose up -d   # Postgres 17, creates bookshelf and bookshelf_test
npm run db:generate -w server   # schema.ts -> SQL migration
npm run db:migrate -w server    # apply migrations to the dev database
```

Test database migration (no dotenv-cli yet):

```bash
cd server && DATABASE_URL=postgres://postgres:postgres@localhost:5432/bookshelf_test npm run db:migrate
```

## Conventions that already exist — follow them

- **Env vars:** only `server/src/config/env.ts` reads `process.env`. Everything else imports `env`.
  Add a new variable to the Zod schema, `.env`, `.env.example`, `.env.test` and `.env.test.example`.
- **Relative imports need `.js`** — `"type": "module"` plus `module: nodenext`. The file is `.ts`,
  the import says `.js`.
- **Code lives under `src/`.** Config files (tsconfig, eslint.config.js, drizzle.config.ts,
  vitest.config.ts) sit at the workspace root, never under `src/`.
- **Backend layers:** routes → controllers → services → db. Business rules only in services, and
  services never import Express. Skip a controller that would only forward one call.
- **Errors:** throw `AppError(status, code, message)`. Every error response is
  `{ "error": { "code", "message" } }`. Never leak an unexpected error's message to the client.
- **Middleware order in `app.ts`:** global middleware, routes, `notFound`, `errorHandler` last.
- **Request bodies:** validated by `validate(schema)` with a Zod schema, so controllers can trust
  `req.body`. Schemas shared with the client belong in `shared/`.
- **Unused parameters are prefixed `_`** (`_req`, `_res`, `_next`) — ESLint is configured for it.
- **Tests sit beside the code** they test: `routes/health.ts`, `routes/health.test.ts`.
- **Close the pool** in tests (`afterAll(() => pool.end())`) or Vitest hangs after passing.

## Things that have already bitten us

- One TypeScript version across all workspaces. Hoisting means a mismatch breaks the lint toolchain
  in a way that looks unrelated.
- `app.use("/api", router)` mounts at a prefix; `app.get(path, router)` consumes the whole path and
  404s.
- Render builds with `npm ci --include=dev` — `NODE_ENV=production` otherwise omits devDependencies
  and the TypeScript build fails on missing `@types`.
- Never put a production connection string in `server/.env`; pass it inline for one-off commands.
- `.gitignore` patterns aren't prefixes: `.env` does not match `.env.test`.

## Deployment

Client on Vercel (root directory `client`), API on Render, database on Neon. Production is
single-origin: `client/vercel.json` rewrites `/api/*` to the Render URL, mirroring Vite's dev proxy,
so session cookies stay first-party. Migrations run from Render's start command.

Render's free tier sleeps after 15 minutes idle — the first request can take ~50s. Not a bug.
