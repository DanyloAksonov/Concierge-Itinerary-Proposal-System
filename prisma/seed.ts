import { prisma } from "@/lib/db/client";

const MEMBER = { name: "James Whitfield", email: "james.whitfield@example.com" };

const RESERVATION = {
  destination: "Punta Mita, Mexico",
  villa: "Villa Punta Mita",
  timeZone: "America/Bahia_Banderas",
  arrivalDate: "2027-03-15",
  departureDate: "2027-03-22",
};

// Idempotent: safe to run on every `npm run dev`.
async function main() {
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
