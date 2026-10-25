export interface EconomicEvent {
  id: string;
  timeUtc: string;
  timeEat: string;
  currency: string;
  flag: string;
  title: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  forecast: string;
  previous: string;
  actual?: string;
  status: "UPCOMING" | "RELEASED";
  implication: string;
}

export const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: "evt_1",
    timeUtc: "12:30 UTC",
    timeEat: "15:30 EAT",
    currency: "USD",
    flag: "🇺🇸",
    title: "US Core Consumer Price Index (CPI) (MoM)",
    impact: "HIGH",
    forecast: "+0.3%",
    previous: "+0.3%",
    actual: "+0.3%",
    status: "RELEASED",
    implication: "High volatility on EURUSD & USDJPY. In-line print maintains Fed rate easing trajectory.",
  },
  {
    id: "evt_2",
    timeUtc: "14:00 UTC",
    timeEat: "17:00 EAT",
    currency: "USD",
    flag: "🇺🇸",
    title: "ISM Manufacturing Purchasing Managers Index (PMI)",
    impact: "HIGH",
    forecast: "49.5",
    previous: "47.2",
    status: "UPCOMING",
    implication: "Crucial indicator of US industrial strength. A print above 50 indicates expansion.",
  },
  {
    id: "evt_3",
    timeUtc: "08:30 UTC",
    timeEat: "11:30 EAT",
    currency: "GBP",
    flag: "🇬🇧",
    title: "UK Gross Domestic Product (GDP) (QoQ)",
    impact: "HIGH",
    forecast: "+0.6%",
    previous: "+0.7%",
    actual: "+0.6%",
    status: "RELEASED",
    implication: "Direct catalyst for GBPUSD and EURGBP currency pairs.",
  },
  {
    id: "evt_4",
    timeUtc: "18:00 UTC",
    timeEat: "21:00 EAT",
    currency: "USD",
    flag: "🇺🇸",
    title: "FOMC Federal Reserve Interest Rate Decision",
    impact: "HIGH",
    forecast: "4.75%",
    previous: "5.00%",
    status: "UPCOMING",
    implication: "Highest impact event in world financial markets. Spreads may widen during announcement.",
  },
  {
    id: "evt_5",
    timeUtc: "11:00 UTC",
    timeEat: "14:00 EAT",
    currency: "KES",
    flag: "🇰🇪",
    title: "Central Bank of Kenya (CBK) Monetary Policy Committee Rate",
    impact: "HIGH",
    forecast: "12.00%",
    previous: "12.75%",
    status: "UPCOMING",
    implication: "Determines USDKES interbank swap rates and commercial banking benchmark in Kenya.",
  },
  {
    id: "evt_6",
    timeUtc: "12:15 UTC",
    timeEat: "15:15 EAT",
    currency: "EUR",
    flag: "🇪🇺",
    title: "European Central Bank (ECB) Main Refinancing Rate",
    impact: "HIGH",
    forecast: "3.40%",
    previous: "3.65%",
    status: "UPCOMING",
    implication: "Direct driver of EURUSD euro exchange rate and DAX volatility.",
  },
  {
    id: "evt_7",
    timeUtc: "14:30 UTC",
    timeEat: "17:30 EAT",
    currency: "USD",
    flag: "🇺🇸",
    title: "EIA Crude Oil Stocks Change",
    impact: "MEDIUM",
    forecast: "+1.2M",
    previous: "+2.1M",
    status: "UPCOMING",
    implication: "Catalyst for spot energy commodities and USDCAD petro-currency.",
  },
  {
    id: "evt_8",
    timeUtc: "01:30 UTC",
    timeEat: "04:30 EAT",
    currency: "AUD",
    flag: "🇦🇺",
    title: "Reserve Bank of Australia (RBA) Meeting Minutes",
    impact: "MEDIUM",
    forecast: "4.35%",
    previous: "4.35%",
    status: "UPCOMING",
    implication: "Drives Asian session liquidity across AUDUSD and AUDJPY.",
  },
];
