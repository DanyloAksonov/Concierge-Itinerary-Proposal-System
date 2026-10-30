import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { DATABASE_URL } from "./url";

export function createPrisma(url: string = DATABASE_URL) {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// Reuse one client across hot reloads in dev instead of opening a new connection per module reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
