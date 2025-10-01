import { PrismaClient } from "@prisma/client"

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = globalWithPrisma.prisma;
}

// Add connection lifecycle management
prisma.$connect().catch((err) => {
  console.error('❌ [Prisma] Initial connection failed:', err);
});

export default prisma;