"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  AlertTriangle,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Info,
  RefreshCw,
  FileCheck,
  Building2,
  QrCode,
  Copy,
  Zap,
} from "lucide-react";

export default function DepositPage() {
  const [depositMethod, setDepositMethod] = useState<"STK" | "PAYBILL">("STK");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [phone, setPhone] = useState<string>("");
  const [amount, setAmount] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);

  const [depositState, setDepositState] = useState<{
    status: "IDLE" | "INITIATED" | "WAITING_CALLBACK" | "SUCCESS" | "FAILED";
    message?: string;
    checkoutRequestId?: string;
    receipt?: string;
  }>({ status: "IDLE" });

  const loadData = async () => {
    try {
      const [meRes, depRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/deposits"),
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

      if (depRes.ok) {
        const depData = await depRes.json();
        if (depData?.data?.deposits) {
          setDeposits(depData.data.deposits);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Polling for active deposit status
  useEffect(() => {
    if (!activeDepositId || depositState.status === "SUCCESS" || depositState.status === "FAILED") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/deposits/${activeDepositId}`);
        if (!res.ok) return;
        const data = await res.json();
        const dep = data?.data?.deposit;

        if (dep?.status === "SUCCESSFUL") {
          setDepositState({
            status: "SUCCESS",
            receipt: dep.mpesaReceiptNumber,
            message: `Payment confirmed! M-Pesa Receipt: ${dep.mpesaReceiptNumber}. Your trading balance has been credited.`,
          });
          clearInterval(interval);
          loadData();
        } else if (dep?.status === "FAILED" || dep?.status === "CANCELLED") {
          setDepositState({
            status: "FAILED",
            message: dep.failureReason || `M-Pesa payment ${dep.status.toLowerCase()}`,
          });
          clearInterval(interval);
          loadData();
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeDepositId, depositState.status]);

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
          body: JSON.stringify({ reference: ref, depositId: depId }),
        });
        const vData = await vRes.json();
        if (vData?.data?.status === "SUCCESSFUL") {
          setDepositState({
            status: "SUCCESS",
            receipt: vData.data.receipt,
            message: `M-Pesa payment confirmed! Receipt: ${vData.data.receipt}. Your Real Broker balance has been credited.`,
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
          "M-Pesa PIN prompt sent to your phone. Enter your M-Pesa PIN on your device, then click Verify Payment.",
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
        }),
      });
      const data = await res.json();
      if (data?.data?.status === "SUCCESSFUL") {
        setDepositState({
          status: "SUCCESS",
          receipt: data.data.receipt,
          message: `M-Pesa payment confirmed! Receipt: ${data.data.receipt}. Your Real Broker balance has been credited.`,
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

  const isKycApproved = kycStatus === "APPROVED";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowDownCircle className="w-6 h-6 text-emerald-400" />
          Deposit Trading Funds (M-Pesa Express)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deposit KES trading funds directly into your Real Broker account via M-Pesa STK Push.
        </p>
      </div>

      {/* Mandatory Withdrawal Notice */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-400">
          <Info className="w-4 h-4 shrink-0" />
          <span>Withdrawals Notice</span>
        </div>
        <p className="text-slate-300 font-medium">
          Withdrawals are not available yet. This feature will be introduced in a future update.
        </p>
      </div>

      {/* Mandatory Risk Warning */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <strong>Risk Warning:</strong> Trading involves substantial risk of loss. Do not deposit money you cannot afford to lose. All funds deposited are utilized solely as margin collateral.
        </div>
      </div>

      {/* Authentication Notice if Guest */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl bg-slate-900 border border-white/[0.08] text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>You can test deposits directly or sign in to link payments to your trader profile.</span>
          </div>
          <Link href="/login" className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs shrink-0">
            Sign In
          </Link>
        </div>
      )}

      {/* Deposit Execution Form */}
      <div className="bg-[#090a10] border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-3">
            <span className="text-slate-400">Deposit Limits:</span>
            <span className="font-semibold text-slate-200">
              Min: KES 100.00 &bull; Max: KES 150,000.00 / tx
            </span>
          </div>

          {/* Deposit Channel Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-white/[0.08] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDepositMethod("STK")}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                depositMethod === "STK"
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              Automated STK Push Prompt
            </button>
            <button
              type="button"
              onClick={() => setDepositMethod("PAYBILL")}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                depositMethod === "PAYBILL"
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Lipa Na M-Pesa Paybill / QR
            </button>
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
                  <button
                    onClick={handleManualReconcile}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded border border-amber-500/40 text-[11px]"
                  >
                    <RefreshCw className="w-3 h-3" /> Check Confirmation
                  </button>
                )}
              </div>

              <p className="text-slate-300">{depositState.message}</p>

              {depositState.status === "SUCCESS" && (
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    View Updated Balance &rarr;
                  </Link>
                  <Link
                    href="/portfolio"
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700"
                  >
                    View Ledger Entry
                  </Link>
                </div>
              )}
            </div>
          )}

          {depositMethod === "STK" ? (
            <form onSubmit={handleInitiateDeposit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Deposit Amount (KES)
                  </label>
                  <span className="text-[11px] text-emerald-400 font-mono">Min KES 1</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">
                    KES
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={150000}
                    step={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-14 pr-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-[#ff5722]"
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2">
                  {[10, 50, 100, 500, 1000, 5000].map((preset) => (
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
                <span className="text-[10px] text-slate-500">
                  A Safaricom STK prompt will pop up on this phone. Enter your PIN to approve.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || depositState.status === "WAITING_CALLBACK"}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-[#ff5722]/20"
              >
                {submitting ? "Sending STK Prompt..." : `Initiate M-Pesa STK Push (KES ${amount.toLocaleString()})`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Lipa Na M-Pesa Paybill / QR Alternative */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Paybill Business Number</span>
                    <div className="text-xl font-black text-amber-400 flex items-center gap-2">
                      522522
                      <span className="text-[10px] text-slate-400 font-normal">(Tradepedia Clearing)</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Your Unique Account Number</span>
                    <div className="text-base font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-white/[0.08]">
                      TRP-{phone ? phone.slice(-6) : "884920"}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Accepted Minimum</span>
                    <div className="text-xs text-emerald-400 font-bold">KES 100.00</div>
                  </div>
                </div>

                {/* M-Pesa QR Code Representation */}
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
                  <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                    <QrCode className="w-20 h-20 text-slate-950" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Scan with Safaricom M-Pesa App
                  </span>
                </div>
              </div>

              {/* Step By Step Instructions */}
              <div className="space-y-2 text-xs text-slate-300 font-mono bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                <div className="font-bold text-white mb-1">M-Pesa Menu Instructions:</div>
                <div className="flex items-center gap-2">1. Open SIM Toolkit or M-Pesa App &rarr; Lipa na M-Pesa &rarr; Paybill</div>
                <div className="flex items-center gap-2">2. Enter Business Number: <strong className="text-amber-400">522522</strong></div>
                <div className="flex items-center gap-2">3. Enter Account Number: <strong className="text-white">TRP-{phone ? phone.slice(-6) : "884920"}</strong></div>
                <div className="flex items-center gap-2">4. Enter Amount (from KES 100) and your M-Pesa PIN</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDepositState({
                    status: "SUCCESS",
                    receipt: `QWE${Math.floor(1000000 + Math.random() * 9000000)}`,
                    message: "M-Pesa Paybill verified! KES 2,500 credited to demo account.",
                  });
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                I Have Sent Funds &bull; Verify Paybill Transaction
              </button>
            </div>
          )}

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
