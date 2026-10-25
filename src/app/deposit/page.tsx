"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  RefreshCw,
  FileCheck,
  Zap,
  Wallet,
  ShieldCheck,
} from "lucide-react";

export default function DepositPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [phone, setPhone] = useState<string>("");
  const [amount, setAmount] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [realBalance, setRealBalance] = useState<number>(0);

  const [depositState, setDepositState] = useState<{
    status: "IDLE" | "INITIATED" | "WAITING_CALLBACK" | "SUCCESS" | "FAILED";
    message?: string;
    checkoutRequestId?: string;
    receipt?: string;
  }>({ status: "IDLE" });

  // Tally balance helper: updates state, localStorage, and dispatches global event
  const tallyBalance = (addedAmount: number) => {
    const prev = parseFloat(
      (typeof window !== "undefined" && localStorage.getItem("tradepedia_real_balance")) || "0"
    );
    const updated = prev + Number(addedAmount);
    setRealBalance(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("tradepedia_real_balance", updated.toFixed(2));
      window.dispatchEvent(
        new CustomEvent("tradepedia_balance_updated", { detail: { balance: updated } })
      );
    }
  };

  const loadData = async () => {
    try {
      // 1. Initialize real balance from localStorage
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("tradepedia_real_balance");
        if (saved) {
          setRealBalance(parseFloat(saved));
        }
      }

      const [meRes, depRes, summaryRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/deposits"),
        fetch("/api/account/summary"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setIsAuthenticated(Boolean(meData?.data?.isAuthenticated));
        if (meData?.data?.user) {
          setKycStatus(meData.data.user.kycStatus);
          if (meData.data.user.phone) {
            setPhone(meData.data.user.phone);
          }
        }
      }

      if (summaryRes.ok) {
        const sumData = await summaryRes.json();
        const serverReal = parseFloat(sumData?.data?.realAccount?.availableBalance || "0");
        const currentSaved = parseFloat(
          (typeof window !== "undefined" && localStorage.getItem("tradepedia_real_balance")) || "0"
        );
        const resolved = Math.max(serverReal, currentSaved);
        setRealBalance(resolved);
        if (typeof window !== "undefined") {
          localStorage.setItem("tradepedia_real_balance", resolved.toFixed(2));
        }
      }

      if (depRes.ok) {
        const depData = await depRes.json();
        if (depData?.data?.deposits) {
          setDeposits(depData.data.deposits);
        }
      }
    } catch (err) {
      console.error("Deposit page load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time balance updates across tabs & terminal
    const handleBalanceUpdate = (e: any) => {
      if (e.detail?.balance !== undefined) {
        setRealBalance(Number(e.detail.balance));
      } else if (typeof window !== "undefined") {
        const saved = localStorage.getItem("tradepedia_real_balance");
        if (saved) setRealBalance(parseFloat(saved));
      }
    };

    window.addEventListener("tradepedia_balance_updated", handleBalanceUpdate);
    window.addEventListener("storage", handleBalanceUpdate);
    return () => {
      window.removeEventListener("tradepedia_balance_updated", handleBalanceUpdate);
      window.removeEventListener("storage", handleBalanceUpdate);
    };
  }, []);

  // Automated Live Polling for M-Pesa STK Push Confirmation
  useEffect(() => {
    const refToPoll = depositState.checkoutRequestId;
    if (!refToPoll || depositState.status !== "WAITING_CALLBACK") {
      return;
    }

    let isPolling = false;
    const interval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await fetch("/api/deposits/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: refToPoll,
            depositId: activeDepositId || undefined,
            amount,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();

        if (data?.data?.status === "SUCCESSFUL") {
          const credited = data.data?.amount ? parseFloat(data.data.amount) : amount;
          tallyBalance(credited);
          setDepositState({
            status: "SUCCESS",
            receipt: data.data.receipt,
            message: `Payment of KES ${credited.toLocaleString()} to TRADEPEDIA confirmed! Receipt: ${data.data.receipt}. Your TRADEPEDIA Real Broker account balance has been credited.`,
          });
          clearInterval(interval);
          loadData();
        } else if (data?.data?.status === "CANCELLED" || data?.data?.status === "FAILED") {
          setDepositState({
            status: "FAILED",
            message: data.error || "M-Pesa payment prompt was cancelled on your phone.",
          });
          clearInterval(interval);
          loadData();
        }
      } catch (e) {
        console.error("Auto polling verify error:", e);
      } finally {
        isPolling = false;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [depositState.checkoutRequestId, depositState.status, activeDepositId, amount]);

  const handleInitiateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setDepositState({
      status: "INITIATED",
      message: "Sending M-Pesa Express STK Push prompt to your phone...",
    });

    try {
      const res = await fetch("/api/deposits/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, phone, mode: "MPESA_STK" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Deposit initiation rejected");
      }

      const depId = data.data?.depositId;
      const ref = data.data?.reference;
      setActiveDepositId(depId);

      if (data.data?.status === "success" && ref) {
        const vRes = await fetch("/api/deposits/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: ref, depositId: depId, amount }),
        });
        const vData = await vRes.json();
        if (vData?.data?.status === "SUCCESSFUL") {
          const credited = vData.data?.amount ? parseFloat(vData.data.amount) : amount;
          tallyBalance(credited);
          setDepositState({
            status: "SUCCESS",
            receipt: vData.data.receipt,
            message: `Payment of KES ${credited.toLocaleString()} to TRADEPEDIA confirmed! Receipt: ${vData.data.receipt}. Your TRADEPEDIA Real Broker account balance has been credited.`,
          });
          await loadData();
          return;
        }
      }

      setDepositState({
        status: "WAITING_CALLBACK",
        checkoutRequestId: ref,
        message:
          data.data?.displayText ||
          "M-Pesa PIN prompt sent to your phone. Enter your PIN on your phone to approve — your balance will update automatically!",
      });

      await loadData();
    } catch (err: any) {
      setDepositState({
        status: "FAILED",
        message: err.message || "Failed to initiate M-Pesa STK Push",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualReconcile = async () => {
    if (!depositState.checkoutRequestId && !activeDepositId) return;
    try {
      const res = await fetch("/api/deposits/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: depositState.checkoutRequestId,
          depositId: activeDepositId,
          amount,
        }),
      });
      const data = await res.json();
      if (data?.data?.status === "SUCCESSFUL") {
        const credited = data.data?.amount ? parseFloat(data.data.amount) : amount;
        tallyBalance(credited);
        setDepositState({
          status: "SUCCESS",
          receipt: data.data.receipt,
          message: `Payment of KES ${credited.toLocaleString()} to TRADEPEDIA confirmed! Receipt: ${data.data.receipt}. Your TRADEPEDIA Real Broker account balance has been credited.`,
        });
      }
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowDownCircle className="w-6 h-6 text-emerald-400" />
          Deposit Trading Funds (M-Pesa Express)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deposit KES trading funds directly into your TRADEPEDIA Real Broker account via instant M-Pesa STK Push.
        </p>
      </div>

      {/* Live TRADEPEDIA Real Account Balance Card */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a0f1d] to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
              <span>TRADEPEDIA Real Account Balance</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              KES {realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/trade/BTCUSD"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ff5722]/20 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Trade Terminal &rarr;
          </Link>
        </div>
      </div>



      {/* Authentication Notice if Guest */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.08] text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>You can deposit directly or sign in to link payments permanently to your trader profile.</span>
          </div>
          <Link href="/login" className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs shrink-0">
            Sign In
          </Link>
        </div>
      )}

      {/* Deposit Execution Form */}
      <div className="bg-[#090a10] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-200 font-semibold">Lipa Na M-Pesa Buy Goods Till: 1850445</span>
          </div>
          <span className="font-semibold text-slate-400 font-mono">
            TRADEPEDIA Clearing
          </span>
        </div>

        {/* Interactive Status Indicator */}
        {depositState.status !== "IDLE" && (
          <div
            className={`p-4 rounded-xl text-xs space-y-2 border ${
              depositState.status === "WAITING_CALLBACK"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : depositState.status === "FAILED"
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                {depositState.status === "WAITING_CALLBACK" && (
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                )}
                {depositState.status === "FAILED" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                {depositState.status === "SUCCESS" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                <span>M-Pesa Status: {depositState.status}</span>
              </div>

              {depositState.status === "WAITING_CALLBACK" && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded border border-amber-500/30 text-[11px] font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                    Listening for PIN...
                  </span>
                  <button
                    onClick={handleManualReconcile}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded border border-amber-500/40 text-[11px]"
                  >
                    Check Now
                  </button>
                </div>
              )}
            </div>

            <p className="text-slate-300 leading-relaxed">{depositState.message}</p>

            {depositState.status === "SUCCESS" && (
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/trade/BTCUSD"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  Trade with Real Funds &rarr;
                </Link>
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700"
                >
                  View Dashboard
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleInitiateDeposit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Deposit Amount (KES)
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

            {/* Quick Amount Chips */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2">
              {[100, 250, 500, 1000, 2500, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-1 rounded text-xs font-mono font-bold border transition-all ${
                    amount === preset
                      ? "bg-[#ff5722] text-white border-[#ff5722]"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              M-Pesa Registered Mobile Phone
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
              A Safaricom STK prompt will pop up on this phone. Enter your PIN to approve payment to TRADEPEDIA.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || depositState.status === "WAITING_CALLBACK"}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-[#ff5722]/20"
          >
            {submitting ? "Sending STK Prompt..." : `Initiate M-Pesa STK Push (KES ${amount.toLocaleString()})`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-[10px] text-slate-500 text-center">
          *Never disclose your M-Pesa PIN. TRADEPEDIA never asks for, records, or stores user PINs.
        </div>
      </div>

      {/* User Deposit History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Your M-Pesa Deposit History</h2>
          </div>
          <span className="text-xs text-slate-400">{deposits.length} record(s)</span>
        </div>

        {deposits.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No deposits initiated yet.
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
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 font-mono">
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap font-sans">
                      {new Date(d.initiatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-emerald-400 font-bold whitespace-nowrap">
                      KES {parseFloat(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-slate-300">{d.phoneNumber}</td>
                    <td className="px-6 py-3 text-slate-300 font-semibold">
                      {d.mpesaReceiptNumber || "-"}
                    </td>
                    <td className="px-6 py-3 font-sans">
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
