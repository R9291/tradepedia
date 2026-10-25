import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
export const metadata: Metadata = {
  title: "TRADEPEDIA — Online Forex & Derivatives Trading",
  description: "Advanced Forex & Derivatives Trading Platform for Kenya. Live prices, demo paper trading, and instant M-Pesa STK Push deposits.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: ReadtemplateProps<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}

type ReadtemplateProps<T> = T;
