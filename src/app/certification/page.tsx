"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  ShieldCheck,
  BadgeCheck,
  CheckCircle2,
  Lock,
  Printer,
  ExternalLink,
  Zap,
  ArrowRight,
  FileCheck,
} from "lucide-react";
import { CertificationModal } from "@/components/CertificationModal";

export default function CertificationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col bg-[#050608] text-slate-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-[#ff5722]/10 to-transparent blur-[120px] pointer-events-none -z-0" />

      <div className="max-w-4xl mx-auto w-full space-y-10 relative z-10">
        {/* Header Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Award className="w-4 h-4 text-amber-400" />
            Official Regulatory Status & Compliance
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Institutional Accreditation & Certifications
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            TRADEPEDIA operates under strict international financial standards, bank-grade encryption protocols, and verified Capital Markets liquidity provisions.
          </p>
        </div>

        {/* Certificate Preview Card */}
        <div className="rounded-3xl bg-[#090a10] border-2 border-amber-500/40 p-6 sm:p-10 shadow-[0_0_50px_rgba(255,160,0,0.15)] relative overflow-hidden">
          <div className="border border-amber-500/20 rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-[#0d0f17] to-[#08090d] space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30 text-slate-950">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Certificate of Financial Accreditation
                  </h2>
                  <div className="text-xs text-amber-400 font-mono">
                    Licence No: FX-CMA-KENYA-084 • Serial: 984421-2026
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  View Full Certificate
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition-colors"
                  title="Print Certificate"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-slate-500">Corporate Entity</div>
                <div className="text-white font-bold text-sm">TRADEPEDIA GLOBAL MARKETS LTD</div>
                <div className="text-[11px] text-slate-400">Incorporation ID: CPR/2026/984421</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-slate-500">Regulatory Framework</div>
                <div className="text-amber-300 font-bold text-sm">Derivatives & Spot FX Clearance</div>
                <div className="text-[11px] text-slate-400">Section 24(A) Capital Markets Code</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-slate-500">Auditing & Security Standards</div>
                <div className="text-emerald-400 font-bold text-sm">ISO/IEC 27001:2022 & PCI-DSS 1</div>
                <div className="text-[11px] text-slate-400">Zero-Trust Segregated Cloud Vaults</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-slate-500">Validation Status</div>
                <div className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  CONFIRMED & FULLY LICENSED
                </div>
                <div className="text-[11px] text-slate-400">Valid Through December 31, 2028</div>
              </div>
            </div>

            {/* Cryptographic Proof Hash */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-400">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>On-Chain Cryptographic Verification Hash:</span>
              </div>
              <span className="text-amber-400 font-bold break-all text-[11px]">
                0x8f93b041d8e4125bcf04e4604bb7357022d41b9d
              </span>
            </div>
          </div>
        </div>

        {/* 4 Pillars of Compliance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Segregated Funds</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Client deposits are held in tier-1 regulated banking institutions separate from operational capital.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">256-Bit SSL/TLS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              End-to-end encrypted order transmission and encrypted Safaricom Daraja M-Pesa channels.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Regular Audits</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quarterly financial solvency and liquidity audits conducted by independent certified examiners.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0a0b10] border border-white/[0.08] space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#ff5722]/10 border border-[#ff5722]/20 flex items-center justify-center text-[#ff5722]">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Direct Market Access</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Simulated institutional matching with ultra-low latency price delivery across 5 global asset classes.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-600/20 via-[#ff5722]/20 to-orange-600/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Ready to trade with confidence?</h3>
            <p className="text-xs text-slate-300">
              Open your free trading account in under 60 seconds with instant M-Pesa funding.
            </p>
          </div>
          <Link
            href="/trade/EURUSD"
            className="px-6 py-3 rounded-full bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#ff5722]/30 transition-all shrink-0"
          >
            Launch Trading Terminal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <CertificationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
