import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllLiveQuotes } from "@/lib/trading";

export const dynamic = "force-dynamic";

const FALLBACK_INSTRUMENTS = [
  { symbol: "EURUSD", displayName: "Euro / US Dollar", baseCurrency: "EUR", quoteCurrency: "USD", pipSize: "0.0001", contractSize: "100000", maxLeverage: 10 },
  { symbol: "GBPUSD", displayName: "British Pound / US Dollar", baseCurrency: "GBP", quoteCurrency: "USD", pipSize: "0.0001", contractSize: "100000", maxLeverage: 10 },
  { symbol: "USDJPY", displayName: "US Dollar / Japanese Yen", baseCurrency: "USD", quoteCurrency: "JPY", pipSize: "0.01", contractSize: "100000", maxLeverage: 10 },
  { symbol: "USDCHF", displayName: "US Dollar / Swiss Franc", baseCurrency: "USD", quoteCurrency: "CHF", pipSize: "0.0001", contractSize: "100000", maxLeverage: 10 },
  { symbol: "AUDUSD", displayName: "Australian Dollar / US Dollar", baseCurrency: "AUD", quoteCurrency: "USD", pipSize: "0.0001", contractSize: "100000", maxLeverage: 10 },
  { symbol: "USDCAD", displayName: "US Dollar / Canadian Dollar", baseCurrency: "USD", quoteCurrency: "CAD", pipSize: "0.0001", contractSize: "100000", maxLeverage: 10 },
];

export async function GET() {
  try {
    let instruments: any[] = [];
    try {
      instruments = await prisma.instrument.findMany({
        where: { isActive: true },
        orderBy: { symbol: "asc" },
      });
    } catch {
      instruments = FALLBACK_INSTRUMENTS;
    }

    if (instruments.length === 0) {
      instruments = FALLBACK_INSTRUMENTS;
    }

    const liveQuotes = getAllLiveQuotes();
    const quotesMap = new Map(liveQuotes.map((q) => [q.symbol, q]));

    const enriched = instruments.map((inst) => {
      const quote = quotesMap.get(inst.symbol);
      return {
        id: inst.id || inst.symbol,
        symbol: inst.symbol,
        displayName: inst.displayName,
        baseCurrency: inst.baseCurrency,
        quoteCurrency: inst.quoteCurrency,
        pipSize: inst.pipSize?.toString() || "0.0001",
        contractSize: inst.contractSize?.toString() || "100000",
        maxLeverage: inst.maxLeverage || 10,
        bid: quote?.bid.toString() || "0",
        ask: quote?.ask.toString() || "0",
        mid: quote?.mid.toString() || "0",
        spreadPips: quote?.spreadPips || 2,
        timestamp: quote?.timestamp || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: { instruments: enriched },
    });
  } catch (error) {
    console.error("Instruments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch instruments" },
      { status: 500 }
    );
  }
}
