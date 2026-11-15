/**
 * Live Deriv WebSocket Tick Feed for Volatility Indices
 * Streams real-time ticks from Deriv's public WebSocket API (wss://ws.derivws.com/websockets/v3)
 * and falls back gracefully to calibrated Brownian motion if offline.
 */

export const DERIV_SYMBOL_MAP: Record<string, { derivSymbol: string; decimals: number }> = {
  VOL_10: { derivSymbol: "R_10", decimals: 3 },
  VOL_25: { derivSymbol: "R_25", decimals: 3 },
  VOL_50: { derivSymbol: "R_50", decimals: 4 },
  VOL_75: { derivSymbol: "R_75", decimals: 4 },
  VOL_100: { derivSymbol: "R_100", decimals: 2 },
  VOL_10_1S: { derivSymbol: "1HZ10V", decimals: 2 },
  VOL_25_1S: { derivSymbol: "1HZ25V", decimals: 2 },
  VOL_50_1S: { derivSymbol: "1HZ50V", decimals: 2 },
  VOL_75_1S: { derivSymbol: "1HZ75V", decimals: 2 },
  VOL_100_1S: { derivSymbol: "1HZ100V", decimals: 2 },
};

const REVERSE_DERIV_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(DERIV_SYMBOL_MAP).map(([tp, cfg]) => [cfg.derivSymbol, tp])
);

export interface LiveDerivTick {
  symbol: string;
  quote: number;
  decimals: number;
  epoch: number;
  receivedAt: number;
}

interface DerivFeedState {
  ws: WebSocket | null;
  connecting: boolean;
  lastConnectAttempt: number;
  ticks: Map<string, LiveDerivTick>;
}

declare global {
  // eslint-disable-next-line no-var
  var derivFeedGlobal: DerivFeedState | undefined;
}

const feedState: DerivFeedState =
  global.derivFeedGlobal || {
    ws: null,
    connecting: false,
    lastConnectAttempt: 0,
    ticks: new Map(),
  };

if (process.env.NODE_ENV !== "production") {
  global.derivFeedGlobal = feedState;
}

/**
 * Ensures the background Deriv WebSocket subscription is active.
 */
export function ensureDerivFeed(): void {
  if (typeof WebSocket === "undefined") return;

  const now = Date.now();
  if (feedState.ws && feedState.ws.readyState === WebSocket.OPEN) return;
  if (feedState.connecting && now - feedState.lastConnectAttempt < 10000) return;
  if (now - feedState.lastConnectAttempt < 15000) return;

  feedState.connecting = true;
  feedState.lastConnectAttempt = now;

  try {
    const appId = process.env.DERIV_APP_ID || "1089";
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
    feedState.ws = ws;

    ws.onopen = () => {
      feedState.connecting = false;
      for (const cfg of Object.values(DERIV_SYMBOL_MAP)) {
        try {
          ws.send(JSON.stringify({ ticks: cfg.derivSymbol, subscribe: 1 }));
        } catch {
          // ignore send errors
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
        if (msg?.msg_type === "tick" && msg?.tick) {
          const derivSym = String(msg.tick.symbol);
          const tpSym = REVERSE_DERIV_MAP[derivSym];
          if (!tpSym) return;
          const decimals = DERIV_SYMBOL_MAP[tpSym]?.decimals ?? 2;
          const quote = Number(msg.tick.quote);
          if (Number.isFinite(quote)) {
            feedState.ticks.set(tpSym, {
              symbol: tpSym,
              quote,
              decimals,
              epoch: Number(msg.tick.epoch || Math.floor(Date.now() / 1000)),
              receivedAt: Date.now(),
            });
          }
        }
      } catch {
        // ignore malformed tick frames
      }
    };

    ws.onerror = () => {
      feedState.connecting = false;
    };

    ws.onclose = () => {
      feedState.connecting = false;
      feedState.ws = null;
    };
  } catch {
    feedState.connecting = false;
  }
}

/**
 * Returns the latest live Deriv tick if received within the last 10 seconds.
 */
export function getDerivLiveTick(symbol: string): LiveDerivTick | null {
  ensureDerivFeed();
  const tick = feedState.ticks.get(symbol.toUpperCase());
  if (!tick) return null;
  if (Date.now() - tick.receivedAt > 10000) return null;
  return tick;
}
