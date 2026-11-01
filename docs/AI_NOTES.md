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
  - Responses expose the `publicId` as a proposal's `id`. (Originally written as "numeric PKs never leave the server" — the audit found that wrong: item and reservation ids are integers. Corrected.)
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

## Intermediate audit (after Phase 3)

- I asked for a devil's-advocate audit. No such skill was installed; AI searched, compared three published skills, read the chosen one in full (instructions only, no scripts) and installed it at user level after I agreed.
- AI ran the protocol over every decision and tested its suspicions with 6 probes on a throwaway DB instead of asserting them. Two suspicions were disproved (Host-header injection into email links; a draft edit racing a send); two were confirmed (`text/plain` bodies accepted; anonymous enumeration + approve). Report published as a private artifact.
- Applied (my approval): 415 for non-JSON bodies; concierge resolved by `CURRENT_CONCIERGE_EMAIL` instead of "first row"; unit tests for the HTTP layer; corrected the false "numeric ids never leave the server" claim; README "Known limitations and trade-offs" (security model, SQLite, workflow/data).
- Verified by AI: 79 tests; mutation checks (removing `unstable_rethrow` and reverting to "first row" each make a test fail); curl (text/plain and form bodies → 415, JSON with charset → 201, bodyless send → 200).

## Phase 4 — Concierge dashboard

- AI read the Next 16 docs before writing pages: with Cache Components, DB-reading pages need `connection()` inside a Suspense boundary (`app/loading.tsx` provides it; build shows `/` as Partial Prerender), and `error.tsx` now gets `retry` (re-fetches) rather than `reset`.
- AI-made fixes on generated code: dropped `next-themes` (shadcn's toaster pulled it in; the app is light-only); restored the class-based `dark:` variant after AI itself removed it, which would have half-darkened shadcn components on OS dark mode.
- Design choices: page and table are Server Components (timestamps formatted on the server in the destination time zone → no hydration mismatches); only the builder and row actions are client components; mutations go through `lib/api/client.ts` + `router.refresh()`.
- Verified by AI: lint, typecheck, 94 tests, build; server-rendered HTML with one proposal per status. **Not yet verified:** interactive flows in a browser (Chrome extension not connected) — my call to do it together with the axe audit after the member view (BACKLOG #9).
- My review after clicking through: the first version looked too decorative for a work tool (serif heading, gold category cards with icons, big cards, gold buttons). Rebuilt as an admin panel: compact header bar, one-row item form (category dropdown + title suggestions via `datalist`), draft items as a table with the total in the footer, denser proposals table with a column per milestone, ink primary buttons. Gold and the serif are now reserved for the member view. Logic, validation and API calls unchanged (94 tests still pass).
- Found while testing: Next 16 allows only one `next dev` per project folder, so AI's throwaway test server stopped when I started mine; AI did a read-only render check against my server instead of touching it.
- My decision: component layout `<module>/components/<Name>/index.tsx` for every component (common, concierge, member), so tests can sit next to each component. AI moved 15 files, rewrote imports, pointed shadcn's aliases at the new folder and documented the manual move needed after `shadcn add`. Caught on the way: an unquoted `$FILES` in zsh isn't word-split, so the first import rewrite silently did nothing; reran via `xargs` and grepped for leftovers.
- My rule: frontend-only helpers live in `app/_src/common/utils/` (or `<module>/utils/` when tied to concierge/member). AI proposed the criterion (depends on browser/React/Tailwind or exists only for the UI; pure functions stay in `lib/`) and applied it: moved the browser API client and a deduplicated `errorMessage()` into `common/utils/`, `memberLink` into `concierge/utils/`, and dropped `lib/utils.ts` (a re-export of the `cn` package that the shadcn components didn't use anyway; a shadcn dry run confirmed nothing needs it).
- I questioned the name `lib/` for code that holds business logic. Agreed split: `domain/` (proposals, reservations, concierges, `DomainError`) and `lib/` (db, HTTP helpers, formatting, generated client). AI rejected `server/` (half the domain code also runs in the browser) and `modules/` (clashes with the UI modules), and added `import "server-only"` to every service — verified by temporarily importing a service into a client component: the build fails with a clear error. Earlier entries in this file keep the old `lib/...` paths as history.

## Phase 5 — Member view

- AI built `/proposal/[id]` to the "Member view design" in CLAUDE.md: hero, concierge note, day-by-day itinerary, sticky concierge + summary cards, Approve → Pay stepper, fixed mobile bar, preview banner for drafts, confirmation as the paid state (survives reloads), member-specific loading/error/404 pages. One DB read per request shared by the page and `generateMetadata` (React `cache`); `noindex, nofollow` because the link is private.
- AI caught itself putting a helper (`destinationCity`) inside a component file and moved it to `member/utils/` per our placement rule.
- Found by testing, documented as a trade-off: unknown links render the right page but with HTTP 200 — Next streams the shell before `notFound()` runs (its docs confirm this and that it adds `noindex`).
- Verified by AI on a production build with a throwaway DB: one proposal per status, each checked for the expected text, hidden actions, a single h1, title, robots meta and in-day ordering. Not yet: clicking Approve/Pay in a browser (BACKLOG #9) and the gallery (waiting for the R2 bucket).
- My decision: keep Next.js route files thin. Pages moved to `<module>/screens/<Name>Screen/` as plain components taking DTOs (AI suggested `views/` over `pages/` to avoid confusion with Next's Pages Router; I chose `screens/`). Route files now only load data / handle `params`, metadata and `notFound()` (≤ 33 lines); `loading/error/not-found.tsx` are one-line re-exports. Verified on a production build: dashboard, member page, member 404 and global 404 all render through the new screens.
- While verifying, AI noticed the member 404 content exists only in the streamed React payload (no plain HTML), so it needs JavaScript — same root cause as the 200 status; added to the README trade-off note rather than "fixed" with an extra DB read in `proxy.ts`.
- My decision: separate internal and external URLs. Dashboard moved to `/concierge` (`/` redirects via `next.config.ts`, 307), members stay on `/proposal/[id]` so sent links keep working; both marked `noindex`. AI flagged that the shared API (`PATCH /api/proposals/:id` serves both sides) isn't solved by a URL prefix and added it to BACKLOG #3, and advised against empty route groups until the layouts differ.
- Hit while verifying: the stopped dev server's stale `.next/dev/types/validator.ts` still referenced `app/page.js` and broke typecheck and build; deleting the generated folder fixed it. Documented in CLAUDE.md.

### Images

- I generated six placeholder images with Google Gemini (villa, dining, spa, sailing, bonfire, confirmation) and replaced the R2 plan with local static files.
- AI looked at each image before writing anything and wrote alt text from what is actually in it (e.g. "an open-air wooden spa pavilion with white curtains around a massage table…"); the confirmation background is decorative, so `alt=""`. No alt text claims the images show the real villa.
- AI noticed the files were JPEGs (I'd said PNGs) and that one name had a leading space (`" hero-villa.jpeg"`); the conversion script trims names. `scripts/optimize-images.ts` (sharp, pinned to the version Next already ships) took them from 21 MB to 1.1 MB as WebP.
- AI used `preload` instead of the `priority` I asked for: the Next 16 docs deprecate `priority` in favour of `preload` (same purpose, LCP image).
- Verified on a production build: hero preloaded and eager, thumbnails lazy, `sizes` match the layout; a phone downloads ~150 KB for the whole gallery (hero 1080w ≈ 71 KB, thumbnails 384w ≈ 20 KB each) vs 3–4 MB per original.

## Phase 6 — Browser walkthrough + accessibility audit

- I connected Claude in Chrome (no paid axe DevTools). AI drove the full loop in a real browser on a production build with a throwaway DB — create → preview → send → open as member → approve → pay → confirmation — and injected axe-core 4.10 (open source, from cdnjs) into the page in every state: empty form, form errors, preview dialog, after send (toast), member sent/approved/paid, phone width.
- axe: **0 violations everywhere.** Every real problem was one axe can't detect, found by checking focus and looking at screenshots:
  1. Item form errors: focus stayed on the button, errors not announced, listed out of field order → focus first invalid field, errors in field order, consistent wording.
  2. Preview dialog: Esc/close dropped focus on `<body>` (opened by state, not `DialogTrigger`) → real trigger; after send focus the section heading.
  3. Member Approve: clicked button replaced → focus moves to Pay.
  4. Member Pay: confirmation rendered **off-screen at the top** while the member was down at the summary card → focus (and scroll) to the confirmation heading. The most important UX bug of the walkthrough.
  5. Cormorant's old-style numerals read "Day ı", "$ı,050" → lining figures.
  6. Dashboard on phones scrolled sideways: grid items' `min-width: auto` let the tables widen the column → `grid-cols-[minmax(0,1fr)]`.
- Phone width couldn't be set by resizing the window (Chrome kept a desktop viewport), so AI rendered both pages in 390px iframes, which apply the same media queries.
- Test-harness mistakes AI made and caught: typing before focusing a field (text went into the category select), and stale element references after React re-renders — neither was an app bug.
- Re-verified after the fixes: keyboard-only member flow (Approve → Enter on the focused Pay → focus on the visible confirmation), dialog focus return, no horizontal scroll at 390px, 94 tests, lint, typecheck, build.
