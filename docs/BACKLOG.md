# Backlog — deferred decisions

Things we consciously postponed to keep the core loop (create → send → approve → pay) simple. Revisit once the core is done; leftovers feed the README "What I'd improve" section.

| # | Item | Simple version now | Deferred version | Why deferred |
|---|---|---|---|---|
| 1 | Villa photos management | Fixed gallery list in code (`key`, `alt`, `credit`); files uploaded once to a public Cloudflare R2 bucket by a script; URLs = `ASSETS_BASE_URL` + key | `villa_images` table (url, alt, credit, sort order) per villa, managed from the concierge dashboard with uploads to R2 | Needs upload UI, signed uploads, ordering — not part of the brief |
| 2 | Concierge identity | Static `CONCIERGE` config (name, title, email, phone); initials monogram, no photo | `concierges` table, proposal → concierge FK, real photo, auth | No concierge users or auth in the brief |
| 3 | Auth | None; the member link's unguessable `publicId` is the access key | Concierge login; member access via signed/expiring links | Out of scope for a take-home |
| 4 | Decline / request changes | Not supported (only draft → sent → approved → paid) | `declined` status or "request changes" back to draft with a member comment | Not in the brief; would change the state machine |
| 5 | DB-level CHECK constraints | Enums enforced by the Prisma client, price ≥ 0 by Zod | CHECKs via custom migration SQL, guarded against Prisma rebuilding SQLite tables | Prisma doesn't emit SQLite CHECKs; hand-edited ones get silently dropped |
