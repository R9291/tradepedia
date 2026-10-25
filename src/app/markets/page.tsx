"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  Activity,
  Zap,
  Sparkles,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { MarketSessionsBar } from "@/components/trading/MarketSessionsBar";
import { getMarketStatus } from "@/lib/market-hours";

const ALL_MARKETS = [
  { symbol: "EURUSD", name: "EUR / USD", category: "Forex", baseBid: 1.08412, baseAsk: 1.08428, spread: "1.5 pips", leverage: "1:100", decimals: 5 },
  { symbol: "GBPUSD", name: "GBP / USD", category: "Forex", baseBid: 1.29810, baseAsk: 1.29830, spread: "2.0 pips", leverage: "1:100", decimals: 5 },
  { symbol: "USDJPY", name: "USD / JPY", category: "Forex", baseBid: 152.440, baseAsk: 152.460, spread: "2.0 pips", leverage: "1:100", decimals: 3 },
  { symbol: "AUDUSD", name: "AUD / USD", category: "Forex", baseBid: 0.66510, baseAsk: 0.66530, spread: "2.0 pips", leverage: "1:100", decimals: 5 },
  { symbol: "USDCHF", name: "USD / CHF", category: "Forex", baseBid: 0.86510, baseAsk: 0.86530, spread: "2.0 pips", leverage: "1:100", decimals: 5 },
  { symbol: "USDCAD", name: "USD / CAD", category: "Forex", baseBid: 1.38210, baseAsk: 1.38230, spread: "2.0 pips", leverage: "1:100", decimals: 5 },
  { symbol: "USDKES", name: "USD / KES", category: "Forex", baseBid: 129.40, baseAsk: 129.60, spread: "1.0 pips", leverage: "1:100", decimals: 2 },
  { symbol: "BTCUSD", name: "Bitcoin / USD", category: "Crypto", baseBid: 67448.00, baseAsk: 67452.00, spread: "2.5 pips", leverage: "1:50", decimals: 2 },
  { symbol: "ETHUSD", name: "Ethereum / USD", category: "Crypto", baseBid: 2640.00, baseAsk: 2641.50, spread: "1.5 pips", leverage: "1:50", decimals: 2 },
  { symbol: "SOLUSD", name: "Solana / USD", category: "Crypto", baseBid: 178.35, baseAsk: 178.45, spread: "1.0 pips", leverage: "1:50", decimals: 2 },
  { symbol: "XAUUSD", name: "Gold / USD", category: "Commodities", baseBid: 2724.00, baseAsk: 2725.50, spread: "1.5 pips", leverage: "1:50", decimals: 2 },
  { symbol: "VOL_100", name: "Volatility 100 Index", category: "Synthetics", baseBid: 1850.20, baseAsk: 1850.60, spread: "1.0 pips", leverage: "1:100", decimals: 2 },
  { symbol: "BOOM_500", name: "Boom 500 Index", category: "Synthetics", baseBid: 4250.60, baseAsk: 4251.00, spread: "1.2 pips", leverage: "1:100", decimals: 2 },
  { symbol: "CRASH_500", name: "Crash 500 Index", category: "Synthetics", baseBid: 3180.00, baseAsk: 3180.40, spread: "1.2 pips", leverage: "1:100", decimals: 2 },
];

export default function MarketsPage() {
  const [markets, setMarkets] = useState(ALL_MARKETS);
  const [filter, setFilter] = useState<"ALL" | "Forex" | "Crypto" | "Commodities" | "Synthetics">("ALL");
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // SSE price stream
  useEffect(() => {
    const eventSource = new EventSource("/api/prices/stream");
    eventSource.onmessage = (event) => {
      try {
        const quotes = JSON.parse(event.data);
        const map = new Map(quotes.map((q: any) => [q.symbol, q]));
        setMarkets((prev) =>
          prev.map((inst) => {
            const q: any = map.get(inst.symbol);
            if (q) {
              return {
                ...inst,
                baseBid: parseFloat(q.bid),
                baseAsk: parseFloat(q.ask),
                spread: `${q.spread} pips`,
              };
            }
            return inst;
          })
        );
      } catch (err) {
        console.error(err);
      }
    };

    return () => eventSource.close();
  }, []);

  const filtered = markets.filter((m) => {
    const matchCat = filter === "ALL" || m.category === filter;
    const matchSearch =
      m.symbol.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#ff5722]" />
            Global Markets Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time streaming prices across Forex, Crypto, and Spot Metals with Deriv-style execution.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Real-Time SSE Tick Stream Active</span>
        </div>
      </div>

      {/* Global Market Trading Sessions Bar */}
      <MarketSessionsBar />

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/[0.08] w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(["ALL", "Forex", "Crypto", "Commodities", "Synthetics"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                filter === cat
                  ? "bg-[#ff5722] text-white shadow-sm shadow-[#ff5722]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search symbol (e.g. BTC, EUR, Gold)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5722]"
          />
        </div>
      </div>

      {/* Markets Table */}
      <div className="bg-[#090a10] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0c0d14] text-slate-400 border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-3.5">Instrument</th>
                <th className="px-6 py-3.5">Market Status</th>
                <th className="px-6 py-3.5">Trading Hours</th>
                <th className="px-6 py-3.5 text-right">Sell (Bid)</th>
                <th className="px-6 py-3.5 text-right">Buy (Ask)</th>
                <th className="px-6 py-3.5 text-center">Spread</th>
                <th className="px-6 py-3.5 text-center">Max Leverage</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-slate-200">
              {filtered.map((pair) => {
                const status = getMarketStatus(pair.symbol, currentTime);
                return (
                  <tr key={pair.symbol} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-white whitespace-nowrap flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#ff5722] to-amber-500 flex items-center justify-center text-white font-black text-xs">
                        {pair.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-white">{pair.symbol}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{pair.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status.isOpen
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : status.statusLabel === "MAINTENANCE"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                              : "bg-red-500/10 text-red-400 border border-red-500/25"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status.isOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                            }`}
                          />
                          {status.statusLabel}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {status.sessionName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-slate-300 font-sans">{status.tradingHoursLabel}</div>
                      <div className="text-[10px] text-slate-400">{status.nextEventLabel}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-400 whitespace-nowrap">
                      {pair.baseBid.toFixed(pair.decimals)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                      {pair.baseAsk.toFixed(pair.decimals)}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400">{pair.spread}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px]">
                        {pair.leverage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/trade/${pair.symbol}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold text-xs transition-all shadow-md shadow-[#ff5722]/20 active:scale-95"
                      >
                        Trade
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
