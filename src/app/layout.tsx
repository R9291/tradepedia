import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
export const metadata: Metadata = {
  title: "TRADEPEDIA — Online Forex Trading Platform",
  description: "Advanced Forex Trading Platform for Kenya. Live prices, demo paper trading, strict KYC verification, and M-Pesa STK Push deposits.",
};

export default function RootLayout({
  children,
}: ReadtemplateProps<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}

type ReadtemplateProps<T> = T;
