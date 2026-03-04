import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      username: "alice",
      balance: 0,
    },
  });
  await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      username: "bob",
      balance: 0,
    },
  });
  await prisma.user.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      username: "charlie",
      balance: 100,
    },
  });
  // Ledger entry for user 3 so ledger-derived balance matches User.balance (append-only consistency)
  const existing = await prisma.ledger.findFirst({
    where: { userId: 3, referenceId: "initial-charlie" },
  });
  if (!existing) {
    await prisma.ledger.create({
      data: {
        userId: 3,
        type: "DEPOSIT",
        amount: 100,
        referenceType: "Seed",
        referenceId: "initial-charlie",
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
