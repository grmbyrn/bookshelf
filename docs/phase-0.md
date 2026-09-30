# Phase 0: the foundation

What was built, why it was built that way, and how to talk about it.

**Live:** https://bookshelf-five-topaz.vercel.app · **API:** https://bookshelf-ne4f.onrender.com/api/health

Phase 0 ended when one command starts both apps locally, `/api/health` reports the database is reachable, CI checks every push, and the whole thing runs on the internet against a hosted database. Seven commits, six pull requests.

---

## 1. What exists now

| Layer | Choice | Version |
| --- | --- | --- |
| Monorepo | npm workspaces (`client`, `server`, `shared`) | npm 11, Node 22 |
| Client | React + TypeScript + Vite | React 19, Vite 8 |
| Client data/forms | TanStack Query, React Router, React Hook Form + Zod | — |
| Server | Express + TypeScript | Express 5 |
| ORM | Drizzle + `pg` | drizzle-orm 0.45 |
| Database | PostgreSQL | 17 (Docker locally, Neon in production) |
| Validation | Zod (env vars and request bodies) | Zod 4 |
| Tests | Vitest + Supertest | Vitest 5 |
| Quality | ESLint (flat config), Prettier, `tsc --noEmit` | ESLint 10, TS 6 |
| CI | GitHub Actions with a Postgres service container | — |
| Hosting | Vercel (client), Render (API), Neon (database) | free tiers |

```
bookstash/
├── client/              React app — Vite dev server on :5173
│   ├── vercel.json      rewrites /api/* to the Render API in production
│   └── vite.config.ts   proxies /api/* to :3001 in development
├── server/              Express API on :3001
│   ├── src/
│   │   ├── app.ts       builds and exports the app (no listen)
│   │   ├── index.ts     the only file that opens a port
│   │   ├── config/      env.ts — Zod-validated environment
│   │   ├── db/          schema.ts (Drizzle tables), index.ts (pool + db)
│   │   ├── middleware/  AppError, errorHandler, notFound, validate
│   │   └── routes/      health.ts, health.test.ts
│   ├── drizzle/         generated SQL migrations (committed)
│   ├── tsconfig.json    strict config for dev and typecheck
│   └── tsconfig.build.json  production build only: src → dist, no tests
├── shared/              Zod schemas both sides will import (empty so far)
├── docker-compose.yml   Postgres 17 + both databases
├── docker/init/         SQL that runs on first container boot
└── .github/workflows/   ci.yml — lint, typecheck, test on every push
```

---

## 2. The decisions, and why

### Monorepo with npm workspaces

Client and server share types and validation rules. A signup form needs the same "password at least 8 characters" rule the API enforces — in separate repositories that rule gets copy-pasted and then drifts, and the drift shows up as a 400 the user can't explain. Workspaces let `shared/` be imported by name with no publishing step, and one `npm install` covers all three packages.

The cost is hoisting. npm installs everything into one root `node_modules`, so two workspaces that disagree about a version force npm to pick a winner and nest the loser. That caused a real failure (see §4).

### `app.ts` separate from `index.ts`

`app.ts` builds the Express app and exports it. `index.ts` imports it and calls `listen`. Nothing else.

This exists for testability. Supertest takes the app object and makes requests against it without binding a port, so tests can't collide with a running dev server or with each other in CI. Doing this split after twenty route files exist means touching all of them, so it was done while there was one.

### Layered backend: routes → controllers → services → db

Routes know about HTTP. Services know about business rules and nothing about HTTP — that's why `AppError` carries a status code, so a service can say "this is a 409" by throwing, without importing Express.

The rule has a limit: a controller that only forwards one call to one service is noise, so the route calls the service directly in that case. The point is separating business rules from transport, not filling every folder.

### Central error handling, one JSON shape

Every error becomes `{ "error": { "code", "message" } }`. `code` is machine-readable (`NOT_FOUND`, `VALIDATION_ERROR`) so the client can branch on it; `message` is for humans.

Three branches in the handler: an `AppError` returns its own status and code; a `ZodError` becomes a 400; anything else is logged server-side and returns a generic 500. That last branch is deliberate — an unexpected error's message can contain a SQL fragment, a file path or a connection string, and none of that should reach a client.

Registration order is load-bearing: routes, then the 404 handler, then the error handler. Express runs middleware in the order it was registered, so an error handler placed above the routes never fires.

### Environment variables parsed with Zod

`config/env.ts` defines a schema, parses `process.env` once at startup, and exits with a readable message if anything is missing or malformed. Everything else imports the typed `env` object; no other file reads `process.env`.

This replaced `process.env.DATABASE_URL!` — the non-null assertion silences the type error without preventing the crash, and the crash then surfaces somewhere confusing, inside the database driver. Validation at the boundary turns a mystery into one line naming the variable. `z.coerce.number()` handles the fact that every environment variable is a string, and `z.infer` derives the TypeScript type from the schema so there's no separate interface to maintain.

### Drizzle over Prisma

Drizzle's queries look like SQL and its migrations are plain `.sql` files you can read and review in a diff. There's no separate schema language and no generated client. For learning, being able to see exactly what SQL reaches the database matters more than the convenience Prisma adds.

Migrations are generated from `src/db/schema.ts`, committed to git, and applied in order. The `drizzle.__drizzle_migrations` table records what has run, so applying twice is a no-op.

### Two databases, plus a third in production

`bookshelf` for development, `bookshelf_test` for tests, both created automatically by the compose init script. Tests from Phase 1 onwards will insert and delete users constantly; sharing one database means a test run deletes the account you're clicking through in the browser, and leftover rows from a failed test make the next run fail for unrelated reasons.

Production is a Neon database, migrated by the same migration files.

### Single origin in both dev and production

In development Vite proxies `/api/*` to `localhost:3001`. In production `client/vercel.json` rewrites `/api/*` to the Render URL. Either way the browser only ever sees one origin.

This was chosen over pointing React at the API's domain directly, and it pays off in Phase 1: the session cookie stays first-party, so no `SameSite=None`, no CORS preflight for credentialed requests, and no `VITE_API_URL` to configure per environment. React calls `/api/...` and it works everywhere.

### Session cookies over JWTs (decided, implemented in Phase 1)

An httpOnly cookie can't be read by JavaScript, which closes off XSS token theft. A session row can be deleted, so logout and revocation actually work — a stateless JWT stays valid until it expires no matter what happens. The cost is a database lookup per request, which is a rounding error next to the network.

### Migrations run on deploy, not by hand

Render's start command is `npm run db:migrate -w server && npm start -w server`. Migrating on boot can't be forgotten, and drizzle skips anything already applied.

The limitation: several instances booting simultaneously would race. With one free-tier instance that can't happen; at more than one, this moves to a dedicated release step.

---

## 3. Quality gates

Every push runs three commands, and they're the same three you run locally:

```bash
npm run lint       # ESLint per workspace
npm run typecheck  # tsc --noEmit (server), tsc -b (client)
npm test           # Vitest + Supertest
```

The CI workflow starts a fresh Postgres 17 service container, waits for `pg_isready` (without that wait the migrate step races the database's startup — the classic flaky-CI bug), applies migrations from scratch, then runs all three. `npm ci` rather than `npm install`, so it installs strictly from the lockfile and fails if the lockfile and `package.json` disagree.

Workflow: one branch per unit of work, a PR, CI green, squash-merge, delete the branch. The value of a PR on a solo project isn't approval — it's a diff you read before merging, plus a gate that can't be skipped by accident.

Two tests exist: `/api/health` returns `{status: "ok", database: "connected"}`, and an unknown path returns the JSON 404 shape. The second one covers the `notFound` middleware for free.

---

## 4. Problems hit, and what they taught

These are worth remembering — they're the concrete stories behind the abstract decisions.

**Two Postgres servers on port 5432.** A Homebrew `postgresql@14` held `127.0.0.1:5432`; Docker bound `0.0.0.0:5432`. The specific binding wins, so every `localhost` connection reached the wrong server — one with no `bookshelf` database and no `postgres` role. `docker ps` said "Up" the whole time. *Lesson: "the container is running" and "I can reach the database" are different claims, and only the second one matters.*

**TypeScript 7 broke ESLint.** The server pulled TS 7 to the root by hoisting; the client's `typescript-eslint` chain loaded `ts-api-utils`, which resolved `typescript` upward to the hoisted 7 and crashed on an API that had moved. Fix: one TypeScript version across the repo, pinned to what the lint ecosystem supports. *Lesson: shared tooling wants a single version in a monorepo; hoisting decides the winner and the loser fails in a way that looks unrelated.*

**Two ESLint configs, one project.** A duplicate `eslint.config.js` under `src/` made typescript-eslint see two candidate root directories and refuse to guess. Fixed by deleting it and setting `tsconfigRootDir: import.meta.dirname` explicitly. *Lesson: config files belong at the workspace root; `src/` is for code.*

**`app.get` instead of `app.use` for a router.** `app.get("/api/health", healthRouter)` consumed the whole path as the mount point, leaving `/` for the router to match — which it couldn't, so every request 404'd. `app.use("/api", healthRouter)` strips the prefix and leaves `/health`. *Lesson: `use` mounts at a prefix, `get` matches one exact path.*

**Render built without devDependencies.** `NODE_ENV=production` makes npm omit devDependencies, so `@types/express` and friends were missing and `tsc` failed with `TS7016` on every import. Confirmed by matching a number in the log — "38 packages are looking for funding" locally under `--omit=dev` versus 100 with them. Fix: `npm ci --include=dev` for the build, keeping `NODE_ENV=production` for the runtime. *Lesson: builds need devDependencies, runtimes don't; hosts default to the runtime install.*

**Vitest hung after passing.** The `pg` pool keeps sockets open, so Node won't exit. `afterAll(() => pool.end())`. *Lesson: a test process that hangs after green tests is usually an open handle, not a broken test.*

---

## 5. Interview questions

### Architecture

**Why a monorepo rather than two repositories?**
The client and server share validation rules and types. In separate repos a Zod schema gets copy-pasted and then drifts, and the mismatch surfaces as a validation error nobody can explain. Workspaces give me one install, one lockfile, one CI run, and a `shared` package importable by name without publishing. The tradeoff is dependency hoisting — one root `node_modules` means two workspaces disagreeing on a version forces npm to nest one, and I hit exactly that with TypeScript and ESLint.

**Why split `app.ts` from `index.ts`?**
So tests can import the app without starting a server. Supertest drives the app object directly, no port bound, which means tests don't collide with my dev server or with each other in CI. `index.ts` is the only file that knows about ports. I did it while there was one route rather than after twenty.

**Explain the layers.**
Routes handle HTTP, services hold business rules, the db layer talks to Postgres. Services don't import Express — when one needs to signal "conflict" it throws an `AppError` carrying a 409, and the error handler translates that to a response. That keeps the rules testable without HTTP and makes it possible to change transport without touching them. I skip the controller when it would only forward one call.

**Why does middleware order matter?**
Express runs middleware in registration order, and an error handler is identified by having four parameters. Mine are registered last: routes, then the 404 handler, then the error handler. Put the error handler above the routes and it never fires; put the 404 above them and everything 404s.

### Data

**Why Drizzle rather than Prisma?**
Drizzle's migrations are plain SQL I can read in a diff and its query syntax stays close to SQL, so I know what reaches the database. No separate schema language, no generated client. Prisma's ergonomics are good, but I wanted to learn SQL rather than an abstraction over it.

**How do migrations reach production?**
They're generated from the Drizzle schema, committed, and applied by the start command on Render — `db:migrate` then `start`. Drizzle records applied migrations in a table, so a redeploy is a no-op. Migrating on boot can't be forgotten, which was the main risk. The limitation is that multiple instances booting at once would race; at that point it becomes a release step instead.

**Why is `email` unique but `name` not?**
Email identifies the account, so the constraint is in the database rather than only in app code — two simultaneous signups can't both pass an application-level check. Name is a display name; requiring uniqueness would stop two people being called the same thing for no benefit. I actually shipped `name` as unique by mistake and dropped it in a follow-up migration, which is a good demonstration of why migrations are versioned.

**Why UUID primary keys?**
IDs appear in URLs. A sequential integer tells anyone how many users I have and lets them walk the range. UUIDs also mean a client can generate an ID before insert, which helps with optimistic updates later.

**Why do you store a password hash and not a password?**
So a database breach doesn't hand over credentials. Argon2 is a slow, memory-hard hash chosen to make brute forcing expensive — the opposite goal from a fast hash like SHA-256. The column is called `password_hash` so nobody is tempted.

### Security

**How do you keep secrets out of the repository?**
`.gitignore` covers `.env` and `.env.test`; committed `.env.example` and `.env.test.example` document which variables exist without their values. That went in before the first `.env` was created, because a secret committed once stays in git history. When a connection string was exposed during setup I rotated it rather than assessing how likely exploitation was.

**What happens if an environment variable is missing in production?**
The Zod schema fails at startup and the process exits with a message naming the variable. Previously I had `process.env.DATABASE_URL!` — the assertion satisfies the compiler and changes nothing at runtime, so the failure surfaced deep inside the driver instead. Validating at the boundary means one clear error at the earliest possible moment.

**Why don't you return the real error message on a 500?**
Because unexpected error messages leak internals — SQL fragments, file paths, connection strings. The handler logs the full error server-side and returns a generic message with a stable code. Errors I raise deliberately, through `AppError`, do carry their message, because I wrote it for the user.

**How will the auth cookie be configured?**
httpOnly so JavaScript can't read it, secure so it only travels over HTTPS, and SameSite — which is straightforward because production is single-origin via the Vercel rewrite. That was a Phase 0 decision made specifically to avoid cross-site cookie problems in Phase 1.

### Testing and CI

**What does CI run, and how does it get a database?**
Lint, typecheck and tests on every push and PR. A Postgres service container starts fresh per run, and the workflow waits for `pg_isready` before migrating — without that wait, the migrate step races the database's startup, which is where flaky CI usually comes from. `npm ci` installs strictly from the lockfile, so a forgotten lockfile commit fails the build rather than passing quietly.

**How do tests avoid interfering with your development data?**
A separate `bookshelf_test` database, selected by `.env.test` loaded through `vitest.config.ts`. Vitest sets those variables before test files import anything, and dotenv doesn't overwrite variables that are already set, so the test values win. In CI there's no `.env.test` — the service container's details come from workflow env vars instead, and the same code reads them.

**What are you testing with the health check?**
That the API answers and that it can query Postgres — the route runs `select 1`, so a green health check means the whole chain works. Render polls it and won't route traffic to a deploy that fails it. A health check that only proves the process started would report healthy while the database was unreachable.

### Deployment

**Walk me through a deploy.**
Merge to main. GitHub Actions runs lint, typecheck and tests. Render rebuilds from main: `npm ci --include=dev && npm run build -w server`, then the start command migrates and boots. Vercel rebuilds the client from the same commit. `/api/health` on the live domain confirms the chain: Vercel rewrite → Render → Neon.

**Why is the client's `/api` proxied rather than calling the API's URL?**
Single origin in both environments. The browser sees one domain, so the session cookie is first-party, there's no CORS preflight on credentialed requests, and there's no per-environment API URL to configure. Vite's proxy does it in development, a `vercel.json` rewrite does it in production, and the React code is identical in both.

**Why a separate build config?**
`tsconfig.build.json` extends the base config and overrides only what a production build needs: `src` into `dist`, tests excluded, emit enabled. The base config stays strict for development and `--noEmit` typechecking. Shipping test files or the drizzle config to production would be dead weight.

**What broke when you first deployed, and how did you diagnose it?**
The build failed with `TS7016` on every Express import — no type declarations. The cause was `NODE_ENV=production`, which makes npm omit devDependencies, so `@types/*` were never installed. I confirmed it by matching a number in the build log: Render reported 38 packages looking for funding, and locally `npm ci --omit=dev` printed the same 38 against 100 for a full install. Fix was `--include=dev` for the build while keeping `NODE_ENV=production` at runtime — builds need dev dependencies, running servers don't.

### Tradeoffs and self-critique

**What would you do differently?**
Pin TypeScript to a version the lint ecosystem supports before installing anything else — I lost time to a crash inside `ts-api-utils` caused by a bleeding-edge compiler. I'd also set up CI earlier, since everything before it was verified by hand.

**What's incomplete?**
Tests don't reset the database between runs, which is fine for two read-only tests and needs fixing with the first test that inserts a user. `validate` is written but has no caller until Phase 1. A 400 currently says only "Invalid request" — no per-field detail, which the signup form will need. `shared/` is set up but empty. Rate limiting is installed and unused.

**Why so much setup before any features?**
Most of it is things that get expensive later: the app/index split touches every route file if deferred, secrets in git history can't be removed cleanly, and a deploy left until the end tends to reveal that the architecture assumed something the host doesn't do. The part I'd defend hardest is deploying a hello-world before writing a feature — every phase after this one ends with a working live version instead of a big first integration.

---

## 6. Where Phase 1 starts

First vertical slice, `POST /api/auth/register`:

1. `sessions` table (id, user_id, expires_at) + migration
2. A Zod register schema in `shared/` — its first real use
3. The route using the existing `validate` middleware
4. Argon2 hashing in a service, `AppError(409, "EMAIL_TAKEN", ...)` on duplicate
5. An API test — and the test-database reset that's now needed, since two register tests collide on the unique email
