import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type PrismaGlobal = typeof globalThis & {
  __byProjectPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrisma() {
  if (!prismaGlobal.__byProjectPrisma) {
    prismaGlobal.__byProjectPrisma = createPrismaClient();
  }

  return prismaGlobal.__byProjectPrisma;
}
