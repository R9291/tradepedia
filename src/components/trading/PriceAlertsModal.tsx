"use client";

import React, { useState } from "react";
import { Bell, X, Trash2, Plus, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "ABOVE" | "BELOW";
  triggered: boolean;
  createdAt: string;
}

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  currentPrice: number;
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, "id" | "triggered" | "createdAt">) => void;
  onDeleteAlert: (id: string) => void;
}

export function PriceAlertsModal({
  isOpen,
  onClose,
  currentSymbol,
  currentPrice,
  alerts,
  onAddAlert,
  onDeleteAlert,
}: PriceAlertsModalProps) {
  const [targetPrice, setTargetPrice] = useState<string>(currentPrice.toString());
  const [condition, setCondition] = useState<"ABOVE" | "BELOW">("ABOVE");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (!price || isNaN(price)) return;

    onAddAlert({
      symbol: currentSymbol,
      targetPrice: price,
      condition,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0c0d14] border border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff5722] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#ff5722]/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Real-Time Price Alerts
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {currentSymbol} • Spot Rate: {currentPrice}
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

        {/* Create Alert Form */}
        <form onSubmit={handleSubmit} className="p-3.5 rounded-2xl bg-[#121420] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Set Trigger Condition:</span>
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-white/[0.08] text-[10px]">
              <button
                type="button"
                onClick={() => setCondition("ABOVE")}
                className={`px-2 py-1 rounded font-bold ${
                  condition === "ABOVE" ? "bg-[#ff5722] text-white" : "text-slate-400"
                }`}
              >
                Price Rises &ge;
              </button>
              <button
                type="button"
                onClick={() => setCondition("BELOW")}
                className={`px-2 py-1 rounded font-bold ${
                  condition === "BELOW" ? "bg-[#ff5722] text-white" : "text-slate-400"
                }`}
              >
                Price Drops &le;
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-mono block">Target Price</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.0001"
                required
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#ff5722]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-[#ff5722]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Alert
              </button>
            </div>
          </div>
        </form>

        {/* Existing Alerts List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Active Alerts ({alerts.length})
          </span>

          {alerts.length === 0 ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center text-xs text-slate-500 font-mono">
              No active alerts. Add an alert above to get notified instantly.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl bg-[#090a10] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{alert.symbol}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        alert.condition === "ABOVE"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {alert.condition === "ABOVE" ? "≥" : "≤"} {alert.targetPrice}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500">Created: {alert.createdAt}</span>
                </div>

                <div className="flex items-center gap-2">
                  {alert.triggered ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Triggered
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold">Watching</span>
                  )}
                  <button
                    onClick={() => onDeleteAlert(alert.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
