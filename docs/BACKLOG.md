# Backlog — deferred decisions

Things we consciously postponed to keep the core loop (create → send → approve → pay) simple. Revisit once the core is done; leftovers feed the README "What I'd improve" section.

| # | Item | Simple version now | Deferred version | Why deferred |
|---|---|---|---|---|
| 1 | Villa photos management | Six AI-generated placeholders as static WebP files in `public/images`, fixed gallery list in code (R2 plan dropped for now — my call) | Real property photos in object storage (e.g. Cloudflare R2) behind `next/image` `remotePatterns`; `villa_images` table (url, alt, credit, sort order) per villa, managed from the concierge dashboard | Needs upload UI, signed uploads, ordering — not part of the brief |
| 2 | Concierge identity | **Done in Phase 3:** `concierges` table + `proposals.concierge_id`; acting concierge = the seeded one via `getCurrentConcierge()`; initials monogram on the member page | Real photo; concierge picked from the logged-in session (needs #3) | No login in the brief; photo is cosmetic |
| 3 | Auth | None; the member link's unguessable `publicId` is the access key. Staff pages already live under `/concierge/*` | Concierge login checked in `proxy.ts` for `/concierge/:path*` and the concierge API endpoints (shared `accounts` identity table that member and concierge profiles reference); member access via signed/expiring tokens that only allow approve/pay on their own proposal — `PATCH /api/proposals/:id` currently serves both sides | Out of scope for a take-home |
| 4 | Decline / request changes | Not supported (only draft → sent → approved → paid) | `declined` and `changes_requested` statuses with a member comment; changes lead to a new revision rather than reopening the sent proposal — see [design](#4-decline--request-changes) | Not in the brief; changes the state machine. Builds on #8 and #18 |
| 5 | DB-level CHECK constraints | Enums enforced by the Prisma client, price ≥ 0 by Zod | CHECKs via custom migration SQL, guarded against Prisma rebuilding SQLite tables | Prisma doesn't emit SQLite CHECKs; hand-edited ones get silently dropped |
| 6 | Absolute links in emails | Member link built from the request's origin | `APP_URL` env var, so links stay correct behind proxies / custom domains | Request origin is right for local dev and a single deployment |
| 7 | Pagination | `GET /api/proposals` returns everything (wrapped in `{ proposals }` so pagination can be added without breaking clients) | Cursor pagination + filters by status / reservation | A handful of proposals in the demo |
| 8 | Supersede on resend | A corrected proposal is a new proposal; the old link still works and can be approved and paid | Mark earlier sent proposals for the same reservation as superseded; the member page points to the latest | Found in the audit; needs a new status, which the brief doesn't define |
| 9 | Accessibility audit + browser walkthrough | **Done (Phase 6).** Full loop clicked through in Chrome; axe-core 4.10 (WCAG 2.0–2.2 A/AA + best practice) in every state: 0 violations. 6 issues axe can't see were found manually and fixed (focus management ×4, display numerals, phone overflow) | Automated: run axe in CI on each state with `@axe-core/playwright`; screen-reader pass with VoiceOver/NVDA | Manual pass done; automation needs Playwright in the project |
| 10 | Gallery carousel | Static hero + 4 thumbnails | Carousel with the hero image and manual switching (reference design to come from me) | UI polish after the core loop; waiting for the reference |
| 11 | Internationalisation (i18n) | English-only copy hard-coded in components; dates, times and money already go through `Intl` (en-US, USD) in `lib/format.ts` | Translated UI strings (e.g. `next-intl`), member language from their profile, localized date/number formats; the member email in the member's language | Not in the brief; worth doing before a second market. Copy is centralized per component, so extraction is mechanical |
| 12 | Environment validation | Both variables are optional with safe defaults (`DATABASE_URL`, `CURRENT_CONCIERGE_EMAIL`), read directly from `process.env` where used | One Zod schema in `lib/env.ts` that parses `process.env` once at startup (and in `prisma.config.ts` / scripts) and fails fast with a clear message naming the bad variable; the rest of the code imports typed `env` instead of `process.env` | Only two optional variables today, so a wrong value can't fail silently yet; becomes necessary as soon as secrets (auth, email provider, storage) are added |
| 13 | Destination as structured data | `reservations.destination` is one string ("Punta Mita, Mexico"); `common/utils/destination.ts` splits it into city and country at render time | Short term: separate `city` and `country` columns (migration splits existing values in SQL), helpers deleted. Proper model: `destinations` (name, ISO country code, time zone) and `villas` (name, destination) tables, reservations pointing to a villa — the time zone belongs to the place, not the booking | Spotted by me in review; one villa in the brief, so the string works today, but parsing a composite field breaks as soon as a destination has no comma or several |
| 14 | Party size | Not modelled; item prices are a total for the party (README assumption) | `reservations.guests` (adults/children); optional per-person pricing on items | From the entity review: changes how prices are read, touches seed/header/email — its own step |
| 15 | Item duration and location | Items have a start time only | `duration_minutes` and optional `location` on items; warn about overlapping items | From the entity review |
| 16 | Member preferences | Name and email only | Phone, dietary requirements / preferences (e.g. allergies before a private chef dinner) | From the entity review |
| 17 | Payments as records | `paid_at` timestamp only | `payments` table (amount, currency, provider reference, status, paid_at); refunds | From the entity review; payment is simulated in the brief |
| 18 | Status history with actor | `sent_at` / `approved_at` / `paid_at` columns | `proposal_events` (status, at, actor) — who approved, from where; can replace the per-status columns | From the entity review |
| 19 | Currency | USD assumed everywhere | `currency` (ISO 4217) per proposal | From the entity review |
| 20 | Per-item confirmation | None after payment | Item status (pending / confirmed / unavailable) the concierge updates while booking | From the entity review: the confirmation screen promises this follow-up |
| 21 | Email delivery tracking | Email row + console log | Provider message id and delivery status (sent / bounced) on `sent_emails` | From the entity review; no real email in the brief |
| 22 | Multiple members / reservations in the UI | The data model and API already support many; the dashboard shows the first reservation only | A trip list at `/concierge`, one trip per URL at `/concierge/trips/[reservationId]` — see [design](#22-multiple-members--reservations) | Stretch goal in the brief; one member in the scenario |

## Designs

Fuller notes for the larger items, so they can be picked up without re-deriving them.

### #22 Multiple members / reservations

Mostly UI, about 1–2 h. Do this before #4: it doesn't touch the domain.

- **Data:** no change. `reservations.member_id` and `proposals.reservation_id` already exist, `POST /api/proposals` takes a `reservationId`, and `GET /api/reservations` returns a list. The only single-trip assumption is `reservations[0]` in `app/concierge/page.tsx`.
- **Routes:** `/concierge` becomes a list of upcoming trips (member, villa, dates, proposal counts by status). `/concierge/trips/[reservationId]` is today's dashboard for one trip. The trip is in the URL, so it survives reloads and can be shared between staff. `?edit=` already checks that the draft belongs to the trip.
- **API:** `GET /api/proposals?reservationId=` filters on the server; the list is already wrapped in `{ proposals }`, so the filter is backwards-compatible.
- **Builder:** `key={reservationId}`, so a half-built draft never carries over to another trip.
- **Seed:** a second member at another destination and time zone (e.g. Los Cabos, `America/Mazatlan`), to show the per-reservation time zone handling.
- **Later, with auth (#3):** which concierge owns which trip, and a "my trips" filter.

### #4 Decline / request changes

Changes the workflow, about 3–4 h plus tests.

- **Decision: a new version, not back to draft.** Sending the proposal back to `draft` would change the member's link under them and lose the record of what they saw, breaking "sent is immutable". Instead the member's response closes this proposal, and the concierge creates a revision: a new draft pre-filled with the old items, linked through `revision_of_id`. Sending the revision moves the old proposal to `superseded`; its page says "A newer version is available" and links to it. This also covers #8.
- **State machine:**
  ```
  draft → sent → approved → paid
           │        │
           ├────────┴──→ declined            (final)
           └──→ changes_requested            (final for this version → concierge creates a revision)
  sent / approved / changes_requested ──→ superseded   (when a revision is sent)
  ```
  Decline is allowed from `sent` and `approved` (the member can change their mind before paying). After `paid` it's a cancellation or refund, which needs #17.
- **`status.ts`:** `NEXT_STATUS` maps each status to a single successor. It becomes `ALLOWED: Record<ProposalStatus, ProposalStatus[]>`, and the UI renders every allowed action instead of one. The guarded update (`WHERE status = <from>`) works unchanged; the tests get new rows.
- **Schema:**
  - new `ProposalStatus` values (a plain text column on SQLite, so the migration is trivial);
  - `proposals.revision_of_id`;
  - the member's comment goes into the `proposal_events` table from #18 (`proposal_id, status, actor, comment, created_at`) rather than more per-status columns. Do #18 first or together.
- **API:**
  - `PATCH /api/proposals/[id] { status: "changes_requested", comment }`, with `comment` required here and optional for `declined`;
  - `POST /api/proposals/[id]/revise` creates the new draft and returns 201 with `Location`.
- **Member page:**
  - Approve stays the primary gold button;
  - "Request changes" is a secondary link that opens a dialog with a required message;
  - "Decline" has its own confirmation dialog;
  - afterwards: "Your concierge will be in touch".
  - Not optimistic: there is nothing useful to show early.
- **Dashboard:** new badges, the member's comment in the expanded row, and a **Revise** action that opens the builder with the copied items (reusing edit mode).
- **Notifying the concierge:** simulated like the member email: a console log and a row in the emails table, which gets a `direction` column.
