import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TradeStatus } from "@prisma/client";
import { demoStore } from "@/lib/memory-store";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("accountType"); // "DEMO" | "REAL" | null

    if (accountType === "REAL" && !authUser) {
      return NextResponse.json({ success: true, data: { trades: [] } });
    }

    const user = authUser || { id: "demo_trader_ke", role: "USER" };
    const isAdmin = user.role === "ADMIN" || user.role === "COMPLIANCE";
    const requestedAll = searchParams.get("all") === "true";

    let closedTrades: any[] = [];

    try {
      const whereClause: any = { status: TradeStatus.CLOSED };
      if (!isAdmin || !requestedAll) {
        whereClause.userId = user.id;
      }
      if (accountType === "DEMO") {
        whereClause.account = { isDemo: true };
      } else if (accountType === "REAL") {
        whereClause.account = { isDemo: false };
      }

      closedTrades = await prisma.trade.findMany({
        where: whereClause,
        include: {
          instrument: true,
          account: true,
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { closedAt: "desc" },
        take: 100,
      });
    } catch {
      // DB unreachable
    }

    if (closedTrades.length === 0) {
      closedTrades = demoStore.trades
        .filter((t) => {
          if (t.status !== "CLOSED") return false;
          if (!isAdmin || !requestedAll) {
            if (t.userId !== user.id) return false;
          }
          if (accountType === "DEMO" && t.isDemo === false) return false;
          if (accountType === "REAL" && t.isDemo !== false) return false;
          return true;
        })
        .map((t) => ({
          id: t.id,
          symbol: t.symbol,
          direction: t.direction,
          lotSize: t.lotSize,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice || "0",
          stopLoss: t.stopLoss,
          takeProfit: t.takeProfit,
          marginRequired: t.marginRequired,
          pnl: t.pnl || "0",
          openedAt: t.openedAt,
          closedAt: t.closedAt,
          isDemo: t.isDemo !== false,
          traderName: t.traderName,
          traderEmail: t.traderEmail,
        }));
    } else {
      closedTrades = closedTrades.map((t) => ({
        id: t.id,
        symbol: t.instrument.symbol,
        direction: t.direction,
        lotSize: t.lotSize.toString(),
        entryPrice: t.entryPrice.toString(),
        exitPrice: t.exitPrice?.toString() || "0",
        stopLoss: t.stopLoss?.toString() || null,
        takeProfit: t.takeProfit?.toString() || null,
        marginRequired: t.marginRequired.toString(),
        pnl: t.pnl?.toString() || "0",
        openedAt: t.openedAt,
        closedAt: t.closedAt,
        isDemo: t.account ? t.account.isDemo : true,
        traderName: t.user?.fullName,
        traderEmail: t.user?.email,
      }));
    }

    return NextResponse.json({
      success: true,
      data: { trades: closedTrades },
    });
  } catch (error) {
    console.error("Trade history error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch trade history" }, { status: 500 });
  }
}
