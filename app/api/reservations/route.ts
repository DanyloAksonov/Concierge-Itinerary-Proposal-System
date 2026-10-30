import { connection } from "next/server";
import { withErrorHandling } from "@/lib/api/errors";
import { reservationService } from "@/lib/reservations/service";

export const GET = withErrorHandling(async () => {
  await connection(); // DB read: always render at request time, never prerender
  return Response.json(await reservationService.listReservations());
});
