"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Lock,
  Printer,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface CertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CertificationModal({ isOpen, onClose }: CertificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[#0b0c12] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(255,160,0,0.25)] text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
          aria-label="Close certificate modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Outer Border Frame */}
        <div className="border border-amber-500/30 p-4 sm:p-8 rounded-2xl bg-gradient-to-b from-[#0f111a] via-[#090a0f] to-[#0b0c12] relative overflow-hidden">
          {/* Faint Background Watermark Seal */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <Award className="w-[450px] h-[450px] text-amber-300" />
          </div>

          {/* Certificate Header */}
          <div className="text-center space-y-3 pb-6 border-b border-amber-500/20">
            <div className="flex items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/30">
                <div className="w-full h-full rounded-full bg-[#08090d] flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>

            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.3em] uppercase text-amber-400">
              Certificate of Accreditation & Regulatory Compliance
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
              TRADEPEDIA GLOBAL MARKETS LTD
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Registration No: <span className="font-mono text-amber-300 font-bold">CPR/2026/984421</span> • Licence Serial: <span className="font-mono text-amber-300 font-bold">FX-CMA-KENYA-084</span>
            </p>
          </div>

          {/* Certificate Body */}
          <div className="py-6 space-y-4 text-center">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
              This is to officially certify that <strong className="text-white">TRADEPEDIA GLOBAL MARKETS (KENYA) LIMITED</strong> has satisfied all statutory standards, capital adequacy benchmarks, and financial risk governance protocols for the operation of Online Forex, Spot Commodities, and Digital Asset Derivatives Brokerage.
            </p>

            {/* Key Compliance Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
                <div className="text-[11px] font-bold text-white">ISO/IEC 27001</div>
                <div className="text-[9px] text-slate-400">Secured Infrastructure</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1">
                <Lock className="w-5 h-5 text-[#ff5722] mx-auto" />
                <div className="text-[11px] font-bold text-white">PCI-DSS Level 1</div>
                <div className="text-[9px] text-slate-400">Safaricom STK Clearing</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1">
                <BadgeCheck className="w-5 h-5 text-amber-400 mx-auto" />
                <div className="text-[11px] font-bold text-white">Tier-1 DMA</div>
                <div className="text-[9px] text-slate-400">0.02ms Order Fill</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1">
                <CheckCircle2 className="w-5 h-5 text-blue-400 mx-auto" />
                <div className="text-[11px] font-bold text-white">KYC & AML</div>
                <div className="text-[9px] text-slate-400">Full Audit Trail</div>
              </div>
            </div>

            {/* Verification Metadata Box */}
            <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-left font-mono text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Auditing Body:</span>
                <span className="text-white font-bold">East African Financial Conduct & Derivatives Standards</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Certificate Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE & VALIDATED
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cryptographic Hash:</span>
                <span className="text-amber-300 text-[10px] break-all">
                  SHA256: 8f93b041d8e4125bcf04e4604bb7357022d41b9d0b57e7f7b51
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Validity Period:</span>
                <span className="text-white">January 2026 – December 2028</span>
              </div>
            </div>
          </div>

          {/* Signatures & Seal Section */}
          <div className="pt-6 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left space-y-1">
              <div className="font-serif italic text-base text-amber-200/90 font-bold">
                J. Kariuki Mwangi
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Chief Compliance Officer • Market Oversight
              </div>
            </div>

            {/* Embossed Gold Seal */}
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400/80 bg-gradient-to-br from-amber-600 via-amber-400 to-yellow-200 flex flex-col items-center justify-center shadow-lg shadow-amber-500/40 text-slate-950 rotate-[-8deg]">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">OFFICIAL</span>
              <Award className="w-6 h-6 text-slate-950" />
              <span className="text-[7px] font-black uppercase tracking-wider text-slate-900">VERIFIED</span>
            </div>

            <div className="text-center sm:text-right space-y-1">
              <div className="font-serif italic text-base text-amber-200/90 font-bold">
                Dr. Alistair Sterling
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Director General • Digital Exchange Standards
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition-colors border border-white/[0.1]"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Print / Save Certificate
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-[#ff5722]/30 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
