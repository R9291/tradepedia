/**
 * Real-time Global Financial Market Sessions and Trading Hours
 *
 * Forex (FX):
 *   - Continuous 24/5 from Sunday 22:00 UTC (Sydney open) to Friday 22:00 UTC (New York close).
 *   - Closed on weekends: Friday 22:00 UTC to Sunday 22:00 UTC.
 *
 * Commodities (Gold / XAUUSD):
 *   - Sunday 23:00 UTC to Friday 22:00 UTC.
 *   - Daily maintenance rollover break: 22:00 UTC to 23:00 UTC (Monday - Thursday).
 *   - Closed on weekends: Friday 22:00 UTC to Sunday 23:00 UTC.
 *
 * Crypto (BTC, ETH, SOL):
 *   - Continuous 24/7/365 non-stop.
 *
 * Major Trading Sessions:
 *   - Sydney: 22:00 - 07:00 UTC
 *   - Tokyo:   00:00 - 09:00 UTC
 *   - London:  08:00 - 16:30 UTC
 *   - New York: 13:00 - 22:00 UTC
 */

export interface MarketStatusResult {
  symbol: string;
  category: "Forex" | "Crypto" | "Commodities" | "Synthetics";
  isOpen: boolean;
  sessionName: string;
  statusLabel: "OPEN" | "CLOSED" | "MAINTENANCE";
  nextEventLabel: string;
  tradingHoursLabel: string;
  activeSessions: string[];
}

export interface SessionInfo {
  id: "sydney" | "tokyo" | "london" | "newyork";
  city: string;
  region: string;
  utcOpen: string;
  utcClose: string;
  eatOpen: string; // Nairobi UTC+3
  eatClose: string;
  isOpen: boolean;
  progressPercent: number;
}

export function getAssetCategory(symbol: string): "Forex" | "Crypto" | "Commodities" | "Synthetics" {
  const s = symbol.toUpperCase();
  if (s.includes("VOL_") || s.includes("BOOM_") || s.includes("CRASH_") || s.includes("STEP_")) return "Synthetics";
  if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL")) return "Crypto";
  if (s.includes("XAU") || s.includes("GOLD") || s.includes("OIL") || s.includes("SILVER")) return "Commodities";
  return "Forex";
}

export function getMarketStatus(symbol: string, date: Date = new Date()): MarketStatusResult {
  const category = getAssetCategory(symbol);
  const utcDay = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const utcTimeMinutes = utcHour * 60 + utcMinute;

  // 1. Synthetics (Deriv Volatility/Crash/Boom) are 24/7/365 continuous
  if (category === "Synthetics") {
    return {
      symbol,
      category,
      isOpen: true,
      sessionName: "Deriv Synthetic Engine (24/7)",
      statusLabel: "OPEN",
      nextEventLabel: "Continuous 24/7/365 Non-stop",
      tradingHoursLabel: "24/7 Continuous Synthetics",
      activeSessions: ["Continuous Volatility Feed"],
    };
  }

  // 2. Crypto is always open 24/7
  if (category === "Crypto") {
    return {
      symbol,
      category,
      isOpen: true,
      sessionName: "Global Decentralized (24/7)",
      statusLabel: "OPEN",
      nextEventLabel: "Open 24/7/365 Non-stop",
      tradingHoursLabel: "24/7 Continuous",
      activeSessions: ["Global Crypto Tape"],
    };
  }

  // Determine active world sessions
  const activeSessions: string[] = [];
  // Sydney: 22:00 - 07:00 UTC
  if (utcTimeMinutes >= 22 * 60 || utcTimeMinutes < 7 * 60) {
    activeSessions.push("Sydney");
  }
  // Tokyo: 00:00 - 09:00 UTC
  if (utcTimeMinutes >= 0 && utcTimeMinutes < 9 * 60) {
    activeSessions.push("Tokyo");
  }
  // London: 08:00 - 16:30 UTC
  if (utcTimeMinutes >= 8 * 60 && utcTimeMinutes < 16 * 60 + 30) {
    activeSessions.push("London");
  }
  // New York: 13:00 - 22:00 UTC
  if (utcTimeMinutes >= 13 * 60 && utcTimeMinutes < 22 * 60) {
    activeSessions.push("New York");
  }

  const sessionName = activeSessions.length > 0
    ? activeSessions.join(" & ") + (activeSessions.length > 1 ? " Overlap" : " Session")
    : "Interbank Bridge";

  // 2. Forex Schedule (Sun 22:00 UTC - Fri 22:00 UTC)
  if (category === "Forex") {
    // Saturday: completely closed
    if (utcDay === 6) {
      const hoursUntilSundayOpen = 24 - utcHour + 22; // Saturday remaining + Sunday 22h
      return {
        symbol,
        category,
        isOpen: false,
        sessionName: "Weekend Closed",
        statusLabel: "CLOSED",
        nextEventLabel: `Opens Sunday at 22:00 UTC (${hoursUntilSundayOpen}h)`,
        tradingHoursLabel: "24/5 (Sun 22:00 – Fri 22:00 UTC)",
        activeSessions: [],
      };
    }

    // Sunday before 22:00 UTC: closed
    if (utcDay === 0 && utcTimeMinutes < 22 * 60) {
      const minutesUntilOpen = 22 * 60 - utcTimeMinutes;
      const h = Math.floor(minutesUntilOpen / 60);
      const m = minutesUntilOpen % 60;
      return {
        symbol,
        category,
        isOpen: false,
        sessionName: "Weekend Closed",
        statusLabel: "CLOSED",
        nextEventLabel: `Opens today at 22:00 UTC (${h}h ${m}m)`,
        tradingHoursLabel: "24/5 (Sun 22:00 – Fri 22:00 UTC)",
        activeSessions: [],
      };
    }

    // Friday after 22:00 UTC: closed
    if (utcDay === 5 && utcTimeMinutes >= 22 * 60) {
      const hoursUntilSundayOpen = 48 - (utcHour - 22);
      return {
        symbol,
        category,
        isOpen: false,
        sessionName: "Weekend Closed",
        statusLabel: "CLOSED",
        nextEventLabel: "Opens Sunday at 22:00 UTC",
        tradingHoursLabel: "24/5 (Sun 22:00 – Fri 22:00 UTC)",
        activeSessions: [],
      };
    }

    // Otherwise Forex is OPEN!
    // Calculate time until Friday close
    let daysUntilFriday = (5 - utcDay + 7) % 7;
    let minutesUntilFridayClose = daysUntilFriday * 24 * 60 + (22 * 60 - utcTimeMinutes);
    const hoursLeft = Math.floor(minutesUntilFridayClose / 60);

    return {
      symbol,
      category,
      isOpen: true,
      sessionName,
      statusLabel: "OPEN",
      nextEventLabel: `Closes Friday 22:00 UTC (${hoursLeft}h remaining)`,
      tradingHoursLabel: "24/5 Continuous Interbank",
      activeSessions,
    };
  }

  // 3. Commodities (XAUUSD / Gold)
  // Sun 23:00 - Fri 22:00 UTC with daily break 22:00 - 23:00 Mon-Thu
  if (category === "Commodities") {
    // Weekend closure: Saturday all day, Sunday before 23:00 UTC, Friday after 22:00 UTC
    if (utcDay === 6 || (utcDay === 0 && utcTimeMinutes < 23 * 60) || (utcDay === 5 && utcTimeMinutes >= 22 * 60)) {
      return {
        symbol,
        category,
        isOpen: false,
        sessionName: "Weekend Closed",
        statusLabel: "CLOSED",
        nextEventLabel: "Opens Sunday at 23:00 UTC",
        tradingHoursLabel: "Sun 23:00 – Fri 22:00 UTC (Daily Break 22-23 UTC)",
        activeSessions: [],
      };
    }

    // Daily maintenance / clearing break: 22:00 - 23:00 UTC (Mon-Thu)
    if (utcTimeMinutes >= 22 * 60 && utcTimeMinutes < 23 * 60) {
      const minsUntilReopen = 23 * 60 - utcTimeMinutes;
      return {
        symbol,
        category,
        isOpen: false,
        sessionName: "Daily Clearing Break",
        statusLabel: "MAINTENANCE",
        nextEventLabel: `Reopens at 23:00 UTC (${minsUntilReopen}m)`,
        tradingHoursLabel: "Daily Maintenance Break (22:00–23:00 UTC)",
        activeSessions: [],
      };
    }

    return {
      symbol,
      category,
      isOpen: true,
      sessionName,
      statusLabel: "OPEN",
      nextEventLabel: "Daily break at 22:00 UTC",
      tradingHoursLabel: "Sun 23:00 – Fri 22:00 UTC",
      activeSessions,
    };
  }

  return {
    symbol,
    category: "Forex",
    isOpen: true,
    sessionName: "Interbank Market",
    statusLabel: "OPEN",
    nextEventLabel: "Continuous 24/5",
    tradingHoursLabel: "24/5",
    activeSessions,
  };
}

export function getAllMarketSessions(date: Date = new Date()): SessionInfo[] {
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const currentMinutes = utcHour * 60 + utcMinute;

  // Helper to compute progress within session
  const calcProgress = (startMins: number, endMins: number) => {
    let duration = endMins - startMins;
    if (duration < 0) duration += 24 * 60; // Wraps midnight

    let elapsed = currentMinutes - startMins;
    if (elapsed < 0) elapsed += 24 * 60;

    if (elapsed > duration) return 0;
    return Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));
  };

  const isSydneyOpen = currentMinutes >= 22 * 60 || currentMinutes < 7 * 60;
  const isTokyoOpen = currentMinutes >= 0 && currentMinutes < 9 * 60;
  const isLondonOpen = currentMinutes >= 8 * 60 && currentMinutes < 16 * 60 + 30;
  const isNewYorkOpen = currentMinutes >= 13 * 60 && currentMinutes < 22 * 60;

  return [
    {
      id: "sydney",
      city: "Sydney",
      region: "Pacific (ASX)",
      utcOpen: "22:00 UTC",
      utcClose: "07:00 UTC",
      eatOpen: "01:00 EAT",
      eatClose: "10:00 EAT",
      isOpen: isSydneyOpen,
      progressPercent: isSydneyOpen ? calcProgress(22 * 60, 7 * 60) : 0,
    },
    {
      id: "tokyo",
      city: "Tokyo",
      region: "Asia (TSE)",
      utcOpen: "00:00 UTC",
      utcClose: "09:00 UTC",
      eatOpen: "03:00 EAT",
      eatClose: "12:00 EAT",
      isOpen: isTokyoOpen,
      progressPercent: isTokyoOpen ? calcProgress(0, 9 * 60) : 0,
    },
    {
      id: "london",
      city: "London",
      region: "Europe (LSE)",
      utcOpen: "08:00 UTC",
      utcClose: "16:30 UTC",
      eatOpen: "11:00 EAT",
      eatClose: "19:30 EAT",
      isOpen: isLondonOpen,
      progressPercent: isLondonOpen ? calcProgress(8 * 60, 16 * 60 + 30) : 0,
    },
    {
      id: "newyork",
      city: "New York",
      region: "Americas (NYSE)",
      utcOpen: "13:00 UTC",
      utcClose: "22:00 UTC",
      eatOpen: "16:00 EAT",
      eatClose: "01:00 EAT",
      isOpen: isNewYorkOpen,
      progressPercent: isNewYorkOpen ? calcProgress(13 * 60, 22 * 60) : 0,
    },
  ];
}
