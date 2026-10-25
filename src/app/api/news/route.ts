import { NextRequest, NextResponse } from "next/server";
import { INITIAL_MARKET_NEWS } from "@/lib/market-news";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const impact = searchParams.get("impact");
    const search = searchParams.get("search")?.toLowerCase();

    let items = [...INITIAL_MARKET_NEWS];

    if (category && category !== "ALL") {
      items = items.filter((n) => n.category === category.toUpperCase());
    }

    if (impact && impact !== "ALL") {
      items = items.filter((n) => n.impact === impact.toUpperCase());
    }

    if (search) {
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.summary.toLowerCase().includes(search) ||
          n.affectedMarkets.some((m) => m.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        news: items,
        breaking: items.filter((n) => n.isBreaking),
        total: items.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load market news wire" },
      { status: 500 }
    );
  }
}
