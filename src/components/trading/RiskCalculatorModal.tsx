"use client";

import React, { useState } from "react";
import { Calculator, X, Shield, ArrowRight, DollarSign, Info } from "lucide-react";

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
}

export function RiskCalculatorModal({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
}: RiskCalculatorModalProps) {
  const [balanceKes, setBalanceKes] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [stopLossPips, setStopLossPips] = useState<number>(25);
  const [customLeverage, setCustomLeverage] = useState<number>(100);

  if (!isOpen) return null;

  // Pip value & lot calculation
  const isCrypto = currentSymbol.includes("BTC") || currentSymbol.includes("ETH") || currentSymbol.includes("SOL");
  const contractSize = isCrypto ? 1 : 100000;
  const pipMultiplier = currentPrice > 1000 ? 1 : 0.0001;

  // Max KES to risk
  const maxRiskKes = (balanceKes * riskPercent) / 100;
  const maxRiskUsd = maxRiskKes / 129.5;

  // Risk per lot in USD = stopLossPips * pipMultiplier * contractSize
  const riskPerLotUsd = Math.max(0.01, stopLossPips * pipMultiplier * contractSize);
  const recommendedLots = Math.max(0.01, Math.min(10, parseFloat((maxRiskUsd / riskPerLotUsd).toFixed(2))));

  // Pip value in KES for recommended lot size
  const pipValueUsd = recommendedLots * pipMultiplier * contractSize;
  const pipValueKes = (pipValueUsd * 129.5).toFixed(2);

  // Required Margin in KES
  const notionalUsd = (recommendedLots * contractSize * currentPrice) / customLeverage;
  const marginRequiredKes = (notionalUsd * 129.5).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#0c0d14] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff5722] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#ff5722]/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Forex & Crypto Risk Calculator
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentSymbol} @ {currentPrice} • 1:{customLeverage} Leverage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Account Balance (KES)</label>
            <input
              type="number"
              value={balanceKes}
              onChange={(e) => setBalanceKes(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ff5722]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Risk Per Trade (%)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 5].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPercent(pct)}
                  className={`flex-1 py-2 rounded-xl font-mono font-bold border transition-all ${
                    riskPercent === pct
                      ? "bg-[#ff5722] text-white border-[#ff5722]"
                      : "bg-slate-950 text-slate-400 border-white/[0.08]"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Stop Loss Distance (Pips)</label>
            <input
              type="number"
              min="1"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ff5722]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-semibold">Leverage Ratio</label>
            <select
              value={customLeverage}
              onChange={(e) => setCustomLeverage(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ff5722]"
            >
              <option value="10">1:10 (Conservative)</option>
              <option value="50">1:50 (Standard)</option>
              <option value="100">1:100 (Professional)</option>
            </select>
          </div>
        </div>

        {/* Calculated Results Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121420] to-[#0a0b12] border border-amber-500/25 space-y-3 font-mono text-xs">
          <div className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
            Risk & Position Size Matrix
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
              <span className="text-[10px] text-slate-400">Recommended Lot Size</span>
              <div className="text-base font-extrabold text-[#089981]">{recommendedLots} Lots</div>
              <span className="text-[9px] text-slate-500">Safeguards capital at {riskPercent}%</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
              <span className="text-[10px] text-slate-400">Max Risk Amount</span>
              <div className="text-base font-extrabold text-[#f23645]">
                KES {maxRiskKes.toLocaleString()}
              </div>
              <span className="text-[9px] text-slate-500">Approx. ${(maxRiskUsd).toFixed(2)} USD</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
              <span className="text-[10px] text-slate-400">Pip Value (Per Pip)</span>
              <div className="text-sm font-bold text-white">KES {pipValueKes}</div>
              <span className="text-[9px] text-slate-500">${pipValueUsd.toFixed(2)} / pip</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-0.5">
              <span className="text-[10px] text-slate-400">Required Margin</span>
              <div className="text-sm font-bold text-amber-300">KES {marginRequiredKes}</div>
              <span className="text-[9px] text-slate-500">Collateral at 1:{customLeverage}</span>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-[#ff5722]/20 transition-all"
        >
          Apply & Return to Terminal
        </button>
      </div>
    </div>
  );
}
