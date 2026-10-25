"use client";

import React, { useEffect, useState } from "react";
import { Clock, Globe, Zap, AlertCircle } from "lucide-react";
import { getAllMarketSessions, SessionInfo } from "@/lib/market-hours";

export function MarketSessionsBar() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentTime, setCurrentTime] = useState<{ utc: string; eat: string }>({
    utc: "",
    eat: "",
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setSessions(getAllMarketSessions(now));

      const utcStr = now.toLocaleTimeString("en-GB", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const eatStr = now.toLocaleTimeString("en-GB", {
        timeZone: "Africa/Nairobi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setCurrentTime({ utc: `${utcStr} UTC`, eat: `${eatStr} EAT (Nairobi)` });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = sessions.filter((s) => s.isOpen).length;
  const activeNames = sessions.filter((s) => s.isOpen).map((s) => s.city).join(" & ");

  return (
    <div className="w-full bg-[#090a10] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header with World Clocks */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff5722] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#ff5722]/20">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Global Forex Market Sessions
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeCount > 0 ? `${activeNames} Active` : "Weekend Break"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Forex operates 24/5 from Sunday 22:00 UTC (01:00 EAT) to Friday 22:00 UTC (01:00 EAT). Crypto is 24/7.
            </p>
          </div>
        </div>

        {/* Live Local & UTC Clocks */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[10px]">UTC:</span>
            <span className="font-bold text-white">{currentTime.utc || "--:--:--"}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 flex items-center gap-1.5">
            <span className="text-[10px] text-[#ff5722] font-black">🇰🇪</span>
            <span className="text-slate-400 text-[10px]">KENYA:</span>
            <span className="font-bold text-emerald-400">{currentTime.eat || "--:--:--"}</span>
          </div>
        </div>
      </div>

      {/* 4 Major Financial Sessions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`p-3 rounded-xl border transition-all ${
              session.isOpen
                ? "bg-emerald-500/[0.04] border-emerald-500/30 shadow-sm"
                : "bg-white/[0.02] border-white/[0.05] opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <span>{session.city}</span>
                <span className="text-[9px] font-normal text-slate-400">({session.region})</span>
              </div>
              <span
                className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                  session.isOpen
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {session.isOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>

            {/* Timeframes */}
            <div className="space-y-0.5 text-[10px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>UTC:</span>
                <span className="text-slate-300 font-medium">{session.utcOpen} – {session.utcClose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400/80">EAT (KE):</span>
                <span className="text-amber-300 font-medium">{session.eatOpen} – {session.eatClose}</span>
              </div>
            </div>

            {/* Progress Bar within Session */}
            {session.isOpen && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
                    style={{ width: `${session.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                  <span>Session Elapsed</span>
                  <span>{session.progressPercent}%</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
