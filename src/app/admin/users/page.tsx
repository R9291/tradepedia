"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Sliders,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  X,
  Wallet,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("ALL");

  // Adjustment Modal State
  const [adjustingUser, setAdjustingUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const url = new URL("/api/admin/users", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (kycFilter) url.searchParams.set("kycStatus", kycFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, kycFilter]);

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    if (!adjustAmount || adjustAmount === 0) {
      setAdjustError("Adjustment amount cannot be zero.");
      return;
    }
    if (!adjustReason || adjustReason.trim().length < 5) {
      setAdjustError("A descriptive reason (min 5 characters) is required.");
      return;
    }

    setAdjustLoading(true);
    setAdjustError(null);

    try {
      const res = await fetch("/api/admin/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adjustingUser.id,
          amount: Number(adjustAmount),
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute adjustment");
      }

      setSuccessMsg(
        `Balance adjusted by KES ${adjustAmount}. New balance: KES ${data.data.newBalance}. Ledger entry created.`
      );
      setAdjustingUser(null);
      setAdjustAmount(0);
      setAdjustReason("");
      await fetchUsers();
    } catch (err: any) {
      setAdjustError(err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 mb-2 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Overview
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-400" />
          Trader Directory & Account Administration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review accounts, KYC states, active collateral, and perform audit-logged balance adjustments.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All KYC States</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PENDING">PENDING</option>
            <option value="NOT_SUBMITTED">NOT SUBMITTED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No traders match the current query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">User Profile</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">KYC Status</th>
                  <th className="px-6 py-3 text-right">Available Balance</th>
                  <th className="px-6 py-3 text-right">Locked Margin</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {users.map((u) => {
                  const account = u.accounts?.[0] || { availableBalance: "0", lockedMargin: "0" };
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="font-bold text-white">{u.fullName}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-300">{u.phone}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.kycStatus === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : u.kycStatus === "PENDING"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {u.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        KES {parseFloat(account.availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-amber-400 whitespace-nowrap">
                        KES {parseFloat(account.lockedMargin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setAdjustingUser(u);
                            setAdjustAmount(0);
                            setAdjustReason("");
                            setAdjustError(null);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-colors"
                        >
                          Adjust Balance
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Balance Adjustment Modal */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Manual Ledger Balance Adjustment
                </h3>
                <span className="text-[11px] text-slate-400">
                  Target: <strong>{adjustingUser.fullName}</strong> ({adjustingUser.email})
                </span>
              </div>
              <button
                onClick={() => setAdjustingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {adjustError}
              </div>
            )}

            <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg text-[11px] text-purple-300">
              *Admins must never directly edit existing ledger records. Submitting this form appends an immutable <strong>ADJUSTMENT</strong> ledger entry and audit log.
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adjustment Delta Amount (KES)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="+500.00 or -200.00"
                  value={adjustAmount || ""}
                  onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-slate-500">
                  Positive value credits account; negative value debits account.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mandatory Administrative Reason
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Reconciliation correction for disputed Safaricom reference QWE123RTY4"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {adjustLoading ? "Recording..." : "Execute & Record Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
