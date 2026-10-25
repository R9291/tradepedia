"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { User, ShieldCheck, Mail, Phone, Lock, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.user) {
          setUser(data.data.user);
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

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-400">
        Please sign in to access settings.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-emerald-400" />
          Account Profile & Security Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review your registered credentials, verified contact channels, and KYC status.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
          Personal Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Full Legal Name:</span>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-semibold text-white">
              {user.fullName}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Platform Role:</span>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-semibold text-emerald-400">
              {user.role}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Email Address:</span>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-slate-200 flex items-center justify-between">
              <span>{user.email}</span>
              {user.emailVerified ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="text-[10px] text-amber-400">Pending</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">M-Pesa Mobile Number:</span>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-slate-200">
              {user.phone}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white">KYC Verification State</h3>
            <p className="text-[11px] text-slate-400">Required for live deposits and forex execution.</p>
          </div>

          <Link
            href="/kyc"
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            Review KYC &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
