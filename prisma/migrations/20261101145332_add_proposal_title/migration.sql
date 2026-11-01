-- Hand-edited: existing proposals get the title "Itinerary #<id>" so databases with data migrate
-- without a reset (Prisma's generated copy had no value for the new required column).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_proposals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "concierge_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" DATETIME,
    "approved_at" DATETIME,
    "paid_at" DATETIME,
    CONSTRAINT "proposals_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "proposals_concierge_id_fkey" FOREIGN KEY ("concierge_id") REFERENCES "concierges" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_proposals" ("approved_at", "concierge_id", "created_at", "id", "note", "paid_at", "public_id", "reservation_id", "sent_at", "status", "title", "updated_at") SELECT "approved_at", "concierge_id", "created_at", "id", "note", "paid_at", "public_id", "reservation_id", "sent_at", "status", 'Itinerary #' || "id", "updated_at" FROM "proposals";
DROP TABLE "proposals";
ALTER TABLE "new_proposals" RENAME TO "proposals";
CREATE UNIQUE INDEX "proposals_public_id_key" ON "proposals"("public_id");
CREATE INDEX "proposals_reservation_id_status_idx" ON "proposals"("reservation_id", "status");
CREATE INDEX "proposals_concierge_id_idx" ON "proposals"("concierge_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
