# Concierge Itinerary Proposal System

A lightweight tool for Exclusive Resorts concierges: build a curated itinerary for a member's upcoming stay, send it as a proposal, and let the member review, approve and "pay" to lock it in.

> **Status: work in progress.** Built in phases — setup & data ✅ · API ✅ · concierge entity ✅ · concierge dashboard ✅ · member view (gallery pending) · final README. Architecture, design decisions and assumptions will be documented here as those phases land.

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

| Page | URL | Who |
|---|---|---|
| Concierge dashboard | `/concierge` (`/` redirects here) | Internal staff |
| Member itinerary | `/proposal/<id>` — the link in the email, or "Open as member" on the dashboard | Members |

Internal and member pages have separate URL prefixes so that, once there is a login, one rule can protect everything under `/concierge`.

No `.env` file or database server is required. On a fresh clone:

1. `npm install` runs `prisma generate` (via `postinstall`) to build the typed Prisma client into `lib/generated/prisma/`.
2. `npm run dev` first runs `npm run db:setup` (via `predev`), which:
   - creates `data/app.db` if it doesn't exist and applies all migrations (`prisma migrate deploy`);
   - seeds the member **James Whitfield**, his reservation at **Villa Punta Mita, Mexico** (15–22 March 2027) and the concierge **Sofia Navarro**. The seed is idempotent, so it is safe on every start.
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
| `npm run db:migrate` | Regenerate the client, then create and apply a new migration after editing the schema (dev only) |
| `npm run db:seed` | Re-run the seed (idempotent) |
| `npm run db:reset` | ⚠️ Delete **all** data, re-apply migrations, re-seed (dev only) |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run images:optimize` | Convert new PNG/JPEG files in `public/images` to resized WebP and delete the originals |

## Database

- **Engine:** SQLite file at `data/app.db` (git-ignored), accessed through **Prisma 7** with the `better-sqlite3` driver adapter.
- **Schema:** [`prisma/schema.prisma`](prisma/schema.prisma) is the source of truth. Tables and columns are snake_case in SQLite (`members`, `reservations`, `concierges`, `proposals`, `proposal_items`, `sent_emails`).
- **Who prepared a proposal:** every proposal belongs to a concierge (`proposals.concierge_id`). There is no login yet, so the server attributes new proposals to the current concierge itself (`getCurrentConcierge()` in `domain/concierges/service.ts`, the single place a session lookup will go); clients never send a concierge id. Members and concierges are separate tables — different roles and relations.
- **Migrations:** SQL files in [`prisma/migrations/`](prisma/migrations), committed to the repo. Prisma records which ones were applied in a `_prisma_migrations` table.
- **Audit timestamps:** every table has `created_at`; tables whose rows change after creation (`members`, `reservations`, `concierges`, `proposals`) also have `updated_at`, set by Prisma on every update. `proposal_items` are replaced, never edited, and `sent_emails` is an append-only log whose `sent_at` is its creation time.

### Common tasks

**Change the schema**

```bash
# 1. edit prisma/schema.prisma
npm run db:migrate -- --name describe_the_change
# creates prisma/migrations/<timestamp>_describe_the_change/migration.sql,
# applies it to data/app.db; the script runs `prisma generate` first,
# because Prisma 7's `migrate dev` no longer regenerates the client itself
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
| `CURRENT_CONCIERGE_EMAIL` | `sofia.navarro@example.com` (the seeded concierge) | Which concierge new proposals are attributed to, until there is a login |

Put overrides in `.env.local` (git-ignored).

## API

JSON over Next.js Route Handlers. Request bodies must be sent with `Content-Type: application/json`. A proposal's `id` is always its unguessable public id (the same one used in the member link), never its database key. Item and reservation ids are plain integers; they grant no access, so they don't need to be unguessable.

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /api/reservations` | — | `200 { reservations: [{ reservation, member }] }` | — |
| `POST /api/proposals` | `{ reservationId, title, note?, items?: Item[] }` | `201` proposal (status `draft`) + `Location` header | 400, 404, 422 |
| `GET /api/proposals` | — | `200 { proposals: [{ id, title, status, itemCount, totalCents, categories, firstDay, lastDay, conciergeName, …timestamps }] }` | — |
| `GET /api/proposals/:id` | — | `200` proposal with items (sorted by time), `totalCents`, reservation, member, concierge | 404 |
| `PATCH /api/proposals/:id` | **either** `{ status }` **or** `{ title?, note?, items? }` (drafts only; `items` replaces the list) | `200` proposal | 400, 404, 409, 422 |
| `POST /api/proposals/:id/send` | — | `200 { proposal, email }` | 404, 409 |

`Item` = `{ category, title, description?, scheduledAt: "YYYY-MM-DDTHH:mm" (destination-local), priceCents }`. Money is always integer cents; totals are computed, never stored.

**Workflow:** `draft → sent → approved → paid`, one step at a time. `PATCH { "status": "sent" }` goes through the same path as `/send`, so a sent proposal always has an email record. Sending writes the status, `sent_at` and a `sent_emails` row in one transaction, then logs the email to the server console.

**Errors** always look like `{ "error": { "code", "message", "details"? } }`:

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Malformed JSON or a body that fails validation (`details.issues` lists each field) |
| 404 | `NOT_FOUND` | Unknown proposal or reservation |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | A request body sent without `Content-Type: application/json` (blocks cross-site form posts) |
| 409 | `INVALID_TRANSITION` | Status change not allowed from the current status (e.g. approve a draft, pay twice) |
| 409 | `CONFLICT` | Editing a non-draft, sending an empty proposal, or a concurrent change (e.g. double-clicked "Pay") |
| 422 | `RULE_VIOLATION` | An item scheduled outside the stay (arrival and departure days count) |
| 500 | `INTERNAL` | Unexpected error — logged on the server, never leaked |

Try it (with `npm run dev` running):

```bash
curl -s localhost:3000/api/reservations
curl -s -X POST localhost:3000/api/proposals -H 'content-type: application/json' \
  -d '{"reservationId":1,"items":[{"category":"DINING","title":"Private chef dinner","scheduledAt":"2027-03-16T19:00","priceCents":120000}]}'
curl -s -X POST localhost:3000/api/proposals/<id>/send   # watch the server console for the email
```

## Assumptions

- `price_cents` on an item is the **total estimated price for the whole party**, not per person (there is no party size yet — see `docs/BACKLOG.md`).
- Images are AI-generated placeholders (Google Gemini), not photos of the real property.

## Known limitations and trade-offs

### Security model

There is no login; the brief asks for a member link, not accounts.

- **What the link protects:** the member page. Proposal ids are random 21-character ids, so a member can't guess another member's link from their own.
- **What it doesn't protect:** the API. `GET /api/proposals` lists every proposal id to anyone who calls it, and anyone holding an id can approve and pay. The API also can't tell a member from a concierge, so either can call any endpoint. Links never expire, so a forwarded email keeps working.
- **Already in place:** request bodies must be `application/json`, which stops a form on another website from posting to the API; unexpected errors are logged on the server and never returned to the client.
- **With more time:** concierge login (with the concierge endpoints behind it), and member access through signed, expiring tokens that can only approve and pay their own proposal.

### SQLite

SQLite is what the brief asks for and it makes the project one command to run, but it has costs a production system wouldn't accept:

- SQLite can't add a column with a non-constant default (such as the current time), so those migrations rebuild the table and copy every row.
- One writer at a time. The status updates are race-safe, but writes queue under load.
- A database file can't be deployed to serverless hosts such as Vercel.
- `better-sqlite3` is a native module (see Requirements).

For production I'd move to Postgres; the Prisma schema and services would barely change.

### Workflow and data

- **Only `draft → sent → approved → paid`.** A member can't decline or ask for changes. If the concierge sends a corrected proposal, the earlier one isn't superseded, so the member could still approve and pay the old one.
- **Prices are USD estimates.** There is no currency field.
- **Unknown member links show the "can't find this itinerary" page with HTTP 200, not 404.** The page streams (Next.js Partial Prerendering), so the status is sent before the database lookup finishes; Next adds `noindex`, and the not-found content arrives in the streamed payload, so it needs JavaScript to appear. A true 404 would need the id checked in `proxy.ts` before rendering, which is an extra database read on every visit.
- **Times are destination wall-clock times** (`2027-03-16T19:00` in the reservation's time zone). That's what an itinerary means, but the API can't check whether a time is in the past. Punta Mita has no daylight saving time, so no times are skipped or repeated.

## Tests

```bash
npm test
```

Tests live in [`tests/`](tests):

- **Unit:** status machine, stay-date rule, totals, request validation, and the HTTP layer (each error code's status, content-type check, no leaked internals on 500s).
- **Service (real SQLite):** the full create → send → approve → pay loop, error cases, and a concurrency test proving two simultaneous approvals can't both succeed. A global setup migrates one template DB per run (`prisma migrate deploy`); each test works on its own copy, so tests never touch `data/app.db`.

## Project structure

```
app/                    Next.js App Router (pages, route handlers)
  _src/                 UI (private folder, not routed)
    common/components/  shared and shadcn/ui components, one folder each (<Name>/index.tsx)
    concierge/components/  concierge dashboard components
    member/components/     member view components
    <module>/screens/      whole pages as plain components; the route files in app/ only load data
domain/                 business logic, one folder per entity
  proposals/            service, status machine, rules, validation, email, categories
  reservations/         service
  concierges/           concierge DTO + current-concierge resolver
  errors.ts             DomainError (business-rule failures)
lib/                    infrastructure and generic helpers
  api/                  route-handler helpers: error mapping, body parsing
  db/                   Prisma client and database URL
  format.ts             money and date formatting
  generated/prisma/     generated Prisma client (git-ignored)
prisma/                 schema, migrations, seed
tests/                  Vitest tests, grouped by module
docs/                   AI usage notes, backlog of deferred decisions
```

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Prisma 7 + SQLite · Zod · Vitest
