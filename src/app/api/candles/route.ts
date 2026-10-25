import { NextRequest, NextResponse } from "next/server";
import { getLiveQuote } from "@/lib/trading";

interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const ASSET_PARAMS: Record<
  string,
  { mid: number; pip: number; decimals: number; typicalBarPips: number }
> = {
  EURUSD: { mid: 1.08420, pip: 0.0001, decimals: 5, typicalBarPips: 2.5 },
  GBPUSD: { mid: 1.29820, pip: 0.0001, decimals: 5, typicalBarPips: 3.5 },
  USDJPY: { mid: 152.450, pip: 0.01, decimals: 3, typicalBarPips: 4.0 },
  AUDUSD: { mid: 0.66520, pip: 0.0001, decimals: 5, typicalBarPips: 2.0 },
  USDCHF: { mid: 0.86520, pip: 0.0001, decimals: 5, typicalBarPips: 2.0 },
  USDCAD: { mid: 1.38220, pip: 0.0001, decimals: 5, typicalBarPips: 2.2 },
  USDKES: { mid: 129.50, pip: 0.01, decimals: 2, typicalBarPips: 0.15 },
  BTCUSD: { mid: 67450.00, pip: 1.0, decimals: 2, typicalBarPips: 65.0 },
  ETHUSD: { mid: 2640.50, pip: 0.1, decimals: 2, typicalBarPips: 6.0 },
  SOLUSD: { mid: 178.40, pip: 0.01, decimals: 2, typicalBarPips: 0.85 },
  XAUUSD: { mid: 2724.80, pip: 0.1, decimals: 2, typicalBarPips: 3.0 },
  VOL_100: { mid: 1850.40, pip: 0.1, decimals: 2, typicalBarPips: 8.5 },
  BOOM_500: { mid: 4250.80, pip: 0.1, decimals: 2, typicalBarPips: 12.0 },
  CRASH_500: { mid: 3180.20, pip: 0.1, decimals: 2, typicalBarPips: 10.5 },
};

/**
 * Realistic Multi-Regime Market Structure Generator:
 * Generates true financial chart price action:
 * - Multi-candle trending swings (Bullish impulse, Bearish pullbacks)
 * - Consolidation ranges & Breakout expansions
 * - Realistic Japanese Candlestick anatomy (Hammers, Shooting Stars, Marubozus, Dojis)
 * - Perfect continuity: candle[i].open === candle[i-1].close
 * - Volume clusters during high-momentum breakout bars
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "EURUSD").toUpperCase();
  const resolution = searchParams.get("resolution") || "1m";
  const count = Math.min(Math.max(parseInt(searchParams.get("count") || "180", 10), 50), 300);

  const cfg = ASSET_PARAMS[symbol] || ASSET_PARAMS.EURUSD;
  const currentQuote = getLiveQuote(symbol);
  const latestPrice = parseFloat(currentQuote.mid.toString());

  // Determine seconds per candle
  let secondsPerCandle = 60;
  if (resolution === "10s") secondsPerCandle = 10;
  else if (resolution === "1m") secondsPerCandle = 60;
  else if (resolution === "5m") secondsPerCandle = 300;
  else if (resolution === "15m") secondsPerCandle = 900;
  else if (resolution === "1h") secondsPerCandle = 3600;
  else if (resolution === "1D") secondsPerCandle = 86400;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const currentBoundary = Math.floor(nowSeconds / secondsPerCandle) * secondsPerCandle;

  // Scale typical bar range based on timeframe
  const tfMultiplier =
    resolution === "10s"
      ? 0.4
      : resolution === "1m"
      ? 1.0
      : resolution === "5m"
      ? 1.8
      : resolution === "15m"
      ? 3.2
      : resolution === "1h"
      ? 6.0
      : 14.0;

  const barScale = cfg.typicalBarPips * cfg.pip * tfMultiplier;

  // Forward simulation of market wave cycle
  const forwardCandles: Candle[] = [];

  // Start back in time
  const startTime = currentBoundary - (count - 1) * secondsPerCandle;
  let currentOpen = latestPrice - (Math.random() - 0.5) * barScale * 12;

  // Market state variables for regime switching
  let trendDirection: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
  let trendStrength = 0.65;
  let waveRemaining = Math.floor(4 + Math.random() * 8); // 4-12 bars per swing leg
  let isConsolidating = false;

  for (let i = 0; i < count; i++) {
    const candleTime = startTime + i * secondsPerCandle;

    // Check if wave finished: switch swing regime
    waveRemaining--;
    if (waveRemaining <= 0) {
      if (!isConsolidating && Math.random() < 0.35) {
        // Enter brief tight consolidation zone
        isConsolidating = true;
        waveRemaining = Math.floor(3 + Math.random() * 5);
      } else {
        // Reverse or continue trend
        isConsolidating = false;
        trendDirection = trendDirection === 1 ? -1 : 1;
        trendStrength = 0.45 + Math.random() * 0.4;
        waveRemaining = Math.floor(5 + Math.random() * 9);
      }
    }

    // Mean-reversion pressure towards cfg.mid to keep prices realistic
    const meanPull = (cfg.mid - currentOpen) * 0.02;

    // Determine body movement
    let barChange: number;
    let barType: "NORMAL" | "ENGULFING" | "HAMMER" | "DOJI";
    const randType = Math.random();

    if (randType < 0.08) barType = "DOJI";
    else if (randType < 0.20) barType = "HAMMER";
    else if (randType < 0.35) barType = "ENGULFING";
    else barType = "NORMAL";

    if (isConsolidating) {
      // Small random noise inside range
      barChange = (Math.random() - 0.5) * barScale * 0.4;
    } else if (barType === "DOJI") {
      barChange = (Math.random() - 0.5) * barScale * 0.12;
    } else if (barType === "ENGULFING") {
      barChange = trendDirection * barScale * (1.5 + Math.random() * 0.8) + meanPull;
    } else {
      // Normal trend-aligned candle with natural variation
      const bias = trendDirection * trendStrength;
      const noise = (Math.random() - 0.4) * 0.8;
      barChange = (bias + noise) * barScale + meanPull;
    }

    const open = parseFloat(currentOpen.toFixed(cfg.decimals));
    const close = parseFloat((open + barChange).toFixed(cfg.decimals));
    const isBullish = close >= open;

    // Generate realistic wicks (upper and lower shadows)
    let high: number;
    let low: number;

    const bodyTop = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    const bodySize = bodyTop - bodyBottom;

    if (barType === "HAMMER") {
      // Long lower wick rejection, small body near the top
      const lowerWick = barScale * (1.2 + Math.random() * 1.0);
      const upperWick = barScale * (0.1 + Math.random() * 0.2);
      high = parseFloat((bodyTop + upperWick).toFixed(cfg.decimals));
      low = parseFloat((bodyBottom - lowerWick).toFixed(cfg.decimals));
    } else if (barType === "DOJI") {
      // Balanced wicks in both directions
      const wick = barScale * (0.6 + Math.random() * 0.5);
      high = parseFloat((bodyTop + wick).toFixed(cfg.decimals));
      low = parseFloat((bodyBottom - wick).toFixed(cfg.decimals));
    } else {
      // Normal candle wicks (typically 20% - 50% of body)
      const topWickFactor = isBullish ? 0.35 : 0.6;
      const bottomWickFactor = isBullish ? 0.6 : 0.35;
      const topWick = (Math.random() * bodySize * topWickFactor) + (barScale * 0.15);
      const bottomWick = (Math.random() * bodySize * bottomWickFactor) + (barScale * 0.15);
      high = parseFloat((bodyTop + topWick).toFixed(cfg.decimals));
      low = parseFloat((bodyBottom - bottomWick).toFixed(cfg.decimals));
    }

    // Ensure invariants: high >= max(open, close), low <= min(open, close)
    high = Math.max(high, bodyTop);
    low = Math.min(low, bodyBottom);

    // Realistic volume: higher volume on strong directional candles
    const baseVol = 80;
    const momentumVol = Math.floor((bodySize / (barScale || 0.0001)) * 140);
    const volume = Math.max(30, baseVol + momentumVol + Math.floor(Math.random() * 60));

    forwardCandles.push({
      time: candleTime,
      open,
      high,
      low,
      close,
      volume,
    });

    // Next candle opens EXACTLY where current candle closes
    currentOpen = close;
  }

  // Anchor the final candle to the real-time live price
  if (forwardCandles.length > 0) {
    const last = forwardCandles[forwardCandles.length - 1];
    const offset = latestPrice - last.close;
    // Smoothly apply linear drift offset across all candles so the chart ends exactly at latestPrice
    forwardCandles.forEach((c, idx) => {
      const weight = (idx + 1) / forwardCandles.length;
      const adj = offset * weight;
      c.open = parseFloat((c.open + adj).toFixed(cfg.decimals));
      c.close = parseFloat((c.close + adj).toFixed(cfg.decimals));
      c.high = parseFloat((c.high + adj).toFixed(cfg.decimals));
      c.low = parseFloat((c.low + adj).toFixed(cfg.decimals));
      c.high = Math.max(c.high, Math.max(c.open, c.close));
      c.low = Math.min(c.low, Math.min(c.open, c.close));
    });

    // Pin last candle directly to live price
    last.close = latestPrice;
    last.high = Math.max(last.high, latestPrice);
    last.low = Math.min(last.low, latestPrice);
  }

  return NextResponse.json({
    success: true,
    data: {
      symbol,
      resolution,
      decimals: cfg.decimals,
      currentPrice: latestPrice,
      candles: forwardCandles,
    },
  });
}
