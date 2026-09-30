# Bookshelf MVP roadmap

Sep 25, 2026 · @Graeme

The MVP is done when a new user can sign up, find and shelve books, track progress toward a yearly goal, add books manually and share them with friends, on a live site that matches the design. Ten phases get there, each ending with something working and deployed.

## How to work

Build each feature as a thin slice through all three tiers: database table, then API route, then React screen. Finish one slice before starting the next.

- **One branch and pull request per feature.** Name branches like `feature/login`, and merge only when CI passes.
- **Deploy at the end of every phase.** Problems show up early, and you always have a working live version to show.
- **Write the test with the feature.** Business rules (progress maths, who can share with whom) get unit tests; each route gets at least one API test.
- **Log decisions as you go.** Add a line to the README's "Decisions & tradeoffs" section whenever you choose between two options.
- **Backend layers.** Every feature follows routes → controllers → services → db, even when a controller is one line. Controllers handle HTTP (reading the request, cookies, status codes, the response); services hold the business rules and never see `req` or `res`.

## Phase 0: Finish the foundation

Done when `npm run dev` starts both apps, the health check returns "connected", CI passes on a push to GitHub, and a hello-world version is live on the internet against its own database.

**Into git first**

- [x] Create the `client` app with Vite and install its packages
- [x] Confirm `/api/health` returns `{"status":"ok","database":"connected"}`
- [x] First commit and push to GitHub — check `git status` before `git add`, and make sure `.env` isn't listed
- [x] Add `docker-compose.yml` for Postgres, so the database setup is in the repo rather than a remembered `docker run`

**Backend structure**

- [x] Create the backend folders: `routes`, `controllers`, `services`, `db`, `middleware`
- [x] Split the app from the server: `src/app.ts` builds and exports the Express app, `src/index.ts` only calls `listen`. Supertest needs the app without a listening port, and retrofitting this later means touching every route file.
- [x] Add a central error handler so every error returns the same JSON shape, e.g. `{ "error": { "code", "message" } }`
- [x] Add a 404 handler beside it, so unknown routes return that shape instead of Express's HTML page
- [x] Add a `validate(schema)` middleware that checks request bodies with Zod and returns 400 on bad input
- [x] Replace `process.env.DATABASE_URL!` with an env module that parses `process.env` through Zod and fails loudly at startup. A missing variable should be one clear error, not a confusing crash inside the database driver.

**Make CI possible**

- [x] Add ESLint to the server (the client already has one from the Vite template) and a Prettier config file
- [x] Add root `lint`, `typecheck` and `test` scripts — the current `test` is still the `npm init` stub that always exits 1
- [x] Decide how tests get a database: a separate `bookshelf_test` database, reset between runs. Write the choice in the README.
- [x] Write one API test against `/api/health` — `vitest` exits non-zero when it finds no test files, so CI needs something real to run
- [x] Add GitHub Actions to run lint, type-check and tests on every push, with a Postgres service container for the API tests

**Ready to deploy**

- [x] Add server `build` (tsc) and `start` (node dist) scripts — `tsx watch` is dev-only — and pin the Node version with `engines`
- [x] Make production look like one site, as the Vite proxy does in dev: have the frontend host forward `/api/*` to the API (a rewrite in `vercel.json`, or a rule in Netlify's `_redirects`). React keeps calling `/api/...` everywhere, and the login cookie stays first-party. Test this now: left until Phase 1, it shows up as a login that works locally and fails on the live site.
- [x] Decide how migrations run on deploy: `drizzle-kit migrate` as a release step, never by hand against production
- [x] Deploy: database on Neon, API on Render or Railway, client on Vercel or Netlify, with environment variables set on each host
- [x] Write the first README: what it is, how to run it locally, how to run the tests

## Phase 1: Accounts and login

Done when a user can register, log in, stay logged in after a refresh, and log out, and signed-out users are sent to the login page.

**Backend**

- [ ] Add a `sessions` table (id, user\_id, expires\_at)
- [ ] `POST /api/auth/register`: validate, hash the password with argon2, create the user, start a session
- [ ] Lowercase and trim emails in the Zod schema on both register and login, so `Graeme@mail.com` and `graeme@mail.com` can't become two accounts
- [ ] `POST /api/auth/login`: check the password, create a session, set an `httpOnly`, `secure`, `SameSite=Lax` cookie
- [ ] `POST /api/auth/logout`: delete the session and clear the cookie
- [ ] `GET /api/auth/me`: return the logged-in user, or 401
- [ ] `requireAuth` middleware that loads the user from the cookie and puts it on the request
- [ ] Rate-limit login and register with express-rate-limit
- [ ] Return the same "Email or password is incorrect" message for both wrong email and wrong password
- [ ] Clear out expired sessions — check `expires_at` on every lookup, and delete stale rows on login so the table doesn't grow forever

**Frontend**

- [ ] Design foundations, just enough for these two screens: `tokens.css` with the colors, fonts and spacing from the design, plus `Button`, `Input`, `Field` and `Spinner`. The rest of the design system is Phase 2 — but building auth screens before any of it exists means building them twice.
- [ ] Log in and Create account pages, matching the design (password rules, "email already exists" error)
- [ ] A `useCurrentUser` hook built on `GET /api/auth/me` with TanStack Query
- [ ] Protected routes: signed-out users go to `/login`, signed-in users skip it

**Tests**

- [ ] API tests: register, duplicate email, wrong password, `me` with and without a cookie

## Phase 2: Design system and app shell

Done when the signed-in layout matches the design on desktop and mobile, with placeholder content in the main area.

- [ ] Finish `tokens.css`: the remaining colors, fonts (Lora, Inter), radii and spacing from the design file, as CSS variables in one place
- [ ] Build the rest of the base components: `Select`, `Modal`, `Tag`, `ProgressBar`, `EmptyState` (`Button`, `Input`, `Field` and `Spinner` came in Phase 1)
- [ ] `BookCover`: shows the cover image, or a colored placeholder with the title when there isn't one
- [ ] Build accessibility into the components as you go: a label tied to every input, a visible focus style, contrast checked once here in the tokens. Phase 9 is then an audit rather than a rewrite of every screen.
- [ ] App layout: sidebar and top bar on desktop, bottom tab bar on mobile
- [ ] Routes for every screen, even if they're empty for now
- [ ] Check it at 390px wide (phone) and 1280px wide (laptop)

## Phase 3: Search for books and add them to a shelf

Done when a user can search "andy weir", see real results with covers, and add one to a shelf.

**Backend**

- [ ] Add the `books` and `user_books` tables (see Database tables below)
- [ ] `GET /api/books/search?q=`: call the Open Library search API from the server, never from React, and return a cleaned-up list
- [ ] Give that call a timeout, and decide what the UI shows when Open Library is slow or down — it's someone else's free API, and it will be both
- [ ] Save a book to `books` the first time anyone adds it, keyed by its Open Library ID, so it's never fetched twice
- [ ] `POST /api/user-books`: add a book to the user's shelf; return 409 if it's already there
- [ ] Mark results the user already has ("On your shelf: Currently reading")

**Frontend**

- [ ] Search box with a 300ms debounce
- [ ] Results page with the "Add to shelf" menu (Want to read, Currently reading, Read)
- [ ] Loading, no-results and error states
- [ ] "Can't find your book? Add it manually" link (the form comes in Phase 7)

## Phase 4: Shelves

Done when the Currently reading page looks like the original screenshot, using the user's real books.

- [ ] `GET /api/user-books?status=reading&sort=recent`, paginated
- [ ] `GET /api/user-books/counts` for the numbers in the sidebar
- [ ] Shelf pages: All books, Want to read, Currently reading, Read, Favorites
- [ ] Book cards with cover, author, genre tag and progress bar
- [ ] Sort menu (Recent, Title, Progress)
- [ ] Move a book to another shelf, favorite it, or remove it
- [ ] Empty state for each shelf, with a button to search for books
- [ ] A seed script that fills a dev account with books across every shelf, so you stop adding books by hand every time you want to look at a page. Phase 9 grows it into the demo account.
- [ ] API test: a user can never see or change another user's books

## Phase 5: Book page and reading progress

Done when a user can open a book, enter the page they're on, and see the percentage, pace and estimated finish date update straight away.

- [ ] `GET /api/user-books/:id`: book details plus the user's progress
- [ ] `PATCH /api/user-books/:id`: update the page, shelf, rating or favorite
- [ ] Status rules in the service: moving to Currently reading sets `started_at`; reaching the last page or moving to Read sets `finished_at`
- [ ] Work out percentage, pages per day and estimated finish in the service, not in React
- [ ] Unit tests for the progress maths, including a book with no page count
- [ ] Book page matching the design: cover, details, shelf dropdown, page input, progress bar, the three stats
- [ ] Optimistic update: the progress bar moves before the server replies, and rolls back if the request fails

## Phase 6: Yearly reading goal

Done when the sidebar shows "15 / 24 books" from real data, and finishing a book moves it up by one.

- [ ] Add the `reading_goals` table: one row per user per year
- [ ] `GET /api/goals/current` and `PUT /api/goals/:year`
- [ ] Count books with `finished_at` in the current year; don't store the count, since stored counts drift out of sync
- [ ] Goal widget in the sidebar and on the mobile shelf screen
- [ ] A "Set your goal" state for users who haven't set one
- [ ] Unit tests: books finished last year don't count; the percentage stops at 100%

## Phase 7: Add a book manually

Done when a user can add a book the search can't find, and it behaves like any other book on their shelves.

- [ ] `POST /api/books`: creates a book with `source = 'manual'` and `created_by` = the user
- [ ] Share one Zod schema between the form and the route through the `shared` folder
- [ ] Manual books are only visible to the user who added them: search and other users never see them
- [ ] Form matching the design: title and author required, pages, year, genre, ISBN, shelf, description
- [ ] For the MVP, the cover is an optional image URL or the colored placeholder; real uploads come after the MVP
- [ ] API test: another user can't read or shelve someone else's manual book

## Phase 8: Friends and sharing

Done when two test accounts can become friends, one shares a book with a note, and the other adds it to Want to read from Shared with me.

**Scope guard.** This is the largest phase — two subsystems, a friendship state machine and a share inbox — and the one a recruiter is least likely to click. It also sits directly before the phase that actually sells the project. If time or energy is running short by the end of Phase 7, move this whole phase to After the MVP, drop sharing from the MVP definition at the top, and make Phase 9 the launch. Decide deliberately rather than by drifting into it.

**Friends (the smallest version that sharing needs)**

- [ ] Add the `friendships` table: requester, addressee, status (pending, accepted)
- [ ] Allow one friendship per pair in either direction: a unique index on (least(requester_id, addressee_id), greatest(requester_id, addressee_id)), so A→B and B→A can't both exist
- [ ] Send a friend request by email address; accept or decline it
- [ ] A Friends page listing friends and pending requests

**Sharing**

- [ ] Add the `shares` table: sender, recipient, book, note, status (new, added, dismissed)
- [ ] `POST /api/shares`: only allowed between accepted friends; reject manual books the recipient can't see
- [ ] `GET /api/shares/inbox` and `PATCH /api/shares/:id` (add to shelf, dismiss)
- [ ] Share dialog on the book page: pick friends, add a note, gray out friends who already have the book
- [ ] Shared with me page, plus the count badge in the sidebar and tab bar
- [ ] Tests: sharing with a non-friend returns 403; adding from the inbox creates the `user_books` row

## Phase 9: Polish and launch

Done when a recruiter can open the live link, log in to the demo account in one click, and use everything without hitting a bug.

- [ ] Every screen has loading, empty and error states
- [ ] Accessibility audit: a keyboard-only pass over every screen, alt text on covers, contrast re-checked. The component-level work happened in Phase 2 — this is checking, not building.
- [ ] Extend the Phase 4 seed script into the demo account: books on every shelf, a goal and two shares; add a "Try the demo account" button
- [ ] One Playwright end-to-end test: sign up, search, add a book, update progress
- [ ] Error monitoring with Sentry on both client and server
- [ ] Remove `console.log`s, dead code and TODOs
- [ ] README: live link, demo login, screenshots or a GIF, features, stack, architecture (three tiers, backend layers), setup steps, decisions and tradeoffs
- [ ] Pin the repo on GitHub and add it to your CV and LinkedIn
- [ ] Practise a two-minute walkthrough: the architecture, and the hardest problem you solved

## Database tables

Seven tables cover the whole MVP. Add each one in the phase that first needs it, with its own migration.

| Table           | Key columns                                                                                                                                 | Rules                                                                             | Phase |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- |
| `users`         | id, name, email, password\_hash, created\_at                                                                                                | email unique                                                                      | 0     |
| `sessions`      | id, user\_id, expires\_at                                                                                                                   | deleted on logout                                                                 | 1     |
| `books`         | id, source (openlibrary or manual), external\_id, title, authors, cover\_url, page\_count, published\_year, genre, description, created\_by | external\_id unique for Open Library books; created\_by set only for manual books | 3     |
| `user_books`    | id, user\_id, book\_id, status (want, reading, read), current\_page, rating, is\_favorite, started\_at, finished\_at, updated\_at           | one row per user and book                                                         | 3     |
| `reading_goals` | user\_id, year, target                                                                                                                      | one row per user and year                                                         | 6     |
| `friendships`   | id, requester\_id, addressee\_id, status (pending, accepted), created\_at                                                                   | one row per pair of users, in either direction (unique index on the sorted pair)  | 8     |
| `shares`        | id, sender\_id, recipient\_id, book\_id, note, status (new, added, dismissed), created\_at                                                  | sender and recipient must be friends                                              | 8     |

The split between `books` and `user_books` matters: a book is stored once, and each user's progress and shelf live in their own row. Worth explaining in interviews.

**Three decisions to make when you write the Phase 3 migration**, because all three are painful to change once there's data:

- `books.authors` — Open Library returns several per book. A `text[]` column is the simple choice and fine for the MVP; a separate authors table is the "correct" one and buys you author pages later. Pick one and log it in Decisions & tradeoffs.
- `books.genre` — free text straight from the API, or your own fixed list? Free text is easier to import and much worse to filter by, and Phase 4 shows genre as a tag.
- `user_books` — "one row per user and book" needs a real composite unique constraint on (`user_id`, `book_id`), not just a check in the service. It's what makes the 409 in Phase 3 reliable when two requests arrive at once.

## API endpoints

All routes start with `/api`, and all except auth need the user to be logged in.

| Method | Route                             | What it does                                   | Phase |
| ------ | --------------------------------- | ---------------------------------------------- | ----- |
| GET    | `/health`                         | Checks the API and database are up             | 0     |
| POST   | `/auth/register`                  | Creates an account and logs in                 | 1     |
| POST   | `/auth/login`                     | Logs in                                        | 1     |
| POST   | `/auth/logout`                    | Logs out                                       | 1     |
| GET    | `/auth/me`                        | Returns the current user                       | 1     |
| GET    | `/books/search?q=`                | Searches Open Library                          | 3     |
| POST   | `/user-books`                     | Adds a book to a shelf                         | 3     |
| GET    | `/user-books?status=&sort=&page=` | Lists the user's books                         | 4     |
| GET    | `/user-books/counts`              | Book counts per shelf                          | 4     |
| DELETE | `/user-books/:id`                 | Removes a book from the user's shelves         | 4     |
| GET    | `/user-books/:id`                 | One book with the user's progress              | 5     |
| PATCH  | `/user-books/:id`                 | Updates page, shelf, rating, favorite          | 5     |
| GET    | `/goals/current`                  | This year's goal and progress                  | 6     |
| PUT    | `/goals/:year`                    | Sets the goal for a year                       | 6     |
| POST   | `/books`                          | Adds a book manually                           | 7     |
| GET    | `/friends`                        | Friends and pending requests                   | 8     |
| POST   | `/friends/requests`               | Sends a friend request by email                | 8     |
| PATCH  | `/friends/requests/:id`           | Accepts or declines a request                  | 8     |
| POST   | `/shares`                         | Shares a book with friends                     | 8     |
| GET    | `/shares/inbox`                   | Books shared with the user                     | 8     |
| PATCH  | `/shares/:id`                     | Adds a shared book to a shelf, or dismisses it | 8     |

## After the MVP

The MVP's tables and layers already leave room for all of these, so none of them means rebuilding what's there. Roughly in order of value:

1. Password reset by email (Resend)
2. Sign in with Google
3. Cover image uploads for manual books (Cloudinary or S3/R2)
4. Notes and a reading log on the book page
5. Star ratings and short reviews
6. Import a Goodreads CSV export
7. A stats page: books per month, pages read, favorite genres
8. Replying to a shared book, plus email alerts for new shares
9. Dark mode
