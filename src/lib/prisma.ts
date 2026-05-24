import path from "path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/client";

function createPrismaClient() {
  const dbPath = path.join(process.cwd(), "production.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  const client = new PrismaClient({ adapter, log: ["error", "warn"] });
  // Enable WAL mode for better concurrent read performance (persists on disk)
  client.$executeRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
