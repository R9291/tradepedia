import { NextRequest } from "next/server";
import { getAllLiveQuotes } from "@/lib/trading";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendTicks = () => {
        try {
          const quotes = getAllLiveQuotes().map((q) => ({
            symbol: q.symbol,
            bid: q.bid.toString(),
            ask: q.ask.toString(),
            mid: q.mid.toString(),
            spread: q.spreadPips,
            timestamp: q.timestamp,
          }));

          const data = `data: ${JSON.stringify(quotes)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          clearInterval(interval);
          controller.close();
        }
      };

      // Emit immediately
      sendTicks();

      // Emit high-frequency micro-ticks every 350ms for realistic Deriv tick chart fluidity
      const interval = setInterval(sendTicks, 350);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
