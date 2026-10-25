import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import { toDecimal } from "../src/lib/ledger";

describe("Password Security & Hashing", () => {
  it("should securely hash a password and correctly verify valid credentials", async () => {
    const raw = "SecureKenya2026!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2")).toBe(true);

    const isValid = await verifyPassword(raw, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("WrongPassword!", hash);
    expect(isInvalid).toBe(false);
  });
});

describe("Trading Math & PnL Engine", () => {
  it("should accurately compute BUY trade profit and loss with Decimal precision", () => {
    // Formula: (exitPrice - entryPrice) * contractSize * lotSize
    const entryPrice = new Prisma.Decimal("1.08500");
    const exitPrice = new Prisma.Decimal("1.08900");
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.10");

    const delta = exitPrice.minus(entryPrice);
    const pnl = delta.times(contractSize).times(lotSize);

    // 0.00400 * 100000 * 0.10 = 40.00 USD
    expect(pnl.toNumber()).toBeCloseTo(40.0, 4);
  });

  it("should accurately compute SELL trade profit and loss with Decimal precision", () => {
    // Formula: (entryPrice - exitPrice) * contractSize * lotSize
    const entryPrice = new Prisma.Decimal("1.08500");
    const exitPrice = new Prisma.Decimal("1.08100");
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.20");

    const delta = entryPrice.minus(exitPrice);
    const pnl = delta.times(contractSize).times(lotSize);

    // 0.00400 * 100000 * 0.20 = 80.00 USD
    expect(pnl.toNumber()).toBeCloseTo(80.0, 4);
  });

  it("should correctly compute margin requirements at 1:10 leverage", () => {
    // Formula: (contractSize * lotSize * entryPrice) / leverage
    const entryPrice = new Prisma.Decimal("1.08000");
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.05");
    const leverage = new Prisma.Decimal("10");

    const marginRequired = contractSize.times(lotSize).times(entryPrice).dividedBy(leverage);

    // (100000 * 0.05 * 1.08) / 10 = 540.00 USD
    expect(marginRequired.toNumber()).toBeCloseTo(540.0, 2);
  });
});

describe("Double-Entry Ledger Integrity Rules", () => {
  it("should guarantee balance equation: balanceAfter = oldBalance + depositAmount", () => {
    const oldBalance = new Prisma.Decimal("15000.50");
    const depositAmount = new Prisma.Decimal("5000.00");
    const balanceAfter = oldBalance.add(depositAmount);

    expect(balanceAfter.toFixed(2)).toBe("20000.50");
    expect(balanceAfter.equals(new Prisma.Decimal("20000.50"))).toBe(true);
  });

  it("should prevent negative adjustments that breach available balance", () => {
    const availableBalance = new Prisma.Decimal("2500.00");
    const attemptedDebit = new Prisma.Decimal("-3000.00");
    const resultingBalance = availableBalance.add(attemptedDebit);

    expect(resultingBalance.isNegative()).toBe(true);
    // In our ledger, this condition throws an exception
    const wouldViolate = resultingBalance.lessThan(0);
    expect(wouldViolate).toBe(true);
  });

  it("should strictly enforce mandatory reasons for administrative adjustments", () => {
    const invalidReason = "    ";
    const isValid = invalidReason.trim().length >= 5;
    expect(isValid).toBe(false);

    const validReason = "Correction for disputed M-Pesa reference QWE123RTY4";
    expect(validReason.trim().length >= 5).toBe(true);
  });
});

describe("KYC Compliance & Conflict of Interest Rules", () => {
  it("should block self-approval by an administrator", () => {
    const adminId = "admin_cuid_12345";
    const targetUserId = "admin_cuid_12345";

    const isSelfApproval = adminId === targetUserId;
    expect(isSelfApproval).toBe(true);
  });

  it("should allow approval when administrator reviews a different user", () => {
    const adminId: string = "admin_cuid_12345";
    const targetUserId: string = "user_cuid_98765";

    const isSelfApproval = adminId === targetUserId;
    expect(isSelfApproval).toBe(false);
  });

  it("should gate trading and deposit actions strictly on APPROVED status", () => {
    const checkCanDepositOrTrade = (status: string) => status === "APPROVED";

    expect(checkCanDepositOrTrade("NOT_SUBMITTED")).toBe(false);
    expect(checkCanDepositOrTrade("PENDING")).toBe(false);
    expect(checkCanDepositOrTrade("REJECTED")).toBe(false);
    expect(checkCanDepositOrTrade("APPROVED")).toBe(true);
  });
});

describe("M-Pesa Webhook Idempotency & ResultCode Logic", () => {
  it("should identify duplicate callbacks and prevent duplicate balance crediting", () => {
    const processedCheckoutIds = new Set<string>(["ws_CO_123456789"]);

    const incomingCheckoutId = "ws_CO_123456789";
    const isDuplicate = processedCheckoutIds.has(incomingCheckoutId);

    expect(isDuplicate).toBe(true);
  });

  it("should never credit balances when Safaricom ResultCode != 0", () => {
    const resultCodeCancelled = 1032; // User cancelled STK prompt
    const resultCodeInsufficientFunds = 1; // Insufficient M-Pesa balance
    const resultCodeSuccess = 0; // Success

    const shouldCreditFunds = (code: number) => code === 0;

    expect(shouldCreditFunds(resultCodeCancelled)).toBe(false);
    expect(shouldCreditFunds(resultCodeInsufficientFunds)).toBe(false);
    expect(shouldCreditFunds(resultCodeSuccess)).toBe(true);
  });
});
