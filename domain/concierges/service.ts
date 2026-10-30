import "server-only";
import { prisma } from "@/lib/db/client";
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

// Defaults to the concierge created by prisma/seed.ts.
const CURRENT_CONCIERGE_EMAIL = process.env.CURRENT_CONCIERGE_EMAIL ?? "sofia.navarro@example.com";

/**
 * The concierge acting in this request. There is no login yet, so the deployment acts as one
 * configured concierge; this is the single place a session lookup will replace. Clients never
 * send a concierge id.
 */
export async function getCurrentConcierge(db: PrismaClient | Prisma.TransactionClient) {
  const concierge = await db.concierge.findUnique({ where: { email: CURRENT_CONCIERGE_EMAIL } });
  if (!concierge) {
    throw new Error(
      `No concierge with email "${CURRENT_CONCIERGE_EMAIL}". Run \`npm run db:seed\` or set CURRENT_CONCIERGE_EMAIL.`,
    );
  }
  return concierge;
}

export function createConciergeService(db: PrismaClient) {
  async function getCurrent() {
    return toConciergeDto(await getCurrentConcierge(db));
  }

  return { getCurrent };
}

export const conciergeService = createConciergeService(prisma);
