"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ArrowLeft,
  FileText,
  UserCheck,
  AlertCircle,
  Eye,
} from "lucide-react";

export default function AdminKycReviewPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [reviewerNote, setReviewerNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSubmissions = async () => {
    try {
      const res = await fetch("/api/admin/kyc");
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.data.submissions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!selectedUser) return;
    if (!reviewerNote || reviewerNote.trim().length < 3) {
      setActionError("A descriptive reviewer note is mandatory before rendering a KYC decision.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          decision,
          reviewerNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process KYC review");
      }

      setSuccessMsg(`User KYC marked as ${decision}.`);
      setSelectedUser(null);
      setReviewerNote("");
      await loadSubmissions();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
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
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            KYC Compliance Verification Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review submitted government IDs, address details, and biometric selfies against Kenya CMA / AML regulations.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
          {submissions.length} Pending Submission(s)
        </span>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          {successMsg}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h2 className="text-sm font-bold text-white">All KYC Submissions Cleared</h2>
          <p className="text-xs text-slate-400">
            There are currently no trader KYC applications waiting in the compliance queue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-2 space-y-4">
            {submissions.map((user) => {
              const mainDoc = user.kycDocuments?.find((d: any) => d.documentType !== "SELFIE") || {};
              const isSelected = selectedUser?.id === user.id;

              return (
                <div
                  key={user.id}
                  className={`p-5 rounded-xl bg-slate-900 border transition-all space-y-4 cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-slate-900/90 shadow-lg shadow-emerald-500/5"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                  onClick={() => {
                    setSelectedUser(user);
                    setActionError(null);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{user.fullName}</h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {user.email} &bull; {user.phone}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      PENDING REVIEW
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block">ID Document:</span>
                      <span className="font-semibold text-slate-200">
                        {mainDoc.documentType || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ID Number:</span>
                      <span className="font-semibold text-slate-200 font-mono">
                        {mainDoc.idNumber || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nationality:</span>
                      <span className="font-semibold text-slate-200">
                        {mainDoc.nationality || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date of Birth:</span>
                      <span className="font-semibold text-slate-200">
                        {mainDoc.dateOfBirth
                          ? new Date(mainDoc.dateOfBirth).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  {mainDoc.address && (
                    <div className="text-[11px] text-slate-400">
                      <strong className="text-slate-300">Address:</strong> {mainDoc.address}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-500">
                      Submitted: {new Date(user.createdAt).toLocaleString()}
                    </span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Inspect & Decide &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action / Review Panel */}
          <div className="lg:col-span-1">
            {selectedUser ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 sticky top-20">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white">Render Compliance Decision</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    For: <strong className="text-slate-200">{selectedUser.fullName}</strong>
                  </div>
                </div>

                {actionError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {actionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reviewer Audit Note (Mandatory)
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter compliance verification findings or reason for rejection..."
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Logged permanently into immutable audit trail.
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleDecision("APPROVED")}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve KYC & Grant Trading Access
                  </button>

                  <button
                    onClick={() => handleDecision("REJECTED")}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    Reject KYC Application
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400 space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Select a KYC submission from the queue to view details and render a decision.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
