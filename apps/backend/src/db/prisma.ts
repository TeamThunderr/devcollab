import "../config/env";

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient;
    prismaPool?: Pool;
};

const prismaPool =
    globalForPrisma.prismaPool ??
    new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
    });

const adapter = new PrismaPg(prismaPool);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["warn", "error"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.prismaPool = prismaPool;
}

export { prismaPool as pool };
