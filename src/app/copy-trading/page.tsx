"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  ShieldCheck,
  Award,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  DollarSign,
  UserCheck,
} from "lucide-react";

interface MasterTrader {
  id: string;
  name: string;
  avatar: string;
  strategy: string;
  returnRate: number; // e.g. +148.5%
  winRate: number; // e.g. 78.4%
  riskScore: number; // 1 to 5
  copiers: number;
  totalProfitKes: number;
  commission: number; // %
  topAsset: string;
}

const MASTER_TRADERS: MasterTrader[] = [
  {
    id: "trd_1",
    name: "Kiprono Alpha FX",
    avatar: "KA",
    strategy: "Deriv Multipliers & Asian Session Breakout",
    returnRate: 218.4,
    winRate: 82.5,
    riskScore: 2,
    copiers: 1420,
    totalProfitKes: 4850000,
    commission: 10,
    topAsset: "EURUSD",
  },
  {
    id: "trd_2",
    name: "Nairobi Liquidity Pool",
    avatar: "NL",
    strategy: "Institutional London/NY Overlap Momentum",
    returnRate: 164.2,
    winRate: 76.8,
    riskScore: 3,
    copiers: 985,
    totalProfitKes: 3120000,
    commission: 12,
    topAsset: "GBPUSD",
  },
  {
    id: "trd_3",
    name: "Deriv Synthetics Bot",
    avatar: "DS",
    strategy: "Algorithmic Volatility Index Scalping 24/7",
    returnRate: 312.9,
    winRate: 88.1,
    riskScore: 4,
    copiers: 2840,
    totalProfitKes: 7640000,
    commission: 15,
    topAsset: "BTCUSD",
  },
  {
    id: "trd_4",
    name: "Savannah Safe Yield",
    avatar: "SS",
    strategy: "Low-Risk Spot Gold & USDKES Hedging",
    returnRate: 84.6,
    winRate: 91.2,
    riskScore: 1,
    copiers: 1190,
    totalProfitKes: 2280000,
    commission: 8,
    topAsset: "XAUUSD",
  },
];

export default function CopyTradingPage() {
  const [copiedTraders, setCopiedTraders] = useState<string[]>([]);
  const [copyModalTrader, setCopyModalTrader] = useState<MasterTrader | null>(null);
  const [allocatedKes, setAllocatedKes] = useState<number>(5000);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleStartCopying = (trader: MasterTrader) => {
    setCopiedTraders((prev) => [...prev, trader.id]);
    setCopyModalTrader(null);
    setSuccessToast(`✓ Successfully copied ${trader.name}! KES ${allocatedKes.toLocaleString()} allocated.`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handleStopCopying = (id: string) => {
    setCopiedTraders((prev) => prev.filter((t) => t !== id));
    setSuccessToast("Copying position terminated. Margin collateral unheld.");
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050608] text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Social & Copy Trading Network
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Follow Top Kenyan & Global Traders
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Automatically mirror trades of audited master traders in real time. Full control over allocation and instant stop-copy at any moment.
          </p>
        </div>

        <Link
          href="/trade/EURUSD"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold text-xs shadow-lg shadow-[#ff5722]/30 transition-all self-start sm:self-auto"
        >
          Open Self-Trading Terminal
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Active Copiers</span>
          <div className="text-xl font-extrabold text-white">6,435 Traders</div>
          <div className="text-[10px] text-emerald-400">+18% this month</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Total Profits Paid</span>
          <div className="text-xl font-extrabold text-amber-400 font-mono">KES 17.89M</div>
          <div className="text-[10px] text-slate-400">Direct to M-Pesa wallets</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Average Win Rate</span>
          <div className="text-xl font-extrabold text-[#089981] font-mono">84.7%</div>
          <div className="text-[10px] text-slate-400">Audited 90-day track record</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono">Execution Slippage</span>
          <div className="text-xl font-extrabold text-purple-400 font-mono">0.02 ms</div>
          <div className="text-[10px] text-slate-400">Instant DMA server mirroring</div>
        </div>
      </div>

      {/* Master Traders Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MASTER_TRADERS.map((trader) => {
          const isCopying = copiedTraders.includes(trader.id);

          return (
            <div
              key={trader.id}
              className="p-6 rounded-3xl bg-[#090a10] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-5 shadow-xl relative overflow-hidden group"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff5722] to-amber-500 p-0.5 shadow-md shadow-[#ff5722]/20">
                    <div className="w-full h-full rounded-[14px] bg-[#0c0d14] flex items-center justify-center font-bold text-sm text-white">
                      {trader.avatar}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                      {trader.name}
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </h3>
                    <p className="text-xs text-slate-400">{trader.strategy}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/[0.05] border border-white/[0.08] text-slate-300">
                  Top: {trader.topAsset}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/40 border border-white/[0.05] text-center font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase">30D Return</span>
                  <div className="text-sm font-extrabold text-[#089981]">+{trader.returnRate}%</div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase">Win Rate</span>
                  <div className="text-sm font-extrabold text-white">{trader.winRate}%</div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase">Copiers</span>
                  <div className="text-sm font-extrabold text-amber-300">{trader.copiers}</div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1">
                  <span>Risk Score:</span>
                  <span className="text-amber-400 font-bold">{"★".repeat(trader.riskScore)}</span>
                  <span className="text-slate-600">{"★".repeat(5 - trader.riskScore)}</span>
                </div>
                <div>
                  <span>Fee:</span> <strong className="text-white">{trader.commission}% on profits</strong>
                </div>
              </div>

              {/* Action Button */}
              {isCopying ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 font-mono">
                    <UserCheck className="w-4 h-4" />
                    Auto-Copy Active
                  </div>
                  <button
                    onClick={() => handleStopCopying(trader.id)}
                    className="py-2.5 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold transition-colors"
                  >
                    Stop
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCopyModalTrader(trader)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-extrabold text-xs shadow-md shadow-[#ff5722]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  Copy {trader.name.split(" ")[0]}&apos;s Trades
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal to Allocate Capital to Master Trader */}
      {copyModalTrader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0d14] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ff5722]" />
                Copy {copyModalTrader.name}
              </h3>
              <button
                onClick={() => setCopyModalTrader(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Every position opened by {copyModalTrader.name} will be mirrored proportionally into your demo account based on your allocated stake.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Allocate Copy Capital (KES)
              </label>
              <input
                type="number"
                min="500"
                step="500"
                value={allocatedKes}
                onChange={(e) => setAllocatedKes(parseFloat(e.target.value) || 500)}
                className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ff5722]"
              />
              <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-xs">
                {[1000, 2500, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAllocatedKes(val)}
                    className={`py-1 rounded-lg border font-bold ${
                      allocatedKes === val
                        ? "bg-[#ff5722] text-white border-[#ff5722]"
                        : "bg-white/[0.03] text-slate-400 border-white/[0.06]"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Performance Fee:</span>
                <span className="text-white">{copyModalTrader.commission}% (only on profit)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Stop-Loss Safeguard:</span>
                <span className="text-emerald-400">Automatic 20% drawdown protection</span>
              </div>
            </div>

            <button
              onClick={() => handleStartCopying(copyModalTrader)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-[#ff5722]/25 transition-all"
            >
              Confirm & Start Copying Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
