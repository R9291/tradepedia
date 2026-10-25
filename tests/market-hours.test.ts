import { describe, it, expect } from "vitest";
import {
  getMarketStatus,
  getAllMarketSessions,
  getAssetCategory,
} from "../src/lib/market-hours";

describe("Market Hours & Session Accuracy", () => {
  it("should categorize symbols into Forex, Crypto, Commodities, and Synthetics correctly", () => {
    expect(getAssetCategory("BTCUSD")).toBe("Crypto");
    expect(getAssetCategory("ETHUSD")).toBe("Crypto");
    expect(getAssetCategory("SOLUSD")).toBe("Crypto");
    expect(getAssetCategory("XAUUSD")).toBe("Commodities");
    expect(getAssetCategory("EURUSD")).toBe("Forex");
    expect(getAssetCategory("USDJPY")).toBe("Forex");
    expect(getAssetCategory("USDKES")).toBe("Forex");
    expect(getAssetCategory("VOL_100")).toBe("Synthetics");
    expect(getAssetCategory("BOOM_500")).toBe("Synthetics");
    expect(getAssetCategory("CRASH_500")).toBe("Synthetics");
  });

  it("should keep Deriv Synthetics (VOL_100, BOOM_500) open 24/7/365 at all times", () => {
    const sat = new Date("2026-10-24T14:30:00Z");
    const volStatus = getMarketStatus("VOL_100", sat);
    expect(volStatus.isOpen).toBe(true);
    expect(volStatus.statusLabel).toBe("OPEN");
    expect(volStatus.category).toBe("Synthetics");
  });

  it("should keep Crypto open 24/7/365 at all times including weekend", () => {
    // Saturday midnight
    const sat = new Date("2026-10-24T12:00:00Z");
    const statusBtcSat = getMarketStatus("BTCUSD", sat);
    expect(statusBtcSat.isOpen).toBe(true);
    expect(statusBtcSat.statusLabel).toBe("OPEN");

    // Sunday evening
    const sun = new Date("2026-10-25T18:00:00Z");
    const statusEthSun = getMarketStatus("ETHUSD", sun);
    expect(statusEthSun.isOpen).toBe(true);
  });

  it("should accurately mark Forex as CLOSED during weekends", () => {
    // Saturday noon UTC
    const satNoon = new Date("2026-10-24T12:00:00Z");
    const statusSat = getMarketStatus("EURUSD", satNoon);
    expect(statusSat.isOpen).toBe(false);
    expect(statusSat.statusLabel).toBe("CLOSED");
    expect(statusSat.sessionName).toBe("Weekend Closed");

    // Sunday before Sydney Open (e.g. 15:00 UTC)
    const sunPreOpen = new Date("2026-10-25T15:00:00Z");
    const statusSunPre = getMarketStatus("EURUSD", sunPreOpen);
    expect(statusSunPre.isOpen).toBe(false);
    expect(statusSunPre.statusLabel).toBe("CLOSED");

    // Friday after 22:00 UTC (New York close)
    const friPostClose = new Date("2026-10-23T22:15:00Z");
    const statusFriPost = getMarketStatus("EURUSD", friPostClose);
    expect(statusFriPost.isOpen).toBe(false);
    expect(statusFriPost.statusLabel).toBe("CLOSED");
  });

  it("should accurately mark Forex as OPEN during the trading week (Sun 22:00 UTC to Fri 22:00 UTC)", () => {
    // Sunday 22:30 UTC (Sydney opens)
    const sunOpen = new Date("2026-10-25T22:30:00Z");
    const statusSunOpen = getMarketStatus("EURUSD", sunOpen);
    expect(statusSunOpen.isOpen).toBe(true);
    expect(statusSunOpen.statusLabel).toBe("OPEN");

    // Wednesday 14:00 UTC (London & NY Overlap)
    const wedMid = new Date("2026-10-21T14:00:00Z");
    const statusWed = getMarketStatus("EURUSD", wedMid);
    expect(statusWed.isOpen).toBe(true);
    expect(statusWed.sessionName).toContain("London");
    expect(statusWed.sessionName).toContain("New York");
    expect(statusWed.activeSessions).toContain("London");
    expect(statusWed.activeSessions).toContain("New York");

    // Friday 18:00 UTC (New York active, before close)
    const friBeforeClose = new Date("2026-10-23T18:00:00Z");
    const statusFri = getMarketStatus("GBPUSD", friBeforeClose);
    expect(statusFri.isOpen).toBe(true);
  });

  it("should accurately handle Commodities (Gold / XAUUSD) daily maintenance breaks", () => {
    // Tuesday 22:30 UTC -> Daily rollover maintenance break
    const tueBreak = new Date("2026-10-20T22:30:00Z");
    const statusBreak = getMarketStatus("XAUUSD", tueBreak);
    expect(statusBreak.isOpen).toBe(false);
    expect(statusBreak.statusLabel).toBe("MAINTENANCE");
    expect(statusBreak.sessionName).toBe("Daily Clearing Break");

    // Tuesday 20:00 UTC -> Gold is OPEN
    const tueOpen = new Date("2026-10-20T20:00:00Z");
    const statusOpen = getMarketStatus("XAUUSD", tueOpen);
    expect(statusOpen.isOpen).toBe(true);
    expect(statusOpen.statusLabel).toBe("OPEN");

    // Saturday -> Gold is weekend closed
    const satGold = new Date("2026-10-24T10:00:00Z");
    const statusSatGold = getMarketStatus("XAUUSD", satGold);
    expect(statusSatGold.isOpen).toBe(false);
    expect(statusSatGold.statusLabel).toBe("CLOSED");
  });

  it("should compute all 4 global trading sessions with Nairobi EAT time alignments", () => {
    const sessions = getAllMarketSessions(new Date("2026-10-21T14:00:00Z"));
    expect(sessions.length).toBe(4);

    const london = sessions.find((s) => s.id === "london");
    const newYork = sessions.find((s) => s.id === "newyork");
    const tokyo = sessions.find((s) => s.id === "tokyo");
    const sydney = sessions.find((s) => s.id === "sydney");

    expect(london).toBeDefined();
    expect(newYork).toBeDefined();
    expect(london?.isOpen).toBe(true);
    expect(newYork?.isOpen).toBe(true);
    expect(tokyo?.isOpen).toBe(false);

    // Verify Nairobi EAT offsets (UTC+3)
    expect(london?.eatOpen).toBe("11:00 EAT");
    expect(newYork?.eatOpen).toBe("16:00 EAT");
    expect(sydney?.eatOpen).toBe("01:00 EAT");
    expect(tokyo?.eatOpen).toBe("03:00 EAT");
  });
});
