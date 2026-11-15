/**
 * Real-time USD <-> KES Exchange Rate Helper
 * Keeps M-Pesa Daraja STK Push in KES while allowing Tradepedia balances & dealings in USD.
 */

export const DEFAULT_USD_TO_KES_RATE = 129.5;

interface FxCache {
  rate: number;
  fetchedAt: number;
}

let fxCache: FxCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches the live USD/KES exchange rate with short-lived caching and a safe fallback.
 */
export async function getUsdToKesRate(): Promise<{ rate: number; source: "live" | "cache" | "fallback" }> {
  const now = Date.now();
  if (fxCache && now - fxCache.fetchedAt < CACHE_TTL_MS) {
    return { rate: fxCache.rate, source: "cache" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const kesRate = Number(data?.rates?.KES);
      if (Number.isFinite(kesRate) && kesRate > 50 && kesRate < 500) {
        fxCache = { rate: kesRate, fetchedAt: now };
        return { rate: kesRate, source: "live" };
      }
    }
  } catch {
    // Fallback to cached or default rate when offline/unreachable
  }

  if (fxCache) {
    return { rate: fxCache.rate, source: "cache" };
  }

  return { rate: DEFAULT_USD_TO_KES_RATE, source: "fallback" };
}

/**
 * Converts a USD deposit amount into rounded integer KES for M-Pesa Daraja STK Push.
 */
export function convertUsdToKes(amountUsd: number, rate: number): number {
  return Math.max(1, Math.round(amountUsd * rate));
}

/**
 * Converts a KES amount into USD rounded to 2 decimal places.
 */
export function convertKesToUsd(amountKes: number, rate: number): number {
  return Number((amountKes / rate).toFixed(2));
}
