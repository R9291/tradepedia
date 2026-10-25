import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLiveQuote } from "@/lib/trading";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();
    let instrument: any = null;
    try {
      instrument = await prisma.instrument.findUnique({
        where: { symbol },
      });
    } catch {
      // fallback
    }

    const quote = getLiveQuote(symbol);

    return NextResponse.json({
      success: true,
      data: {
        instrument: {
          id: instrument?.id || symbol,
          symbol,
          displayName: instrument?.displayName || symbol,
          baseCurrency: instrument?.baseCurrency || symbol.slice(0, 3),
          quoteCurrency: instrument?.quoteCurrency || symbol.slice(3, 6),
          pipSize: instrument?.pipSize?.toString() || (symbol.includes("JPY") ? "0.01" : "0.0001"),
          contractSize: instrument?.contractSize?.toString() || "100000",
          maxLeverage: instrument?.maxLeverage || 10,
          bid: quote.bid.toString(),
          ask: quote.ask.toString(),
          mid: quote.mid.toString(),
          spreadPips: quote.spreadPips,
          timestamp: quote.timestamp,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch instrument" }, { status: 500 });
  }
}
