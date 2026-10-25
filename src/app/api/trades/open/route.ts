import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLiveQuote, calculatePnL } from "@/lib/trading";
import { TradeStatus, TradeDirection, Prisma } from "@prisma/client";
import { demoStore } from "@/lib/memory-store";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const accountType = searchParams.get("accountType"); // "DEMO" | "REAL" | null

    if (accountType === "REAL" && !authUser) {
      return NextResponse.json({ success: true, data: { openTrades: [] } });
    }

    const user = authUser || { id: "demo_trader_ke", role: "USER" };
    const isAdmin = user.role === "ADMIN" || user.role === "COMPLIANCE";
    const requestedAll = searchParams.get("all") === "true";

    let openTrades: any[] = [];

    try {
      const whereClause: any = { status: TradeStatus.OPEN };
      if (!isAdmin || !requestedAll) {
        whereClause.userId = user.id;
      }
      if (accountType === "DEMO") {
        whereClause.account = { isDemo: true };
      } else if (accountType === "REAL") {
        whereClause.account = { isDemo: false };
      }

      openTrades = await prisma.trade.findMany({
        where: whereClause,
        include: {
          instrument: true,
          account: true,
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { openedAt: "desc" },
      });
    } catch {
      // DB unreachable
    }

    if (openTrades.length === 0) {
      // Check in demo store
      openTrades = demoStore.trades
        .filter((t) => {
          if (t.status !== "OPEN") return false;
          if (!isAdmin || !requestedAll) {
            if (t.userId !== user.id) return false;
          }
          if (accountType === "DEMO" && t.isDemo === false) return false;
          if (accountType === "REAL" && t.isDemo !== false) return false;
          return true;
        })
        .map((t) => ({
          id: t.id,
          instrument: { symbol: t.symbol, contractSize: new Prisma.Decimal("100000") },
          direction: t.direction,
          lotSize: new Prisma.Decimal(t.lotSize),
          entryPrice: new Prisma.Decimal(t.entryPrice),
          stopLoss: t.stopLoss,
          takeProfit: t.takeProfit,
          marginRequired: new Prisma.Decimal(t.marginRequired),
          openedAt: t.openedAt,
          isDemo: t.isDemo !== false,
          user: { fullName: t.traderName, email: t.traderEmail },
        }));
    }

    const enriched = openTrades.map((t) => {
      const quote = getLiveQuote(t.instrument.symbol);
      const currentPrice = t.direction === TradeDirection.BUY ? quote.bid : quote.ask;
      const { pnlKes, pnlUsd } = calculatePnL(
        t.direction as TradeDirection,
        t.entryPrice,
        currentPrice,
        t.instrument.contractSize,
        t.lotSize,
        t.instrument.symbol
      );

      return {
        id: t.id,
        symbol: t.instrument.symbol,
        direction: t.direction,
        lotSize: t.lotSize.toString(),
        entryPrice: t.entryPrice.toString(),
        currentPrice: currentPrice.toString(),
        stopLoss: t.stopLoss?.toString() || null,
        takeProfit: t.takeProfit?.toString() || null,
        marginRequired: t.marginRequired.toString(),
        floatingPnL: pnlKes.toString(),
        floatingPnLUsd: pnlUsd.toString(),
        isDemo: t.isDemo !== undefined ? t.isDemo : (t.account ? t.account.isDemo : true),
        openedAt: t.openedAt,
        traderName: t.user?.fullName,
        traderEmail: t.user?.email,
      };
    });

    return NextResponse.json({
      success: true,
      data: { openTrades: enriched },
    });
  } catch (error) {
    console.error("Open trades error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch open trades" }, { status: 500 });
  }
}
