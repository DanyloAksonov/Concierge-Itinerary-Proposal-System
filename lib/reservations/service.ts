import { prisma } from "@/lib/db/client";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

type ReservationRecord = Prisma.ReservationGetPayload<{ include: { member: true } }>;

/** Public shape of a reservation and its member, shared by the API and Server Components. */
export function toReservationDto({ member, ...reservation }: ReservationRecord) {
  return {
    reservation: {
      id: reservation.id,
      destination: reservation.destination,
      villa: reservation.villa,
      timeZone: reservation.timeZone,
      arrivalDate: reservation.arrivalDate,
      departureDate: reservation.departureDate,
    },
    member: { name: member.name, email: member.email },
  };
}

export type ReservationDto = ReturnType<typeof toReservationDto>;

export function createReservationService(db: PrismaClient) {
  async function listReservations() {
    const reservations = await db.reservation.findMany({
      include: { member: true },
      orderBy: { arrivalDate: "asc" },
    });
    return { reservations: reservations.map(toReservationDto) };
  }

  return { listReservations };
}

export const reservationService = createReservationService(prisma);
