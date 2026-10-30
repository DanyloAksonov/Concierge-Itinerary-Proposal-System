-- Hand-edited: existing proposals are backfilled with the seed concierge (see "Backfill" below),
-- so databases that already have proposals migrate without a reset.
-- CreateTable
CREATE TABLE "concierges" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfill: only when proposals already exist. Same email as prisma/seed.ts, whose upsert
-- then keeps this row instead of creating a second concierge.
INSERT INTO "concierges" ("name", "title", "email", "phone")
SELECT 'Sofia Navarro', 'Senior Concierge, Punta Mita', 'sofia.navarro@example.com', '+52 329 555 0142'
WHERE EXISTS (SELECT 1 FROM "proposals");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_proposals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "concierge_id" INTEGER NOT NULL,
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
INSERT INTO "new_proposals" ("approved_at", "concierge_id", "created_at", "id", "note", "paid_at", "public_id", "reservation_id", "sent_at", "status", "updated_at") SELECT "approved_at", (SELECT "id" FROM "concierges" WHERE "email" = 'sofia.navarro@example.com'), "created_at", "id", "note", "paid_at", "public_id", "reservation_id", "sent_at", "status", "updated_at" FROM "proposals";
DROP TABLE "proposals";
ALTER TABLE "new_proposals" RENAME TO "proposals";
CREATE UNIQUE INDEX "proposals_public_id_key" ON "proposals"("public_id");
CREATE INDEX "proposals_reservation_id_status_idx" ON "proposals"("reservation_id", "status");
CREATE INDEX "proposals_concierge_id_idx" ON "proposals"("concierge_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "concierges_email_key" ON "concierges"("email");
