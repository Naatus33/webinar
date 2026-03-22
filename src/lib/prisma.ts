import { PrismaClient } from "@prisma/client";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (dbUrl.startsWith("file:")) {
    const relativePath = dbUrl.replace(/^file:/, "");
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const absoluteUrl = `file:${absolutePath}`;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const adapter = new PrismaBetterSqlite3({ url: absoluteUrl });
    return new PrismaClient({ adapter });
  }

  // Prisma 7: Postgres exige driver adapter (@prisma/adapter-pg + pg)
  // Usa PoolConfig (objeto) para evitar conflito de tipos entre @types/pg duplicados.
  const adapter = new PrismaPg({ connectionString: dbUrl });
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
