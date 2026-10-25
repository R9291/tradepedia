import { Prisma, TradeDirection, TradeStatus, LedgerEntryType } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { demoStore, DemoTrade } from "./memory-store";

// Default currency conversion: USD to KES
export const USD_TO_KES_RATE = new Prisma.Decimal("129.50");

export interface ForexQuote {
  symbol: string;
  bid: Prisma.Decimal;
  ask: Prisma.Decimal;
  mid: Prisma.Decimal;
  spreadPips: number;
  pipSize: Prisma.Decimal;
  contractSize: Prisma.Decimal;
  maxLeverage: number;
  timestamp: string;
}

// In-memory live quotes base rates (Forex, Crypto, Commodities)
const BASE_MARKET_RATES: Record<string, { mid: number; pipSize: number; spread: number; contractSize: number; maxLeverage: number; decimals: number }> = {
  EURUSD: { mid: 1.08420, pipSize: 0.0001, spread: 1.5, contractSize: 100000, maxLeverage: 500, decimals: 5 },
  GBPUSD: { mid: 1.29820, pipSize: 0.0001, spread: 2.0, contractSize: 100000, maxLeverage: 500, decimals: 5 },
  USDJPY: { mid: 152.450, pipSize: 0.01, spread: 2.0, contractSize: 100000, maxLeverage: 500, decimals: 3 },
  USDCHF: { mid: 0.86520, pipSize: 0.0001, spread: 2.0, contractSize: 100000, maxLeverage: 500, decimals: 5 },
  AUDUSD: { mid: 0.66520, pipSize: 0.0001, spread: 2.0, contractSize: 100000, maxLeverage: 500, decimals: 5 },
  USDCAD: { mid: 1.38220, pipSize: 0.0001, spread: 2.0, contractSize: 100000, maxLeverage: 500, decimals: 5 },
  BTCUSD: { mid: 67450.00, pipSize: 1.0, spread: 2.5, contractSize: 1, maxLeverage: 500, decimals: 2 },
  ETHUSD: { mid: 2640.50, pipSize: 0.1, spread: 1.5, contractSize: 1, maxLeverage: 500, decimals: 2 },
  SOLUSD: { mid: 178.40, pipSize: 0.01, spread: 1.0, contractSize: 1, maxLeverage: 500, decimals: 2 },
  XAUUSD: { mid: 2724.80, pipSize: 0.1, spread: 1.5, contractSize: 100, maxLeverage: 500, decimals: 2 },
  USDKES: { mid: 129.50, pipSize: 0.01, spread: 1.0, contractSize: 100000, maxLeverage: 500, decimals: 2 },
  VOL_100: { mid: 1850.40, pipSize: 0.1, spread: 1.0, contractSize: 1, maxLeverage: 500, decimals: 2 },
  BOOM_500: { mid: 4250.80, pipSize: 0.1, spread: 1.2, contractSize: 1, maxLeverage: 500, decimals: 2 },
  CRASH_500: { mid: 3180.20, pipSize: 0.1, spread: 1.2, contractSize: 1, maxLeverage: 500, decimals: 2 },
};

// Dynamic market state tracking for realistic micro-structure random walk
const LIVE_MARKET_STATE: Record<string, { currentMid: number; lastUpdate: number; velocity: number }> = {};

/**
 * Returns live simulated price ticks with realistic financial Brownian motion.
 */
export function getLiveQuote(symbol: string): ForexQuote {
  const sym = symbol.toUpperCase();
  const base = BASE_MARKET_RATES[sym] || BASE_MARKET_RATES.EURUSD;
  const now = Date.now();

  if (!LIVE_MARKET_STATE[sym]) {
    LIVE_MARKET_STATE[sym] = {
      currentMid: base.mid,
      lastUpdate: now,
      velocity: 0,
    };
  }

  const state = LIVE_MARKET_STATE[sym];
  const dt = Math.min((now - state.lastUpdate) / 1000, 2);
  state.lastUpdate = now;

  if (dt > 0.1) {
    // Volatility parameter
    const vol = base.pipSize * (base.mid > 1000 ? 1.5 : 0.4);
    // Mean reversion force towards base rate
    const meanReversion = (base.mid - state.currentMid) * 0.05;
    // Micro momentum + random Gaussian shock
    const shock = (Math.random() + Math.random() + Math.random() - 1.5) * vol;
    state.velocity = state.velocity * 0.7 + shock * 0.3;
    state.currentMid = Math.max(0.0001, state.currentMid + state.velocity + meanReversion * dt);
  }

  const halfSpread = (base.spread * base.pipSize) / 2;
  const decimals = base.decimals ?? (sym.includes("JPY") ? 3 : 5);

  const bid = new Prisma.Decimal((state.currentMid - halfSpread).toFixed(decimals));
  const ask = new Prisma.Decimal((state.currentMid + halfSpread).toFixed(decimals));
  const mid = new Prisma.Decimal(state.currentMid.toFixed(decimals));

  return {
    symbol: sym,
    bid,
    ask,
    mid,
    spreadPips: base.spread,
    pipSize: new Prisma.Decimal(base.pipSize.toString()),
    contractSize: new Prisma.Decimal(base.contractSize.toString()),
    maxLeverage: base.maxLeverage,
    timestamp: new Date().toISOString(),
  };
}

export function getAllLiveQuotes(): ForexQuote[] {
  return Object.keys(BASE_MARKET_RATES).map((sym) => getLiveQuote(sym));
}

export function calculateRequiredMargin(
  contractSize: Prisma.Decimal,
  lotSize: Prisma.Decimal,
  entryPrice: Prisma.Decimal,
  maxLeverage: number,
  symbol: string
): Prisma.Decimal {
  const notional = contractSize.times(lotSize).times(entryPrice);
  const marginUsd = notional.dividedBy(maxLeverage);
  const marginKes = marginUsd.times(USD_TO_KES_RATE);
  return marginKes.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function calculatePnL(
  direction: TradeDirection,
  entryPrice: Prisma.Decimal,
  currentOrExitPrice: Prisma.Decimal,
  contractSize: Prisma.Decimal,
  lotSize: Prisma.Decimal,
  symbol: string
): { pnlUsd: Prisma.Decimal; pnlKes: Prisma.Decimal } {
  let priceDelta: Prisma.Decimal;
  if (direction === TradeDirection.BUY) {
    priceDelta = currentOrExitPrice.minus(entryPrice);
  } else {
    priceDelta = entryPrice.minus(currentOrExitPrice);
  }

  let pnlQuoteCurrency = priceDelta.times(contractSize).times(lotSize);
  let pnlUsd = pnlQuoteCurrency;

  if (symbol.endsWith("JPY") || symbol.endsWith("CHF") || symbol.endsWith("CAD")) {
    pnlUsd = pnlQuoteCurrency.dividedBy(currentOrExitPrice);
  }

  const pnlKes = pnlUsd.times(USD_TO_KES_RATE).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return {
    pnlUsd: pnlUsd.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
    pnlKes,
  };
}

export async function executeOpenTrade(
  params: {
    userId: string;
    symbol: string;
    direction: TradeDirection;
    lotSize: number;
    stopLoss?: number | null;
    takeProfit?: number | null;
    isDemo?: boolean;
  },
  client = defaultPrisma
) {
  const { userId, symbol, direction, lotSize, stopLoss, takeProfit } = params;
  const isDemo = params.isDemo !== undefined ? params.isDemo : true;

  let user: any = null;
  let account: any = null;

  try {
    user = await client.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });
    if (user && user.accounts.length > 0) {
      account = user.accounts.find((a: any) => a.isDemo === isDemo) || user.accounts[0];
    }
  } catch {
    // DB unreachable
  }

  if (!user) {
    const memUser = demoStore.users.get(userId);
    if (memUser) {
      user = memUser;
      account = memUser.accounts.find((a: any) => a.isDemo === isDemo) || memUser.accounts[0];
    }
  }

  if (!user) {
    throw new Error("No trading account found.");
  }

  if (user.kycStatus !== "APPROVED") {
    throw new Error("Trading gated: Identity verification (KYC) must be APPROVED to trade.");
  }

  // Risk Control: Maximum 5 open trades per user
  let openTradesCount = 0;
  try {
    openTradesCount = await client.trade.count({
      where: { userId, status: TradeStatus.OPEN },
    });
  } catch {
    openTradesCount = demoStore.trades.filter((t) => t.userId === userId && t.status === "OPEN").length;
  }

  if (openTradesCount >= 5) {
    throw new Error("Risk Limit Breached: Maximum of 5 open positions allowed per account.");
  }

  const quote = getLiveQuote(symbol);
  const entryPrice = direction === TradeDirection.BUY ? quote.ask : quote.bid;
  const decimalLotSize = new Prisma.Decimal(lotSize.toString());
  const contractSize = quote.contractSize;
  const maxLeverage = quote.maxLeverage;

  const requiredMargin = calculateRequiredMargin(
    contractSize,
    decimalLotSize,
    entryPrice,
    maxLeverage,
    symbol
  );

  const availableBalance = new Prisma.Decimal(account?.availableBalance?.toString() || "100000");
  if (availableBalance.lessThan(requiredMargin)) {
    throw new Error(
      `Insufficient available balance. Required Margin: KES ${requiredMargin.toFixed(2)}, Available: KES ${availableBalance.toFixed(2)}`
    );
  }

  // Stop loss / take profit validation
  if (stopLoss) {
    const slDecimal = new Prisma.Decimal(stopLoss.toString());
    if (direction === TradeDirection.BUY && slDecimal.greaterThanOrEqualTo(entryPrice)) {
      throw new Error("Stop loss for a BUY trade must be strictly below entry Ask price.");
    }
    if (direction === TradeDirection.SELL && slDecimal.lessThanOrEqualTo(entryPrice)) {
      throw new Error("Stop loss for a SELL trade must be strictly above entry Bid price.");
    }
  }

  if (takeProfit) {
    const tpDecimal = new Prisma.Decimal(takeProfit.toString());
    if (direction === TradeDirection.BUY && tpDecimal.lessThanOrEqualTo(entryPrice)) {
      throw new Error("Take profit for a BUY trade must be strictly above entry Ask price.");
    }
    if (direction === TradeDirection.SELL && tpDecimal.greaterThanOrEqualTo(entryPrice)) {
      throw new Error("Take profit for a SELL trade must be strictly below entry Bid price.");
    }
  }

  try {
    // Try Prisma transaction
    const instrument = await client.instrument.findUnique({ where: { symbol: symbol.toUpperCase() } });
    if (instrument) {
      return await client.$transaction(async (tx) => {
        const newAvailable = availableBalance.minus(requiredMargin);
        const newLocked = new Prisma.Decimal(account.lockedMargin.toString()).add(requiredMargin);

        const updatedAccount = await tx.account.update({
          where: { id: account.id },
          data: { availableBalance: newAvailable, lockedMargin: newLocked },
        });

        const trade = await tx.trade.create({
          data: {
            userId,
            accountId: account.id,
            instrumentId: instrument.id,
            direction,
            lotSize: decimalLotSize,
            entryPrice,
            stopLoss: stopLoss ? new Prisma.Decimal(stopLoss.toString()) : null,
            takeProfit: takeProfit ? new Prisma.Decimal(takeProfit.toString()) : null,
            marginRequired: requiredMargin,
            status: TradeStatus.OPEN,
          },
        });

        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            userId,
            accountId: account.id,
            type: LedgerEntryType.TRADE_OPEN_MARGIN_HOLD,
            amount: requiredMargin.negated(),
            balanceAfter: newAvailable,
            referenceType: "TRADE",
            referenceId: trade.id,
            tradeId: trade.id,
            description: `Margin locked for ${direction} ${lotSize} lots ${symbol} @ ${entryPrice.toString()}`,
          },
        });

        return { trade, account: updatedAccount, ledgerEntry };
      });
    }
  } catch {
    // Fallback: Demo Store
  }

  // Demo store trade execution
  const tradeId = `trd_${Date.now()}`;
  const newAvailable = availableBalance.minus(requiredMargin);
  const newLocked = new Prisma.Decimal(account.lockedMargin?.toString() || "0").add(requiredMargin);

  const demoTrade: DemoTrade = {
    id: tradeId,
    userId,
    accountId: account.id || `acc_${userId}`,
    isDemo,
    symbol,
    direction,
    lotSize: decimalLotSize.toString(),
    entryPrice: entryPrice.toString(),
    stopLoss: stopLoss?.toString() || null,
    takeProfit: takeProfit?.toString() || null,
    marginRequired: requiredMargin.toString(),
    status: "OPEN",
    openedAt: new Date(),
    traderName: user.fullName,
    traderEmail: user.email,
  };

  demoStore.trades.unshift(demoTrade);

  if (account) {
    account.availableBalance = newAvailable.toFixed(2);
    account.lockedMargin = newLocked.toFixed(2);
  }

  return {
    trade: demoTrade,
    account: {
      availableBalance: newAvailable,
      lockedMargin: newLocked,
    },
    ledgerEntry: { id: `led_${Date.now()}` },
  };
}

export async function executeCloseTrade(
  params: { tradeId: string; userId: string },
  client = defaultPrisma
) {
  const { tradeId, userId } = params;

  try {
    const trade = await client.trade.findUnique({
      where: { id: tradeId },
      include: { instrument: true, account: true },
    });

    if (trade && trade.status === TradeStatus.OPEN) {
      const quote = getLiveQuote(trade.instrument.symbol);
      const exitPrice = trade.direction === TradeDirection.BUY ? quote.bid : quote.ask;
      const { pnlKes } = calculatePnL(
        trade.direction,
        trade.entryPrice,
        exitPrice,
        trade.instrument.contractSize,
        trade.lotSize,
        trade.instrument.symbol
      );

      return await client.$transaction(async (tx) => {
        const releasedMargin = trade.marginRequired;
        const account = await tx.account.findUniqueOrThrow({ where: { id: trade.accountId } });

        const newAvailable = account.availableBalance.add(releasedMargin).add(pnlKes);
        const newLocked = account.lockedMargin.minus(releasedMargin);
        const newEquity = account.equity.add(pnlKes);

        const updatedAccount = await tx.account.update({
          where: { id: account.id },
          data: {
            availableBalance: newAvailable,
            lockedMargin: newLocked.lessThan(0) ? new Prisma.Decimal(0) : newLocked,
            equity: newEquity,
          },
        });

        const updatedTrade = await tx.trade.update({
          where: { id: trade.id },
          data: { exitPrice, pnl: pnlKes, status: TradeStatus.CLOSED, closedAt: new Date() },
        });

        return { trade: updatedTrade, account: updatedAccount };
      });
    }
  } catch {
    // Fallback: Demo Store
  }

  const dTrade = demoStore.trades.find((t) => t.id === tradeId);
  if (!dTrade) {
    throw new Error("Trade position not found.");
  }
  if (dTrade.status !== "OPEN") {
    throw new Error("Trade is already closed.");
  }

  const quote = getLiveQuote(dTrade.symbol);
  const exitPrice = dTrade.direction === "BUY" ? quote.bid : quote.ask;
  const { pnlKes } = calculatePnL(
    dTrade.direction as TradeDirection,
    new Prisma.Decimal(dTrade.entryPrice),
    exitPrice,
    quote.contractSize,
    new Prisma.Decimal(dTrade.lotSize),
    dTrade.symbol
  );

  dTrade.status = "CLOSED";
  dTrade.exitPrice = exitPrice.toString();
  dTrade.pnl = pnlKes.toString();
  dTrade.closedAt = new Date();

  const memUser = demoStore.users.get(userId);
  const isTradeDemo = dTrade.isDemo !== false;
  let updatedAcc: any = null;
  if (memUser && memUser.accounts.length > 0) {
    updatedAcc = memUser.accounts.find((a) => a.isDemo === isTradeDemo) || memUser.accounts[0];
    const released = new Prisma.Decimal(dTrade.marginRequired);
    const newAvail = new Prisma.Decimal(updatedAcc.availableBalance).add(released).add(pnlKes);
    const newLock = new Prisma.Decimal(updatedAcc.lockedMargin).minus(released);
    updatedAcc.availableBalance = newAvail.toFixed(2);
    updatedAcc.lockedMargin = newLock.lessThan(0) ? "0.00" : newLock.toFixed(2);
    updatedAcc.equity = newAvail.add(new Prisma.Decimal(updatedAcc.lockedMargin)).toFixed(2);
  }

  const fallbackAcc = updatedAcc || memUser?.accounts[0];
  return {
    trade: dTrade,
    account: {
      availableBalance: fallbackAcc ? new Prisma.Decimal(fallbackAcc.availableBalance) : pnlKes,
      lockedMargin: fallbackAcc ? new Prisma.Decimal(fallbackAcc.lockedMargin) : new Prisma.Decimal("0.00"),
    },
  };
}
