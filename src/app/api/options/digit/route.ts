import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { demoStore } from "@/lib/memory-store";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const digitSettleSchema = z.object({
  symbol: z.string().min(2),
  category: z.enum(["MATCHES_DIFFERS", "EVEN_ODD", "OVER_UNDER"]),
  contractType: z.enum(["MATCHES", "DIFFERS", "EVEN", "ODD", "OVER", "UNDER"]),
  predictionDigit: z.number().int().min(0).max(9).optional(),
  ticks: z.number().int().min(1).max(10),
  stakeUsd: z.number().min(0.35).max(10000),
  payoutUsd: z.number().positive(),
  entryPrice: z.string(),
  exitPrice: z.string(),
  exitDigit: z.number().int().min(0).max(9),
  won: z.boolean(),
  accountType: z.enum(["DEMO", "REAL"]),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    const userId = authUser?.id || "demo_trader_ke";
    const body = await req.json();
    const parsed = digitSettleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid digit contract payload" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const isDemo = d.accountType === "DEMO";
    const netDelta = d.won ? d.payoutUsd - d.stakeUsd : -d.stakeUsd;

    const memUser = demoStore.users.get(userId) || (authUser?.email ? demoStore.users.get(authUser.email) : undefined);
    let updatedBalance = "";

    if (memUser) {
      const acc = memUser.accounts.find((a) => a.isDemo === isDemo) || memUser.accounts[0];
      if (acc) {
        const current = parseFloat(acc.availableBalance || "0");
        const nextBal = Math.max(0, current + netDelta);
        acc.availableBalance = nextBal.toFixed(2);
        acc.equity = nextBal.toFixed(2);
        updatedBalance = acc.availableBalance;
        acc.ledgerEntries = acc.ledgerEntries || [];
        acc.ledgerEntries.unshift({
          id: `led_dig_${Date.now()}`,
          type: d.won ? "TRADE_PROFIT" : "TRADE_LOSS",
          amount: netDelta.toFixed(2),
          balanceAfter: acc.availableBalance,
          description: `Digit ${d.contractType}${d.predictionDigit !== undefined ? ` (${d.predictionDigit})` : ""} on ${d.symbol} • Exit digit ${d.exitDigit}`,
          createdAt: new Date(),
        });
      }
    }

    await createAuditLog({
      actorId: userId,
      action: "DIGIT_OPTION_SETTLED",
      entityType: "DigitOption",
      metadata: { ...d, netDelta },
    });

    return NextResponse.json({
      success: true,
      data: {
        won: d.won,
        netDelta: Number(netDelta.toFixed(2)),
        availableBalance: updatedBalance || undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to settle digit option" },
      { status: 500 }
    );
  }
}
