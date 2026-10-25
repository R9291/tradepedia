"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TrendingUp,
  Wallet,
  ShieldCheck,
  BarChart3,
  LogOut,
  User,
  Shield,
  Layers,
  ArrowDownCircle,
  Zap,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Globe,
  Calendar,
  Users,
  Award,
} from "lucide-react";

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  kycStatus: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [realBalance, setRealBalance] = useState<number>(0);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    // Initial fetch from localStorage or account summary
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tradepedia_real_balance");
      if (saved) setRealBalance(parseFloat(saved));
    }
    fetch("/api/account/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.data?.realAccount?.availableBalance) {
          const serverBal = parseFloat(res.data.realAccount.availableBalance);
          const localBal = parseFloat(
            (typeof window !== "undefined" && localStorage.getItem("tradepedia_real_balance")) || "0"
          );
          const best = Math.max(serverBal, localBal);
          setRealBalance(best);
          if (typeof window !== "undefined") {
            localStorage.setItem("tradepedia_real_balance", best.toFixed(2));
          }
        }
      })
      .catch(() => {});

    const onBalanceUpdate = (e: any) => {
      if (e.detail?.balance !== undefined) {
        setRealBalance(Number(e.detail.balance));
      } else if (typeof window !== "undefined") {
        const saved = localStorage.getItem("tradepedia_real_balance");
        if (saved) setRealBalance(parseFloat(saved));
      }
    };
    window.addEventListener("tradepedia_balance_updated", onBalanceUpdate);
    window.addEventListener("storage", onBalanceUpdate);
    return () => {
      window.removeEventListener("tradepedia_balance_updated", onBalanceUpdate);
      window.removeEventListener("storage", onBalanceUpdate);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.isAuthenticated && data?.data?.user && !data.data.user.isGuest) {
          setUser(data.data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const primaryLinks = [
    { name: "Terminal", href: "/trade/EURUSD" },
    { name: "Market News", href: "/news" },
    { name: "Markets", href: "/markets" },
    { name: "Deposit", href: "/deposit" },
    { name: "Withdraw", href: "/withdraw" },
  ];

  const moreLinks = [
    { name: "Analytics", href: "/analytics" },
    { name: "Copy Trading", href: "/copy-trading" },
    { name: "Economic Calendar", href: "/calendar" },
    { name: "Certification", href: "/certification" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "KYC Clearance", href: "/kyc" },
  ];

  const allNavLinks = [
    { name: "Terminal", href: "/trade/EURUSD" },
    { name: "Market News", href: "/news" },
    { name: "Markets", href: "/markets" },
    { name: "Deposit", href: "/deposit" },
    { name: "Withdraw", href: "/withdraw" },
    { name: "Analytics", href: "/analytics" },
    { name: "Copy Trading", href: "/copy-trading" },
    { name: "Economic Calendar", href: "/calendar" },
    { name: "Certification", href: "/certification" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "KYC Clearance", href: "/kyc" },
  ];

  const isAdmin = user?.role === "ADMIN" || user?.role === "COMPLIANCE";

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#050608]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#ff5722] via-orange-500 to-amber-400 p-[1px] shadow-lg shadow-[#ff5722]/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#08090d] rounded-[11px] flex items-center justify-center">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff5722] fill-[#ff5722]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base sm:text-lg tracking-tight text-white flex items-center gap-1">
              Tradepedia
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-pulse" />
            </span>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-400 font-mono -mt-1 hidden xs:block">
              Kenya Forex & Crypto
            </span>
          </div>
        </Link>

        {/* Center Floating Pill Navbar for Laptops & Desktops (>= lg) */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] p-1 rounded-full shadow-inner">
          <Link
            href="/"
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              pathname === "/"
                ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            Home
          </Link>

          {primaryLinks.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          {/* More Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              onBlur={() => setTimeout(() => setMoreMenuOpen(false), 200)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                moreLinks.some((l) => pathname.startsWith(l.href))
                  ? "bg-white/[0.1] text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span>Explore</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {moreMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#0b0c12] border border-white/[0.1] rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-1">
                {moreLinks.map((sub) => {
                  const isActive = pathname.startsWith(sub.href);
                  return (
                    <Link
                      key={sub.name}
                      href={sub.href}
                      onClick={() => setMoreMenuOpen(false)}
                      className={`block px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#ff5722] text-white"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      {sub.name}
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link
                    href="/admin/kyc"
                    onClick={() => setMoreMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-all border-t border-white/[0.06] mt-1 pt-1.5"
                  >
                    Admin Portal
                  </Link>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Live Real Balance Pill */}
          <Link
            href="/deposit"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-xs"
            title="TRADEPEDIA Real Balance - Tap to Deposit"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="flex items-center gap-1 font-mono text-[11px] sm:text-xs">
              <span className="text-[9px] sm:text-[10px] text-emerald-400/80 uppercase font-semibold">Real:</span>
              <span className="font-bold text-emerald-300 whitespace-nowrap">
                KES {realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase">
              + Deposit
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/trade/EURUSD"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-[#ff5722]/25 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Launch DTrader</span>
                <span className="md:hidden">Trade</span>
              </Link>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="hidden sm:flex p-1.5 sm:p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-[#ff5722]/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile / Tablet Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#ff5722]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer (Visible on < lg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-white/[0.08] bg-[#08090e]/98 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Quick User Status on Mobile */}
          {user ? (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">{user.fullName}</div>
                <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold flex items-center gap-1 border border-red-500/30"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 rounded-xl bg-white/[0.05] text-center text-xs font-bold text-white border border-white/[0.1]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-500 text-center text-xs font-bold text-white shadow-md shadow-[#ff5722]/30"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                pathname === "/"
                  ? "bg-[#ff5722] text-white border-[#ff5722] shadow-md shadow-[#ff5722]/20"
                  : "bg-white/[0.02] text-slate-300 border-white/[0.06] hover:bg-white/[0.05]"
              }`}
            >
              <span>Home</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </Link>

            {allNavLinks.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-[#ff5722] text-white border-[#ff5722] shadow-md shadow-[#ff5722]/20"
                      : "bg-white/[0.02] text-slate-300 border-white/[0.06] hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0 ml-1" />
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin/kyc"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between bg-amber-500/10 text-amber-300 border-amber-500/30"
              >
                <span>Admin Portal</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            )}
          </div>

          {/* Quick Terminal Launch Button */}
          <Link
            href="/trade/EURUSD"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff5722] via-orange-600 to-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ff5722]/30"
          >
            <Sparkles className="w-4 h-4" />
            Launch Live Trading Terminal
          </Link>
        </div>
      )}
    </header>
  );
}
