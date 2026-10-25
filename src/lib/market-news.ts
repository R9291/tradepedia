export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string;
  category: "STOCKS" | "FOREX" | "CRYPTO" | "COMMODITIES" | "MACRO";
  impact: "CRITICAL" | "HIGH" | "MEDIUM";
  affectedMarkets: string[];
  sentiment: "BULLISH" | "BEARISH" | "VOLATILE";
  publishedAt: string;
  timeAgo: string;
  actionableInsight: string;
  source: string;
  isBreaking?: boolean;
}

export const INITIAL_MARKET_NEWS: MarketNewsItem[] = [
  {
    id: "news_1",
    title: "US Federal Reserve Signals Imminent Interest Rate Pivot; Wall Street Equities Rally",
    summary:
      "Federal Reserve Chairman Jerome Powell noted cooling labor conditions and stable inflation metrics, signaling that monetary policy easing is now firmly on the table for upcoming FOMC cycles.",
    category: "STOCKS",
    impact: "CRITICAL",
    affectedMarkets: ["S&P 500", "NASDAQ 100", "Dow Jones", "EURUSD", "USDJPY"],
    sentiment: "BULLISH",
    publishedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    timeAgo: "6m ago",
    actionableInsight:
      "Lower benchmark yields dramatically decrease corporate borrowing costs. Growth equities and tech shares (NASDAQ) historically outperform in this environment.",
    source: "Tradepedia Institutional Macro Wire",
    isBreaking: true,
  },
  {
    id: "news_2",
    title: "Big Tech Earnings Surpass Wall Street Estimates with Record Cloud & AI Revenues",
    summary:
      "Mega-cap semiconductor and cloud enterprise leaders delivered quarterly revenue beats exceeding analysts' consensus by 8.4%, sparking heavy pre-market institutional buying.",
    category: "STOCKS",
    impact: "HIGH",
    affectedMarkets: ["NASDAQ 100", "S&P 500", "Tech Stocks"],
    sentiment: "BULLISH",
    publishedAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    timeAgo: "24m ago",
    actionableInsight:
      "Tech-heavy indices expected to sustain positive momentum. Watch for breakout above key resistance barriers on NASDAQ CFDs.",
    source: "Wall Street Intelligence",
    isBreaking: true,
  },
  {
    id: "news_3",
    title: "US Consumer Price Index (CPI) Cools to 2.4%; Easing Core Inflation Pressures",
    summary:
      "Headline CPI printed cooler than expected at 2.4% year-over-year. Core inflation pressures in services and housing showed sustained deceleration.",
    category: "MACRO",
    impact: "HIGH",
    affectedMarkets: ["Stock Indices", "Gold (XAUUSD)", "USDKES", "EURUSD"],
    sentiment: "BULLISH",
    publishedAt: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
    timeAgo: "52m ago",
    actionableInsight:
      "Cooling inflation reduces risk of stagflation, lifting consumer discretionary and equity valuations while weakening the US Dollar.",
    source: "US Bureau of Labor Statistics / Tradepedia Wire",
  },
  {
    id: "news_4",
    title: "Crude Oil Surges 3.8% Amid Middle East Supply Disruptions & Tanker Route Reroutes",
    summary:
      "Brent and WTI crude contracts spiked aggressively after maritime chokepoints faced fresh geopolitical tensions, leading major shipping conglomerates to reroute tankers.",
    category: "COMMODITIES",
    impact: "HIGH",
    affectedMarkets: ["Brent Crude (UKOIL)", "WTI Crude (USOIL)", "Energy Stocks", "USDKES"],
    sentiment: "VOLATILE",
    publishedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    timeAgo: "1h 50m ago",
    actionableInsight:
      "Energy sector equities gain margin expansion, but elevated transportation fuel costs could pressure airline and logistics stocks.",
    source: "Global Energy Commodities Desk",
  },
  {
    id: "news_5",
    title: "Central Bank of Kenya (CBK) Lowers Benchmark MPC Rate to 12.00% to Stimulate Credit",
    summary:
      "The CBK Monetary Policy Committee enacted a benchmark lending rate reduction of 75 bps, citing currency stabilization against the USD and well-anchored inflation within target bands.",
    category: "FOREX",
    impact: "HIGH",
    affectedMarkets: ["USDKES", "Nairobi Securities Exchange (NSE 20)", "Kenyan Equities"],
    sentiment: "BULLISH",
    publishedAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    timeAgo: "3h ago",
    actionableInsight:
      "Cheaper commercial credit stimulates corporate capital expenditures and boosts domestic stock valuations across banking and telecoms.",
    source: "Central Bank of Kenya (CBK)",
  },
  {
    id: "news_6",
    title: "Bitcoin Surges Past $68,000 as Institutional ETF Inflows Hit Multi-Month Highs",
    summary:
      "Global spot ETF custodians reported net positive inflows surpassing $540M in a single 24-hour window, igniting broad-based altcoin momentum.",
    category: "CRYPTO",
    impact: "MEDIUM",
    affectedMarkets: ["BTCUSD", "ETHUSD", "SOLUSD", "Crypto Mining Equities"],
    sentiment: "BULLISH",
    publishedAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    timeAgo: "4h ago",
    actionableInsight:
      "Crypto sentiment registers 'Extreme Greed' (78/100). Higher beta crypto-correlated stocks often mirror intraday price expansions.",
    source: "Tradepedia Blockchain Intelligence",
  },
];
