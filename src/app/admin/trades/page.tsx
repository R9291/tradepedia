"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Layers,
  AlertTriangle,
  Shield,
  Activity,
} from "lucide-react";

export default function AdminTradesPage() {
  const [openTrades, setOpenTrades] = useState<any[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrades = async () => {
    try {
      const [openRes, closedRes] = await Promise.all([
        fetch("/api/trades/open?all=true"),
        fetch("/api/trades/history?all=true"),
      ]);

      if (openRes.ok) {
        const d = await openRes.json();
        setOpenTrades(d?.data?.openTrades || []);
      }
      if (closedRes.ok) {
        const d = await closedRes.json();
        setClosedTrades(d?.data?.trades || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  // Compute platform net exposure by currency pair
  const exposureMap: Record<string, { buyLots: number; sellLots: number; netLots: number }> = {};
  for (const t of openTrades) {
    if (!exposureMap[t.symbol]) {
      exposureMap[t.symbol] = { buyLots: 0, sellLots: 0, netLots: 0 };
    }
    const lots = parseFloat(t.lotSize);
    if (t.direction === "BUY") {
      exposureMap[t.symbol].buyLots += lots;
      exposureMap[t.symbol].netLots += lots;
    } else {
      exposureMap[t.symbol].sellLots += lots;
      exposureMap[t.symbol].netLots -= lots;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Overview
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            Trading Engine Exposure & Risk Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time aggregate platform net exposure, active trader positions, and margin usage across currency pairs.
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            loadTrades();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Aggregate Exposure Cards by Pair */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          Aggregate Platform Exposure by Currency Pair
        </h2>

        {Object.keys(exposureMap).length === 0 ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
            No open exposure across the platform currently.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(exposureMap).map(([sym, exp]) => (
              <div key={sym} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-base">{sym}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      exp.netLots > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : exp.netLots < 0
                        ? "bg-red-500/10 text-red-400 border border-red-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Net: {exp.netLots > 0 ? "+" : ""}
                    {exp.netLots.toFixed(2)} Lots
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 text-slate-400">
                  <div>
                    <span className="text-emerald-400 block text-[10px]">Buy Exposure:</span>
                    <span>{exp.buyLots.toFixed(2)} Lots</span>
                  </div>
                  <div>
                    <span className="text-red-400 block text-[10px]">Sell Exposure:</span>
                    <span>{exp.sellLots.toFixed(2)} Lots</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Active Platform Open Positions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">All Active Trader Open Positions</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{openTrades.length} open position(s)</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : openTrades.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No open trades currently in the system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Trader</th>
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Side</th>
                  <th className="px-6 py-3">Volume (Lots)</th>
                  <th className="px-6 py-3 text-right">Entry Price</th>
                  <th className="px-6 py-3 text-right">Current Price</th>
                  <th className="px-6 py-3 text-right">Locked Margin (KES)</th>
                  <th className="px-6 py-3 text-right">Floating PnL (KES)</th>
                  <th className="px-6 py-3">Opened At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {openTrades.map((t) => {
                  const pnl = parseFloat(t.floatingPnL);
                  const isProfit = pnl >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 font-mono">
                      <td className="px-6 py-3 font-sans whitespace-nowrap">
                        <div className="font-bold text-white">{t.traderName || "Trader"}</div>
                        <div className="text-[10px] text-slate-400">{t.traderEmail}</div>
                      </td>
                      <td className="px-6 py-3 font-bold text-white font-sans">{t.symbol}</td>
                      <td className="px-6 py-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.direction === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-300">{parseFloat(t.lotSize).toFixed(2)}</td>
                      <td className="px-6 py-3 text-right text-slate-300">{t.entryPrice}</td>
                      <td className="px-6 py-3 text-right text-slate-100 font-bold">{t.currentPrice}</td>
                      <td className="px-6 py-3 text-right text-amber-400">
                        KES {parseFloat(t.marginRequired).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-bold ${
                          isProfit ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}
                        KES {pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-slate-400 font-sans whitespace-nowrap">
                        {new Date(t.openedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
