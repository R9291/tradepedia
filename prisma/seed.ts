import { PrismaClient, UserRole, KycStatus, LedgerEntryType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding TRADEPEDIA instruments and administrator...");

  // 1. Seed Forex Instruments
  const instruments = [
    {
      symbol: "EURUSD",
      baseCurrency: "EUR",
      quoteCurrency: "USD",
      displayName: "Euro / US Dollar",
      pipSize: 0.0001,
      contractSize: 100000,
      maxLeverage: 10,
    },
    {
      symbol: "GBPUSD",
      baseCurrency: "GBP",
      quoteCurrency: "USD",
      displayName: "British Pound / US Dollar",
      pipSize: 0.0001,
      contractSize: 100000,
      maxLeverage: 10,
    },
    {
      symbol: "USDJPY",
      baseCurrency: "USD",
      quoteCurrency: "JPY",
      displayName: "US Dollar / Japanese Yen",
      pipSize: 0.01,
      contractSize: 100000,
      maxLeverage: 10,
    },
    {
      symbol: "USDCHF",
      baseCurrency: "USD",
      quoteCurrency: "CHF",
      displayName: "US Dollar / Swiss Franc",
      pipSize: 0.0001,
      contractSize: 100000,
      maxLeverage: 10,
    },
    {
      symbol: "AUDUSD",
      baseCurrency: "AUD",
      quoteCurrency: "USD",
      displayName: "Australian Dollar / US Dollar",
      pipSize: 0.0001,
      contractSize: 100000,
      maxLeverage: 10,
    },
    {
      symbol: "USDCAD",
      baseCurrency: "USD",
      quoteCurrency: "CAD",
      displayName: "US Dollar / Canadian Dollar",
      pipSize: 0.0001,
      contractSize: 100000,
      maxLeverage: 10,
    },
  ];

  for (const inst of instruments) {
    await prisma.instrument.upsert({
      where: { symbol: inst.symbol },
      update: {},
      create: {
        symbol: inst.symbol,
        baseCurrency: inst.baseCurrency,
        quoteCurrency: inst.quoteCurrency,
        displayName: inst.displayName,
        pipSize: inst.pipSize,
        contractSize: inst.contractSize,
        maxLeverage: inst.maxLeverage,
        isActive: true,
      },
    });
  }

  // 2. Seed Default Administrator
  const adminPasswordHash = await bcrypt.hash("TradepediaAdmin2026!", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@tradepedia.co.ke" },
    update: {},
    create: {
      email: "admin@tradepedia.co.ke",
      phone: "254700000001",
      fullName: "Tradepedia Lead Administrator",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      kycStatus: KycStatus.APPROVED,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
      accounts: {
        create: {
          currency: "KES",
          availableBalance: 1000000.0,
          lockedMargin: 0.0,
          equity: 1000000.0,
          isDemo: true,
        },
      },
    },
  });

  console.log(`Administrator seeded: ${adminUser.email}`);
  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
