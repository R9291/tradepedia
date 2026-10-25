"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Percent,
  Award,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  PieChart,
} from "lucide-react";

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<"ALL" | "30D" | "7D">("ALL");

  return (
    <div className="flex-1 flex flex-col bg-[#050608] text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5722]/10 border border-[#ff5722]/30 text-[#ff5722] text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Performance & Trade Journal
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Institutional Trading Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Audit your execution edge with deep statistical breakdown: Win/Loss ratio, Sharpe metric, profit factor, and equity growth trajectory.
          </p>
        </div>

        {/* Timeframe Filter */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/[0.08] text-xs font-mono">
          {(["ALL", "30D", "7D"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeframe === tf ? "bg-[#ff5722] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {tf === "ALL" ? "All Time" : tf === "30D" ? "Last 30 Days" : "Last 7 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Performance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-3xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Win Rate</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#089981]">78.4%</div>
          <div className="text-[10px] text-slate-500">47 Wins / 13 Losses</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Profit Factor</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">2.64</div>
          <div className="text-[10px] text-emerald-400">&gt; 1.5 Benchmark Met</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Win / Avg Loss</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">2.8 : 1</div>
          <div className="text-[10px] text-slate-500">KES 4,820 / KES 1,720</div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Net Realized PnL</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#089981]">+KES 184,520</div>
          <div className="text-[10px] text-emerald-400 font-sans">+18.4% demo growth</div>
        </div>
      </div>

      {/* Cumulative Equity Growth Chart (Obsidian + Radiant Orange Aura) */}
      <div className="p-6 rounded-3xl bg-[#090a10] border border-white/[0.08] space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ff5722]" />
              Cumulative Account Equity Growth Curve
            </h2>
            <p className="text-xs text-slate-400">
              Starting Balance: KES 100,000.00 &rarr; Current Peak: KES 284,520.00
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 self-start sm:self-auto">
            Maximum Drawdown: -4.2% (Low Risk)
          </span>
        </div>

        {/* SVG Equity Curve */}
        <div className="h-56 w-full pt-4 relative">
          <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5722" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ff5722" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Guideline ticks */}
            <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
            <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

            {/* Filled Area */}
            <path
              d="M0,160 Q80,140 150,130 T280,110 T380,80 T480,50 T600,20 L600,200 L0,200 Z"
              fill="url(#equityGradient)"
            />

            {/* Smooth Glowing Line */}
            <path
              d="M0,160 Q80,140 150,130 T280,110 T380,80 T480,50 T600,20"
              fill="none"
              stroke="#ff5722"
              strokeWidth="3.5"
            />
          </svg>
        </div>

        <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1">
          <span>Day 1 (Entry)</span>
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Current Live (Peak)</span>
        </div>
      </div>

      {/* Asset Class Distribution & Win Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Asset Distribution */}
        <div className="p-6 rounded-3xl bg-[#090a10] border border-white/[0.08] space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-400" />
            Volume Distribution by Asset Class
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Forex Majors (EURUSD, GBPUSD)</span>
                <span className="font-bold text-white">48%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-[#ff5722] h-full rounded-full" style={{ width: "48%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Crypto (BTCUSD, ETHUSD)</span>
                <span className="font-bold text-white">32%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: "32%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Deriv Synthetics (VOL_100, BOOM_500)</span>
                <span className="font-bold text-white">20%</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div className="bg-[#089981] h-full rounded-full" style={{ width: "20%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Strategy Edge Breakdown */}
        <div className="p-6 rounded-3xl bg-[#090a10] border border-white/[0.08] space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Strategy Execution Breakdown
          </h3>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex justify-between items-center">
              <div>
                <div className="font-bold text-white">Multipliers with Deal Cancellation</div>
                <div className="text-[10px] text-slate-400">100% loss-protection within 15s</div>
              </div>
              <span className="text-[#089981] font-extrabold">+KES 94,200</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex justify-between items-center">
              <div>
                <div className="font-bold text-white">Rise / Fall Digital Options (95.5%)</div>
                <div className="text-[10px] text-slate-400">High-frequency 30s contracts</div>
              </div>
              <span className="text-[#089981] font-extrabold">+KES 68,320</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex justify-between items-center">
              <div>
                <div className="font-bold text-white">Pending Limit Orders</div>
                <div className="text-[10px] text-slate-400">Support / resistance boundary fills</div>
              </div>
              <span className="text-[#089981] font-extrabold">+KES 22,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
