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

  const navLinks = [
    { name: "Terminal", href: "/trade/EURUSD" },
    { name: "Markets", href: "/markets" },
    { name: "Analytics", href: "/analytics" },
    { name: "Copy Trading", href: "/copy-trading" },
    { name: "Calendar", href: "/calendar" },
    { name: "Certification", href: "/certification" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "KYC Clearance", href: "/kyc" },
    { name: "M-Pesa Deposit", href: "/deposit" },
  ];

  const isAdmin = user?.role === "ADMIN" || user?.role === "COMPLIANCE";

  return (
    <header className="sticky top-0 z-50 px-4 py-3 bg-[#050608]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff5722] via-orange-500 to-amber-400 p-[1px] shadow-lg shadow-[#ff5722]/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#08090d] rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#ff5722] fill-[#ff5722]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight text-white flex items-center gap-1">
              Tradepedia
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722] animate-pulse" />
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono -mt-1">
              Kenya Forex & Crypto
            </span>
          </div>
        </Link>

        {/* Center Floating Pill Navbar */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] p-1 rounded-full shadow-inner">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              pathname === "/"
                ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            Home
          </Link>

          {navLinks.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin/kyc"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                pathname.startsWith("/admin")
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              Admin Portal
            </Link>
          )}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/trade/EURUSD"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-[#ff5722]/25 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Launch DTrader
              </Link>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="hidden sm:flex p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-[#ff5722]/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#ff5722]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Glassmorphic Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-white/[0.08] bg-[#08090e]/95 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
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

          {/* Mobile Links List */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                pathname === "/"
                  ? "bg-[#ff5722] text-white border-[#ff5722] shadow-md shadow-[#ff5722]/20"
                  : "bg-white/[0.02] text-slate-300 border-white/[0.06] hover:bg-white/[0.05]"
              }`}
            >
              <span>Home</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </Link>

            {navLinks.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-[#ff5722] text-white border-[#ff5722] shadow-md shadow-[#ff5722]/20"
                      : "bg-white/[0.02] text-slate-300 border-white/[0.06] hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{item.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </Link>
              );
            })}
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
