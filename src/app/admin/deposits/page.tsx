"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDeposits = async () => {
    try {
      const res = await fetch("/api/deposits?all=true");
      const data = await res.json();
      if (data.success) {
        setDeposits(data.data.deposits || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const handleReconcile = async (depositId: string) => {
    setReconcilingId(depositId);
    setNotice(null);
    try {
      const res = await fetch("/api/deposits/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId }),
      });
      const data = await res.json();
      setNotice(data.message || "Reconciliation query executed.");
      await fetchDeposits();
    } catch (e: any) {
      setNotice(e.message || "Reconciliation query failed.");
    } finally {
      setReconcilingId(null);
    }
  };

  const filtered = deposits.filter((d) => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

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
            <ArrowDownCircle className="w-6 h-6 text-amber-400" />
            M-Pesa Deposits & Daraja Reconciliation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor incoming customer payments, verify M-Pesa receipts, and resolve pending STK Push transactions.
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            fetchDeposits();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-300 font-semibold">Filter by Status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Transactions ({deposits.length})</option>
            <option value="SUCCESSFUL">SUCCESSFUL</option>
            <option value="PENDING_CONFIRMATION">PENDING CONFIRMATION</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filtered.length} deposit(s)
        </span>
      </div>

      {/* Deposits Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No deposit records match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Trader</th>
                  <th className="px-6 py-3">M-Pesa Phone</th>
                  <th className="px-6 py-3 text-right">Amount (KES)</th>
                  <th className="px-6 py-3">M-Pesa Receipt</th>
                  <th className="px-6 py-3">Checkout Request ID</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 font-mono">
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap font-sans">
                      {new Date(d.initiatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-sans whitespace-nowrap">
                      <div className="font-bold text-white">{d.userFullName || "Trader"}</div>
                      <div className="text-[10px] text-slate-400">{d.userEmail}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-300">{d.phoneNumber}</td>
                    <td className="px-6 py-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                      KES {parseFloat(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-slate-200 font-semibold">
                      {d.mpesaReceiptNumber || "-"}
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-[11px] truncate max-w-[120px]">
                      {d.checkoutRequestId || "-"}
                    </td>
                    <td className="px-6 py-3 font-sans whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          d.status === "SUCCESSFUL"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : d.status === "PENDING_CONFIRMATION" || d.status === "INITIATED"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center font-sans whitespace-nowrap">
                      {d.status !== "SUCCESSFUL" && (
                        <button
                          onClick={() => handleReconcile(d.id)}
                          disabled={reconcilingId === d.id}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          {reconcilingId === d.id ? "Querying..." : "Reconcile"}
                        </button>
                      )}
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
