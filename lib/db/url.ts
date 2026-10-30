// Shared by the Prisma CLI (prisma.config.ts) and the runtime client so both hit the same file.
export const DATABASE_URL = process.env.DATABASE_URL ?? "file:./data/app.db";
