"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  AlertTriangle,
  ArrowRight,
  FileText,
  UserCheck,
  Zap,
  Sparkles,
} from "lucide-react";

export default function KycPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("NOT_SUBMITTED");
  const [documents, setDocuments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [docFileName, setDocFileName] = useState<string | null>(null);
  const [selfieFileName, setSelfieFileName] = useState<string | null>(null);

  const docFileRef = useRef<HTMLInputElement>(null);
  const selfieFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    documentType: "NATIONAL_ID",
    idNumber: "38920145",
    nationality: "Kenyan",
    dateOfBirth: "1998-05-14",
    address: "Kilimani, Nairobi County, Kenya",
    documentUrl: "/uploads/kyc/national_id_sample.jpg",
    selfieUrl: "/uploads/kyc/selfie_sample.jpg",
  });

  const fetchKycStatus = async () => {
    try {
      const res = await fetch("/api/kyc/status");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setKycStatus(data.data.kycStatus);
        setDocuments(data.data.documents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "doc" | "selfie") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === "doc") {
          setDocFileName(file.name);
          setForm((prev) => ({ ...prev, documentUrl: base64 }));
        } else {
          setSelfieFileName(file.name);
          setForm((prev) => ({ ...prev, selfieUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/kyc/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg =
          (data.details && data.details.length > 0 ? data.details.join(" • ") : null) ||
          data.error ||
          "KYC submission failed";
        throw new Error(msg);
      }

      setSuccess("KYC verification documents successfully submitted. Compliance review in progress.");
      await fetchKycStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Demo auto-approve simulation
  const handleInstantDemoApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/demo-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Instant demo approval failed");
      }

      setKycStatus("APPROVED");
      setSuccess("KYC Approved! Welcome demo credits (KES 100,000) have been unlocked.");
      await fetchKycStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(false);
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
    <div className="max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Identity Verification (KYC / AML)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Mandatory compliance onboarding under Kenya Capital Markets (Online Foreign Exchange Trading) Regulations, 2017.
        </p>
      </div>

      {/* Status Cards */}
      {kycStatus === "APPROVED" && (
        <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">KYC Verification Approved</h2>
              <p className="text-xs text-emerald-300/90">
                Your identity has been authenticated. You have full clearance for trading and M-Pesa deposits.
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => router.push("/trade/EURUSD")}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-colors"
            >
              Start Trading Now (EUR/USD)
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/deposit")}
              className="px-4 py-2 rounded-lg bg-emerald-600/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 hover:bg-emerald-600/50 transition-colors"
            >
              Deposit Funds via M-Pesa
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {kycStatus === "PENDING" && (
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-white">KYC Review in Progress</h2>
              <p className="text-xs text-amber-300/90">
                Your identity documents have been submitted and are undergoing compliance review. Deposits and trading will remain locked until verified.
              </p>
            </div>
          </div>

          {/* Sandbox Fast-Approve Helper */}
          <div className="pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <strong className="text-amber-300">Demo Testing Mode:</strong> You can fast-approve this submission immediately to unlock paper trading credits.
            </div>
            <button
              type="button"
              onClick={handleInstantDemoApprove}
              disabled={approving}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-colors shadow-lg shadow-emerald-500/10"
            >
              <Zap className="w-4 h-4" />
              {approving ? "Approving..." : "Instant Demo Approval (1-Click)"}
            </button>
          </div>
        </div>
      )}

      {kycStatus === "REJECTED" && (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-3">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <div>
              <h2 className="text-lg font-bold text-white">KYC Application Rejected</h2>
              <p className="text-xs text-red-300/90">
                Your submission did not meet regulatory standards. Please review the note below and resubmit clear documents.
              </p>
            </div>
          </div>
          {documents[0]?.reviewerNote && (
            <div className="p-3 bg-red-950/40 rounded border border-red-800 text-xs">
              <strong>Reviewer Note:</strong> {documents[0].reviewerNote}
            </div>
          )}
        </div>
      )}

      {/* Submission Form (Shown when NOT_SUBMITTED or REJECTED) */}
      {(kycStatus === "NOT_SUBMITTED" || kycStatus === "REJECTED") && (
        <div className="space-y-6">
          {/* Fast-Track Demo Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Fast-Track Demo Verification</span>
              </div>
              <p className="text-xs text-slate-300">
                Skip document uploads and instantly activate full trading privileges with simulated <strong>KES 100,000</strong> demo funds.
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstantDemoApprove}
              disabled={approving}
              className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-colors shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              {approving ? "Activating..." : "Instant Demo Approval (1-Click)"}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">
                {kycStatus === "REJECTED" ? "Resubmit KYC Information" : "Standard KYC Document Submission"}
              </h2>
              <p className="text-xs text-slate-400">
                Provide government-issued credentials to activate your trading account according to CMA guidelines.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Document Type
                  </label>
                  <select
                    value={form.documentType}
                    onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NATIONAL_ID">Kenyan National ID Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="ALIEN_CARD">Alien ID / Work Permit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ID / Passport Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 38920145"
                    value={form.idNumber}
                    onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Residential Address (County / Sub-county / Estate)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kilimani, Nairobi County, Kenya"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Document and Biometric Upload Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <input
                  type="file"
                  ref={docFileRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, "doc")}
                />
                <div
                  onClick={() => docFileRef.current?.click()}
                  className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg p-4 text-center space-y-2 bg-slate-950 cursor-pointer transition-colors"
                >
                  <FileText className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="text-xs font-semibold text-slate-200">
                    {docFileName ? docFileName : "ID / Passport Document"}
                  </div>
                  <div className="text-[10px] text-slate-400">Click to upload file (or keep default sample)</div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    {docFileName ? "✓ File Selected" : "[Verified Sample Attached]"}
                  </div>
                </div>

                <input
                  type="file"
                  ref={selfieFileRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "selfie")}
                />
                <div
                  onClick={() => selfieFileRef.current?.click()}
                  className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg p-4 text-center space-y-2 bg-slate-950 cursor-pointer transition-colors"
                >
                  <UserCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="text-xs font-semibold text-slate-200">
                    {selfieFileName ? selfieFileName : "Biometric Live Selfie"}
                  </div>
                  <div className="text-[10px] text-slate-400">Click to upload photo (or keep default sample)</div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    {selfieFileName ? "✓ Photo Selected" : "[Biometric Check Ready]"}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors border border-slate-700"
              >
                {submitting ? "Submitting for Review..." : "Submit KYC Application"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
