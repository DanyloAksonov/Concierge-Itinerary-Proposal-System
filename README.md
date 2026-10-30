# Concierge Itinerary Proposal System

A lightweight tool for Exclusive Resorts concierges: build a curated itinerary for a member's upcoming stay, send it as a proposal, and let the member review, approve and "pay" to lock it in.

> **Status: work in progress.** Built in phases — setup & data ✅ · API · concierge dashboard · member view · final README. Architecture, API reference, design decisions and assumptions will be documented here as those phases land.

## Requirements

- **Node.js 22 or newer** (developed on Node 24).
- **npm** (ships with Node — no extra package manager needed).
- SQLite runs through [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3), a **native module**. Prebuilt binaries cover current Node versions on macOS, Linux and Windows. If none matches your platform, npm compiles it from source, which needs Python 3 and a C++ toolchain (Xcode Command Line Tools on macOS, `build-essential` on Linux).

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed in the terminal — usually <http://localhost:3000> (Next.js picks the next free port if 3000 is taken).

No `.env` file or database server is required. On a fresh clone:

1. `npm install` runs `prisma generate` (via `postinstall`) to build the typed Prisma client into `lib/generated/prisma/`.
2. `npm run dev` first runs `npm run db:setup` (via `predev`), which:
   - creates `data/app.db` if it doesn't exist and applies all migrations (`prisma migrate deploy`);
   - seeds the member **James Whitfield** and his reservation at **Villa Punta Mita, Mexico** (15–22 March 2027). The seed is idempotent, so it is safe on every start.
3. Then Next.js starts in development mode.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Set up the DB (migrate + seed), then start the dev server |
| `npm run build` / `npm start` | Production build / serve it (`start` also runs DB setup first) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run db:setup` | Apply pending migrations and seed |
| `npm run db:migrate` | Create and apply a new migration after editing the schema (dev only) |
| `npm run db:seed` | Re-run the seed (idempotent) |
| `npm run db:reset` | ⚠️ Delete **all** data, re-apply migrations, re-seed (dev only) |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Database

- **Engine:** SQLite file at `data/app.db` (git-ignored), accessed through **Prisma 7** with the `better-sqlite3` driver adapter.
- **Schema:** [`prisma/schema.prisma`](prisma/schema.prisma) is the source of truth. Tables and columns are snake_case in SQLite (`members`, `reservations`, `proposals`, `proposal_items`, `sent_emails`).
- **Migrations:** SQL files in [`prisma/migrations/`](prisma/migrations), committed to the repo. Prisma records which ones were applied in a `_prisma_migrations` table.

### Common tasks

**Change the schema**

```bash
# 1. edit prisma/schema.prisma
npm run db:migrate -- --name describe_the_change
# creates prisma/migrations/<timestamp>_describe_the_change/migration.sql,
# applies it to data/app.db and regenerates the Prisma client
```

Commit the new migration folder together with the schema change. Don't edit or rename a migration once it has been applied anywhere — Prisma checks them by name and checksum.

**Start over with a clean database**

```bash
npm run db:reset
```

> ⚠️ Irreversibly deletes every row (proposals, items, sent emails) and rebuilds the DB from migrations + seed. Development databases only — never point this at production. In Prisma 7, `migrate reset` no longer seeds on its own; the script chains `prisma db seed`.

Deleting the file works too: `rm -rf data && npm run db:setup`.

**Inspect the data**

```bash
npm run db:studio
```

### Environment variables

All optional — the defaults work out of the box.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./data/app.db` | SQLite file used by both the Prisma CLI and the app |

Put overrides in `.env.local` (git-ignored).

## Tests

```bash
npm test
```

Unit tests live in [`tests/`](tests) and currently cover the proposal status machine (`draft → sent → approved → paid`; every other transition is rejected).

## Project structure

```
app/                    Next.js App Router (pages, route handlers)
  _src/                 UI components (private folder, not routed)
    common/ui/          shadcn/ui components
    concierge/          concierge dashboard components
    member/             member view components
lib/
  db/                   Prisma client and database URL
  proposals/            domain logic: status machine, categories
  errors.ts             DomainError (business-rule failures)
  generated/prisma/     generated Prisma client (git-ignored)
prisma/                 schema, migrations, seed
tests/                  Vitest unit tests
docs/                   AI usage notes, backlog of deferred decisions
```

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Prisma 7 + SQLite · Zod · Vitest
