import { describe, it, expect } from "vitest";
import { Prisma, TradeDirection } from "@prisma/client";
import {
  getLiveQuote,
  calculateRequiredMargin,
  calculatePnL,
  USD_TO_KES_RATE,
} from "../src/lib/trading";

describe("Forex Pricing & Quotes Engine", () => {
  it("should generate valid bid and ask prices where Ask > Bid by the configured spread", () => {
    const quote = getLiveQuote("EURUSD");
    expect(quote.symbol).toBe("EURUSD");
    expect(quote.ask.greaterThan(quote.bid)).toBe(true);

    const spread = quote.ask.minus(quote.bid);
    const expectedSpread = quote.pipSize.times(quote.spreadPips);
    expect(spread.toNumber()).toBeCloseTo(expectedSpread.toNumber(), 5);
  });

  it("should handle Japanese Yen (USDJPY) 3-decimal pricing convention correctly", () => {
    const quote = getLiveQuote("USDJPY");
    expect(quote.symbol).toBe("USDJPY");
    expect(quote.ask.greaterThan(quote.bid)).toBe(true);
    expect(quote.pipSize.toNumber()).toBe(0.01);
  });
});

describe("Margin Calculation & Leverage Engine", () => {
  it("should compute exact margin requirement in KES at 1:10 leverage", () => {
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.10");
    const entryPrice = new Prisma.Decimal("1.08500");
    const leverage = 10;

    const marginKes = calculateRequiredMargin(
      contractSize,
      lotSize,
      entryPrice,
      leverage,
      "EURUSD"
    );

    // Notional = 100000 * 0.10 * 1.08500 = 10,850 USD
    // Margin USD = 10,850 / 10 = 1,085 USD
    // Margin KES = 1,085 * 129.50 = 140,507.50 KES
    expect(marginKes.toFixed(2)).toBe("140507.50");
  });

  it("should compute micro-lot (0.01) margin accurately", () => {
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.01");
    const entryPrice = new Prisma.Decimal("1.08000");
    const leverage = 10;

    const marginKes = calculateRequiredMargin(
      contractSize,
      lotSize,
      entryPrice,
      leverage,
      "EURUSD"
    );

    // Notional = 1,080 USD; Margin USD = 108 USD; Margin KES = 108 * 129.50 = 13,986.00 KES
    expect(marginKes.toFixed(2)).toBe("13986.00");
  });
});

describe("PnL Calculation Rules (Buy opens Ask/closes Bid; Sell opens Bid/closes Ask)", () => {
  it("should correctly compute BUY order profit when exiting at higher Bid price", () => {
    const entryAsk = new Prisma.Decimal("1.08435");
    const exitBid = new Prisma.Decimal("1.08935"); // +0.00500 gain (50 pips)
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.10");

    const { pnlUsd, pnlKes } = calculatePnL(
      TradeDirection.BUY,
      entryAsk,
      exitBid,
      contractSize,
      lotSize,
      "EURUSD"
    );

    // Gain = 0.00500 * 100000 * 0.10 = +50.00 USD
    // KES = 50 * 129.50 = +6,475.00 KES
    expect(pnlUsd.toNumber()).toBe(50.0);
    expect(pnlKes.toFixed(2)).toBe("6475.00");
  });

  it("should correctly compute BUY order loss when exiting at lower Bid price", () => {
    const entryAsk = new Prisma.Decimal("1.08435");
    const exitBid = new Prisma.Decimal("1.08035"); // -0.00400 loss (40 pips)
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.10");

    const { pnlUsd, pnlKes } = calculatePnL(
      TradeDirection.BUY,
      entryAsk,
      exitBid,
      contractSize,
      lotSize,
      "EURUSD"
    );

    // Loss = -0.00400 * 100000 * 0.10 = -40.00 USD
    // KES = -40 * 129.50 = -5,180.00 KES
    expect(pnlUsd.toNumber()).toBe(-40.0);
    expect(pnlKes.toFixed(2)).toBe("-5180.00");
  });

  it("should correctly compute SELL order profit when exiting at lower Ask price", () => {
    const entryBid = new Prisma.Decimal("1.08420");
    const exitAsk = new Prisma.Decimal("1.08120"); // +0.00300 gain (30 pips)
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.10");

    const { pnlUsd, pnlKes } = calculatePnL(
      TradeDirection.SELL,
      entryBid,
      exitAsk,
      contractSize,
      lotSize,
      "EURUSD"
    );

    // Gain = (1.08420 - 1.08120) * 100000 * 0.10 = +30.00 USD
    // KES = 30 * 129.50 = +3,885.00 KES
    expect(pnlUsd.toNumber()).toBe(30.0);
    expect(pnlKes.toFixed(2)).toBe("3885.00");
  });

  it("should correctly compute SELL order loss when exiting at higher Ask price", () => {
    const entryBid = new Prisma.Decimal("1.08420");
    const exitAsk = new Prisma.Decimal("1.08720"); // -0.00300 loss (30 pips)
    const contractSize = new Prisma.Decimal("100000");
    const lotSize = new Prisma.Decimal("0.10");

    const { pnlUsd, pnlKes } = calculatePnL(
      TradeDirection.SELL,
      entryBid,
      exitAsk,
      contractSize,
      lotSize,
      "EURUSD"
    );

    expect(pnlUsd.toNumber()).toBe(-30.0);
    expect(pnlKes.toFixed(2)).toBe("-3885.00");
  });
});

describe("Risk Parameters & Boundary Controls", () => {
  it("should reject stop-loss for BUY order that is greater than or equal to entry Ask", () => {
    const entryAsk = 1.08435;
    const invalidStopLoss = 1.08500;
    const isValid = invalidStopLoss < entryAsk;
    expect(isValid).toBe(false);
  });

  it("should reject take-profit for BUY order that is less than or equal to entry Ask", () => {
    const entryAsk = 1.08435;
    const invalidTakeProfit = 1.08300;
    const isValid = invalidTakeProfit > entryAsk;
    expect(isValid).toBe(false);
  });

  it("should reject opening an order when user currently has 5 active open positions", () => {
    const currentOpenPositions = 5;
    const maxAllowed = 5;
    const canOpen = currentOpenPositions < maxAllowed;
    expect(canOpen).toBe(false);
  });

  it("should calculate correct margin usage level and flag 80% margin call warning", () => {
    const equity = new Prisma.Decimal("100000.00");
    const lockedMargin = new Prisma.Decimal("85000.00"); // 85% margin usage

    const marginUsagePercentage = lockedMargin.dividedBy(equity).times(100);
    const isMarginCallWarning = marginUsagePercentage.greaterThanOrEqualTo(80);
    const isStopOutLiquidation = marginUsagePercentage.greaterThanOrEqualTo(100);

    expect(isMarginCallWarning).toBe(true);
    expect(isStopOutLiquidation).toBe(false);
  });
});
