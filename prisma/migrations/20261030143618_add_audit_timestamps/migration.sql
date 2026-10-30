-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_members" ("email", "id", "name") SELECT "email", "id", "name" FROM "members";
DROP TABLE "members";
ALTER TABLE "new_members" RENAME TO "members";
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");
CREATE TABLE "new_proposal_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposal_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scheduled_at" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "proposal_items_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_proposal_items" ("category", "description", "id", "price_cents", "proposal_id", "scheduled_at", "title") SELECT "category", "description", "id", "price_cents", "proposal_id", "scheduled_at", "title" FROM "proposal_items";
DROP TABLE "proposal_items";
ALTER TABLE "new_proposal_items" RENAME TO "proposal_items";
CREATE INDEX "proposal_items_proposal_id_scheduled_at_idx" ON "proposal_items"("proposal_id", "scheduled_at");
CREATE TABLE "new_proposals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" DATETIME,
    "approved_at" DATETIME,
    "paid_at" DATETIME,
    CONSTRAINT "proposals_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_proposals" ("approved_at", "created_at", "id", "note", "paid_at", "public_id", "reservation_id", "sent_at", "status") SELECT "approved_at", "created_at", "id", "note", "paid_at", "public_id", "reservation_id", "sent_at", "status" FROM "proposals";
DROP TABLE "proposals";
ALTER TABLE "new_proposals" RENAME TO "proposals";
CREATE UNIQUE INDEX "proposals_public_id_key" ON "proposals"("public_id");
CREATE INDEX "proposals_reservation_id_status_idx" ON "proposals"("reservation_id", "status");
CREATE TABLE "new_reservations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "member_id" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "villa" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "arrival_date" TEXT NOT NULL,
    "departure_date" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_reservations" ("arrival_date", "departure_date", "destination", "id", "member_id", "time_zone", "villa") SELECT "arrival_date", "departure_date", "destination", "id", "member_id", "time_zone", "villa" FROM "reservations";
DROP TABLE "reservations";
ALTER TABLE "new_reservations" RENAME TO "reservations";
CREATE INDEX "reservations_member_id_idx" ON "reservations"("member_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
