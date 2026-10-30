# Backlog — deferred decisions

Things we consciously postponed to keep the core loop (create → send → approve → pay) simple. Revisit once the core is done; leftovers feed the README "What I'd improve" section.

| # | Item | Simple version now | Deferred version | Why deferred |
|---|---|---|---|---|
| 1 | Villa photos management | Fixed gallery list in code (`key`, `alt`, `credit`); files uploaded once to a public Cloudflare R2 bucket by a script; URLs = `ASSETS_BASE_URL` + key | `villa_images` table (url, alt, credit, sort order) per villa, managed from the concierge dashboard with uploads to R2 | Needs upload UI, signed uploads, ordering — not part of the brief |
| 2 | Concierge identity | **Scheduled as Phase 3:** `concierges` table + `proposals.concierge_id`, acting concierge resolved server-side, initials monogram | Real photo; concierge picked from the logged-in session (needs #3) | No login in the brief; photo is cosmetic |
| 3 | Auth | None; the member link's unguessable `publicId` is the access key | Concierge login (shared `accounts` identity table that member and concierge profiles reference); member access via signed/expiring links | Out of scope for a take-home |
| 4 | Decline / request changes | Not supported (only draft → sent → approved → paid) | `declined` status or "request changes" back to draft with a member comment | Not in the brief; would change the state machine |
| 5 | DB-level CHECK constraints | Enums enforced by the Prisma client, price ≥ 0 by Zod | CHECKs via custom migration SQL, guarded against Prisma rebuilding SQLite tables | Prisma doesn't emit SQLite CHECKs; hand-edited ones get silently dropped |
| 6 | Absolute links in emails | Member link built from the request's origin | `APP_URL` env var, so links stay correct behind proxies / custom domains | Request origin is right for local dev and a single deployment |
| 7 | Pagination | `GET /api/proposals` returns everything (wrapped in `{ proposals }` so pagination can be added without breaking clients) | Cursor pagination + filters by status / reservation | A handful of proposals in the demo |
