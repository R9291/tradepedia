import { NextResponse } from "next/server";
import { getUsdToKesRate } from "@/lib/fx";

export const dynamic = "force-dynamic";

export async function GET() {
  const { rate, source } = await getUsdToKesRate();
  return NextResponse.json({
    success: true,
    data: {
      pair: "USDKES",
      rate,
      source,
      timestamp: new Date().toISOString(),
    },
  });
}
