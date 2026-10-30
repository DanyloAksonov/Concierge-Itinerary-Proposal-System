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
