import { randomUUID } from "node:crypto";
import { copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { inject } from "vitest";
import { createPrisma } from "@/lib/db/client";

export type TestDb = ReturnType<typeof createPrisma>;

/** A private, already-migrated SQLite DB (a copy of the run's template) plus its cleanup. */
export function createTestDb() {
  const template = inject("templateDbPath");
  const file = join(dirname(template), `${randomUUID()}.db`);
  copyFileSync(template, file);

  const db = createPrisma(`file:${file}`);
  const cleanup = async () => {
    await db.$disconnect();
    rmSync(file, { force: true });
  };
  return { db, cleanup };
}

/** The brief's scenario: James Whitfield at Villa Punta Mita, 15–22 March 2027. */
export async function seedStay(db: TestDb) {
  const member = await db.member.create({
    data: { name: "James Whitfield", email: "james.whitfield@example.com" },
  });
  return db.reservation.create({
    data: {
      memberId: member.id,
      destination: "Punta Mita, Mexico",
      villa: "Villa Punta Mita",
      timeZone: "America/Bahia_Banderas",
      arrivalDate: "2027-03-15",
      departureDate: "2027-03-22",
    },
  });
}
