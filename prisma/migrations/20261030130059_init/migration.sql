-- CreateTable
CREATE TABLE "members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "member_id" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "villa" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "arrival_date" TEXT NOT NULL,
    "departure_date" TEXT NOT NULL,
    CONSTRAINT "reservations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "public_id" TEXT NOT NULL,
    "reservation_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" DATETIME,
    "approved_at" DATETIME,
    "paid_at" DATETIME,
    CONSTRAINT "proposals_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "proposal_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposal_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scheduled_at" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    CONSTRAINT "proposal_items_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sent_emails" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposal_id" INTEGER NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_preview" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sent_emails_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE INDEX "reservations_member_id_idx" ON "reservations"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_public_id_key" ON "proposals"("public_id");

-- CreateIndex
CREATE INDEX "proposals_reservation_id_status_idx" ON "proposals"("reservation_id", "status");

-- CreateIndex
CREATE INDEX "proposal_items_proposal_id_scheduled_at_idx" ON "proposal_items"("proposal_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "sent_emails_proposal_id_idx" ON "sent_emails"("proposal_id");
