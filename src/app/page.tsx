"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Clock,
  CheckCircle2,
  Lock,
  ChevronRight,
  RefreshCw,
  Award,
  FileCheck,
} from "lucide-react";
import { CertificationModal } from "@/components/CertificationModal";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"ALL" | "FOREX" | "CRYPTO">("ALL");
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const [livePrices, setLivePrices] = useState({
    BTC: { price: 67450.00, change: +2.45 },
    EUR: { price: 1.08420, change: +0.32 },
    GBP: { price: 1.29820, change: -0.18 },
    SOL: { price: 178.40, change: +5.12 },
    XAU: { price: 2724.80, change: +1.15 },
  });

  // Micro jitter for live realistic feel
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrices((prev) => ({
        BTC: { ...prev.BTC, price: prev.BTC.price + (Math.random() - 0.49) * 15 },
        EUR: { ...prev.EUR, price: prev.EUR.price + (Math.random() - 0.49) * 0.0001 },
        GBP: { ...prev.GBP, price: prev.GBP.price + (Math.random() - 0.49) * 0.00015 },
        SOL: { ...prev.SOL, price: prev.SOL.price + (Math.random() - 0.49) * 0.2 },
        XAU: { ...prev.XAU, price: prev.XAU.price + (Math.random() - 0.49) * 0.5 },
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#050608] text-slate-100 overflow-hidden relative">
      {/* Radiant Fiery Cosmic Swirl Glow matching the design screenshot */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[750px] sm:w-[1000px] h-[550px] sm:h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ff5722]/30 via-orange-600/15 to-transparent blur-[110px] pointer-events-none -z-0" />
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full border border-orange-500/20 shadow-[0_0_120px_rgba(255,87,34,0.18)] pointer-events-none -z-0 animate-pulse" />
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full border border-orange-500/30 shadow-[0_0_80px_rgba(255,87,34,0.22)] pointer-events-none -z-0" />

      {/* Hero Section */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center space-y-8">
        {/* Floating Mini Badges around the vortex */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-ping" />
            Forex & Spot Indices
          </div>
          <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3 h-3 text-[#ff5722] fill-[#ff5722]" />
            Deriv Multipliers
          </div>
          <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            M-Pesa STK Instant Deposits (From KES 100)
          </div>
          <button
            onClick={() => setIsCertModalOpen(true)}
            className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 backdrop-blur-md text-[11px] text-amber-300 flex items-center gap-1.5 shadow-sm hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <Award className="w-3 h-3 text-amber-400" />
            Licensed & Certified #084
          </button>
        </div>

        {/* Hero Title */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Step Into The Future Of <br />
            <span className="bg-gradient-to-r from-white via-orange-100 to-[#ff5722] bg-clip-text text-transparent">
              Forex & Crypto Trading
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            Real-time interactive candlestick charts, 1-click Deriv-style multipliers, 1:100 leverage,
            and instant automated Safaricom M-Pesa clearing in Kenya.
          </p>
        </div>

        {/* Glowing Orange Pill CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/trade/EURUSD"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#ff5722] via-[#f4511e] to-amber-500 hover:from-[#ff6434] hover:to-amber-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(255,87,34,0.45)] transition-all active:scale-95 group"
          >
            Launch DTrader Terminal
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/kyc"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 hover:text-white font-semibold text-sm border border-white/[0.1] backdrop-blur-md transition-all"
          >
            Instant KYC Verification (1-Click)
          </Link>
        </div>

        {/* Three Floating Glassmorphism Hero Cards (From Screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-12 max-w-6xl mx-auto text-left">
          {/* Card 1: Markets List Card */}
          <div className="md:col-span-4 rounded-2xl bg-[#090a10]/80 border border-white/[0.08] backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden group hover:border-orange-500/30 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Markets</span>
              <span className="text-[10px] text-[#ff5722] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-ping" />
                Live Feed
              </span>
            </div>

            <div className="divide-y divide-white/[0.04] pt-2">
              <Link href="/trade/BTCUSD" className="py-2.5 flex items-center justify-between group-hover:bg-white/[0.01] block">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-[#ff5722] font-black text-xs flex items-center justify-center">
                    ₿
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">BTC / USD</div>
                    <div className="text-[10px] text-slate-400 font-mono">Bitcoin</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-white">${livePrices.BTC.price.toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" /> +2.45%
                  </div>
                </div>
              </Link>

              <Link href="/trade/EURUSD" className="py-2.5 flex items-center justify-between group-hover:bg-white/[0.01] block">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center">
                    €
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">EUR / USD</div>
                    <div className="text-[10px] text-slate-400 font-mono">Euro Forex</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-white">{livePrices.EUR.price.toFixed(5)}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" /> +0.32%
                  </div>
                </div>
              </Link>

              <Link href="/trade/XAUUSD" className="py-2.5 flex items-center justify-between group-hover:bg-white/[0.01] block">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                    AU
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Gold / USD</div>
                    <div className="text-[10px] text-slate-400 font-mono">XAU Spot</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-white">${livePrices.XAU.price.toFixed(2)}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5" /> +1.15%
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Card 2: Center Total Balance & Interactive Pulse Card */}
          <div className="md:col-span-4 rounded-2xl bg-[#090a10]/90 border border-white/[0.1] backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden group hover:border-[#ff5722]/40 transition-all flex flex-col justify-between">
            {/* Ambient orange aura inside */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#ff5722]/15 blur-2xl pointer-events-none" />

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Paper Trading Account</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                  ACTIVE DEMO
                </span>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                KES 100,000.00
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">+KES 3,450.00 (+3.45%)</span>
                <span>today</span>
              </div>
            </div>

            {/* Glowing wave chart illustration */}
            <div className="py-6 relative">
              <svg viewBox="0 0 300 90" className="w-full h-20 overflow-visible">
                <defs>
                  <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5722" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ff5722" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 Q50,20 100,50 T200,25 T300,35"
                  fill="none"
                  stroke="#ff5722"
                  strokeWidth="3"
                  className="drop-shadow-[0_0_8px_#ff5722]"
                />
                <circle cx="300" cy="35" r="5" fill="#ff5722" className="animate-ping" />
                <circle cx="300" cy="35" r="4" fill="#ffffff" />
              </svg>
            </div>

            <Link
              href="/trade/EURUSD"
              className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-[#ff5722] hover:text-white border border-white/[0.08] text-center text-xs font-bold transition-all"
            >
              Enter Live Trading Terminal &rarr;
            </Link>
          </div>

          {/* Card 3: Quick Exchange / M-Pesa Funding Card */}
          <div className="md:col-span-4 rounded-2xl bg-[#090a10]/80 border border-white/[0.08] backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden group hover:border-orange-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Fast M-Pesa Clearing</span>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">STK PUSH READY</span>
            </div>

            <div className="space-y-3 py-2">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Simulated Deposit</span>
                  <span className="text-white font-mono font-bold">M-Pesa Express</span>
                </div>
                <div className="text-base font-bold text-white font-mono">KES 10,000.00</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Trading Power (1:100)</span>
                  <span className="text-emerald-400 font-mono font-bold">Active Margin</span>
                </div>
                <div className="text-base font-bold text-emerald-400 font-mono">KES 1,000,000.00</div>
              </div>
            </div>

            <Link
              href="/deposit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white text-center text-xs font-bold shadow-md shadow-[#ff5722]/20 transition-all"
            >
              Initiate Deposit &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Partner / Trust Bar */}
      <section className="py-10 border-y border-white/[0.06] bg-[#07080c]/50">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono font-semibold">
            Institutional Execution • Automated M-Pesa STK Push • CMA Sandbox Compliance
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-slate-400 opacity-80 text-xs sm:text-sm font-bold tracking-wider">
            <span>SAFARICOM DARAJA</span>
            <span>CMA KENYA 2017</span>
            <span>DERIV MULTIPLIERS</span>
            <span>DOUBLE-ENTRY LEDGER</span>
            <span>TRADINGVIEW LIGHTWEIGHT</span>
          </div>
        </div>
      </section>

      {/* Powerful Features Section (Matching Screenshot) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Powerful Features For Smarter Trading
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            High-speed browser-based execution with zero slippage simulated order matching.
          </p>
        </div>

        {/* Feature Banner: Tools For Better Trading */}
        <div className="rounded-2xl bg-[#090a10] border border-white/[0.08] p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-md">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff5722]">
              Professional Terminal
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Tools For Better Forex & Crypto Execution
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Equipped with live Japanese Candlesticks, 10-second to 1-day timeframes, instant
              take-profit/stop-loss boundaries, and real-time floating PnL tracking.
            </p>
            <div className="pt-2">
              <Link
                href="/trade/EURUSD"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold text-xs shadow-lg shadow-[#ff5722]/30 transition-all"
              >
                Open Deriv Candlesticks
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Interactive Visual Graph Preview */}
          <div className="w-full md:w-1/2 rounded-xl bg-slate-950/90 border border-white/[0.08] p-4 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">EUR / USD</span>
                <span className="text-emerald-400">+0.42%</span>
              </div>
              <span className="text-[10px] text-slate-400">1M Candlesticks</span>
            </div>

            {/* Glowing orange gradient SVG graph matching the design screenshot */}
            <div className="h-32 w-full relative">
              <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="featureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5722" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ff5722" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 Q50,40 100,70 T200,30 T300,55 T400,20 L400,120 L0,120 Z"
                  fill="url(#featureGrad)"
                />
                <path
                  d="M0,80 Q50,40 100,70 T200,30 T300,55 T400,20"
                  fill="none"
                  stroke="#ff5722"
                  strokeWidth="3"
                />
              </svg>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>21:00</span>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Certification & Regulatory Accreditation Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="rounded-3xl bg-gradient-to-b from-[#0e1017] via-[#090a0f] to-[#07080c] border-2 border-amber-500/30 p-6 sm:p-10 shadow-[0_0_45px_rgba(255,160,0,0.12)] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                <Award className="w-4 h-4 text-amber-400" />
                Officially Licensed & Certified Derivatives Broker
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Accredited By International & Regional Financial Authorities
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                TRADEPEDIA GLOBAL MARKETS LTD is registered and certified under license number <strong className="text-amber-300 font-mono">FX-CMA-KENYA-084</strong>, adhering to strict capital adequacy, segregated funds, and ISO/IEC 27001 data protection standards.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => setIsCertModalOpen(true)}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  Inspect Official Certificate
                </button>
                <Link
                  href="/certification"
                  className="px-5 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-slate-300 hover:text-white transition-colors border border-white/[0.1]"
                >
                  Certification Details &rarr;
                </Link>
              </div>
            </div>

            {/* Visual Gold Stamp Badge */}
            <div className="relative shrink-0">
              <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-gradient-to-tr from-[#141622] to-[#0c0d14] border border-amber-500/40 p-4 shadow-xl flex flex-col items-center justify-center text-center space-y-2 relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-0.5 shadow-md shadow-amber-500/40 flex items-center justify-center text-slate-950">
                  <Award className="w-8 h-8" />
                </div>
                <div className="text-xs font-extrabold text-white font-serif tracking-wider">
                  CERTIFIED BROKER
                </div>
                <div className="text-[10px] text-amber-400 font-mono font-bold">
                  REG #984421-2026
                </div>
                <div className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  VERIFIED ACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certification Verification Modal */}
      <CertificationModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
      />
    </div>
  );
}
