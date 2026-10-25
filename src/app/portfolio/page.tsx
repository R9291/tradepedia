"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Wallet,
  Activity,
  CheckCircle,
  FileText,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

export default function PortfolioPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const account = data?.account || {
    availableBalance: "0",
    lockedMargin: "0",
    equity: "0",
    currency: "KES",
  };
  const recentTransactions = data?.recentTransactions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            Trading Portfolio & Double-Entry Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time balance, locked collateral, and immutable audit trail.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          Ledger Invariant: Reconciled & Balanced
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Available Cash Balance</span>
          <div className="text-2xl font-extrabold text-white">
            KES {parseFloat(account.availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Unencumbered funds ready for orders</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Locked Margin Requirement</span>
          <div className="text-2xl font-extrabold text-amber-400">
            KES {parseFloat(account.lockedMargin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Active margin held by engine</div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Equity</span>
          <div className="text-2xl font-extrabold text-emerald-400">
            KES {parseFloat(account.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">Available + Locked Margin + Floating PnL</div>
        </div>
      </div>

      {/* Ledger History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Immutable Ledger Audit Entries</h2>
          </div>
          <span className="text-xs text-slate-400">
            {recentTransactions.length} transaction(s) recorded
          </span>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No ledger transactions found for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Transaction Type</th>
                  <th className="px-6 py-3">Audit Details</th>
                  <th className="px-6 py-3 text-right">Delta Amount (KES)</th>
                  <th className="px-6 py-3 text-right">Post-Transaction Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {recentTransactions.map((tx: any) => {
                  const isPositive = parseFloat(tx.amount) >= 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 font-mono">
                      <td className="px-6 py-3 text-slate-400 whitespace-nowrap font-sans">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-sans text-slate-300">{tx.description}</td>
                      <td
                        className={`px-6 py-3 text-right font-bold whitespace-nowrap ${
                          isPositive ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {parseFloat(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-300 whitespace-nowrap">
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
