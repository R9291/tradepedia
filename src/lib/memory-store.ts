/**
 * Robust in-memory state repository for DEMO_MODE & Zero-Config Local Setup.
 * Guarantees that KYC, Trading, Balances, Ledger, and Admin review work seamlessly
 * even when a local PostgreSQL server is not running on port 5432.
 */

export interface DemoUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  passwordHash: string;
  role: "USER" | "ADMIN" | "COMPLIANCE";
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  accounts: DemoAccount[];
  kycDocuments: DemoKycDoc[];
}

export interface DemoAccount {
  id: string;
  userId: string;
  currency: string;
  availableBalance: string;
  lockedMargin: string;
  equity: string;
  isDemo: boolean;
  ledgerEntries: any[];
}

export interface DemoKycDoc {
  id: string;
  userId: string;
  documentType: string;
  fileUrl: string;
  idNumber?: string;
  address?: string;
  nationality?: string;
  dateOfBirth?: Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
}

export interface DemoTrade {
  id: string;
  userId: string;
  accountId: string;
  isDemo?: boolean;
  symbol: string;
  direction: "BUY" | "SELL";
  lotSize: string;
  entryPrice: string;
  exitPrice?: string | null;
  stopLoss?: string | null;
  takeProfit?: string | null;
  marginRequired: string;
  pnl?: string | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  openedAt: Date;
  closedAt?: Date | null;
  traderName?: string;
  traderEmail?: string;
}

interface DemoStore {
  users: Map<string, DemoUser>; // key: id or email
  trades: DemoTrade[];
  deposits: any[];
  auditLogs: any[];
}

declare global {
  // eslint-disable-next-line no-var
  var demoStoreGlobal: DemoStore | undefined;
}

export const demoStore: DemoStore =
  global.demoStoreGlobal || {
    users: new Map(),
    trades: [],
    deposits: [],
    auditLogs: [],
  };

if (process.env.NODE_ENV !== "production") {
  global.demoStoreGlobal = demoStore;
}

// Seed default administrator if not present
if (!demoStore.users.has("admin@tradepedia.co.ke")) {
  const admin: DemoUser = {
    id: "admin_root_tradepedia",
    email: "admin@tradepedia.co.ke",
    phone: "254700000001",
    fullName: "Tradepedia Lead Administrator",
    passwordHash: "",
    role: "ADMIN",
    kycStatus: "APPROVED",
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date(),
    accounts: [
      {
        id: "acc_admin_root",
        userId: "admin_root_tradepedia",
        currency: "KES",
        availableBalance: "1000000.00",
        lockedMargin: "0.00",
        equity: "1000000.00",
        isDemo: true,
        ledgerEntries: [
          {
            id: "led_init_admin",
            type: "DEPOSIT",
            amount: "1000000.00",
            balanceAfter: "1000000.00",
            description: "Initial administrator liquidity grant",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "acc_admin_real",
        userId: "admin_root_tradepedia",
        currency: "KES",
        availableBalance: "0.00",
        lockedMargin: "0.00",
        equity: "0.00",
        isDemo: false,
        ledgerEntries: [],
      },
    ],
    kycDocuments: [],
  };
  demoStore.users.set(admin.id, admin);
  demoStore.users.set(admin.email, admin);
}

// Seed default paper & live trader for zero-config trading terminal access
if (!demoStore.users.has("demo_trader_ke")) {
  const defaultPaperTrader: DemoUser = {
    id: "demo_trader_ke",
    email: "trader@tradepedia.co.ke",
    phone: "254712345678",
    fullName: "Paper Trader (Guest Trader)",
    passwordHash: "",
    role: "USER",
    kycStatus: "APPROVED",
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date(),
    accounts: [
      {
        id: "acc_demo_trader_ke",
        userId: "demo_trader_ke",
        currency: "KES",
        availableBalance: "100000.00",
        lockedMargin: "0.00",
        equity: "100000.00",
        isDemo: true,
        ledgerEntries: [
          {
            id: "led_init_paper",
            type: "DEPOSIT",
            amount: "100000.00",
            balanceAfter: "100000.00",
            description: "Initial Paper Trading virtual liquidity",
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "acc_real_trader_ke",
        userId: "demo_trader_ke",
        currency: "KES",
        availableBalance: "0.00",
        lockedMargin: "0.00",
        equity: "0.00",
        isDemo: false,
        ledgerEntries: [],
      },
    ],
    kycDocuments: [],
  };
  demoStore.users.set(defaultPaperTrader.id, defaultPaperTrader);
  demoStore.users.set(defaultPaperTrader.email, defaultPaperTrader);
}
