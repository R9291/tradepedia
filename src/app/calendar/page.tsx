"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Filter,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Globe,
  Zap,
  CheckCircle2,
  BellRing,
} from "lucide-react";
import { ECONOMIC_EVENTS, EconomicEvent } from "@/lib/economic-calendar";

export default function EconomicCalendarPage() {
  const [filterImpact, setFilterImpact] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");
  const [filterCurrency, setFilterCurrency] = useState<string>("ALL");
  const [timeZoneDisplay, setTimeZoneDisplay] = useState<"EAT" | "UTC">("EAT");

  const currencies = ["ALL", "USD", "EUR", "GBP", "KES", "AUD"];

  const filteredEvents = ECONOMIC_EVENTS.filter((evt) => {
    const matchImpact = filterImpact === "ALL" || evt.impact === filterImpact;
    const matchCurrency = filterCurrency === "ALL" || evt.currency === filterCurrency;
    return matchImpact && matchCurrency;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#050608] text-slate-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5722]/10 border border-[#ff5722]/25 text-[#ff5722] text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            Institutional Macro Calendar
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Economic Calendar & Volatility Events
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time macroeconomic announcements driving global Forex, Gold, and USDKES liquidity with instant impact ratings.
          </p>
        </div>

        {/* Timezone Switcher Pill */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-white/[0.08] text-xs font-mono">
          <button
            onClick={() => setTimeZoneDisplay("EAT")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              timeZoneDisplay === "EAT"
                ? "bg-[#ff5722] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🇰🇪 Nairobi (EAT)
          </button>
          <button
            onClick={() => setTimeZoneDisplay("UTC")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              timeZoneDisplay === "UTC"
                ? "bg-[#ff5722] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🌐 UTC (Universal)
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090a10] border border-white/[0.08] p-3 rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Currency:
          </span>
          {currencies.map((curr) => (
            <button
              key={curr}
              onClick={() => setFilterCurrency(curr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filterCurrency === curr
                  ? "bg-white/[0.1] text-white border border-white/[0.2]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Impact:</span>
          <button
            onClick={() => setFilterImpact("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              filterImpact === "ALL" ? "bg-[#ff5722] text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterImpact("HIGH")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              filterImpact === "HIGH"
                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                : "text-red-400 hover:bg-red-500/10"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            High Impact Only
          </button>
        </div>
      </div>

      {/* Economic Events Table */}
      <div className="bg-[#090a10] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0c0d14] text-slate-400 border-b border-white/[0.06]">
              <tr>
                <th className="px-5 py-3.5">Time</th>
                <th className="px-5 py-3.5">Cur</th>
                <th className="px-5 py-3.5 text-center">Impact</th>
                <th className="px-5 py-3.5">Event Description</th>
                <th className="px-5 py-3.5 text-right">Actual</th>
                <th className="px-5 py-3.5 text-right">Forecast</th>
                <th className="px-5 py-3.5 text-right">Previous</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-slate-200">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap text-white font-bold">
                    {timeZoneDisplay === "EAT" ? evt.timeEat : evt.timeUtc}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span>{evt.flag}</span>
                      <span>{evt.currency}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.impact === "HIGH"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {evt.impact}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-sans font-bold text-white text-xs">{evt.title}</div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">{evt.implication}</div>
                  </td>
                  <td className="px-5 py-4 text-right font-bold whitespace-nowrap">
                    {evt.actual ? (
                      <span className="text-emerald-400">{evt.actual}</span>
                    ) : (
                      <span className="text-slate-500 italic">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-300 whitespace-nowrap">
                    {evt.forecast}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-400 whitespace-nowrap">
                    {evt.previous}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <Link
                      href={`/trade/${evt.currency === "KES" ? "USDKES" : evt.currency === "EUR" ? "EURUSD" : evt.currency === "GBP" ? "GBPUSD" : "EURUSD"}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Trade
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
