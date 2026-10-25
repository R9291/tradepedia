"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Clock,
} from "lucide-react";

interface DerivCandlestickChartProps {
  symbol: string;
  currentBid: number;
  currentAsk: number;
  currentMid: number;
  openTrades?: Array<{
    id: string;
    direction: "BUY" | "SELL";
    entryPrice: string;
    floatingPnL: string;
  }>;
}

interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  time: string;
}

export function DerivCandlestickChart({
  symbol,
  currentBid,
  currentAsk,
  currentMid,
  openTrades = [],
}: DerivCandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const currentCandleRef = useRef<CandlestickData<UTCTimestamp> | null>(null);
  const tradeLinesRef = useRef<any[]>([]);

  const [chartType, setChartType] = useState<"CANDLES" | "AREA">("CANDLES");
  const [resolution, setResolution] = useState<string>("1m");

  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredOHLC, setHoveredOHLC] = useState<OHLCData | null>(null);
  const [latestOHLC, setLatestOHLC] = useState<OHLCData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("--:--");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerWrapperRef = useRef<HTMLDivElement>(null);

  const getSecondsPerCandle = (res: string) => {
    switch (res) {
      case "10s": return 10;
      case "1m": return 60;
      case "5m": return 300;
      case "15m": return 900;
      case "1h": return 3600;
      case "1D": return 86400;
      default: return 60;
    }
  };

  // Candle Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const secondsPerCandle = getSecondsPerCandle(resolution);
      const nowSeconds = Math.floor(Date.now() / 1000);
      const currentBoundary = Math.floor(nowSeconds / secondsPerCandle) * secondsPerCandle;
      const nextBoundary = currentBoundary + secondsPerCandle;
      const diff = Math.max(0, nextBoundary - nowSeconds);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setTimeRemaining(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    }, 500);

    return () => clearInterval(timer);
  }, [resolution]);

  // 1. Initialize Clean Candlestick Chart (No lines cutting through or between candles)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    chartContainerRef.current.innerHTML = "";

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 460,
      layout: {
        background: { type: ColorType.Solid, color: "#06070a" },
        textColor: "#94a3b8",
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      // Completely disable background grid lines so no lines run between the candles
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 87, 34, 0.35)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#ff5722",
        },
        horzLine: {
          color: "rgba(255, 87, 34, 0.35)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#ff5722",
        },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: resolution === "10s",
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },
    });

    // Faint Institutional Symbol Watermark
    (chart as any).applyOptions({
      watermark: {
        visible: true,
        fontSize: 56,
        horzAlign: "center",
        vertAlign: "center",
        color: "rgba(255, 255, 255, 0.025)",
        text: `${symbol} • ${resolution}`,
      },
    });

    chartRef.current = chart;

    // Pure, Crisp Japanese Candlesticks (No lines running through)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#089981", // Authentic TradingView Emerald
      downColor: "#f23645", // Authentic TradingView Crimson
      borderUpColor: "#089981",
      borderDownColor: "#f23645",
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });
    candleSeriesRef.current = candleSeries as any;

    // Cosmic Area Series (Orange glow)
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(255, 87, 34, 0.45)",
      bottomColor: "rgba(255, 87, 34, 0.01)",
      lineColor: "#ff5722",
      lineWidth: 2,
    });
    areaSeriesRef.current = areaSeries as any;

    // Initial series visibility
    if (chartType === "CANDLES") {
      areaSeries.applyOptions({ visible: false });
      candleSeries.applyOptions({ visible: true });
    } else {
      candleSeries.applyOptions({ visible: false });
      areaSeries.applyOptions({ visible: true });
    }

    // Crosshair OHLC Hover Update
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoveredOHLC(null);
        return;
      }

      const candleData = param.seriesData.get(candleSeries) as any;
      if (candleData && candleData.open !== undefined) {
        const change = ((candleData.close - candleData.open) / candleData.open) * 100;
        setHoveredOHLC({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          change,
          time: new Date(Number(param.time) * 1000).toLocaleTimeString(),
        });
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height: Math.max(height, 460) });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, resolution]);

  // 2. Fetch Historical Candles for Symbol & Resolution
  const loadCandles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candles?symbol=${symbol}&resolution=${resolution}&count=160`);
      const data = await res.json();
      if (data.success && data.data.candles.length > 0) {
        const rawCandles = data.data.candles;

        const formattedCandles: CandlestickData<UTCTimestamp>[] = rawCandles.map((c: any) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(formattedCandles);
        }

        if (areaSeriesRef.current) {
          areaSeriesRef.current.setData(
            formattedCandles.map((c) => ({ time: c.time, value: c.close }))
          );
        }

        const lastCandle = formattedCandles[formattedCandles.length - 1];
        currentCandleRef.current = { ...lastCandle };

        const initialChange = ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100;
        setLatestOHLC({
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          change: initialChange,
          time: new Date(Number(lastCandle.time) * 1000).toLocaleTimeString(),
        });

        chartRef.current?.timeScale().fitContent();
      }
    } catch (err) {
      console.error("Failed to load candles:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, resolution]);

  useEffect(() => {
    loadCandles();
  }, [loadCandles]);

  // 3. Real-Time Candle Ticking (Continuous Breathing & Wick Formation)
  useEffect(() => {
    if (!currentMid || currentMid <= 0 || !candleSeriesRef.current) return;

    const secondsPerCandle = getSecondsPerCandle(resolution);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const currentBoundary = Math.floor(nowSeconds / secondsPerCandle) * secondsPerCandle;

    let activeCandle = currentCandleRef.current;

    if (!activeCandle || Number(activeCandle.time) < currentBoundary) {
      // Timeframe boundary elapsed: Spawn new candle starting at previous candle's close
      const prevClose = activeCandle ? activeCandle.close : currentMid;
      const newCandle: CandlestickData<UTCTimestamp> = {
        time: currentBoundary as UTCTimestamp,
        open: prevClose,
        high: Math.max(prevClose, currentMid),
        low: Math.min(prevClose, currentMid),
        close: currentMid,
      };
      activeCandle = newCandle;
      currentCandleRef.current = newCandle;
    } else {
      // Update ongoing candle (stretch wicks and update close)
      activeCandle.close = currentMid;
      activeCandle.high = Math.max(activeCandle.high, currentMid);
      activeCandle.low = Math.min(activeCandle.low, currentMid);
    }

    candleSeriesRef.current.update(activeCandle);

    if (areaSeriesRef.current) {
      areaSeriesRef.current.update({
        time: activeCandle.time,
        value: activeCandle.close,
      });
    }

    const change = ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100;
    setLatestOHLC({
      open: activeCandle.open,
      high: activeCandle.high,
      low: activeCandle.low,
      close: activeCandle.close,
      change,
      time: new Date(Number(activeCandle.time) * 1000).toLocaleTimeString(),
    });
  }, [currentMid, resolution]);

  // Toggle chart type
  const handleToggleChartType = (type: "CANDLES" | "AREA") => {
    setChartType(type);
    if (candleSeriesRef.current && areaSeriesRef.current) {
      if (type === "CANDLES") {
        areaSeriesRef.current.applyOptions({ visible: false });
        candleSeriesRef.current.applyOptions({ visible: true });
      } else {
        candleSeriesRef.current.applyOptions({ visible: false });
        areaSeriesRef.current.applyOptions({ visible: true });
      }
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (!range) return;
    const diff = range.to - range.from;
    const factor = direction === "in" ? 0.25 : -0.35;
    timeScale.setVisibleLogicalRange({
      from: range.from + diff * factor,
      to: range.to - diff * factor,
    });
  };

  const toggleFullscreen = () => {
    if (!containerWrapperRef.current) return;
    if (!isFullscreen) {
      if (containerWrapperRef.current.requestFullscreen) {
        containerWrapperRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const activeOHLC = hoveredOHLC || latestOHLC;
  const isUp = (activeOHLC?.change ?? 0) >= 0;

  return (
    <div
      ref={containerWrapperRef}
      className={`relative flex flex-col bg-[#06070a] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? "h-screen w-screen p-4" : "h-full w-full"
      }`}
    >
      {/* Radiant Cosmic Orange Glow at top perimeter */}
      <div className="absolute top-0 left-1/4 right-1/4 h-28 bg-gradient-to-b from-[#ff5722]/15 via-orange-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header Bar: Symbol, Timeframes, Chart Type, Countdown */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0a0b10]/95 backdrop-blur-md border-b border-white/[0.06]">
        {/* Left: Symbol & Live Pulse */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-white tracking-wide">{symbol}</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE TICK
            </div>
          </div>

          {/* Timeframe Selectors (Deriv style) */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/[0.06] overflow-x-auto no-scrollbar max-w-[190px] sm:max-w-none">
            {["10s", "1m", "5m", "15m", "1h", "1D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setResolution(tf)}
                className={`px-2 sm:px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-semibold transition-all whitespace-nowrap ${
                  resolution === tf
                    ? "bg-[#ff5722] text-white shadow-sm shadow-[#ff5722]/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => handleToggleChartType("CANDLES")}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                chartType === "CANDLES"
                  ? "bg-[#ff5722] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3 h-3" />
              Candles
            </button>
            <button
              onClick={() => handleToggleChartType("AREA")}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                chartType === "AREA"
                  ? "bg-[#ff5722] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Area
            </button>
          </div>
        </div>

        {/* Right: Candle Timer & Chart Controls */}
        <div className="flex items-center gap-2 text-slate-400">
          {/* Live Candle Countdown Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/[0.06] text-[11px] font-mono text-slate-300">
            <Clock className="w-3 h-3 text-[#ff5722]" />
            <span>Candle:</span>
            <span className="font-bold text-white">{timeRemaining}</span>
          </div>

          <button
            onClick={() => handleZoom("in")}
            title="Zoom In"
            className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom("out")}
            title="Zoom Out"
            className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => chartRef.current?.timeScale().fitContent()}
            title="Fit to screen"
            className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Dynamic TradingView / Deriv OHLC Indicator Bar */}
      <div className="relative z-10 px-2.5 sm:px-4 py-1.5 bg-[#08090e]/85 border-b border-white/[0.04] text-[10px] sm:text-[11px] font-mono flex flex-wrap items-center gap-2 sm:gap-4 text-slate-400 select-none">
        {activeOHLC ? (
          <>
            <div>
              <span className="text-slate-500">O:</span>{" "}
              <span className="text-white font-medium">{activeOHLC.open}</span>
            </div>
            <div>
              <span className="text-slate-500">H:</span>{" "}
              <span className="text-[#089981] font-medium">{activeOHLC.high}</span>
            </div>
            <div>
              <span className="text-slate-500">L:</span>{" "}
              <span className="text-[#f23645] font-medium">{activeOHLC.low}</span>
            </div>
            <div>
              <span className="text-slate-500">C:</span>{" "}
              <span className={isUp ? "text-[#089981] font-medium" : "text-[#f23645] font-medium"}>
                {activeOHLC.close}
              </span>
            </div>
            <div className={`font-semibold ${isUp ? "text-[#089981]" : "text-[#f23645]"}`}>
              {isUp ? "+" : ""}
              {activeOHLC.change.toFixed(3)}%
            </div>
            <div className="text-[10px] text-slate-500 hidden md:block">
              Time: {activeOHLC.time}
            </div>
          </>
        ) : (
          <div className="text-slate-500">Connecting institutional quote feed...</div>
        )}

        {/* Live Bid / Ask / Spread Deriv Pill */}
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <div>
            <span className="text-slate-500">BID:</span>{" "}
            <span className="text-[#f23645] font-bold">{currentBid}</span>
          </div>
          <div>
            <span className="text-slate-500">ASK:</span>{" "}
            <span className="text-[#089981] font-bold">{currentAsk}</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-slate-900 text-orange-400 border border-orange-500/20 font-semibold font-mono">
            Spread: {((currentAsk - currentBid) * (symbol.includes("JPY") ? 100 : 10000)).toFixed(1)} pips
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area: Pure Candlesticks (No lines running between or across) */}
      <div className="relative flex-1 w-full min-h-[300px] sm:min-h-[460px]">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06070a]/80 backdrop-blur-sm gap-2">
            <div className="w-8 h-8 border-2 border-[#ff5722] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-mono">Loading {symbol} Candlesticks...</span>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
