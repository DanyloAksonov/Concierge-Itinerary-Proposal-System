import { prisma } from "@/lib/db/client";

const MEMBER = { name: "James Whitfield", email: "james.whitfield@example.com" };

// Same email as the backfill in the add_concierges migration, so the upsert reuses that row.
const CONCIERGE = {
  name: "Sofia Navarro",
  title: "Senior Concierge, Punta Mita",
  email: "sofia.navarro@example.com",
  phone: "+52 329 555 0142",
};

const RESERVATION = {
  destination: "Punta Mita, Mexico",
  villa: "Villa Punta Mita",
  timeZone: "America/Bahia_Banderas",
  arrivalDate: "2027-03-15",
  departureDate: "2027-03-22",
};

// Idempotent: safe to run on every `npm run dev`.
async function main() {
  await prisma.concierge.upsert({
    where: { email: CONCIERGE.email },
    update: CONCIERGE,
    create: CONCIERGE,
  });

  const member = await prisma.member.upsert({
    where: { email: MEMBER.email },
    update: { name: MEMBER.name },
    create: MEMBER,
  });

  const existing = await prisma.reservation.findFirst({
    where: { memberId: member.id, villa: RESERVATION.villa, arrivalDate: RESERVATION.arrivalDate },
  });

  if (!existing) {
    await prisma.reservation.create({ data: { ...RESERVATION, memberId: member.id } });
  }

  console.log("[db] seed complete");
}

main().finally(() => prisma.$disconnect());
