"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ArrowDownCircle,
  Clock,
  Sliders,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    pendingKyc: 0,
    approvedKyc: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.users) {
          const users = data.data.users;
          setStats({
            totalUsers: users.length,
            pendingKyc: users.filter((u: any) => u.kycStatus === "PENDING").length,
            approvedKyc: users.filter((u: any) => u.kycStatus === "APPROVED").length,
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const adminModules = [
    {
      title: "KYC Compliance Queue",
      count: stats.pendingKyc,
      badge: `${stats.pendingKyc} pending review`,
      desc: "Inspect identity documents, approve or reject trader KYC submissions with audit notes.",
      href: "/admin/kyc",
      icon: CheckCircle2,
      color: "text-emerald-400",
      urgent: stats.pendingKyc > 0,
    },
    {
      title: "User Directory & Adjustments",
      count: stats.totalUsers,
      badge: `${stats.totalUsers} registered`,
      desc: "View customer profiles, accounts, balances, and perform manual adjustments with mandatory audit reason.",
      href: "/admin/users",
      icon: Users,
      color: "text-indigo-400",
    },
    {
      title: "M-Pesa Deposits & Reconciliation",
      count: 0,
      badge: "Safaricom Daraja",
      desc: "Monitor STK Push transactions, verify receipts, and reconcile pending payments.",
      href: "/admin/deposits",
      icon: ArrowDownCircle,
      color: "text-amber-400",
    },
    {
      title: "Trading Risk & Exposure Monitor",
      count: 0,
      badge: "Market Engine",
      desc: "Live currency pair open trades, platform exposure, and margin call thresholds.",
      href: "/admin/trades",
      icon: TrendingUp,
      color: "text-purple-400",
    },
    {
      title: "Security & Action Audit Logs",
      count: null,
      badge: "Immutable Trail",
      desc: "Comprehensive log of all administrative actions, logins, reviews, and adjustments.",
      href: "/admin/audit-log",
      icon: Clock,
      color: "text-slate-300",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-400" />
          Tradepedia Regulatory & Administrative Control Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Compliance oversight under Kenya CMA regulations, double-entry ledger reconciliation, and risk parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.title}
              href={m.href}
              className={`p-6 rounded-xl bg-slate-900 border transition-all flex flex-col justify-between space-y-4 hover:border-purple-500/50 group ${
                m.urgent ? "border-amber-500/50 bg-amber-950/10" : "border-slate-800"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {m.badge}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    {m.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                </div>
              </div>

              <div className="flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                <span>Manage Module</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
