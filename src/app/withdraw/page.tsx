"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowUpRight,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

export default function WithdrawPreviewPage() {
  const [realBalance, setRealBalance] = useState<number>(0);
  const [phone, setPhone] = useState<string>("");
  const [amount, setAmount] = useState<number>(500);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [simulatedState, setSimulatedState] = useState<{
    status: "IDLE" | "PROCESSING" | "COMPLETED";
    ticketId?: string;
    message?: string;
  }>({ status: "IDLE" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tradepedia_real_balance");
      if (saved) setRealBalance(parseFloat(saved));
    }

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.user?.phone) {
          setPhone(data.data.user.phone);
        }
      })
      .catch(() => {});

    fetch("/api/account/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.realAccount?.availableBalance) {
          const serverBal = parseFloat(data.data.realAccount.availableBalance);
          const localBal = parseFloat(
            (typeof window !== "undefined" && localStorage.getItem("tradepedia_real_balance")) || "0"
          );
          setRealBalance(Math.max(serverBal, localBal));
        }
      })
      .catch(() => {});
  }, []);

  const handleSimulateWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setSubmitting(true);
    setSimulatedState({
      status: "PROCESSING",
      message: "Routing request to Safaricom Daraja B2C payout gateway...",
    });

    setTimeout(() => {
      const ticket = `B2C_${Date.now().toString().slice(-8)}`;
      setSimulatedState({
        status: "COMPLETED",
        ticketId: ticket,
        message: `Simulated M-Pesa B2C payout of KES ${amount.toLocaleString()} to ${phone || "your M-Pesa number"} successfully staged.`,
      });
      setSubmitting(false);
    }, 1800);
  };

  const setPercentage = (pct: number) => {
    const val = Math.max(100, Math.floor((realBalance * pct) / 100));
    setAmount(val);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Feature Preview &bull; Upcoming Release
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-[#ff5722]" />
            M-Pesa B2C Instant Withdrawal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Preview the upcoming automated Safaricom B2C payout engine for instant withdrawals directly to your M-Pesa line.
          </p>
        </div>

        <Link
          href="/deposit"
          className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          &larr; Back to Deposit
        </Link>
      </div>

      {/* Real Account Balance Card */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0b0e1a] to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
              <span>Withdrawable Cash Balance</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              KES {realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            Zero Payout Fees (0%)
          </span>
        </div>
      </div>

      {/* Feature Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white block font-semibold">How Automated Withdrawals Will Work:</strong>
          <p className="text-slate-300 leading-relaxed">
            When enabled, traders enter the desired amount, and Tradepedia&apos;s automated Safaricom B2C disbursement gateway routes the funds directly to your registered Safaricom M-Pesa line in under 60 seconds.
          </p>
        </div>
      </div>

      {/* Interactive Withdrawal Preview Form */}
      <div className="bg-[#090a10] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-3">
          <span className="text-slate-400">Destination Channel:</span>
          <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Safaricom M-Pesa B2C Payout
          </span>
        </div>

        {/* Status Confirmation Display */}
        {simulatedState.status !== "IDLE" && (
          <div
            className={`p-4 rounded-xl text-xs space-y-2 border ${
              simulatedState.status === "PROCESSING"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {simulatedState.status === "PROCESSING" ? (
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>
                {simulatedState.status === "PROCESSING"
                  ? "Staging B2C Payout Transaction..."
                  : `Preview Simulation Staged (Ticket #${simulatedState.ticketId})`}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">{simulatedState.message}</p>
            {simulatedState.status === "COMPLETED" && (
              <p className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                This is a preview of the upcoming B2C disbursement flow. Live automated payouts will disburse straight to your phone once the Safaricom B2C certificate audit is complete.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSimulateWithdrawal} className="space-y-4">
          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Registered Safaricom M-Pesa Phone Number
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                required
                placeholder="07XXXXXXXX or 2547XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-[#ff5722]"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Funds will be sent directly to this M-Pesa mobile line via Safaricom B2C.
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Withdrawal Amount (KES)
              </label>
              <span className="text-[11px] text-emerald-400 font-mono">Min KES 100</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">
                KES
              </span>
              <input
                type="number"
                min={100}
                max={Math.max(100, realBalance || 150000)}
                step={50}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-14 pr-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-[#ff5722]"
              />
            </div>

            {/* Quick Percentage Chips */}
            <div className="grid grid-cols-4 gap-1.5 pt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentage(pct)}
                  className="py-1 rounded text-xs font-mono font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  {pct === 100 ? "Max (100%)" : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Summary Breakdown */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.06] space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Payout Amount:</span>
              <span className="text-white font-bold">KES {amount.toLocaleString()}.00</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>M-Pesa B2C Gateway Fee:</span>
              <span className="text-emerald-400 font-bold">KES 0.00 (Free)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Settlement Speed:</span>
              <span className="text-amber-300 font-bold">&lt; 60 seconds (Instant)</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ff5722]/20 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Staging B2C Payout Preview...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Preview M-Pesa B2C Withdrawal (KES {amount.toLocaleString()})
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
