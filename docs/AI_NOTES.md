# AI usage notes

Working log of how AI (Claude Code) was used. Summarised into the README at the end.

## Kickoff review

- Kickoff prompt: read `CLAUDE.md` + the brief, restate the task, list ambiguities with proposed assumptions, critique `CLAUDE.md` — no code until I confirm, then work phase by phase with a stop after each.
- AI restated the brief, listed ambiguities with proposed assumptions, and critiqued `CLAUDE.md`. I reviewed and accepted:
  - 400 (shape) vs 422 (domain rule) split.
  - Race-safe status updates (`UPDATE … WHERE status = <from>`) instead of check-then-write.
  - `PATCH { status: "sent" }` reuses the send service, so `sent` always has an email record.
  - Local wall-time `scheduled_at` + `time_zone` column on reservations instead of a hardcoded zone.
  - All UI mutations through Route Handlers (no Server Actions) — I asked for the reasoning before agreeing.
  - Dropped `proposal_items.position` (ordering is by `scheduled_at`).
- I cross-checked `docs/TASK.md` against the original PDF; no differences that change scope.
- My call: private material lives in a git-ignored `_local/` folder.

## Phase 1 — Setup & data

- AI scaffolded with `create-next-app@16.4.3` and `shadcn@4.23.0` (Radix base chosen over the new Base UI default for proven dialog a11y).
- Fixes AI made to generated output:
  - Scaffold + shadcn left `--font-sans: var(--font-sans)` (self-reference → font fallback); layout now sets `--font-sans` from Geist.
  - Bumped `@types/node` to ^24 to match the Node 24 runtime (Vitest 5 peer requirement) instead of `--legacy-peer-deps`.
  - Renamed `vitest.config.ts` → `.mts` to clear Vite's ESM-as-CJS warning.
- AI flagged and checked the unfamiliar `cn` dependency shadcn added (published by the shadcn maintainer; replaces clsx + tailwind-merge).
- Verified by AI (commands shown in chat; still to be re-checked by me): fresh `npm run dev` creates and seeds `data/app.db`; re-seeding is idempotent; CHECK / FK / UNIQUE / cascade constraints probed with raw SQL in a rolled-back transaction.

### Switch Drizzle → Prisma (my decision, before the first commit)

- AI replaced Drizzle with Prisma 7.10.1 (`prisma-client` generator + better-sqlite3 driver adapter). It noticed the npm `latest` tag of `prisma` points at an 8.0 RC and pinned all Prisma packages to the matching stable 7.10.1.
- Status and category are now Prisma enums; `lib/proposals/*` re-exports them from the runtime-free `enums.ts`, so the schema is the single source of truth.
- Trade-off accepted: Prisma doesn't emit SQLite CHECK constraints, so the DB-level checks on status and `price_cents >= 0` are gone. Enum values are enforced by the Prisma client; price by Zod (Phase 2). Hand-editing CHECKs into migration SQL was rejected — Prisma rebuilds SQLite tables on later migrations and would silently drop them.
- Known, accepted: `npm audit` reports 3 low issues in `deepmerge` inside the shadcn CLI (the "fix" downgrades shadcn to 1.0).
- Verified by AI: in a copy containing only the files git would commit, `npm install` generated the client and `npm run dev` applied the migration, seeded, and served the page. Prisma's adapter turns `PRAGMA foreign_keys` on; FK rejection, cascade delete and enum rejection were probed.

### Components folder (my decision)

- Components live in the private route folder `app/_src/{common,member,concierge}`; shadcn's `components.json` aliases point to `app/_src/common/ui` (verified with `shadcn add --dry-run`).

### Member view design input

- Design brief came from a separate Claude chat (style of a luxury real-estate listing page); AI rendered the screenshot, checked the palette contrast (white/gold text fails AA → gold only as fill behind charcoal) and confirmed 2027-03-15 is a Monday.
- My decisions: photos served from a public Cloudflare R2 bucket (production-like) but kept as simple as possible — gallery list in code, DB-managed photos deferred. Deferred items are tracked in `docs/BACKLOG.md`.

### README v1 + DB scripts

- AI tried `prisma migrate reset --force` to check whether Prisma 7 still seeds after a reset. Prisma's own guard detected an AI agent and refused without user consent; AI stopped, explained the command, impact (dev DB only, seed data only) and options, and ran it only after my explicit "Yes, reset the DB" (passed via `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`).
- Finding: Prisma 7 `migrate reset` does **not** seed → `db:reset` chains `prisma db seed`. ~~Also confirmed `migrate dev` still regenerates the client.~~ **Wrong** — AI had only checked the help text and a no-op run. The first real schema change (audit timestamps) showed Prisma 7's `migrate dev` does not run `generate`; fixed `db:migrate` to `prisma generate && prisma migrate dev` (generate first so `-- --name x` reaches `migrate dev`) and corrected the README.

## Phase 2 — API

- AI wrote the service layer, Zod schemas, error mapping and the 6 route handlers; I reviewed the API contract decisions:
  - PATCH is **either** a status change **or** a draft edit (both → 400) instead of "and/or" — one request, one meaning.
  - New `RULE_VIOLATION` code for 422 (item outside the stay).
  - Responses expose the `publicId` as `id`; numeric PKs never leave the server.
- AI read the bundled Next 16 docs first and caught a Cache Components pitfall: a DB-reading `GET` handler without `await connection()` is **prerendered at build time** (verified: `/api/reservations` became static `○` without it).
- Bug AI introduced and then caught from the build log: the `withErrorHandling` try/catch swallowed Next's internal prerender-bailout signal from `connection()`. Fixed with `unstable_rethrow` (per the Next docs).
- Verified by AI:
  - 53 tests (unit + service tests on a real migrated SQLite copy per test).
  - Mutation check: removing the `WHERE status = <from>` guard makes the concurrency test fail; restoring it passes (10/10 runs stable).
  - curl against `npm run dev` on a throwaway DB: every endpoint and every error case (400 malformed/invalid, 404, 409 transitions/edits/empty send, 422 outside stay, 405), parallel approvals over HTTP (one 200, one 409), one email row per sent proposal, email logged to console.
  - `npm run build` + `npm start` (prestart DB setup, error mapping in production mode).
- My review: the single `proposalService` also served reservations. Split into `lib/reservations/service.ts` (own service + `toReservationDto`, reused by the proposal DTO); tests regrouped by module with a shared `tests/helpers/test-db.ts`. Re-verified: 55 tests, lint, typecheck, curl smoke test.
- My review: noticed the dashboard acts for a concierge the data model doesn't know about. AI laid out the options (no entity / own table / shared `users` with roles); I decided on a separate `concierges` table, as its own phase (Phase 3) before the dashboard.
- My decision: audit timestamps on all entities, `updated_at` only where rows change. AI proposed the per-table split (skip `updated_at` on replaced items and the append-only email log; keep `sent_at` instead of a duplicate `created_at`) and added it as a new migration (`init` is already on `main`), with `@default(now())` so existing rows backfill. Verified with a test that `updated_at` moves on draft edits and on `updateMany` status changes.

## Phase 3 — Concierge entity

- AI added `concierges` + required `proposals.concierge_id`, `getCurrentConcierge()` as the single stand-in for a future session lookup (clients can't send a concierge id — unknown body keys are already a 400), concierge in proposal responses, `conciergeName` in the list, and an email signature.
- Prisma's generated migration would fail on any DB that already has proposals (required column, no default). AI hand-edited it with a conditional backfill (insert the seed concierge only if proposals exist; same email as the seed so the seed's upsert reuses it).
- Verified by AI: built a DB at the Phase 2 state with 2 proposals, applied the new migration → both attributed, seed kept 1 concierge; fresh DB seeded twice → 1 concierge; 59 tests; curl (400 on `conciergeId` in body, concierge in detail/list, signed email).
