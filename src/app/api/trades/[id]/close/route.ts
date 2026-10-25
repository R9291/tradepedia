import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { executeCloseTrade } from "@/lib/trading";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    const user = authUser || { id: "demo_trader_ke" };

    const tradeId = params.id;
    const result = await executeCloseTrade({
      tradeId,
      userId: user.id,
    });

    const tradeObj = result.trade as any;
    const pnlDisplay = typeof tradeObj.pnl === "number" || typeof tradeObj.pnl?.toFixed === "function"
      ? Number(tradeObj.pnl).toFixed(2)
      : String(tradeObj.pnl || "0.00");

    await createAuditLog({
      actorId: user.id,
      action: "TRADE_CLOSED",
      entityType: "Trade",
      entityId: tradeId,
      metadata: {
        symbol: tradeObj.symbol || tradeObj.instrumentId || "ASSET",
        exitPrice: tradeObj.exitPrice?.toString(),
        pnl: tradeObj.pnl?.toString(),
      },
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Position closed. Realized PnL: KES ${pnlDisplay}. Margin collateral released.`,
      data: {
        tradeId: tradeObj.id,
        exitPrice: tradeObj.exitPrice?.toString(),
        pnl: tradeObj.pnl?.toString(),
        newAvailableBalance: result.account.availableBalance.toString(),
        newLockedMargin: (result.account as any).lockedMargin?.toString() || "0.00",
      },
    });
  } catch (error: any) {
    console.error("Close trade error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to close position" },
      { status: 400 }
    );
  }
}
