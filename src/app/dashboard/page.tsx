"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  Clock,
} from "lucide-react";

interface AccountSummary {
  isAuthenticated?: boolean;
  account: {
    id: string;
    currency: string;
    availableBalance: string;
    lockedMargin: string;
    equity: string;
    isDemo: boolean;
  };
  demoAccount?: {
    id: string;
    availableBalance: string;
    lockedMargin: string;
    equity: string;
    isDemo: boolean;
  };
  realAccount?: {
    id: string;
    availableBalance: string;
    lockedMargin: string;
    equity: string;
    isDemo: boolean;
  };
  compliance: {
    demoMode: boolean;
    kycStatus: string;
    canTrade: boolean;
    canDeposit: boolean;
  };
  recentTransactions: {
    id: string;
    type: string;
    amount: string;
    balanceAfter: string;
    description: string;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountMode, setAccountMode] = useState<"REAL" | "DEMO">("REAL");

  useEffect(() => {
    fetch("/api/account/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.success) {
          setData(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md w-full bg-[#090a10] border border-white/[0.1] p-6 rounded-2xl space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sign In Required</h2>
            <p className="text-xs text-slate-400 mt-1">
              Please sign in or register an account to access your personal trading portfolio, balances, and M-Pesa deposit history.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { account, compliance, recentTransactions } = data;
  const isKycApproved = compliance.kycStatus === "APPROVED";
  const activeAcc = accountMode === "REAL" ? (data.realAccount || account) : (data.demoAccount || account);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Banner / KYC Alert */}
      {!isKycApproved && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              <strong>KYC Action Required:</strong> Your identity status is{" "}
              <span className="font-bold underline">{compliance.kycStatus}</span>. Deposits and trading execution are gated until approved.
            </span>
          </div>
          <Link
            href="/kyc"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors whitespace-nowrap"
          >
            Complete Verification
          </Link>
        </div>
      )}

      {/* Account Type Selector Bar (Live Real vs Demo) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#090a10] border border-white/[0.08] p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/[0.08] text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setAccountMode("REAL")}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                accountMode === "REAL"
                  ? "bg-[#089981] text-white shadow-md shadow-[#089981]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real <span className="hidden xs:inline">(CR-884920)</span></span>
            </button>
            <button
              onClick={() => setAccountMode("DEMO")}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                accountMode === "DEMO"
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Demo <span className="hidden xs:inline">(VRTC-1002)</span></span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {accountMode === "REAL" ? (
            <Link
              href="/deposit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ff5722]/20"
            >
              <Wallet className="w-3.5 h-3.5" />
              Deposit via M-Pesa
            </Link>
          ) : (
            <Link
              href="/trade/EURUSD"
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30"
            >
              Launch Demo Terminal &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Account Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            KES {parseFloat(activeAcc.availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-[10px] font-semibold ${accountMode === "REAL" ? "text-emerald-400" : "text-amber-400"}`}>
            {accountMode === "REAL" ? "Real Money Cash Capital" : "Simulated Paper Capital"}
          </div>
        </div>

        {/* Equity */}
        <div className="p-5 rounded-2xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Account Equity</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            KES {parseFloat(activeAcc.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Balance + Floating PnL</div>
        </div>

        {/* Locked Margin */}
        <div className="p-5 rounded-2xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Locked Margin</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            KES {parseFloat(activeAcc.lockedMargin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Collateral held for open orders</div>
        </div>

        {/* Account Mode */}
        <div className="p-5 rounded-2xl bg-[#090a10] border border-white/[0.08] space-y-1">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Operational Mode</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-xl font-extrabold ${accountMode === "REAL" ? "text-[#089981]" : "text-amber-400"}`}>
            {accountMode === "REAL" ? "REAL BROKER" : "DEMO SANDBOX"}
          </div>
          <div className="text-[10px] text-slate-400">
            {accountMode === "REAL" ? "Direct Market Access (DMA)" : "Paper Trading Simulation"}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/deposit"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                M-Pesa Deposit
              </div>
              <div className="text-[11px] text-slate-400">
                Instant Daraja STK Push into trading account
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
        </Link>

        <Link
          href="/markets"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                Trade Forex Pairs
              </div>
              <div className="text-[11px] text-slate-400">
                Live EUR/USD, GBP/USD, USD/JPY quotes
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
        </Link>

        <Link
          href="/portfolio"
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                Portfolio & Ledger
              </div>
              <div className="text-[11px] text-slate-400">
                Audit transactions, margin & equity history
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>

      {/* Recent Ledger History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Recent Account Ledger Activity</h2>
          </div>
          <Link href="/portfolio" className="text-xs text-emerald-400 hover:underline">
            View All Ledger Entries &rarr;
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No ledger transactions recorded yet. Complete KYC to receive demo funds or initiate a deposit.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Amount (KES)</th>
                  <th className="px-6 py-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {recentTransactions.map((tx) => {
                  const isPositive = parseFloat(tx.amount) >= 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-3">{tx.description}</td>
                      <td
                        className={`px-6 py-3 text-right font-mono font-bold whitespace-nowrap ${
                          isPositive ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {parseFloat(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-300 whitespace-nowrap">
                        KES{" "}
                        {parseFloat(tx.balanceAfter).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
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
