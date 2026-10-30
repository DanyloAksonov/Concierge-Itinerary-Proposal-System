import type { Concierge, Prisma, PrismaClient } from "@/lib/generated/prisma/client";

/** Public shape of a concierge — contact details the member may see; no internal id. */
export function toConciergeDto(concierge: Concierge) {
  return {
    name: concierge.name,
    title: concierge.title,
    email: concierge.email,
    phone: concierge.phone,
  };
}

export type ConciergeDto = ReturnType<typeof toConciergeDto>;

/**
 * The concierge acting in this request. There is no login yet, so this is the single place a
 * session lookup will replace; until then it is the (only) seeded concierge. Clients never
 * send a concierge id.
 */
export async function getCurrentConcierge(db: PrismaClient | Prisma.TransactionClient) {
  const concierge = await db.concierge.findFirst({ orderBy: { id: "asc" } });
  if (!concierge) {
    throw new Error("No concierge found — run `npm run db:seed`.");
  }
  return concierge;
}
