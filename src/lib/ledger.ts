import { Prisma, PrismaClient, LedgerEntryType } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";

type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Ensures decimal representation and arithmetic precision.
 */
export function toDecimal(val: number | string | Prisma.Decimal): Prisma.Decimal {
  if (val instanceof Prisma.Decimal) return val;
  return new Prisma.Decimal(val.toString());
}

/**
 * Credits a confirmed deposit to user account and writes an immutable LedgerEntry.
 */
export async function creditDeposit(
  params: {
    accountId: string;
    userId: string;
    amount: number | string | Prisma.Decimal;
    depositId: string;
    description?: string;
  },
  client: PrismaTx = defaultPrisma
) {
  const depositAmount = toDecimal(params.amount);
  if (depositAmount.lessThanOrEqualTo(0)) {
    throw new Error("Deposit amount must be strictly positive");
  }

  // Fetch current account state
  const account = await client.account.findUniqueOrThrow({
    where: { id: params.accountId },
  });

  const newBalance = account.availableBalance.add(depositAmount);
  const newEquity = account.equity.add(depositAmount);

  // Update account
  const updatedAccount = await client.account.update({
    where: { id: params.accountId },
    data: {
      availableBalance: newBalance,
      equity: newEquity,
    },
  });

  // Record ledger entry
  const entry = await client.ledgerEntry.create({
    data: {
      userId: params.userId,
      accountId: params.accountId,
      type: LedgerEntryType.DEPOSIT,
      amount: depositAmount,
      balanceAfter: newBalance,
      referenceType: "DEPOSIT",
      referenceId: params.depositId,
      depositId: params.depositId,
      description: params.description || `Deposit credited via M-Pesa (Ref: ${params.depositId})`,
    },
  });

  return { account: updatedAccount, ledgerEntry: entry };
}

/**
 * Administrative manual balance adjustment.
 * Enforces mandatory reason and creates an immutable ADJUSTMENT ledger entry.
 */
export async function recordAdminAdjustment(
  params: {
    accountId: string;
    userId: string;
    amount: number | string | Prisma.Decimal;
    reason: string;
    adminActorId: string;
    ipAddress?: string;
  },
  client: PrismaTx = defaultPrisma
) {
  const adjustmentAmount = toDecimal(params.amount);
  if (adjustmentAmount.isZero()) {
    throw new Error("Adjustment amount cannot be zero");
  }

  if (!params.reason || params.reason.trim().length < 5) {
    throw new Error("A descriptive reason (min 5 chars) is mandatory for any ledger adjustment");
  }

  const account = await client.account.findUniqueOrThrow({
    where: { id: params.accountId },
  });

  const newBalance = account.availableBalance.add(adjustmentAmount);
  if (newBalance.lessThan(0)) {
    throw new Error("Adjustment would result in a negative account balance");
  }

  const newEquity = account.equity.add(adjustmentAmount);

  const updatedAccount = await client.account.update({
    where: { id: params.accountId },
    data: {
      availableBalance: newBalance,
      equity: newEquity,
    },
  });

  const entry = await client.ledgerEntry.create({
    data: {
      userId: params.userId,
      accountId: params.accountId,
      type: LedgerEntryType.ADJUSTMENT,
      amount: adjustmentAmount,
      balanceAfter: newBalance,
      referenceType: "ADJUSTMENT",
      referenceId: params.adminActorId,
      description: `Manual adjustment by admin (${params.adminActorId}): ${params.reason}`,
    },
  });

  // Write audit log
  await client.auditLog.create({
    data: {
      actorId: params.adminActorId,
      action: "ADMIN_BALANCE_ADJUSTMENT",
      entityType: "Account",
      entityId: params.accountId,
      metadata: {
        amount: adjustmentAmount.toString(),
        previousBalance: account.availableBalance.toString(),
        newBalance: newBalance.toString(),
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
    },
  });

  return { account: updatedAccount, ledgerEntry: entry };
}

/**
 * Reconciles an account balance against its ledger entries.
 */
export async function reconcileAccountBalance(
  accountId: string,
  client: PrismaTx = defaultPrisma
) {
  const account = await client.account.findUniqueOrThrow({
    where: { id: accountId },
  });

  const ledgerEntries = await client.ledgerEntry.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
  });

  // Ledger verification: calculate balance sum from history
  let computedBalance = new Prisma.Decimal(0);
  for (const entry of ledgerEntries) {
    // Depending on entry type:
    // DEPOSIT: +
    // ADJUSTMENT: + / -
    // TRADE_PROFIT: +
    // TRADE_LOSS: -
    // FEE: -
    // TRADE_OPEN_MARGIN_HOLD: -
    // TRADE_CLOSE_MARGIN_RELEASE: +
    computedBalance = computedBalance.add(entry.amount);
  }

  const isBalanced = computedBalance.equals(account.availableBalance);
  return {
    accountId,
    accountAvailableBalance: account.availableBalance,
    computedFromLedger: computedBalance,
    isBalanced,
    discrepancy: account.availableBalance.minus(computedBalance),
    entriesCount: ledgerEntries.length,
  };
}
