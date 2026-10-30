# CLAUDE.md — Concierge Itinerary Proposal System

Context for Claude Code. Read this file and `docs/TASK.md` (the original assignment) before doing anything.

## Who I am and what this is

- I'm Danylo, a Senior Full-Stack Engineer (TypeScript, React, Next.js, Node.js/NestJS). This repo is the **final-stage take-home task** for a Fullstack Engineer role at ApexTech (client: Exclusive Resorts).
- Time budget: **~4.5 hours of build + Loom demo**. Using AI is expected, but **I must be able to explain every line** in a client interview and in a 5–10 min Loom walkthrough.
- Evaluation (in order): Problem thinking (data model + workflow) → UI/UX → Code quality → API design → Completeness (create → send → approve → pay) → README/communication.

## How to work with me

1. **Work in phases** (see Plan). At the end of each phase: stop, summarize what you did, list the key decisions and why, and wait for my "continue". Do not run ahead into the next phase.
2. **Explain non-obvious choices** in 1–3 sentences in chat (not in long code comments). If there's a trade-off, name the alternative you rejected.
3. **Keep `docs/AI_NOTES.md` up to date** (short bullets): what AI generated, what I changed or rejected, what I verified manually. This goes into the README — the company is AI-first and wants to see how I work with AI.
4. Prefer **small, readable code** over clever abstractions. No dead code, no TODO spam.
5. Never invent requirements. If something in `docs/TASK.md` is ambiguous, propose an assumption and add it to the README "Assumptions" list.
6. **Deferred decisions go to `docs/BACKLOG.md`.** Whenever we postpone something (simple version now, fuller version later), add a row there and tell me in chat. Default to the simplest version that keeps the core loop working.
7. Before saying a phase is done: `npm run lint`, `npm run typecheck`, `npm test` must pass, and you must exercise the flow (curl or the UI) — say what you actually ran.

## Stack (decided)

- **Next.js (latest stable, App Router) + TypeScript (strict)**. Note: in Next.js 15+ route `params` and `searchParams` are Promises — `await` them.
- **Tailwind CSS**; **shadcn/ui** allowed for the concierge dashboard (forms, table, dialog, badge, toast). The member view is custom-styled for a premium feel.
- **SQLite via Prisma 7** (`prisma-client` generator + `@prisma/adapter-better-sqlite3` driver adapter). Schema: `prisma/schema.prisma`; DB URL in `prisma.config.ts` (default `file:./data/app.db`, git-ignored). Client is generated to `lib/generated/prisma` (git-ignored, `postinstall: prisma generate`). Pinned to 7.10.1 — the npm `latest` tag of `prisma` points at an 8.0 RC.
- **Zod** for request validation (shared schemas between API and forms where sensible).
- **Vitest** for unit tests of the domain logic (status machine, validation, totals) plus a few service tests against a throwaway SQLite DB (send transaction, 409s, 422 outside stay).
- Node LTS (≥ 22). better-sqlite3 (pulled in by the Prisma adapter) is a native module — note this in the README.

## Key product / domain decisions (these are my talking points — keep them)

1. **Status state machine.** Allowed transitions only:
   `draft → sent → approved → paid`.
   Any other transition → **409 Conflict** with a clear message. Implemented once in `domain/proposals/status.ts` (`canTransition(from, to)`, `assertTransition`) and unit-tested. The UI only shows actions valid for the current status.
2. **Unguessable public id.** Members open `/proposal/[publicId]`. Use a random id (nanoid/UUID) as `public_id`, not the incremental PK, so members can't enumerate other proposals. Internal routes may use the numeric id or the same public id — pick one and be consistent (prefer the public id everywhere in URLs).
3. **Money in integer cents** (`price_cents`). Totals are **computed** from items, never stored. Format with `Intl.NumberFormat` (USD).
4. **Drafts are editable, sent proposals are immutable.** Server rejects item changes unless status is `draft` (409).
5. **Items must fall within the stay** (arrival ≤ scheduled_at ≤ departure). Validate server-side (400/422) and in the form.
6. **Timestamps per status:** `created_at`, `sent_at`, `approved_at`, `paid_at` (extends the minimum schema — explain why: audit trail + shows progress in the list).
7. **Sending email = write to `sent_emails` + `console.log`**, and set `status = sent`, `sent_at`, in **one DB transaction**. The email body includes the member link `/proposal/[publicId]`.
8. **Categories** are a Prisma enum `ItemCategory` (`DINING | ACTIVITIES | WELLNESS | EXCURSIONS | TRANSPORT | EXPERIENCES`); labels + suggested items are a TS config in `domain/proposals/categories.ts` — not a DB table (static product config; explain the trade-off). Status is the Prisma enum `ProposalStatus`. Import enums from `@/lib/generated/prisma/enums` (runtime-free, safe in client components).
9. **Dates/time zone:** store `scheduled_at` as ISO string in the destination's local time (Punta Mita = `America/Bahia_Banderas`); display in that zone. Assume the trip year is **2027** (next March). Document both as assumptions.

## Data model (Prisma — `prisma/schema.prisma` is the source of truth; table/column names are snake_case via `@@map`/`@map`)

```
members           id PK, name, email (unique)
concierges        id PK, name, title, email (unique), phone
reservations      id PK, member_id FK→members, destination, villa, time_zone (IANA), arrival_date (YYYY-MM-DD), departure_date
proposals         id PK, public_id (unique), reservation_id FK→reservations, concierge_id FK→concierges,
                  status ('draft'|'sent'|'approved'|'paid'), note (nullable, stretch),
                  created_at, sent_at, approved_at, paid_at
proposal_items    id PK, proposal_id FK→proposals (ON DELETE CASCADE), category, title,
                  description, scheduled_at (local wall time 'YYYY-MM-DDTHH:mm'), price_cents (int ≥ 0)
                  (ordered by scheduled_at, then id — no position column)
sent_emails       id PK, proposal_id FK→proposals, to_email, subject, body_preview, sent_at
```
Indexes: `proposals(reservation_id, status)`, `proposals(concierge_id)`, `proposal_items(proposal_id, scheduled_at)`.
**Audit timestamps rule:** every table gets `created_at`; `updated_at` (`@default(now()) @updatedAt`) only where rows are modified after creation — `members`, `reservations`, `concierges`, `proposals`. Skipped for `proposal_items` (replaced, never edited) and `sent_emails` (append-only; `sent_at` is its creation time). `@updatedAt` is set by the Prisma client, so all writes go through Prisma. New tables follow the same rule.
Seed (idempotent): James Whitfield (`james.whitfield@example.com`), reservation Villa Punta Mita, Punta Mita, Mexico, 2027-03-15 → 2027-03-22.

## API contract (Route Handlers)

All responses JSON. Errors: `{ "error": { "code": "VALIDATION_ERROR" | "NOT_FOUND" | "UNSUPPORTED_MEDIA_TYPE" | "INVALID_TRANSITION" | "CONFLICT" | "RULE_VIOLATION" | "INTERNAL", "message": string, "details"?: unknown } }` → 400 / 404 / 415 / 409 / 409 / 422 / 500. Bodies must be `Content-Type: application/json` (415 otherwise — blocks cross-site form posts). A proposal's `id` in responses is always its `publicId`, never its PK; item and reservation ids are plain integers (they grant no access).

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `GET /api/reservations` | — | 200 `{ reservations: [{ reservation, member }] }` | — |
| `POST /api/proposals` | `{ reservationId, note?, items?: Item[] }` | 201 proposal (status `draft`) with items + total, `Location` header | 400, 422, 404 reservation |
| `GET /api/proposals` | — | 200 `{ proposals: [{ id, reservationId, conciergeName, status, itemCount, totalCents, timestamps }] }` | — |
| `GET /api/proposals/[id]` | — | 200 proposal + items (sorted by scheduled_at) + totalCents + reservation + member + concierge | 404 |
| `PATCH /api/proposals/[id]` | **either** `{ status }` **or** (draft only) `{ note?, items? }` — both → 400 | 200 updated proposal | 400, 422, 404, 409 |
| `POST /api/proposals/[id]/send` | — | 200 `{ proposal, email }` | 404, 409 (not draft / no items) |

Agreed rules (kickoff review):
- **400** `VALIDATION_ERROR` = malformed JSON / wrong shape (Zod). **422** = domain rule failed (e.g. item outside stay dates).
- `PATCH { status: "sent" }` delegates to the same `send()` service as `/send` — `sent` is never reached without an email record.
- Paying requires `approved` first (no skipping).
- Status updates are race-safe: `UPDATE … WHERE id = ? AND status = <from>`; 0 rows changed → 409.
- `[id]` in all URLs is the `publicId`.
- No auth (documented): `publicId` is the member's capability link; concierge endpoints would sit behind auth in production.
- Range check: arrival 00:00 ≤ scheduled_at ≤ departure 23:59, both days inclusive; plain string comparison on local wall time.

**Next 16 + Cache Components:** every `GET` handler / Server Component that reads the DB must `await connection()` first — verified: without it `next build` prerenders `/api/reservations` as static and freezes the seed data.

Route handlers stay thin: parse + validate (Zod) → call the module's service (`domain/proposals/service.ts`, `domain/reservations/service.ts`) → map domain errors to HTTP. One service per domain module; a module may reuse another's DTO mapper (proposals embed `toReservationDto`), never its service internals. One shared error-mapping helper. Never leak stack traces.

Reads in Server Components call the service layer directly (no fetch to own API). **All mutations from the UI go through the Route Handlers** (client components + typed fetch wrapper + `router.refresh()`), so the graded API is the one the UI exercises. No Server Actions.

## Folder structure

```
app/
  concierge/page.tsx              concierge dashboard — internal (staff) URLs live under /concierge
  proposal/[id]/page.tsx          member view (+ confirmation state) — external (member) URLs
  (no page.tsx at the root: next.config.ts redirects / → /concierge, 307)
  api/reservations/route.ts
  api/proposals/route.ts
  api/proposals/[id]/route.ts
  api/proposals/[id]/send/route.ts
domain/                           business logic, split by entity
  errors.ts                       DomainError (code → HTTP mapping lives in lib/api/errors.ts)
  proposals/service.ts            proposal business logic + DTOs        (server-only)
  proposals/status.ts             state machine                          (isomorphic)
  proposals/rules.ts              isWithinStay, totalCents, stayDays…    (isomorphic)
  proposals/validation.ts         Zod schemas, shared with the forms     (isomorphic)
  proposals/categories.ts         category labels + suggestions          (isomorphic)
  proposals/email.ts              composes the simulated proposal email
  reservations/service.ts         reservation listing + toReservationDto (server-only)
  concierges/service.ts           toConciergeDto + getCurrentConcierge   (server-only)
lib/                              infrastructure + generic helpers
  db/client.ts                    PrismaClient (adapter) + createPrisma(url) for tests
  db/url.ts                       DATABASE_URL shared by CLI config and runtime
  generated/prisma/               generated client (git-ignored)
  api/errors.ts                   domain error → HTTP mapping + withErrorHandling wrapper
  api/request.ts                  parseBody (JSON + Zod → 400), requestOrigin
  format.ts                       money/date formatting
app/_src/                         UI (private folder: `_` keeps it out of routing)
  common/components/<Name>/index.tsx      shared + shadcn components (Button, Dialog, Input, Label, Table,
                                          Textarea, Toaster, StatusBadge); a component's test goes next to it
  common/utils/                           generic frontend helpers: api-client.ts (apiRequest, ApiError,
                                          errorMessage), copy-text.ts
  concierge/utils/                        concierge-specific frontend helpers: member-link.ts
  concierge/components/<Name>/index.tsx   TripHeader, ItemForm, ItemList, ProposalBuilder, ProposalPreview,
                                          ProposalRowActions, ProposalsTable
  member/components/<Name>/index.tsx      member view building blocks
  <module>/screens/<Name>Screen/index.tsx whole pages as plain components (DTO props only): DashboardScreen,
                                          ProposalScreen, their Loading/Error/NotFound screens; common/screens
                                          holds the app-wide NotFoundScreen
prisma/
  schema.prisma, migrations/ (committed), seed.ts
tests/                            vitest, grouped by module (proposals/, reservations/); helpers/test-db.ts gives each test a migrated SQLite copy
prisma.config.ts                  schema/migrations/seed/datasource config
docs/TASK.md (git-ignored), docs/AI_NOTES.md
```

## Member view design (reference: `_local/references/christies-listing.*` — copy the style, never the brand)

- **Layout:** white page, centred container ~1100px, generous whitespace, thin gray dividers between sections.
  - Top: gallery — one large hero (≈2/3 width) + 2–4 thumbnails.
  - Below: serif title "Your Punta Mita Itinerary", subtitle "Prepared for James Whitfield · Villa Punta Mita, Mexico", key-facts row (dates · nights · number of experiences).
  - Desktop two columns: left = "A note from your concierge" (if present) + "Your itinerary" grouped by day ("Day 1 · Monday, March 15"), each item a row: time · title + small uppercase category · description · price. Right = sticky column: concierge card, then a gray summary card (total, status, actions).
  - Mobile: single column; summary becomes a fixed bottom bar (total + primary action). Pad the page bottom so the bar never hides focused content (WCAG 2.2 Focus Not Obscured).
  - Skip listing-site extras (map, nearby, stories, newsletter, heavy footer). Header: plain serif text wordmark "Exclusive Resorts".
- **Typography (`next/font`):** Cormorant Garamond for display only (≥ ~28px, weight 500–600); Jost for everything else, body ≥ 16px. Section labels: small uppercase Jost, wide letter-spacing.
- **Primary button on the member page is gold with ink text** (`bg-gold text-ink`) — the global shadcn `--primary` is ink for the dashboard.
- **Palette (contrast checked):** text `#1c1f23`; panels `#f4f4f2`; muted text `#6b6f76` (5.05:1 on white, 4.58:1 on panel); gold `#c5a572` **only as a fill behind charcoal text (7.09:1) or decoration** — white-on-gold / gold text on white is 2.33:1 and fails AA; for gold-coloured text use `#8a6d3b` (4.85:1).
- **Actions:** two-step stepper "1 Approve → 2 Pay & Lock In"; only the valid step is enabled, the disabled one says why. Status changes announced via `role="status"`.
- **Confirmation** is the paid state of the same route (reload / reopening the email link still shows it), same visual style.
- **Draft at the member URL** (concierge "open as member"): render with a "Preview — not yet sent to member" banner and no actions.
- **Concierge card:** from the proposal's concierge (Phase 3) with an initials monogram — no stock face photo. (Photo: BACKLOG #2)
- **Photos (my call, replaces the earlier R2 plan):** six AI-generated placeholders (Google Gemini) in `public/images/*.webp`, statically imported into `next/image` (intrinsic size + blur placeholder for free). Originals are converted with `npm run images:optimize` (`scripts/optimize-images.ts`, sharp: WebP q80, max width 2000px for `hero-villa`/`confirmation`, 1200px otherwise; originals deleted).
  - Gallery (`member/components/Gallery`): `hero-villa` 16:9 with `preload` (LCP; Next 16 replaced `priority` with `preload`) + `dining`, `spa`, `sailing`, `bonfire` thumbnails. Hidden once paid.
  - Confirmation (`ConfirmationPanel`): `confirmation` is a decorative full-bleed background (`alt=""`, `preload`, since it is the main visual when paid); text sits on a white/90 card so contrast never depends on the photo.
  - Every image has `sizes` matching the layout and `object-cover`. Alt text describes what the image actually shows and never claims it is the real property.
  - Cloud storage / concierge-managed photos: BACKLOG #1.

## UX guidelines

- **Concierge dashboard** — a plain admin panel, not a branded page (my call after a first, too decorative version): one sans font (Jost), small headings, white/grey, **ink primary buttons**, no serif, no gold. Compact app bar + trip bar pinned at top (member, villa, arrival, departure, nights, signed-in concierge). Items are added in one form row: Category dropdown → Title (category suggestions via `datalist`) → Day (stay days only) → Time → Price (USD) → Add; optional description below. Draft items in a table with the total in the footer; note; Save draft / Preview & send (preview dialog required by the brief). Proposals table: status, items, total, Created/Sent/Approved/Paid columns (destination time), prepared by, Send (drafts) / copy link / open as member. Toasts for outcomes.
- **Member view** — see "Member view design" above (it replaces the earlier warm-palette / gradient-hero idea).
- **Accessibility** is part of my profile — do it properly: semantic landmarks, one `h1`, labelled inputs, visible focus, keyboard-operable dialogs (focus trap, Esc, focus return), status changes announced (`role="status"`), AA contrast.
- Loading (`loading.tsx`), error (`error.tsx`) and `not-found` states for both routes. `generateMetadata` for the member page (title: "Your Punta Mita Itinerary").

## Plan (stop after each phase; one branch per phase, PR into `main`, merge commit — no squash)

1. **Setup & data** (~45 min): create-next-app, Tailwind, shadcn init, Prisma schema + migration, migrate + idempotent seed run automatically (`predev`), status machine + unit tests.
2. **API** (~60 min): service layer, all 6 endpoints, Zod, error mapping, transaction on send. Verify each route with curl, including error cases (invalid transition, not found, item outside stay dates).
3. ✅ **Concierge entity** (`feat/concierge`): `concierges` table (id, name, title, email, phone), seeded with one concierge; `proposals.concierge_id` (required FK) set on create. No auth — the server resolves the acting concierge via one `getCurrentConcierge()` (stand-in for a future session lookup), looked up by `CURRENT_CONCIERGE_EMAIL` (default: the seeded concierge) — never "the first row"; clients never send a concierge id. Proposal responses include `concierge`; the member-page card and email signature read from it. Keep `members` and `concierges` as separate tables (different roles and relations); a shared login identity (`accounts`) only comes with auth (BACKLOG #3).
4. **Concierge dashboard** (~75 min).
5. **Member view** (~60 min).
6. **README + full-loop check** (~30 min). Starts with the accessibility audit + browser walkthrough of both screens (BACKLOG #9): axe-core in every UI state, keyboard-only pass, phone width.
7. **Stretch (if time), in this order:** concierge note → day-by-day timeline (if not already) → edit draft → optimistic UI → animation on confirmation.

## Definition of done

- `npm install && npm run dev` works on a clean clone (DB auto-created and seeded).
- Full loop works in the UI: create → preview → send → open member link → approve → pay → confirmation; dashboard reflects every status.
- lint, typecheck, tests green.
- README contains: one-command run, architecture overview, data model, API table, key decisions & trade-offs, assumptions, what I'd improve with more time, most interesting/challenging part, honest list of anything incomplete, how AI was used (from `docs/AI_NOTES.md`).

## Git

- Small, meaningful commits per phase (conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- **Helper placement rule:** a helper is *frontend-only* when it depends on the browser, React or Tailwind, or exists only to serve the UI (e.g. the fetch wrapper). Generic ones go in `app/_src/common/utils/`; ones tied to a module (concierge/member) in `app/_src/<module>/utils/`. Pure functions stay out of the UI folder even if only the UI calls them today — formatting in `lib/`, domain rules and validation in `domain/` — so the server and tests can use them. **`domain/` vs `lib/`:** business logic (services, rules, state machine, validation, email) lives in `domain/<entity>/`; infrastructure and generic helpers (DB client, HTTP helpers, formatting, generated client) in `lib/`. Every `domain/*/service.ts` starts with `import "server-only"`, so importing a service from a client component fails the build (verified); Vitest aliases `server-only` to the package's own no-op build. `cn` is imported straight from the `cn` package, like the shadcn components do.
- **Internal vs external URLs:** staff pages under `/concierge/*`, member pages under `/proposal/*`, so a future `proxy.ts` can protect all internal pages with one matcher. The API paths are fixed by the brief and serve both sides; splitting their access is part of auth (BACKLOG #3).
- **Gotcha after moving or renaming routes:** a running or stopped `next dev` leaves route types in `.next/dev/types/`, which `tsconfig.json` includes; stale ones break `typecheck`/`build` ("Cannot find module '../../../app/page.js'"). Delete `.next/dev/types` (generated) or restart `next dev`.
- **Thin route files:** `app/**/page.tsx` only does Next.js work — `params`, `connection()`, `generateMetadata`, `notFound()`, the `cache()`-shared data load — then returns a `<…Screen />` with DTO props. `loading/error/not-found.tsx` are one-line re-exports of their screens (`error.tsx` keeps `"use client"`). Screens never import services or Next routing APIs.
- **Component layout rule:** every component is a folder named after it, PascalCase, with `index.tsx` (same shape everywhere; a colocated test can sit next to it). Module components live in `<module>/components/<Name>/`. `shadcn add` still writes `button.tsx`-style files into `common/components/` — move each into `<Name>/index.tsx` and fix the imports.
- `.gitignore`: `node_modules`, `.next`, `data/*.db`, `docs/TASK.md`, `.env*`, `_local/`.
- `_local/` holds private/local-only material (original task PDF, context files) — present on disk, invisible to git.
- Migrations: `prisma migrate dev` output in `prisma/migrations/` is committed; `predev`/`prestart` run `prisma migrate deploy && prisma db seed`.
