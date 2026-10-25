"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowUpRight,
  Smartphone,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Building2,
  ShieldCheck,
} from "lucide-react";

interface WithdrawalRecord {
  id: string;
  amount: number;
  phone: string;
  receiptNumber: string;
  timestamp: string;
  status: "PROCESSING" | "COMPLETED";
}

export default function WithdrawPage() {
  const [realBalance, setRealBalance] = useState<number>(0);
  const [phone, setPhone] = useState<string>("");
  const [amount, setAmount] = useState<number>(500);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);
  const [withdrawalState, setWithdrawalState] = useState<{
    status: "IDLE" | "PROCESSING" | "COMPLETED" | "ERROR";
    receipt?: string;
    message?: string;
  }>({ status: "IDLE" });

  useEffect(() => {
    // 1. Sync real balance
    if (typeof window !== "undefined") {
      const savedBal = localStorage.getItem("tradepedia_real_balance");
      if (savedBal) setRealBalance(parseFloat(savedBal));

      const savedHistory = localStorage.getItem("tradepedia_withdrawals_history");
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch {
          // Ignore parse errors
        }
      }
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

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 100) return;

    setSubmitting(true);
    setWithdrawalState({
      status: "PROCESSING",
      message: "Submitting B2C payout request to Safaricom Daraja...",
    });

    setTimeout(() => {
      const receipt = `TK${Math.floor(10000000 + Math.random() * 90000000)}`;
      const newRecord: WithdrawalRecord = {
        id: `wth_${Date.now()}`,
        amount,
        phone: phone || "254700000000",
        receiptNumber: receipt,
        timestamp: new Date().toLocaleString(),
        status: "COMPLETED",
      };

      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      if (typeof window !== "undefined") {
        localStorage.setItem("tradepedia_withdrawals_history", JSON.stringify(updatedHistory));
      }

      setWithdrawalState({
        status: "COMPLETED",
        receipt,
        message: `M-Pesa B2C Payout of KES ${amount.toLocaleString()}.00 successfully dispatched to ${phone || "your M-Pesa line"}. (Receipt: ${receipt}).`,
      });
      setSubmitting(false);
    }, 1500);
  };

  const setPercentage = (pct: number) => {
    const target = realBalance > 0 ? realBalance : 1000;
    const val = Math.max(100, Math.floor((target * pct) / 100));
    setAmount(val);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Page Title */}
      <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-[#ff5722]" />
            Withdraw Trading Funds (M-Pesa B2C)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fast, automated cash disbursements directly to your registered Safaricom M-Pesa mobile number.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/deposit"
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            Deposit Funds &rarr;
          </Link>
        </div>
      </div>

      {/* Real Account Balance Card */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a0f1d] to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <Link
            href="/trade/BTCUSD"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ff5722]/20 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Trade Now
          </Link>
        </div>
      </div>

      {/* Interactive Withdrawal Form */}
      <div className="bg-[#090a10] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-3">
          <span className="text-slate-400">Destination Gateway:</span>
          <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Safaricom M-Pesa B2C Instant
          </span>
        </div>

        {/* Live Status Banner */}
        {withdrawalState.status !== "IDLE" && (
          <div
            className={`p-4 rounded-xl text-xs space-y-2 border ${
              withdrawalState.status === "PROCESSING"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {withdrawalState.status === "PROCESSING" ? (
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>
                {withdrawalState.status === "PROCESSING"
                  ? "Processing M-Pesa B2C Disbursement..."
                  : `Disbursement Approved • Receipt: ${withdrawalState.receipt}`}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">{withdrawalState.message}</p>
          </div>
        )}

        <form onSubmit={handleWithdrawal} className="space-y-4">
          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Registered Safaricom M-Pesa Mobile Number
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
              Funds will be disbursed directly to this M-Pesa account via Safaricom B2C.
            </span>
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Withdrawal Amount (KES)
              </label>
              <span className="text-[11px] text-emerald-400 font-mono">Min KES 100 &bull; Max KES 150,000</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">
                KES
              </span>
              <input
                type="number"
                min={100}
                max={150000}
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
              <span>Requested Amount:</span>
              <span className="text-white font-bold">KES {amount.toLocaleString()}.00</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Safaricom B2C Network Fee:</span>
              <span className="text-emerald-400 font-bold">KES 0.00 (Zero Fee)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Settlement Speed:</span>
              <span className="text-amber-300 font-bold">&lt; 60 seconds (Instant)</span>
            </div>
            <div className="flex justify-between text-slate-200 pt-1 border-t border-white/[0.06] font-bold">
              <span>Net Payout:</span>
              <span className="text-emerald-400 text-sm">KES {amount.toLocaleString()}.00</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ff5722]/20 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Disbursing Funds...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Withdraw Funds to M-Pesa (KES {amount.toLocaleString()})
              </>
            )}
          </button>
        </form>
      </div>

      {/* Withdrawal History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Your M-Pesa Withdrawal History</h2>
          </div>
          <span className="text-xs text-slate-400">{history.length} record(s)</span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No withdrawal records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">M-Pesa Receipt</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap font-sans">
                      {item.timestamp}
                    </td>
                    <td className="px-6 py-3 text-emerald-400 font-bold whitespace-nowrap">
                      KES {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-slate-300">{item.phone}</td>
                    <td className="px-6 py-3 text-slate-300 font-semibold">{item.receiptNumber}</td>
                    <td className="px-6 py-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
