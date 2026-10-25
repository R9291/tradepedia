import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoStore } from "@/lib/memory-store";
import { Prisma, LedgerEntryType } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    const user = authUser || { id: "demo_trader_ke", email: "trader@tradepedia.co.ke" };

    let resetAmount = "100000.00"; // default KES 100,000
    try {
      const body = await req.json();
      if (body?.amount && typeof body.amount === "number" && body.amount >= 1000) {
        resetAmount = body.amount.toFixed(2);
      }
    } catch {}

    // 1. Try PostgreSQL via Prisma
    try {
      const demoAccount = await prisma.account.findFirst({
        where: { userId: user.id, isDemo: true },
      }) || await prisma.account.findFirst({
        where: { userId: user.id },
      });

      if (demoAccount) {
        await prisma.$transaction(async (tx) => {
          await tx.account.update({
            where: { id: demoAccount.id },
            data: {
              availableBalance: new Prisma.Decimal(resetAmount),
              lockedMargin: new Prisma.Decimal("0.00"),
              equity: new Prisma.Decimal(resetAmount),
            },
          });

          await tx.ledgerEntry.create({
            data: {
              userId: user.id,
              accountId: demoAccount.id,
              type: LedgerEntryType.DEPOSIT,
              amount: new Prisma.Decimal(resetAmount),
              balanceAfter: new Prisma.Decimal(resetAmount),
              referenceType: "DEMO_RESET",
              referenceId: `rst_${Date.now()}`,
              description: `Demo Paper Balance Reset to KES ${parseFloat(resetAmount).toLocaleString()}`,
            },
          });
        });
      }
    } catch (dbErr) {
      console.warn("DB unreachable, resetting in demo store:", dbErr);
    }

    // 2. Update memory store
    let memUser = demoStore.users.get(user.id);
    if (!memUser) memUser = demoStore.users.get(user.email);

    if (memUser && memUser.accounts.length > 0) {
      const acc = memUser.accounts.find((a) => a.isDemo) || memUser.accounts[0];
      acc.availableBalance = resetAmount;
      acc.lockedMargin = "0.00";
      acc.equity = resetAmount;
      acc.ledgerEntries = acc.ledgerEntries || [];
      acc.ledgerEntries.unshift({
        id: `led_rst_${Date.now()}`,
        type: "DEPOSIT",
        amount: resetAmount,
        balanceAfter: resetAmount,
        description: `Demo Paper Balance Reset to KES ${parseFloat(resetAmount).toLocaleString()}`,
        createdAt: new Date(),
      });
      demoStore.users.set(user.id, memUser);
      demoStore.users.set(memUser.email, memUser);
    }

    // Remove or close open demo trades so trader starts fresh
    demoStore.trades = demoStore.trades.filter((t) => !(t.userId === user.id && t.isDemo !== false));

    await createAuditLog({
      actorId: user.id,
      action: "DEMO_BALANCE_RESET",
      entityType: "Account",
      entityId: user.id,
      metadata: { amount: resetAmount },
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Demo paper balance successfully reset to KES 100,000.00",
      data: {
        availableBalance: resetAmount,
        equity: resetAmount,
      },
    });
  } catch (error: any) {
    console.error("Reset demo balance error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset demo balance" },
      { status: 500 }
    );
  }
}
