"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ArrowLeft, Layers, TrendingUp, CheckCircle2 } from "lucide-react";

export default function HistoryPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trades/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.trades) {
          setTrades(data.data.trades);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            Trade Execution & Closed Positions History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete record of settled orders, entry/exit pricing, released margin, and realized PnL.
          </p>
        </div>

        <Link
          href="/markets"
          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
        >
          Open New Trade &rarr;
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Closed Market Trades</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{trades.length} settled trade(s)</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : trades.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No closed trades found. Execute trades in the terminal to view realized settlement records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Trade ID</th>
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Side</th>
                  <th className="px-6 py-3">Lots</th>
                  <th className="px-6 py-3 text-right">Entry Price</th>
                  <th className="px-6 py-3 text-right">Exit Price</th>
                  <th className="px-6 py-3 text-right">Released Margin</th>
                  <th className="px-6 py-3 text-right">Realized PnL (KES)</th>
                  <th className="px-6 py-3">Closed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {trades.map((t) => {
                  const pnl = parseFloat(t.pnl);
                  const isProfit = pnl >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 font-mono">
                      <td className="px-6 py-3 text-slate-400 font-sans">#{t.id.slice(-6)}</td>
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
                      <td className="px-6 py-3 text-right text-slate-100 font-bold">{t.exitPrice}</td>
                      <td className="px-6 py-3 text-right text-slate-400">
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
                        {new Date(t.closedAt).toLocaleString()}
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
