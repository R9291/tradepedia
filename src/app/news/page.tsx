"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Newspaper,
  Flame,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  BellRing,
  Filter,
  Search,
  ExternalLink,
  Zap,
  Globe,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { MarketNewsItem, INITIAL_MARKET_NEWS } from "@/lib/market-news";

export default function MarketNewsPage() {
  const [news, setNews] = useState<MarketNewsItem[]>(INITIAL_MARKET_NEWS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedImpact, setSelectedImpact] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [latestBreaking, setLatestBreaking] = useState<MarketNewsItem | null>(
    INITIAL_MARKET_NEWS[0] || null
  );

  useEffect(() => {
    fetch(`/api/news?category=${selectedCategory}&impact=${selectedImpact}&search=${encodeURIComponent(searchQuery)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.news) {
          setNews(data.data.news);
          if (data.data.breaking && data.data.breaking.length > 0) {
            setLatestBreaking(data.data.breaking[0]);
          }
        }
      })
      .catch((err) => console.error("Error fetching news:", err));
  }, [selectedCategory, selectedImpact, searchQuery]);

  const categories = [
    { label: "All Markets", value: "ALL" },
    { label: "Stock Market & Equities", value: "STOCKS" },
    { label: "Forex & Currencies", value: "FOREX" },
    { label: "Commodities & Oil", value: "COMMODITIES" },
    { label: "Crypto Assets", value: "CRYPTO" },
    { label: "Macro & Central Banks", value: "MACRO" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5722]/10 border border-[#ff5722]/30 text-[#ff5722] text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#ff5722] animate-pulse" />
            Live Market Catalysts & Breaking Wire
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-[#ff5722]" />
            Stock Market & Financial News
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time macroeconomic alerts, central bank decisions, Wall Street equity catalysts, and market-moving intelligence for Kenyan traders.
          </p>
        </div>

        {/* Live Notification Toggle & Terminal Link */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
              notificationsEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-white/[0.04] border-white/[0.08] text-slate-400"
            }`}
          >
            {notificationsEnabled ? (
              <>
                <BellRing className="w-4 h-4 text-emerald-400 animate-bounce" />
                Breaking Alerts: ON
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-slate-500" />
                Breaking Alerts: OFF
              </>
            )}
          </button>

          <Link
            href="/trade/BTCUSD"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 hover:from-[#f4511e] hover:to-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#ff5722]/20 transition-all"
          >
            <Zap className="w-4 h-4 fill-white" />
            Launch Terminal
          </Link>
        </div>
      </div>

      {/* Breaking News High-Impact Flash Card */}
      {latestBreaking && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#ff5722]/15 via-orange-950/20 to-slate-900 border border-[#ff5722]/40 shadow-2xl relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#ff5722] text-white flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3 fill-white" />
                Breaking Catalyst
              </span>
              <span className="text-xs font-mono text-slate-400">{latestBreaking.timeAgo}</span>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">
              {latestBreaking.category} &bull; {latestBreaking.impact} IMPACT
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white leading-snug">
            {latestBreaking.title}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
            {latestBreaking.summary}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Affected Equities & Assets:</span>
              {latestBreaking.affectedMarkets.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-amber-300 font-mono text-[11px] font-bold"
                >
                  {m}
                </span>
              ))}
            </div>

            <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
              💡 {latestBreaking.actionableInsight}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-white/[0.06]">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === c.value
                  ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                  : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search stocks, Fed, inflation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5722]"
          />
        </div>
      </div>

      {/* News Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-[#090a10] border border-white/[0.08] hover:border-white/[0.2] transition-all flex flex-col justify-between space-y-4 group shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-full font-black uppercase text-[10px] tracking-wider ${
                    item.impact === "CRITICAL"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : item.impact === "HIGH"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  }`}
                >
                  {item.impact} IMPACT
                </span>
                <span className="text-slate-500 font-mono">{item.timeAgo}</span>
              </div>

              <h3 className="font-bold text-white text-sm group-hover:text-[#ff5722] transition-colors leading-snug">
                {item.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                {item.summary}
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              {/* Market Impact & Assets */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                  Affects Stock Markets & Pairs:
                </span>
                <div className="flex flex-wrap gap-1">
                  {item.affectedMarkets.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 font-mono text-[10px]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actionable Insight Box */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-[11px] text-emerald-400 leading-relaxed font-sans">
                <strong className="text-emerald-300">Trader Outlook:</strong> {item.actionableInsight}
              </div>

              {/* Source & Action */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span className="font-mono">{item.source}</span>
                <Link
                  href="/trade/BTCUSD"
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  Trade Assets &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
