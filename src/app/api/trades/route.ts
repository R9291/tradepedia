import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { executeOpenTrade } from "@/lib/trading";
import { getMarketStatus } from "@/lib/market-hours";
import { TradeDirection } from "@prisma/client";
import { z } from "zod";

const createTradeSchema = z.object({
  symbol: z.string().min(3).max(10),
  direction: z.enum(["BUY", "SELL"]),
  lotSize: z.number().min(0.01, "Minimum volume is 0.01 lot").max(10.0, "Maximum volume is 10.0 lots"),
  stopLoss: z.number().nullable().optional(),
  takeProfit: z.number().nullable().optional(),
  isDemo: z.boolean().optional(),
  accountType: z.enum(["DEMO", "REAL"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    const body = await req.json();
    const validated = createTradeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validated.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { symbol, direction, lotSize, stopLoss, takeProfit } = validated.data;
    const isDemo = validated.data.isDemo !== undefined 
      ? validated.data.isDemo 
      : validated.data.accountType !== "REAL";

    if (!isDemo && (!authUser || authUser.isGuest)) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required: Please log in or register an account before trading on a Real Broker account.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const user = authUser || {
      id: "demo_trader_ke",
      kycStatus: "APPROVED",
      isGuest: true,
    };

    if (user.kycStatus !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          error: "Trading restricted: Your identity verification (KYC) must be APPROVED.",
        },
        { status: 403 }
      );
    }

    const marketStatus = getMarketStatus(symbol);
    if (!marketStatus.isOpen && process.env.STRICT_MARKET_HOURS === "true") {
      return NextResponse.json(
        {
          success: false,
          error: `Market for ${symbol} is currently closed (${marketStatus.tradingHoursLabel}). ${marketStatus.nextEventLabel}. You can place a Pending Limit Order or trade 24/7 Crypto.`,
        },
        { status: 400 }
      );
    }

    const result = await executeOpenTrade({
      userId: user.id,
      symbol,
      direction: direction as TradeDirection,
      lotSize,
      stopLoss,
      takeProfit,
      isDemo,
    });

    return NextResponse.json({
      success: true,
      message: `${isDemo ? "[Paper Trading]" : "[Live Real]"} Market order executed: ${direction} ${lotSize} lots ${symbol} [${marketStatus.sessionName}]`,
      data: {
        tradeId: result.trade.id,
        isDemo,
        accountType: isDemo ? "DEMO" : "REAL",
        symbol,
        marketSession: marketStatus.sessionName,
        marketStatus: marketStatus.statusLabel,
        direction: result.trade.direction,
        entryPrice: result.trade.entryPrice.toString(),
        lotSize: result.trade.lotSize.toString(),
        marginRequired: result.trade.marginRequired.toString(),
        openedAt: result.trade.openedAt,
        newAvailableBalance: result.account.availableBalance.toString(),
        newLockedMargin: result.account.lockedMargin.toString(),
      },
    });
  } catch (error: any) {
    console.error("Open trade error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute order" },
      { status: 400 }
    );
  }
}
