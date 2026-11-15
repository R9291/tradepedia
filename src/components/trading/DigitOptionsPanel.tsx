"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dice5, TrendingUp, TrendingDown, CheckCircle2, XCircle, Clock } from "lucide-react";

export type DigitCategory = "MATCHES_DIFFERS" | "EVEN_ODD" | "OVER_UNDER";
export type DigitContractType = "MATCHES" | "DIFFERS" | "EVEN" | "ODD" | "OVER" | "UNDER";

export interface DigitContractRecord {
  id: string;
  symbol: string;
  contractType: DigitContractType;
  predictionDigit?: number;
  ticksTotal: number;
  ticksRemaining: number;
  stakeUsd: number;
  payoutUsd: number;
  entryPrice: string;
  exitPrice?: string;
  exitDigit?: number;
  status: "ACTIVE" | "WON" | "LOST";
  createdAt: string;
}

interface DigitOptionsPanelProps {
  symbol: string;
  livePrice: string;
  accountType: "DEMO" | "REAL";
  availableBalance: number;
  onBalanceChange: (newBalance: number) => void;
}

export function extractLastDigit(priceStr: string): number {
  const digits = priceStr.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits[digits.length - 1]);
}

export function computeDigitPayoutMultiplier(
  contractType: DigitContractType,
  predictionDigit: number
): number {
  switch (contractType) {
    case "MATCHES":
      return 9.0; // 10% probability -> ~9.0x payout
    case "DIFFERS":
      return 1.09; // 90% probability -> ~1.09x payout
    case "EVEN":
    case "ODD":
      return 1.95; // 50% probability -> ~1.95x payout
    case "OVER": {
      const winCount = 9 - predictionDigit;
      if (winCount <= 0) return 0;
      return Number((0.95 / (winCount / 10)).toFixed(2));
    }
    case "UNDER": {
      const winCount = predictionDigit;
      if (winCount <= 0) return 0;
      return Number((0.95 / (winCount / 10)).toFixed(2));
    }
  }
}

function evaluateDigitWin(
  contractType: DigitContractType,
  exitDigit: number,
  predictionDigit?: number
): boolean {
  switch (contractType) {
    case "MATCHES":
      return exitDigit === predictionDigit;
    case "DIFFERS":
      return exitDigit !== predictionDigit;
    case "EVEN":
      return exitDigit % 2 === 0;
    case "ODD":
      return exitDigit % 2 !== 0;
    case "OVER":
      return predictionDigit !== undefined && exitDigit > predictionDigit;
    case "UNDER":
      return predictionDigit !== undefined && exitDigit < predictionDigit;
  }
}

export function DigitOptionsPanel({
  symbol,
  livePrice,
  accountType,
  availableBalance,
  onBalanceChange,
}: DigitOptionsPanelProps) {
  const [category, setCategory] = useState<DigitCategory>("MATCHES_DIFFERS");
  const [predictionDigit, setPredictionDigit] = useState<number>(4);
  const [ticks, setTicks] = useState<number>(5);
  const [stakeUsd, setStakeUsd] = useState<number>(5);
  const [digitHistory, setDigitHistory] = useState<number[]>([]);
  const [contracts, setContracts] = useState<DigitContractRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastPriceRef = useRef<string>("");
  const balanceRef = useRef<number>(availableBalance);
  balanceRef.current = availableBalance;

  const currentDigit = extractLastDigit(livePrice);

  // Track tick stream for digit distribution & active contract countdown
  useEffect(() => {
    if (!livePrice || livePrice === "0" || livePrice === lastPriceRef.current) return;
    lastPriceRef.current = livePrice;

    const digit = extractLastDigit(livePrice);
    setDigitHistory((prev) => [...prev.slice(-49), digit]);

    setContracts((prev) =>
      prev.map((c) => {
        if (c.status !== "ACTIVE") return c;
        const remaining = c.ticksRemaining - 1;
        if (remaining > 0) {
          return { ...c, ticksRemaining: remaining };
        }

        const won = evaluateDigitWin(c.contractType, digit, c.predictionDigit);
        const finalStatus = won ? "WON" : "LOST";
        const credit = won ? c.payoutUsd : 0;
        if (credit > 0) {
          onBalanceChange(Number((balanceRef.current + credit).toFixed(2)));
        }

        // Persist settlement to backend audit/ledger
        fetch("/api/options/digit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: c.symbol,
            category,
            contractType: c.contractType,
            predictionDigit: c.predictionDigit,
            ticks: c.ticksTotal,
            stakeUsd: c.stakeUsd,
            payoutUsd: c.payoutUsd,
            entryPrice: c.entryPrice,
            exitPrice: livePrice,
            exitDigit: digit,
            won,
            accountType,
          }),
        }).catch(() => {});

        return {
          ...c,
          ticksRemaining: 0,
          exitPrice: livePrice,
          exitDigit: digit,
          status: finalStatus,
        };
      })
    );
  }, [livePrice, accountType, category, onBalanceChange]);

  const digitPercentages = useMemo(() => {
    const counts = Array(10).fill(0);
    for (const d of digitHistory) counts[d] += 1;
    const total = digitHistory.length || 1;
    return counts.map((c) => Math.round((c / total) * 100));
  }, [digitHistory]);

  const placeContract = (contractType: DigitContractType) => {
    setErrorMsg(null);
    if (stakeUsd < 0.35) {
      setErrorMsg("Minimum digit option stake is $0.35 USD.");
      return;
    }
    if (stakeUsd > availableBalance) {
      setErrorMsg(`Insufficient ${accountType} balance ($${availableBalance.toFixed(2)} USD available).`);
      return;
    }

    const mult = computeDigitPayoutMultiplier(contractType, predictionDigit);
    if (mult <= 0) {
      setErrorMsg("Selected digit barrier has 0% win probability for this direction.");
      return;
    }

    const payoutUsd = Number((stakeUsd * mult).toFixed(2));
    onBalanceChange(Number((availableBalance - stakeUsd).toFixed(2)));

    const newContract: DigitContractRecord = {
      id: `dig_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      symbol,
      contractType,
      predictionDigit:
        contractType === "EVEN" || contractType === "ODD" ? undefined : predictionDigit,
      ticksTotal: ticks,
      ticksRemaining: ticks,
      stakeUsd,
      payoutUsd,
      entryPrice: livePrice,
      status: "ACTIVE",
      createdAt: new Date().toLocaleTimeString(),
    };

    setContracts((prev) => [newContract, ...prev].slice(0, 15));
  };

  const renderDigitBadge = () => {
    if (!livePrice) return null;
    const prefix = livePrice.slice(0, -1);
    const last = livePrice.slice(-1);
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-white/[0.08]">
        <span className="text-[11px] text-slate-400 font-semibold">Live Spot & Last Digit</span>
        <div className="font-mono text-sm font-bold text-slate-200">
          {prefix}
          <span className="ml-0.5 px-1.5 py-0.5 rounded bg-[#ff5722] text-white font-black">
            {last}
          </span>
        </div>
      </div>
    );
  };

  const primaryActions: { type: DigitContractType; label: string; color: string }[] =
    category === "MATCHES_DIFFERS"
      ? [
          { type: "MATCHES", label: "Matches", color: "bg-emerald-600 hover:bg-emerald-500" },
          { type: "DIFFERS", label: "Differs", color: "bg-rose-600 hover:bg-rose-500" },
        ]
      : category === "EVEN_ODD"
      ? [
          { type: "EVEN", label: "Even", color: "bg-emerald-600 hover:bg-emerald-500" },
          { type: "ODD", label: "Odd", color: "bg-rose-600 hover:bg-rose-500" },
        ]
      : [
          { type: "OVER", label: `Over ${predictionDigit}`, color: "bg-emerald-600 hover:bg-emerald-500" },
          { type: "UNDER", label: `Under ${predictionDigit}`, color: "bg-rose-600 hover:bg-rose-500" },
        ];

  return (
    <div className="space-y-3 text-xs">
      {/* Category Selector */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-white/[0.08]">
        {[
          { id: "MATCHES_DIFFERS", label: "Matches/Differs" },
          { id: "EVEN_ODD", label: "Even/Odd" },
          { id: "OVER_UNDER", label: "Over/Under" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id as DigitCategory)}
            className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
              category === tab.id
                ? "bg-[#ff5722] text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderDigitBadge()}

      {/* Digit 0-9 Picker & Live Frequency */}
      {category !== "EVEN_ODD" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Dice5 className="w-3.5 h-3.5 text-[#ff5722]" />
              Last Digit Prediction ({predictionDigit})
            </span>
            <span className="font-mono text-[10px]">Last {digitHistory.length} ticks</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPredictionDigit(d)}
                className={`py-1.5 rounded-lg border font-mono transition-all flex flex-col items-center ${
                  predictionDigit === d
                    ? "bg-[#ff5722]/20 border-[#ff5722] text-white"
                    : d === currentDigit
                    ? "bg-slate-900 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                <span className="font-bold text-xs">{d}</span>
                <span className="text-[9px] text-slate-400">{digitPercentages[d]}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tick Duration */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-slate-300">Duration (Ticks)</label>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 5, 10].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTicks(t)}
              className={`py-1.5 rounded-lg font-mono font-bold border transition-all ${
                ticks === t
                  ? "bg-white text-slate-950 border-white"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {t}t
            </button>
          ))}
        </div>
      </div>

      {/* Stake Input (USD) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <label className="font-semibold text-slate-300">Stake (USD)</label>
          <span className="text-slate-400 font-mono">Min $0.35</span>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">$</span>
          <input
            type="number"
            min={0.35}
            max={10000}
            step={0.5}
            value={stakeUsd}
            onChange={(e) => setStakeUsd(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-[#ff5722]"
          />
        </div>
        <div className="grid grid-cols-5 gap-1 pt-1">
          {[1, 5, 10, 25, 50].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setStakeUsd(amt)}
              className={`py-1 rounded text-[10px] font-mono font-bold border ${
                stakeUsd === amt
                  ? "bg-[#ff5722] text-white border-[#ff5722]"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
          {errorMsg}
        </div>
      )}

      {/* Buy Contract Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {primaryActions.map((act, idx) => {
          const mult = computeDigitPayoutMultiplier(act.type, predictionDigit);
          const payout = (stakeUsd * mult).toFixed(2);
          return (
            <button
              key={act.type}
              type="button"
              disabled={mult <= 0}
              onClick={() => placeContract(act.type)}
              className={`p-2.5 rounded-xl text-white font-bold transition-all disabled:opacity-40 flex flex-col items-start gap-0.5 ${act.color}`}
            >
              <span className="flex items-center gap-1 text-xs">
                {idx === 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {act.label}
              </span>
              <span className="text-[10px] font-mono opacity-90">
                Payout: ${payout} ({mult}x)
              </span>
            </button>
          );
        })}
      </div>

      {/* Active & Recent Digit Contracts */}
      {contracts.length > 0 && (
        <div className="pt-2 border-t border-white/[0.08] space-y-1.5 max-h-48 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Digit Contracts
          </div>
          {contracts.map((c) => (
            <div
              key={c.id}
              className="px-2.5 py-2 rounded-lg bg-slate-950 border border-white/[0.06] flex items-center justify-between text-[11px] font-mono"
            >
              <div>
                <div className="font-bold text-white">
                  {c.contractType}
                  {c.predictionDigit !== undefined ? ` ${c.predictionDigit}` : ""} • {c.symbol}
                </div>
                <div className="text-[10px] text-slate-400">
                  Stake ${c.stakeUsd.toFixed(2)} &rarr; ${c.payoutUsd.toFixed(2)}
                  {c.exitDigit !== undefined ? ` • Exit: ${c.exitDigit}` : ""}
                </div>
              </div>
              <div>
                {c.status === "ACTIVE" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                    <Clock className="w-3 h-3 animate-spin" />
                    {c.ticksRemaining}t
                  </span>
                ) : c.status === "WON" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    +${(c.payoutUsd - c.stakeUsd).toFixed(2)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-bold">
                    <XCircle className="w-3 h-3" />
                    -${c.stakeUsd.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
