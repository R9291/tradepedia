"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Info,
  Activity,
  Layers,
  XCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  DollarSign,
  Wallet,
  Sparkles,
  Search,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Flame,
  ArrowUpDown,
  History,
  RotateCcw,
  Target,
  BarChart3,
  Percent,
  Timer,
  Award,
  Calculator,
  Bell,
  Compass,
  CreditCard,
  Building2,
  QrCode,
  Receipt,
  ExternalLink,
  Shield,
  Globe,
} from "lucide-react";
import { DerivCandlestickChart } from "@/components/trading/DerivCandlestickChart";
import { getMarketStatus } from "@/lib/market-hours";
import { RiskCalculatorModal } from "@/components/trading/RiskCalculatorModal";
import { TechnicalAnalysisGauge } from "@/components/trading/TechnicalAnalysisGauge";
import { PriceAlertsModal, PriceAlert } from "@/components/trading/PriceAlertsModal";

interface OpenTrade {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  lotSize: string;
  entryPrice: string;
  currentPrice: string;
  stopLoss: string | null;
  takeProfit: string | null;
  marginRequired: string;
  floatingPnL: string;
  openedAt: string;
  dealCancellationUntil?: number; // timestamp
}

interface PendingLimitOrder {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  targetPrice: number;
  lotSize: number;
  placedAt: string;
  isDemo?: boolean;
}

interface DigitalContract {
  id: string;
  symbol: string;
  direction: "HIGHER" | "LOWER";
  entryPrice: number;
  stakeKes: number;
  payoutKes: number;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: number;
  isDemo?: boolean;
}

interface MarketTrade {
  id: string;
  time: string;
  price: string;
  amount: string;
  type: "BUY" | "SELL";
}

const AVAILABLE_ASSETS = [
  { symbol: "EURUSD", name: "EUR / USD", category: "Forex", basePrice: 1.08420, decimals: 5 },
  { symbol: "GBPUSD", name: "GBP / USD", category: "Forex", basePrice: 1.29820, decimals: 5 },
  { symbol: "USDJPY", name: "USD / JPY", category: "Forex", basePrice: 152.450, decimals: 3 },
  { symbol: "AUDUSD", name: "AUD / USD", category: "Forex", basePrice: 0.66520, decimals: 5 },
  { symbol: "USDCHF", name: "USD / CHF", category: "Forex", basePrice: 0.86520, decimals: 5 },
  { symbol: "USDCAD", name: "USD / CAD", category: "Forex", basePrice: 1.38220, decimals: 5 },
  { symbol: "USDKES", name: "USD / KES", category: "Forex", basePrice: 129.50, decimals: 2 },
  { symbol: "BTCUSD", name: "Bitcoin / USD", category: "Crypto", basePrice: 67450.00, decimals: 2 },
  { symbol: "ETHUSD", name: "Ethereum / USD", category: "Crypto", basePrice: 2640.50, decimals: 2 },
  { symbol: "SOLUSD", name: "Solana / USD", category: "Crypto", basePrice: 178.40, decimals: 2 },
  { symbol: "XAUUSD", name: "Gold / USD", category: "Commodities", basePrice: 2724.80, decimals: 2 },
  { symbol: "VOL_100", name: "Volatility 100 Index", category: "Synthetics", basePrice: 1850.40, decimals: 2 },
  { symbol: "BOOM_500", name: "Boom 500 Index", category: "Synthetics", basePrice: 4250.80, decimals: 2 },
  { symbol: "CRASH_500", name: "Crash 500 Index", category: "Synthetics", basePrice: 3180.20, decimals: 2 },
];

export default function DerivTraderPage({ params }: { params: { symbol: string } }) {
  const router = useRouter();
  const rawSymbol = (params.symbol || "EURUSD").toUpperCase();
  const currentAsset = AVAILABLE_ASSETS.find((a) => a.symbol === rawSymbol) || AVAILABLE_ASSETS[0];
  const symbol = currentAsset.symbol;

  // Deriv Trading Modes: MULTIPLIER (Spot Margin) vs DIGITAL_OPTIONS (Rise/Fall)
  const [contractMode, setContractMode] = useState<"MULTIPLIER" | "OPTIONS">("MULTIPLIER");
  const [executionType, setExecutionType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitTargetPrice, setLimitTargetPrice] = useState<string>("");

  // Multiplier / Spot parameters
  const [lotSize, setLotSize] = useState<number>(0.01);
  const [leverage, setLeverage] = useState<number>(500);
  const [stakePreset, setStakePreset] = useState<number>(250);
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [useSlTp, setUseSlTp] = useState<boolean>(false);
  const [dealCancellationDuration, setDealCancellationDuration] = useState<number>(0); // 0 (off), 15s, 30s, 60s

  // Digital Options (Rise / Fall) parameters
  const [optionsDuration, setOptionsDuration] = useState<number>(15); // 5s, 15s, 30s, 60s
  const [optionsStakeKes, setOptionsStakeKes] = useState<number>(1000);
  const [activeDigitalContracts, setActiveDigitalContracts] = useState<DigitalContract[]>([]);

  // Pending limit orders
  const [pendingOrders, setPendingOrders] = useState<PendingLimitOrder[]>([]);

  // Market quotes
  const [bid, setBid] = useState<number>(currentAsset.basePrice);
  const [ask, setAsk] = useState<number>(currentAsset.basePrice * 1.0002);
  const [mid, setMid] = useState<number>(currentAsset.basePrice);
  const [priceFlash, setPriceFlash] = useState<"UP" | "DOWN" | null>(null);

  // Sentiment ratio (Dynamic Bullish % vs Bearish %)
  const [bullishPercent, setBullishPercent] = useState<number>(64);

  // Account & Trades State
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [availableBalance, setAvailableBalance] = useState<string>("100000.00");
  const [equity, setEquity] = useState<string>("100000.00");
  const [accountType, setAccountType] = useState<"DEMO" | "REAL">("DEMO");
  const [demoBalance, setDemoBalance] = useState<string>("100000.00");
  const [realBalance, setRealBalance] = useState<string>("0.00");

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [customResetAmount, setCustomResetAmount] = useState<number>(100000);

  const switchAccount = (type: "DEMO" | "REAL") => {
    setAccountType(type);
    playSound("order");
    const bal = type === "REAL" ? realBalance : demoBalance;
    setAvailableBalance(bal);
    setEquity(bal);
    if (type === "REAL") {
      setSuccessMsg("✓ Switched to LIVE BROKER (Real Account). Live M-Pesa cash balance active.");
    } else {
      setSuccessMsg("✓ Switched to PAPER TRADING (Demo Account). Risk-free virtual simulation active.");
    }
    loadAccountAndTrades(type);
  };

  const [submitting, setSubmitting] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [depositPhone, setDepositPhone] = useState<string>("0712345678");
  const [depositing, setDepositing] = useState(false);
  const [resettingBalance, setResettingBalance] = useState(false);

  // Paystack Kenya Real-Time Payment Gateway State
  const [depositChannel, setDepositChannel] = useState<"PAYSTACK" | "STK" | "MPESA_MANUAL" | "INTASEND" | "FLUTTERWAVE">("PAYSTACK");
  const [gatewayMethod, setGatewayMethod] = useState<"MPESA" | "CARD" | "BANK">("MPESA");
  const [manualMpesaCode, setManualMpesaCode] = useState<string>("");
  const [gatewayEmail, setGatewayEmail] = useState<string>("trader@tradepedia.co.ke");
  const [pendingStkDepositId, setPendingStkDepositId] = useState<string | null>(null);
  const [pendingStkCheckoutId, setPendingStkCheckoutId] = useState<string | null>(null);
  const [stkStatusMessage, setStkStatusMessage] = useState<string | null>(null);
  const [reconcilingStk, setReconcilingStk] = useState<boolean>(false);

  // User Authentication State (Required before making any deposit or trading Real account)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [authFullName, setAuthFullName] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPhone, setAuthPhone] = useState<string>("0712345678");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [assetFilter, setAssetFilter] = useState<"ALL" | "Forex" | "Crypto" | "Commodities" | "Synthetics">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bottomTab, setBottomTab] = useState<"POSITIONS" | "PENDING" | "OPTIONS" | "HISTORY" | "ANALYTICS">("POSITIONS");
  const [sideTab, setSideTab] = useState<"TICKET" | "ORDERBOOK" | "TAPE" | "GAUGE">("TICKET");

  // Real-Time Price Alerts
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: "alt_1",
      symbol: "EURUSD",
      targetPrice: 1.0880,
      condition: "ABOVE",
      triggered: false,
      createdAt: "14:15",
    },
  ]);

  const handleAddAlert = (alertData: Omit<PriceAlert, "id" | "triggered" | "createdAt">) => {
    const newAlert: PriceAlert = {
      ...alertData,
      id: `alt_${Date.now()}`,
      triggered: false,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setSuccessMsg(`✓ Price alert created for ${alertData.symbol} at ${alertData.targetPrice}!`);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Simulated live tape of incoming institutional market executions
  const [recentTrades, setRecentTrades] = useState<MarketTrade[]>([]);

  // Audio feedback completely silenced per user preference
  const playSound = (_type: "order" | "close" | "win" | "loss") => {
    // Intentionally silent - no beeping sounds
  };

  const loadAccountAndTrades = async (activeType: "DEMO" | "REAL" = accountType) => {
    try {
      const [sumRes, tradesRes, historyRes] = await Promise.all([
        fetch("/api/account/summary"),
        fetch(`/api/trades/open?accountType=${activeType}`),
        fetch(`/api/trades/history?accountType=${activeType}`),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        if (sumData?.data) {
          const authFlag = Boolean(sumData.data.isAuthenticated);
          setIsAuthenticated(authFlag);
          if (authFlag && sumData.data.user) {
            setCurrentUser(sumData.data.user);
            if (sumData.data.user.phone) setDepositPhone(sumData.data.user.phone);
            if (sumData.data.user.email) setGatewayEmail(sumData.data.user.email);
          } else {
            setCurrentUser(null);
          }

          setKycStatus(sumData.data.compliance.kycStatus);
          const demoBal = sumData.data.demoAccount?.availableBalance || "100000.00";
          const serverReal = parseFloat(sumData.data.realAccount?.availableBalance || "0");
          const localReal = parseFloat(
            (typeof window !== "undefined" && localStorage.getItem("tradepedia_real_balance")) || "0"
          );
          const resolvedReal = Math.max(serverReal, localReal).toFixed(2);
          if (typeof window !== "undefined") {
            localStorage.setItem("tradepedia_real_balance", resolvedReal);
          }
          const realBal = resolvedReal;
          setDemoBalance(demoBal);
          setRealBalance(realBal);

          const currentBal = activeType === "REAL" ? realBal : demoBal;
          setAvailableBalance(currentBal);
          setEquity(currentBal);
        }
      }

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        if (tradesData?.data?.openTrades) {
          setOpenTrades(tradesData.data.openTrades);
        } else {
          setOpenTrades([]);
        }
      }

      if (historyRes.ok) {
        const histData = await historyRes.json();
        if (histData?.data?.trades) {
          setClosedTrades(histData.data.trades);
        } else {
          setClosedTrades([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAccountAndTrades();

    const handleBalanceEvent = (e: any) => {
      if (e.detail?.balance !== undefined) {
        const b = Number(e.detail.balance).toFixed(2);
        setRealBalance(b);
        if (accountType === "REAL") {
          setAvailableBalance(b);
          setEquity(b);
        }
      }
    };
    window.addEventListener("tradepedia_balance_updated", handleBalanceEvent);
    window.addEventListener("storage", handleBalanceEvent);
    return () => {
      window.removeEventListener("tradepedia_balance_updated", handleBalanceEvent);
      window.removeEventListener("storage", handleBalanceEvent);
    };
  }, [accountType]);

  // High-Frequency SSE Tick Stream (Every 350ms)
  useEffect(() => {
    let lastMid = mid;
    const eventSource = new EventSource("/api/prices/stream");

    eventSource.onmessage = (event) => {
      try {
        const quotes = JSON.parse(event.data);
        const thisQuote = quotes.find((q: any) => q.symbol === symbol);
        if (thisQuote) {
          const currentBid = parseFloat(thisQuote.bid);
          const currentAsk = parseFloat(thisQuote.ask);
          const currentMid = parseFloat(thisQuote.mid);

          if (currentMid > lastMid) setPriceFlash("UP");
          else if (currentMid < lastMid) setPriceFlash("DOWN");
          setTimeout(() => setPriceFlash(null), 350);

          lastMid = currentMid;
          setBid(currentBid);
          setAsk(currentAsk);
          setMid(currentMid);

          // Micro sentiment jitter
          setBullishPercent((prev) => Math.min(85, Math.max(25, prev + (Math.random() - 0.5) * 1.5)));

          // Check pending limit orders for execution
          setPendingOrders((prevPending) => {
            const remaining: PendingLimitOrder[] = [];
            prevPending.forEach((po) => {
              const triggered =
                po.direction === "BUY" ? currentAsk <= po.targetPrice : currentBid >= po.targetPrice;
              if (triggered) {
                // Execute limit order
                executeOrder(po.direction, po.lotSize, po.targetPrice);
                playSound("order");
                setSuccessMsg(`✓ Limit Order Triggered & Filled: ${po.direction} ${po.lotSize} lots @ ${po.targetPrice}`);
              } else {
                remaining.push(po);
              }
            });
            return remaining;
          });

          // Random tape trade execution
          if (Math.random() < 0.4) {
            const isBuy = Math.random() > 0.48;
            const newTapeTrade: MarketTrade = {
              id: `tr_${Date.now()}_${Math.random()}`,
              time: new Date().toLocaleTimeString(),
              price: (isBuy ? currentAsk : currentBid).toFixed(currentAsset.decimals),
              amount: (0.01 + Math.random() * 0.45).toFixed(2),
              type: isBuy ? "BUY" : "SELL",
            };
            setRecentTrades((prev) => [newTapeTrade, ...prev.slice(0, 15)]);
          }

          // Update floating PnL on open positions
          setOpenTrades((prev) =>
            prev.map((trade) => {
              if (trade.symbol !== symbol) return trade;
              const entry = parseFloat(trade.entryPrice);
              const lots = parseFloat(trade.lotSize);
              const isBuy = trade.direction === "BUY";
              const currentPrice = isBuy ? currentBid : currentAsk;
              const contractMultiplier = symbol.includes("BTC") || symbol.includes("ETH") ? 1 : 100000;
              const pipDifference = (currentPrice - entry) * (isBuy ? 1 : -1);
              const usdPnl = pipDifference * lots * contractMultiplier;
              const kesPnl = (usdPnl * 129.5).toFixed(2);

              return {
                ...trade,
                currentPrice: currentPrice.toString(),
                floatingPnL: kesPnl,
              };
            })
          );

          // Evaluate live price alerts
          setAlerts((prevAlerts) =>
            prevAlerts.map((alt) => {
              if (alt.symbol === symbol && !alt.triggered) {
                if (alt.condition === "ABOVE" && currentMid >= alt.targetPrice) {
                  playSound("win");
                  setSuccessMsg(`🔔 PRICE ALERT: ${alt.symbol} reached target rate ${currentMid}!`);
                  return { ...alt, triggered: true };
                }
                if (alt.condition === "BELOW" && currentMid <= alt.targetPrice) {
                  playSound("win");
                  setSuccessMsg(`🔔 PRICE ALERT: ${alt.symbol} reached target rate ${currentMid}!`);
                  return { ...alt, triggered: true };
                }
              }
              return alt;
            })
          );
        }
      } catch (err) {
        console.error("SSE error:", err);
      }
    };

    return () => eventSource.close();
  }, [symbol]);

  // Digital Contracts Countdown & Settlement Loop
  useEffect(() => {
    if (activeDigitalContracts.length === 0) return;

    const timer = setInterval(() => {
      setActiveDigitalContracts((prev) => {
        const next: DigitalContract[] = [];
        prev.forEach((contract) => {
          if (contract.remainingSeconds <= 1) {
            // Settle Digital Contract
            const isWin =
              contract.direction === "HIGHER" ? mid > contract.entryPrice : mid < contract.entryPrice;

            if (isWin) {
              playSound("win");
              setSuccessMsg(
                `🎉 CONTRACT WON (+95.5%)! Payout of KES ${contract.payoutKes.toLocaleString()} credited to your balance.`
              );
              // Credit balance
              setAvailableBalance((b) => (parseFloat(b) + contract.payoutKes).toFixed(2));
            } else {
              playSound("close");
              setErrorMsg(`Contract Expired: Spot price closed ${contract.direction === "HIGHER" ? "below" : "above"} entry barrier.`);
            }
          } else {
            next.push({ ...contract, remainingSeconds: contract.remainingSeconds - 1 });
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeDigitalContracts, mid]);

  // Margin calculation
  const contractSize =
    currentAsset.category === "Forex" ? 100000 : currentAsset.symbol === "XAUUSD" ? 100 : 1;
  const notionalUsd = (contractSize * lotSize * mid) / leverage;
  const estimatedMarginKes = (notionalUsd * 129.5).toFixed(2);

  // Digital Options Potential Payout (95.5% Deriv Return)
  const optionsPayoutKes = Math.floor(optionsStakeKes * 1.955);

  const handleStakePreset = (stakeInKes: number) => {
    setStakePreset(stakeInKes);
    const calculatedLots = (stakeInKes * leverage) / (contractSize * mid * 129.5);
    setLotSize(parseFloat(Math.max(0.01, calculatedLots).toFixed(2)));
  };

  // 1-Click Order Execution (Market or Limit)
  const executeOrder = async (orderDirection: "BUY" | "SELL", customLot?: number, customPrice?: number) => {
    if (kycStatus !== "APPROVED") {
      setErrorMsg("KYC verification is required. Click 'Fast-Track KYC' above for instant clearance.");
      return;
    }

    const currentMarketStatus = getMarketStatus(symbol);
    if (!currentMarketStatus.isOpen && executionType === "MARKET" && !customPrice) {
      setErrorMsg(`Market for ${symbol} is currently closed (${currentMarketStatus.tradingHoursLabel}). ${currentMarketStatus.nextEventLabel}. You can place a Pending Limit Order or trade 24/7 Crypto.`);
      return;
    }

    // Require Login or Registration before trading Real Broker account
    if (accountType === "REAL" && !isAuthenticated) {
      setErrorMsg("Please log in or register an account before making a deposit or placing Real Broker trades.");
      setIsDepositModalOpen(true);
      return;
    }

    // Live Broker Balance Check (TradingView Unfunded Prompt)
    if (accountType === "REAL" && parseFloat(realBalance) < parseFloat(estimatedMarginKes)) {
      setErrorMsg(
        `Live Broker account has insufficient funds (Available: KES ${parseFloat(realBalance).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}, Required Margin: KES ${estimatedMarginKes}). Deposit via M-Pesa or switch to Paper Trading.`
      );
      setIsDepositModalOpen(true);
      return;
    }

    // Limit Order Branch
    if (executionType === "LIMIT" && !customPrice) {
      const target = parseFloat(limitTargetPrice);
      if (!target || isNaN(target)) {
        setErrorMsg("Please enter a valid target price for the limit order.");
        return;
      }
      const newOrder: PendingLimitOrder = {
        id: `lmt_${Date.now()}`,
        symbol,
        direction: orderDirection,
        targetPrice: target,
        lotSize,
        placedAt: new Date().toLocaleTimeString(),
        isDemo: accountType === "DEMO",
      };
      setPendingOrders((prev) => [newOrder, ...prev]);
      setSuccessMsg(`✓ Pending Limit Order placed [${accountType === "DEMO" ? "Paper Trading" : "Live Real"}]: ${orderDirection} ${lotSize} lots @ ${target}`);
      setLimitTargetPrice("");
      setBottomTab("PENDING");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          direction: orderDirection,
          lotSize: customLot || lotSize,
          stopLoss: useSlTp && stopLoss ? parseFloat(stopLoss) : null,
          takeProfit: useSlTp && takeProfit ? parseFloat(takeProfit) : null,
          accountType,
          isDemo: accountType === "DEMO",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order execution failed");

      playSound("order");
      const executedTrade = data.data;
      if (dealCancellationDuration > 0 && executedTrade?.tradeId) {
        executedTrade.dealCancellationUntil = Date.now() + dealCancellationDuration * 1000;
      }

      setSuccessMsg(`✓ [${accountType === "DEMO" ? "Paper Trading" : "Live Real"}] ${orderDirection} order filled! ${lotSize} lots @ ${orderDirection === "BUY" ? ask : bid}`);
      await loadAccountAndTrades(accountType);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Digital Options Contract (Rise / Fall)
  const executeDigitalOption = (direction: "HIGHER" | "LOWER") => {
    if (accountType === "REAL" && !isAuthenticated) {
      setErrorMsg("Please log in or register an account before making a deposit or placing Real Broker trades.");
      setIsDepositModalOpen(true);
      return;
    }
    if (kycStatus !== "APPROVED") {
      setErrorMsg("KYC verification required. Click Fast-Track KYC above.");
      return;
    }
    const currentMarketStatus = getMarketStatus(symbol);
    if (!currentMarketStatus.isOpen) {
      setErrorMsg(`Market for ${symbol} is currently closed (${currentMarketStatus.tradingHoursLabel}). ${currentMarketStatus.nextEventLabel}. Trade 24/7 Crypto assets.`);
      return;
    }
    if (parseFloat(availableBalance) < optionsStakeKes) {
      setErrorMsg("Insufficient available funds for this digital contract stake.");
      return;
    }

    // Deduct stake from active account balance
    if (accountType === "REAL") {
      setRealBalance((b) => (parseFloat(b) - optionsStakeKes).toFixed(2));
      setAvailableBalance((b) => (parseFloat(b) - optionsStakeKes).toFixed(2));
    } else {
      setDemoBalance((b) => (parseFloat(b) - optionsStakeKes).toFixed(2));
      setAvailableBalance((b) => (parseFloat(b) - optionsStakeKes).toFixed(2));
    }

    const contract: DigitalContract = {
      id: `opt_${Date.now()}`,
      symbol,
      direction,
      entryPrice: mid,
      stakeKes: optionsStakeKes,
      payoutKes: optionsPayoutKes,
      durationSeconds: optionsDuration,
      remainingSeconds: optionsDuration,
      startedAt: Date.now(),
      isDemo: accountType === "DEMO",
    };

    setActiveDigitalContracts((prev) => [contract, ...prev]);
    setBottomTab("OPTIONS");
    playSound("order");
    setSuccessMsg(`✓ [${accountType === "DEMO" ? "Paper" : "Live"}] ${direction} Digital Contract opened! Entry Barrier: ${mid}. Settles in ${optionsDuration}s.`);
  };

  // Close Position with Deal Cancellation Check
  const handleCloseTrade = async (trade: OpenTrade) => {
    setClosingId(trade.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const isWithinDealCancellation =
      trade.dealCancellationUntil && Date.now() < trade.dealCancellationUntil;

    try {
      const res = await fetch(`/api/trades/${trade.id}/close`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close position");

      playSound("close");
      if (isWithinDealCancellation) {
        setSuccessMsg(`✓ Deal Cancellation Exercised: 100% of stake refunded! Position closed risk-free.`);
      } else {
        setSuccessMsg(`✓ Position liquidated. Realized PnL: KES ${data.data?.realizedPnL || "0.00"}`);
      }
      await loadAccountAndTrades(accountType);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setClosingId(null);
    }
  };

  // Emergency Close All (for active account)
  const handleCloseAllPositions = async () => {
    const tradesToClose = openTradesForCurrentAccount;
    if (tradesToClose.length === 0) return;
    setClosingId("ALL");
    try {
      for (const t of tradesToClose) {
        await fetch(`/api/trades/${t.id}/close`, { method: "POST" });
      }
      playSound("close");
      setSuccessMsg(`✓ Liquidated all ${tradesToClose.length} [${accountType === "DEMO" ? "Paper" : "Live"}] positions at market prices.`);
      await loadAccountAndTrades(accountType);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setClosingId(null);
    }
  };

  // TradingView Style: Reset Paper Trading Account Balance
  const handleResetDemoBalance = async (customAmount: number = customResetAmount) => {
    setResettingBalance(true);
    try {
      const res = await fetch("/api/account/reset-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: customAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      const formatted = customAmount.toFixed(2);
      setDemoBalance(formatted);
      if (accountType === "DEMO") {
        setAvailableBalance(formatted);
        setEquity(formatted);
      }
      setIsResetModalOpen(false);
      playSound("win");
      setSuccessMsg(`✓ Paper Trading account reset to KES ${customAmount.toLocaleString()}.00`);
      await loadAccountAndTrades("DEMO");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setResettingBalance(false);
    }
  };

  // Direct M-Pesa STK Push Deposit (powered silently in the backend by Paystack Charge API)
  const handleQuickDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositing(true);
    setErrorMsg(null);
    setStkStatusMessage(null);
    try {
      const res = await fetch("/api/deposits/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: depositAmount,
          phoneNumber: depositPhone,
          email: gatewayEmail || currentUser?.email || "trader@tradepedia.co.ke",
          mode: "MPESA_STK",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "M-Pesa STK Push failed");

      const ref = data.data?.reference || null;
      setPendingStkDepositId(ref);
      setPendingStkCheckoutId(ref);

      // If the gateway already confirmed completion immediately, verify and credit right away
      if (data.data?.status === "success" && ref) {
        await handleReconcileStk(ref);
        return;
      }

      setStkStatusMessage(
        data.data?.displayText ||
          `M-Pesa STK Push sent to ${depositPhone}. Please enter your M-Pesa PIN on your phone, then click "Confirm M-Pesa Payment" below.`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDepositing(false);
    }
  };

  // Verify Paystack Kenya transaction server-to-server (GET https://api.paystack.co/transaction/verify/:reference)
  const handleReconcileStk = async (customRef?: string) => {
    const refToVerify = customRef || pendingStkCheckoutId || pendingStkDepositId;
    if (!refToVerify) return;
    setReconcilingStk(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/deposits/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: refToVerify }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStkStatusMessage(data.error || "Payment not yet completed on Paystack.");
        return;
      }

      if (data.data?.status === "SUCCESSFUL") {
        const newBal = data.data?.newRealBalance || (parseFloat(realBalance) + depositAmount).toFixed(2);
        setRealBalance(newBal);
        setAccountType("REAL");
        setAvailableBalance(newBal);
        setEquity(newBal);
        if (typeof window !== "undefined") {
          localStorage.setItem("tradepedia_real_balance", newBal);
          window.dispatchEvent(
            new CustomEvent("tradepedia_balance_updated", { detail: { balance: parseFloat(newBal) } })
          );
        }
        setSuccessMsg(
          `✓ Payment to TRADEPEDIA Confirmed! KES ${depositAmount.toLocaleString()} credited to your Real Broker account (Receipt: ${data.data.receipt}).`
        );
        setPendingStkDepositId(null);
        setPendingStkCheckoutId(null);
        setStkStatusMessage(null);
        setIsDepositModalOpen(false);
        await loadAccountAndTrades("REAL");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setReconcilingStk(false);
    }
  };

  // Automated Polling for Quick Deposit M-Pesa Confirmation
  useEffect(() => {
    if (!pendingStkCheckoutId) return;

    let isPolling = false;
    const interval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        await handleReconcileStk(pendingStkCheckoutId);
      } catch (e) {
        console.error("Terminal STK polling error:", e);
      } finally {
        isPolling = false;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [pendingStkCheckoutId, depositAmount, realBalance]);

  // Launch Official Paystack Kenya Inline Checkout Popup (M-Pesa Express, Airtel Money, Card, Bank)
  const handlePaystackCheckout = async () => {
    setDepositing(true);
    setErrorMsg(null);
    try {
      // 1. Initialize transaction on backend (verifies auth + creates pending deposit + returns publicKey & reference)
      const res = await fetch("/api/deposits/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: depositAmount,
          phoneNumber: depositPhone,
          email: gatewayEmail || currentUser?.email || "trader@tradepedia.co.ke",
          mode: "CHECKOUT",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize Paystack checkout");

      const serverPubKey = data.data?.publicKey || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      const ref = data.data?.reference || `TP_PSK_${Date.now()}`;
      setPendingStkCheckoutId(ref);
      if (data.data?.depositId) {
        setPendingStkDepositId(data.data.depositId);
      }

      if (serverPubKey && !serverPubKey.startsWith("pk_placeholder")) {
        await new Promise<void>((resolve, reject) => {
          const openPopup = () => {
            const win = window as any;
            if (!win.PaystackPop) {
              if (data.data?.authorizationUrl) {
                window.open(data.data.authorizationUrl, "_blank", "noopener,noreferrer");
                resolve();
                return;
              }
              reject(new Error("Could not load Paystack Inline SDK."));
              return;
            }
            const handler = win.PaystackPop.setup({
              key: serverPubKey,
              email: gatewayEmail || currentUser?.email || "trader@tradepedia.co.ke",
              amount: Math.round(depositAmount * 100), // KES cents
              currency: "KES",
              ref,
              channels: ["mobile_money", "card", "bank", "bank_transfer"],
              metadata: {
                custom_fields: [
                  {
                    display_name: "M-Pesa Phone Number",
                    variable_name: "phone_number",
                    value: depositPhone,
                  },
                ],
              },
              callback: (response: { reference: string }) => {
                handleReconcileStk(response.reference).then(() => resolve()).catch(reject);
              },
              onClose: () => {
                setStkStatusMessage(
                  `Paystack session (${ref}) is still open. If you completed payment, click "Verify Paystack Payment Status Now" below.`
                );
                resolve();
              },
            });
            handler.openIframe();
          };

          if ((window as any).PaystackPop) {
            openPopup();
          } else {
            const script = document.createElement("script");
            script.src = "https://js.paystack.co/v1/inline.js";
            script.onload = openPopup;
            script.onerror = () => {
              if (data.data?.authorizationUrl) {
                window.open(data.data.authorizationUrl, "_blank", "noopener,noreferrer");
                resolve();
              } else {
                reject(new Error("Failed to load Paystack script from js.paystack.co"));
              }
            };
            document.body.appendChild(script);
          }
        });
        return;
      }

      if (data.data?.authorizationUrl) {
        setStkStatusMessage(
          `Paystack Checkout opened in a new tab (Ref: ${ref}). Once you complete your M-Pesa or Card payment, click "Verify Paystack Payment Status Now" below.`
        );
        window.open(data.data.authorizationUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDepositing(false);
    }
  };

  // Real Third-Party Kenyan Payment Gateway Verification (IntaSend, Flutterwave, Manual M-Pesa)
  const handleGatewayPayment = async (provider: "INTASEND" | "FLUTTERWAVE" | "MPESA_MANUAL" | "STK") => {
    setDepositing(true);
    setErrorMsg(null);
    try {
      // 1. If IntaSend Live Public Key is configured and user hasn't entered a manual receipt code yet, launch real IntaSend Inline SDK
      const intasendPubKey = process.env.NEXT_PUBLIC_INTASEND_PUBLIC_KEY;
      if (provider === "INTASEND" && intasendPubKey && !manualMpesaCode.trim()) {
        await new Promise<void>((resolve, reject) => {
          const launchIntaSend = () => {
            const win = window as any;
            if (!win.IntaSend) {
              reject(new Error("Failed to load IntaSend Checkout SDK."));
              return;
            }
            const instance = new win.IntaSend({
              publicAPIKey: intasendPubKey,
              live: process.env.NEXT_PUBLIC_INTASEND_LIVE === "true",
            });
            instance
              .run({
                amount: depositAmount,
                currency: "KES",
                email: gatewayEmail,
                phone_number: depositPhone,
                api_ref: `TP_${Date.now()}`,
              })
              .on("COMPLETE", async (results: any) => {
                const invoiceId = results?.invoice?.invoice_id || results?.tracking_id || `IS_${Date.now()}`;
                const mpesaRef = results?.invoice?.mpesa_reference || invoiceId;
                const vRes = await fetch("/api/deposits/gateway/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    provider: "INTASEND",
                    amount: depositAmount,
                    transactionId: invoiceId,
                    receiptNumber: mpesaRef,
                    phoneNumber: depositPhone,
                    paymentMethod: gatewayMethod,
                  }),
                });
                const vData = await vRes.json();
                if (!vRes.ok) {
                  reject(new Error(vData.error || "IntaSend verification failed"));
                  return;
                }
                const newBal = vData.data?.newRealBalance || (parseFloat(realBalance) + depositAmount).toFixed(2);
                setRealBalance(newBal);
                if (accountType === "REAL") {
                  setAvailableBalance(newBal);
                  setEquity(newBal);
                }
                setSuccessMsg(`✓ IntaSend Payment Confirmed! KES ${depositAmount.toLocaleString()} credited to Real Broker account (Ref: ${mpesaRef}).`);
                setIsDepositModalOpen(false);
                await loadAccountAndTrades(accountType);
                resolve();
              })
              .on("FAILED", () => {
                reject(new Error("IntaSend payment failed or was cancelled."));
              });
          };

          if ((window as any).IntaSend) {
            launchIntaSend();
          } else {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/intasend-inlinejs-sdk@3.0.4/build/intasend-inline.js";
            script.onload = launchIntaSend;
            script.onerror = () => reject(new Error("Unable to load IntaSend SDK."));
            document.body.appendChild(script);
          }
        });
        return;
      }

      // 2. If Flutterwave Live Public Key is configured and user hasn't entered a manual receipt code yet, launch real Flutterwave Checkout
      const flwPubKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
      if (provider === "FLUTTERWAVE" && flwPubKey && !manualMpesaCode.trim()) {
        await new Promise<void>((resolve, reject) => {
          const launchFlw = () => {
            const win = window as any;
            if (!win.FlutterwaveCheckout) {
              reject(new Error("Failed to load Flutterwave Checkout SDK."));
              return;
            }
            win.FlutterwaveCheckout({
              public_key: flwPubKey,
              tx_ref: `TP_FLW_${Date.now()}`,
              amount: depositAmount,
              currency: "KES",
              payment_options: "mpesa,card,banktransfer",
              customer: {
                email: gatewayEmail,
                phone_number: depositPhone,
                name: currentUser?.fullName || "Tradepedia Trader",
              },
              callback: async (payment: any) => {
                if (payment.status === "successful" || payment.status === "completed") {
                  const txId = String(payment.transaction_id || payment.tx_ref);
                  const flwRef = String(payment.flw_ref || txId);
                  const vRes = await fetch("/api/deposits/gateway/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      provider: "FLUTTERWAVE",
                      amount: depositAmount,
                      transactionId: txId,
                      receiptNumber: flwRef,
                      phoneNumber: depositPhone,
                    }),
                  });
                  const vData = await vRes.json();
                  if (!vRes.ok) {
                    reject(new Error(vData.error || "Flutterwave verification failed"));
                    return;
                  }
                  const newBal = vData.data?.newRealBalance || (parseFloat(realBalance) + depositAmount).toFixed(2);
                  setRealBalance(newBal);
                  if (accountType === "REAL") {
                    setAvailableBalance(newBal);
                    setEquity(newBal);
                  }
                  setSuccessMsg(`✓ Flutterwave Payment Confirmed! KES ${depositAmount.toLocaleString()} credited to Real Broker account (Ref: ${flwRef}).`);
                  setIsDepositModalOpen(false);
                  await loadAccountAndTrades(accountType);
                  resolve();
                } else {
                  reject(new Error("Flutterwave payment was not completed."));
                }
              },
              onclose: () => {
                resolve();
              },
            });
          };

          if ((window as any).FlutterwaveCheckout) {
            launchFlw();
          } else {
            const script = document.createElement("script");
            script.src = "https://checkout.flutterwave.com/v3.js";
            script.onload = launchFlw;
            script.onerror = () => reject(new Error("Unable to load Flutterwave SDK."));
            document.body.appendChild(script);
          }
        });
        return;
      }

      // 3. Verify using the actual 10-character M-Pesa / Gateway Receipt Code entered by the user
      const cleanCode = manualMpesaCode.trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9]{9}$/.test(cleanCode)) {
        throw new Error(
          "Please enter your real 10-character Safaricom M-Pesa or Gateway Receipt Code (e.g. SK92LM40KP) from your payment confirmation SMS to verify and credit your deposit."
        );
      }

      const res = await fetch("/api/deposits/gateway/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          amount: depositAmount,
          currency: "KES",
          transactionId: `${provider}_${cleanCode}`,
          receiptNumber: cleanCode,
          phoneNumber: depositPhone,
          paymentMethod: gatewayMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment verification failed");

      const newBal = data.data?.newRealBalance || (parseFloat(realBalance) + depositAmount).toFixed(2);
      setRealBalance(newBal);
      if (accountType === "REAL") {
        setAvailableBalance(newBal);
        setEquity(newBal);
      }

      setSuccessMsg(`✓ Deposit of KES ${depositAmount.toLocaleString()} verified (${cleanCode}) & credited to your Real Broker account!`);
      setIsDepositModalOpen(false);
      setManualMpesaCode("");
      await loadAccountAndTrades(accountType);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDepositing(false);
    }
  };

  // In-Terminal Login / Register Handler (Required before making any deposit)
  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const endpoint = authMode === "LOGIN" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        authMode === "LOGIN"
          ? { email: authEmail.trim(), password: authPassword }
          : {
              fullName: authFullName.trim(),
              email: authEmail.trim(),
              phone: authPhone.trim(),
              password: authPassword,
              confirmPassword: authPassword,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setIsAuthenticated(true);
      setAccountType("REAL");
      if (data.data?.user) {
        setCurrentUser(data.data.user);
        if (data.data.user.phone) setDepositPhone(data.data.user.phone);
        if (data.data.user.email) setGatewayEmail(data.data.user.email);
      }
      setAuthPassword("");
      setSuccessMsg(
        authMode === "LOGIN"
          ? `✓ Welcome back! Switched to your Real Broker account.`
          : `✓ Account created & verified! Switched to your Real Broker account.`
      );
      await loadAccountAndTrades("REAL");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAccountType("DEMO");
      setSuccessMsg("✓ Signed out. Switched to Guest Paper Trading mode.");
      await loadAccountAndTrades("DEMO");
    } catch (e) {
      console.error(e);
    }
  };

  // TradingView Account Summary Metrics (Computed in Real-Time for Active Account)
  const openTradesForCurrentAccount = openTrades.filter(
    (t: any) => (t.isDemo !== undefined ? t.isDemo : true) === (accountType === "DEMO")
  );
  const closedTradesForCurrentAccount = closedTrades.filter(
    (t: any) => (t.isDemo !== undefined ? t.isDemo : true) === (accountType === "DEMO")
  );
  const pendingOrdersForCurrentAccount = pendingOrders.filter(
    (po) => (po.isDemo !== undefined ? po.isDemo : true) === (accountType === "DEMO")
  );
  const activeDigitalContractsForCurrentAccount = activeDigitalContracts.filter(
    (dc) => (dc.isDemo !== undefined ? dc.isDemo : true) === (accountType === "DEMO")
  );

  const totalOpenFloatingPnL = openTradesForCurrentAccount.reduce(
    (sum, t) => sum + parseFloat(t.floatingPnL || "0"),
    0
  );
  const totalMarginLocked = openTradesForCurrentAccount.reduce(
    (sum, t) => sum + parseFloat(t.marginRequired || "0"),
    0
  );
  const activeAccountBalance = parseFloat(accountType === "REAL" ? realBalance : demoBalance);
  const activeAccountEquity = activeAccountBalance + totalOpenFloatingPnL;
  const availableMargin = Math.max(0, activeAccountBalance - totalMarginLocked);

  // Performance Analytics calculation
  const totalWinningTrades = closedTradesForCurrentAccount.filter((t) => parseFloat(t.pnl || "0") > 0).length;
  const winRatePercent =
    closedTradesForCurrentAccount.length > 0 ? ((totalWinningTrades / closedTradesForCurrentAccount.length) * 100).toFixed(1) : "0.0";
  const netPnLTotal = closedTradesForCurrentAccount.reduce((acc, t) => acc + parseFloat(t.pnl || "0"), 0);

  const isKycApproved = kycStatus === "APPROVED";
  const filteredAssets = AVAILABLE_ASSETS.filter((a) => {
    const matchesCategory = assetFilter === "ALL" || a.category === assetFilter;
    const matchesSearch =
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Simulated Order Book Depths (5 levels)
  const spreadStep = (currentAsset.basePrice > 1000 ? 1.0 : 0.0001);
  const orderBookBids = [
    { price: (bid - spreadStep * 0).toFixed(currentAsset.decimals), size: 1.45, depth: 85 },
    { price: (bid - spreadStep * 1).toFixed(currentAsset.decimals), size: 2.10, depth: 70 },
    { price: (bid - spreadStep * 2).toFixed(currentAsset.decimals), size: 3.80, depth: 95 },
    { price: (bid - spreadStep * 3).toFixed(currentAsset.decimals), size: 0.90, depth: 40 },
    { price: (bid - spreadStep * 4).toFixed(currentAsset.decimals), size: 1.20, depth: 55 },
  ];
  const orderBookAsks = [
    { price: (ask + spreadStep * 0).toFixed(currentAsset.decimals), size: 1.15, depth: 65 },
    { price: (ask + spreadStep * 1).toFixed(currentAsset.decimals), size: 2.40, depth: 80 },
    { price: (ask + spreadStep * 2).toFixed(currentAsset.decimals), size: 0.75, depth: 35 },
    { price: (ask + spreadStep * 3).toFixed(currentAsset.decimals), size: 3.10, depth: 90 },
    { price: (ask + spreadStep * 4).toFixed(currentAsset.decimals), size: 1.85, depth: 75 },
  ];

  const marketStatus = getMarketStatus(symbol);

  return (
    <div className="flex-1 flex flex-col bg-[#050608] text-slate-100 min-h-screen">
      {/* Deriv Top Command Header */}
      <div className="border-b border-white/[0.08] bg-[#0a0b10]/95 backdrop-blur-xl px-2.5 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-4 sticky top-0 z-40">
        {/* Left: Asset Selector Pill (Deriv DTrader Style) & Mode Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] transition-all group shadow-inner"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#ff5722] to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-md shadow-[#ff5722]/20">
              {symbol.slice(0, 2)}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1 group-hover:text-[#ff5722] transition-colors">
                {currentAsset.name}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentAsset.category} • 1:{leverage}
              </span>
            </div>
          </button>

          {/* Accurate Market Trading Hours & Session Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                marketStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span
              className={`font-bold ${
                marketStatus.isOpen ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {marketStatus.statusLabel}
            </span>
            <span className="text-slate-400 text-[10px]">
              • {marketStatus.sessionName}
            </span>
          </div>

          {/* Deriv Contract Mode Selector (Multipliers vs Rise/Fall Options) */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-white/[0.08] text-[11px] sm:text-xs">
            <button
              onClick={() => setContractMode("MULTIPLIER")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                contractMode === "MULTIPLIER"
                  ? "bg-[#ff5722] text-white shadow-sm shadow-[#ff5722]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3 fill-white" />
              Multipliers
            </button>
            <button
              onClick={() => setContractMode("OPTIONS")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                contractMode === "OPTIONS"
                  ? "bg-[#ff5722] text-white shadow-sm shadow-[#ff5722]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Timer className="w-3 h-3" />
              Rise / Fall
            </button>
          </div>

          {/* Quick Real-Time Pulsing Price Meter */}
          <div className="hidden md:flex items-center gap-3 text-xs font-mono">
            <div
              className={`px-2.5 py-1 rounded-lg transition-colors duration-300 font-bold ${
                priceFlash === "UP"
                  ? "bg-[#089981]/25 text-[#089981]"
                  : priceFlash === "DOWN"
                  ? "bg-[#f23645]/25 text-[#f23645]"
                  : "bg-white/[0.03] text-white"
              }`}
            >
              MID: {mid.toFixed(currentAsset.decimals)}
            </div>
            <div className="flex items-center gap-1 text-[#089981] font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +0.34%
            </div>
          </div>
        </div>

        {/* Center / Right: Deriv Dual Account Switcher (Real vs Demo), Balance, & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto flex-wrap justify-end">
          {/* TradingView Dual Broker & Account Switcher */}
          <div className="flex items-center rounded-xl bg-slate-900/95 border border-white/[0.1] p-0.5 sm:p-1 shadow-md">
            {/* Demo (Paper Trading) Option */}
            <button
              type="button"
              onClick={() => switchAccount("DEMO")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 ${
                accountType === "DEMO"
                  ? "bg-gradient-to-r from-amber-500 to-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              <span>Demo</span>
              <span className="text-[10px] opacity-75 font-mono hidden sm:inline">(Paper)</span>
            </button>

            {/* Real (Live Broker) Option */}
            <button
              type="button"
              onClick={() => switchAccount("REAL")}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 ${
                accountType === "REAL"
                  ? "bg-[#089981] text-white shadow-md shadow-[#089981]/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real</span>
              <span className="text-[10px] opacity-75 font-mono hidden sm:inline">(Live)</span>
            </button>

            {/* Live Active Balance with Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(true)}
              className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono font-extrabold text-white flex items-center gap-1 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
              title="Click to view Account Manager"
            >
              <span
                className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded font-sans uppercase ${
                  accountType === "REAL"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {accountType === "REAL" ? "REAL" : "DEMO"}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-sans">KES</span>
              <span className="font-bold">
                {activeAccountBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* TradingView 1-Click Paper Reset Dialog Trigger */}
            {accountType === "DEMO" && (
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                title="TradingView: Reset Paper Trading Account"
                className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 text-amber-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resettingBalance ? "animate-spin text-[#ff5722]" : ""}`} />
                <span className="hidden xl:inline text-[10px] font-mono">Reset</span>
              </button>
            )}
          </div>

          {/* User Authentication Status Pill (Login / Register vs Signed In User) */}
          {isAuthenticated && currentUser ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-emerald-300 truncate max-w-[110px]">
                {currentUser.fullName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[10px] text-slate-400 hover:text-red-400 ml-1 underline"
                title="Sign Out"
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode("LOGIN");
                setIsDepositModalOpen(true);
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-white font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#089981]" />
              <span>Log In / Register</span>
            </button>
          )}

          {/* Instant In-Terminal Deposit Button */}
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 shadow-lg shadow-[#ff5722]/20 transition-all active:scale-95"
          >
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
            <span className="hidden xs:inline">Deposit</span>
            <span className="xs:hidden">Dep</span>
          </button>

          {/* Real-Time Price Alerts Bell */}
          <button
            onClick={() => setIsAlertsModalOpen(true)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-all relative"
            title="Manage Price Alerts"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            {alerts.filter((a) => !a.triggered).length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#ff5722] text-white text-[8px] font-black flex items-center justify-center font-mono">
                {alerts.filter((a) => !a.triggered).length}
              </span>
            )}
          </button>

          {/* Withdraw Info Button */}
          <button
            onClick={() => setIsWithdrawalModalOpen(true)}
            className="hidden sm:flex px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 hover:text-white text-xs font-bold border border-white/[0.08] transition-all"
          >
            Withdraw
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute trading audio" : "Enable trading audio"}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#089981]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* KYC Warning Banner if needed */}
      {!isKycApproved && (
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>KYC Clearance Required:</strong> You must verify identity credentials under CMA Kenya regulations.
            </span>
          </div>
          <Link
            href="/kyc"
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Fast-Track KYC &rarr;
          </Link>
        </div>
      )}

      {/* Notifications */}
      {errorMsg && (
        <div className="mx-4 mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white text-base">
            &times;
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mx-4 mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white text-base">
            &times;
          </button>
        </div>
      )}

      {/* Main Trading Floor Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 w-full">
        {/* Left Column: Interactive Pure Candlestick Chart (Deriv Engine) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-[340px] sm:h-[460px] lg:h-[640px]">
          <DerivCandlestickChart
            symbol={symbol}
            currentBid={bid}
            currentAsk={ask}
            currentMid={mid}
            openTrades={openTrades.map((t) => ({
              id: t.id,
              direction: t.direction,
              entryPrice: t.entryPrice,
              floatingPnL: t.floatingPnL,
            }))}
          />
        </div>

        {/* Right Column: Order Execution Ticket, Order Book & Market Tape */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-[#0a0b10] border border-white/[0.08] rounded-2xl p-4 space-y-3.5 shadow-2xl relative overflow-hidden">
          {/* Subtle fiery glow top accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff5722]/10 blur-3xl pointer-events-none" />

          {/* Ticket Header Navigation: Ticket vs Depth vs Tape */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/[0.06] text-[11px]">
              <button
                onClick={() => setSideTab("TICKET")}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  sideTab === "TICKET" ? "bg-[#ff5722] text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Ticket
              </button>
              <button
                onClick={() => setSideTab("ORDERBOOK")}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  sideTab === "ORDERBOOK" ? "bg-[#ff5722] text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Depth
              </button>
              <button
                onClick={() => setSideTab("TAPE")}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  sideTab === "TAPE" ? "bg-[#ff5722] text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                Tape
              </button>
              <button
                onClick={() => setSideTab("GAUGE")}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  sideTab === "GAUGE" ? "bg-[#ff5722] text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="TradingView Technical Sentiment Speedometer"
              >
                Gauge
              </button>
            </div>

            {/* Live Real-Time Market Sentiment Meter */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-[#089981] font-bold">{bullishPercent.toFixed(0)}% Buy</span>
              <span className="text-slate-500">/</span>
              <span className="text-[#f23645] font-bold">{(100 - bullishPercent).toFixed(0)}% Sell</span>
            </div>
          </div>

          {/* Live Sentiment Progress Bar */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-[#089981] transition-all duration-300" style={{ width: `${bullishPercent}%` }} />
            <div className="bg-[#f23645] transition-all duration-300" style={{ width: `${100 - bullishPercent}%` }} />
          </div>

          {/* Side Tab 1: Deriv Multiplier or Digital Options Ticket */}
          {sideTab === "TICKET" && (
            <div className="space-y-3">
              {/* Account Mode Execution Pill: Real vs Demo */}
              <div
                className={`p-2 rounded-xl border text-xs flex items-center justify-between font-mono ${
                  accountType === "REAL"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      accountType === "REAL" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  <span>{accountType === "REAL" ? "REAL TRADING (LIVE)" : "DEMO SIMULATION"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => switchAccount(accountType === "REAL" ? "DEMO" : "REAL")}
                  className="text-[10px] text-slate-300 hover:text-white underline decoration-dotted"
                >
                  Switch to {accountType === "REAL" ? "Demo" : "Real"}
                </button>
              </div>

              {/* Authentication Gate Banner for Real Account */}
              {accountType === "REAL" && !isAuthenticated && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Login or Register Required
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-mono">Auth Required</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    You must sign in or register an account before making any deposit or trading on a Real Broker account.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("LOGIN");
                        setIsDepositModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-[#ff5722]/20 transition-all active:scale-95"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Log In / Register
                    </button>
                    <button
                      type="button"
                      onClick={() => switchAccount("DEMO")}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
                    >
                      Paper Trade
                    </button>
                  </div>
                </div>
              )}

              {/* TradingView Unfunded Live Account Banner (Shown after Login/Registration) */}
              {accountType === "REAL" && isAuthenticated && parseFloat(realBalance) <= 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      Live Broker Unfunded (KES 0.00)
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-mono">Min KES 100</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Deposit funds via IntaSend, Flutterwave, or M-Pesa to trade live, or switch to Paper Trading to practice risk-free.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsDepositModalOpen(true)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-[#ff5722]/20 transition-all active:scale-95"
                    >
                      <Zap className="w-3 h-3 fill-white" />
                      Deposit Now
                    </button>
                    <button
                      type="button"
                      onClick={() => switchAccount("DEMO")}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
                    >
                      Paper Trade
                    </button>
                  </div>
                </div>
              )}

              {/* Accurate Market Closed Warning Pill if outside trading hours */}
              {!marketStatus.isOpen && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Market Closed: {marketStatus.sessionName}</span>
                  </div>
                  <p className="text-[10px] text-amber-200/90 leading-tight">
                    {symbol} ({currentAsset.category}): {marketStatus.tradingHoursLabel}. {marketStatus.nextEventLabel}. You can place Pending Limit Orders or switch to 24/7 Crypto assets.
                  </p>
                </div>
              )}

              {/* MODE A: DERIV MULTIPLIERS (Spot Margin) */}
              {contractMode === "MULTIPLIER" && (
                <>
                  {/* Execution Mode: Market vs Limit & Risk Calculator Button */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300">Order:</span>
                      <button
                        type="button"
                        onClick={() => setIsCalculatorOpen(true)}
                        className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-colors flex items-center gap-1 text-[10px] font-mono cursor-pointer"
                        title="Position Sizing & Risk Calculator"
                      >
                        <Calculator className="w-3 h-3 text-amber-400" />
                        Calc
                      </button>
                    </div>
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
                      <button
                        onClick={() => setExecutionType("MARKET")}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          executionType === "MARKET" ? "bg-[#ff5722] text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Market
                      </button>
                      <button
                        onClick={() => setExecutionType("LIMIT")}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          executionType === "LIMIT" ? "bg-[#ff5722] text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Pending Limit
                      </button>
                    </div>
                  </div>

                  {/* Limit Price Input if in Limit mode */}
                  {executionType === "LIMIT" && (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1">
                      <label className="text-[10px] text-amber-300 font-semibold block">
                        Target Trigger Price
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder={`Target rate (e.g. ${mid})`}
                        value={limitTargetPrice}
                        onChange={(e) => setLimitTargetPrice(e.target.value)}
                        className="w-full bg-slate-900 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  {/* Quick KES Stake Presets */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label className="font-semibold text-slate-300">Quick Stake (KES)</label>
                      <span className="text-[11px] text-[#ff5722] font-mono font-bold">
                        KES {stakePreset.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[1000, 2500, 5000, 10000, 25000, 50000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleStakePreset(amt)}
                          className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                            stakePreset === amt
                              ? "bg-[#ff5722] text-white border-[#ff5722] shadow-sm shadow-[#ff5722]/30"
                              : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]"
                          }`}
                        >
                          {amt >= 1000 ? `${amt / 1000}k` : amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Volume / Lot Size */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-300">Volume / Lot Size</label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {(lotSize * contractSize).toLocaleString()} units
                      </span>
                    </div>
                    <div className="flex items-center bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="5.0"
                        value={lotSize}
                        onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
                      />
                      <span className="text-slate-400 font-mono font-semibold">LOTS</span>
                    </div>
                  </div>

                  {/* Multiplier / Leverage Chips */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300">Multiplier / Leverage</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[10, 20, 50, 100].map((lev) => (
                        <button
                          key={lev}
                          type="button"
                          onClick={() => setLeverage(lev)}
                          className={`py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                            leverage === lev
                              ? "bg-slate-800 text-[#089981] border-[#089981]/50 shadow-sm"
                              : "bg-slate-950 text-slate-400 border-white/[0.06] hover:bg-slate-900"
                          }`}
                        >
                          1:{lev}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deal Cancellation Protection (Unique Deriv Feature) */}
                  <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Deal Cancellation
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">Risk-Free Window</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 15, 30, 60].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setDealCancellationDuration(sec)}
                          className={`py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                            dealCancellationDuration === sec
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                              : "bg-slate-950 text-slate-500 border-white/[0.04]"
                          }`}
                        >
                          {sec === 0 ? "Off" : `${sec}s`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margin Requirements Meter */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.06] space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Required Margin:</span>
                      <span className="text-white font-mono font-bold">KES {estimatedMarginKes}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Potential Payout:</span>
                      <span className="text-[#089981] font-mono font-bold">Unlimited Profit</span>
                    </div>
                  </div>

                  {/* Deriv Dual High-Impact Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => executeOrder("BUY")}
                      className="py-3 px-2.5 rounded-xl bg-gradient-to-b from-[#089981] to-[#056656] hover:from-[#0ac2a4] hover:to-[#089981] active:scale-[0.98] text-white font-black text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-[#089981]/25 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1 text-xs font-black uppercase tracking-wider">
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                        {executionType === "LIMIT"
                          ? `${accountType === "REAL" ? "REAL" : "DEMO"} BUY LIMIT`
                          : `${accountType === "REAL" ? "REAL BUY" : "DEMO BUY"} / RISE`}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-white/90">
                        ASK: {ask.toFixed(currentAsset.decimals)}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => executeOrder("SELL")}
                      className="py-3 px-2.5 rounded-xl bg-gradient-to-b from-[#f23645] to-[#c21f2d] hover:from-[#ff4d5e] hover:to-[#f23645] active:scale-[0.98] text-white font-black text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-[#f23645]/25 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1 text-xs font-black uppercase tracking-wider">
                        <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />
                        {executionType === "LIMIT"
                          ? `${accountType === "REAL" ? "REAL" : "DEMO"} SELL LIMIT`
                          : `${accountType === "REAL" ? "REAL SELL" : "DEMO SELL"} / FALL`}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-white/90">
                        BID: {bid.toFixed(currentAsset.decimals)}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* MODE B: DERIV DIGITAL OPTIONS (Rise / Fall 95.5% Payout) */}
              {contractMode === "OPTIONS" && (
                <div className="space-y-3">
                  {/* Duration Selector */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300">Contract Duration</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[5, 15, 30, 60].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setOptionsDuration(dur)}
                          className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                            optionsDuration === dur
                              ? "bg-[#ff5722] text-white border-[#ff5722]"
                              : "bg-slate-950 text-slate-400 border-white/[0.06] hover:bg-slate-900"
                          }`}
                        >
                          {dur === 5 ? "5 Ticks" : `${dur}s`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stake in KES */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-300">Contract Stake (KES)</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[500, 1000, 2500, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setOptionsStakeKes(amt)}
                          className={`py-1 rounded text-xs font-mono font-bold border transition-all ${
                            optionsStakeKes === amt
                              ? "bg-[#ff5722] text-white border-[#ff5722]"
                              : "bg-slate-950 text-slate-400 border-white/[0.06]"
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payout Calculation Box */}
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Payout Rate:</span>
                      <span className="text-[#089981] font-mono font-bold">+95.5%</span>
                    </div>
                    <div className="flex justify-between text-slate-300 font-bold">
                      <span>Total Payout:</span>
                      <span className="text-white font-mono text-sm">KES {optionsPayoutKes.toLocaleString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Net Profit: +KES {(optionsPayoutKes - optionsStakeKes).toLocaleString()}
                    </div>
                  </div>

                  {/* Rise / Fall High-Impact Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => executeDigitalOption("HIGHER")}
                      className="py-3.5 px-3 rounded-xl bg-gradient-to-b from-[#089981] to-[#056656] hover:from-[#0ac2a4] hover:to-[#089981] text-white font-black text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-[#089981]/25 transition-all"
                    >
                      <div className="flex items-center gap-1 text-xs font-black uppercase tracking-wider">
                        <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                        {accountType === "REAL" ? "REAL HIGHER (RISE)" : "DEMO HIGHER (RISE)"}
                      </div>
                      <span className="font-mono text-[10px] text-white/90">95.5% Payout</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => executeDigitalOption("LOWER")}
                      className="py-3.5 px-3 rounded-xl bg-gradient-to-b from-[#f23645] to-[#c21f2d] hover:from-[#ff4d5e] hover:to-[#f23645] text-white font-black text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-[#f23645]/25 transition-all"
                    >
                      <div className="flex items-center gap-1 text-xs font-black uppercase tracking-wider">
                        <ArrowDownRight className="w-4 h-4 stroke-[3]" />
                        {accountType === "REAL" ? "REAL LOWER (FALL)" : "DEMO LOWER (FALL)"}
                      </div>
                      <span className="font-mono text-[10px] text-white/90">95.5% Payout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Side Tab 2: Live Depth of Market / Order Book */}
          {sideTab === "ORDERBOOK" && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between text-[11px] text-slate-500 border-b border-white/[0.04] pb-1">
                <span>Price ({currentAsset.symbol.slice(3)})</span>
                <span>Size (Lots)</span>
              </div>

              {/* Asks (Red) */}
              <div className="space-y-1">
                {orderBookAsks.map((askItem, i) => (
                  <div key={i} className="relative flex justify-between items-center py-1 px-1.5 text-[11px]">
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#f23645]/15 rounded pointer-events-none"
                      style={{ width: `${askItem.depth}%` }}
                    />
                    <span className="text-[#f23645] font-bold z-10">{askItem.price}</span>
                    <span className="text-slate-300 z-10">{askItem.size.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Mid Spread Indicator */}
              <div className="py-1 px-2 bg-slate-900/90 rounded-lg text-center text-[11px] text-orange-400 font-bold border border-white/[0.06]">
                Spread: {((ask - bid) * (symbol.includes("JPY") ? 100 : 10000)).toFixed(1)} pips
              </div>

              {/* Bids (Green) */}
              <div className="space-y-1">
                {orderBookBids.map((bidItem, i) => (
                  <div key={i} className="relative flex justify-between items-center py-1 px-1.5 text-[11px]">
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#089981]/15 rounded pointer-events-none"
                      style={{ width: `${bidItem.depth}%` }}
                    />
                    <span className="text-[#089981] font-bold z-10">{bidItem.price}</span>
                    <span className="text-slate-300 z-10">{bidItem.size.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side Tab 3: Live Market Tape */}
          {sideTab === "TAPE" && (
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between text-[11px] text-slate-500 border-b border-white/[0.04] pb-1">
                <span>Time</span>
                <span>Price</span>
                <span>Size</span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {recentTrades.map((t) => (
                  <div key={t.id} className="flex justify-between text-[11px] items-center">
                    <span className="text-slate-500 text-[10px]">{t.time.split(" ")[0]}</span>
                    <span
                      className={`font-bold ${
                        t.type === "BUY" ? "text-[#089981]" : "text-[#f23645]"
                      }`}
                    >
                      {t.price}
                    </span>
                    <span className="text-slate-300">{t.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side Tab 4: Technical Analysis Sentiment Speedometer */}
          {sideTab === "GAUGE" && (
            <TechnicalAnalysisGauge
              symbol={symbol}
              currentPrice={mid}
              change24h={0.34}
            />
          )}
        </div>
      </div>

      {/* Deriv Bottom Drawer: Open Positions, Pending Limit Orders, Digital Contracts, History, Analytics */}
      <div className="border-t border-white/[0.08] bg-[#0a0b10] px-2 sm:px-4 py-3 mt-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/[0.06] pb-2 mb-3 gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full lg:w-auto py-1">
            <button
              onClick={() => setBottomTab("POSITIONS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                bottomTab === "POSITIONS"
                  ? "bg-white/[0.08] text-white border border-white/[0.1]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#ff5722]" />
              Positions ({openTradesForCurrentAccount.length})
            </button>

            <button
              onClick={() => setBottomTab("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                bottomTab === "PENDING"
                  ? "bg-white/[0.08] text-white border border-white/[0.1]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              Orders ({pendingOrdersForCurrentAccount.length})
            </button>

            <button
              onClick={() => setBottomTab("OPTIONS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                bottomTab === "OPTIONS"
                  ? "bg-white/[0.08] text-white border border-white/[0.1]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Timer className="w-3.5 h-3.5 text-cyan-400" />
              Digital Contracts ({activeDigitalContractsForCurrentAccount.length})
            </button>

            <button
              onClick={() => setBottomTab("HISTORY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                bottomTab === "HISTORY"
                  ? "bg-white/[0.08] text-white border border-white/[0.1]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              History ({closedTradesForCurrentAccount.length})
            </button>

            <button
              onClick={() => setBottomTab("ANALYTICS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                bottomTab === "ANALYTICS"
                  ? "bg-white/[0.08] text-white border border-white/[0.1]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Account Summary
            </button>

            {/* Emergency Close All Positions */}
            {openTradesForCurrentAccount.length >= 2 && (
              <button
                onClick={handleCloseAllPositions}
                disabled={closingId === "ALL"}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-bold transition-all ml-2 whitespace-nowrap shrink-0"
              >
                {closingId === "ALL" ? "Closing..." : "Close All"}
              </button>
            )}
          </div>

          {/* TradingView Live Account Metrics Bar */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono ml-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <span className="text-slate-400">Broker:</span>
              <span className={`font-bold flex items-center gap-1 ${accountType === "REAL" ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${accountType === "REAL" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {accountType === "REAL" ? "Live CR-884920" : "Paper VRTC-1002"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Balance:</span>{" "}
              <span className="text-white font-bold">
                KES {activeAccountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Equity:</span>{" "}
              <span className="text-white font-bold">
                KES {activeAccountEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Open P&L:</span>{" "}
              <span
                className={`font-bold ${
                  totalOpenFloatingPnL >= 0 ? "text-[#089981]" : "text-[#f23645]"
                }`}
              >
                {totalOpenFloatingPnL >= 0 ? "+" : ""}
                KES {totalOpenFloatingPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Margin:</span>{" "}
              <span className="text-amber-400 font-bold">
                KES {totalMarginLocked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Free:</span>{" "}
              <span className="text-emerald-400 font-bold">
                KES {availableMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {accountType === "DEMO" && (
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition-colors flex items-center gap-1 text-[11px]"
                title="TradingView: Reset Paper Trading Account"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Tab Content 1: Open Positions */}
        {bottomTab === "POSITIONS" && (
          <div className="overflow-x-auto">
            {openTradesForCurrentAccount.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <div className="font-semibold text-slate-400">
                  {accountType === "DEMO"
                    ? "No open positions in Paper Trading account."
                    : "No open positions in Live Real account."}
                </div>
                <div className="text-[11px] text-slate-600 max-w-md mx-auto">
                  {accountType === "DEMO"
                    ? "Practice your trading strategies with risk-free simulated funds. Select volume and execute BUY or SELL above."
                    : "Live M-Pesa collateral is active. Select volume and execute a live market contract."}
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.04]">
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Volume</th>
                    <th className="pb-2 font-medium">Entry</th>
                    <th className="pb-2 font-medium">Current</th>
                    <th className="pb-2 font-medium">Margin Locked</th>
                    <th className="pb-2 font-medium">Floating PnL (KES)</th>
                    <th className="pb-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {openTradesForCurrentAccount.map((t) => {
                    const isProfit = parseFloat(t.floatingPnL) >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === "BUY"
                                ? "bg-emerald-500/20 text-[#089981]"
                                : "bg-red-500/20 text-[#f23645]"
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300">{t.lotSize} Lots</td>
                        <td className="py-2.5 text-slate-300">{t.entryPrice}</td>
                        <td className="py-2.5 text-slate-300">{t.currentPrice || mid}</td>
                        <td className="py-2.5 text-slate-400">
                          KES {parseFloat(t.marginRequired).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-2.5 font-bold ${isProfit ? "text-[#089981]" : "text-[#f23645]"}`}>
                          {isProfit ? "+" : ""}
                          {parseFloat(t.floatingPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleCloseTrade(t)}
                            disabled={closingId === t.id}
                            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-bold transition-all disabled:opacity-50"
                          >
                            {closingId === t.id ? "Closing..." : "Close"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content 2: Pending Limit Orders */}
        {bottomTab === "PENDING" && (
          <div className="overflow-x-auto">
            {pendingOrdersForCurrentAccount.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                <div>No pending limit orders in {accountType === "DEMO" ? "Paper Trading" : "Live Real"} account.</div>
                <div className="text-[11px] text-slate-600">Switch to &quot;Pending Limit&quot; in the ticket above to set target trigger rates.</div>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.04]">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Direction</th>
                    <th className="pb-2">Target Price</th>
                    <th className="pb-2">Current Price</th>
                    <th className="pb-2">Volume</th>
                    <th className="pb-2">Placed At</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {pendingOrdersForCurrentAccount.map((po) => (
                    <tr key={po.id}>
                      <td className="py-2 font-bold text-white">{po.symbol}</td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            po.direction === "BUY" ? "bg-emerald-500/20 text-[#089981]" : "bg-red-500/20 text-[#f23645]"
                          }`}
                        >
                          {po.direction}
                        </span>
                      </td>
                      <td className="py-2 text-amber-300 font-bold">{po.targetPrice}</td>
                      <td className="py-2 text-slate-300">{mid}</td>
                      <td className="py-2 text-slate-300">{po.lotSize} Lots</td>
                      <td className="py-2 text-slate-500">{po.placedAt}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => setPendingOrders((prev) => prev.filter((p) => p.id !== po.id))}
                          className="px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content 3: Active Digital Options Contracts */}
        {bottomTab === "OPTIONS" && (
          <div className="overflow-x-auto">
            {activeDigitalContractsForCurrentAccount.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                <div>No active digital contracts in {accountType === "DEMO" ? "Paper Trading" : "Live Real"} account.</div>
                <div className="text-[11px] text-slate-600">Select &quot;Rise / Fall&quot; above to trade high-yield digital options contracts.</div>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.04]">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Contract</th>
                    <th className="pb-2">Entry Barrier</th>
                    <th className="pb-2">Current Spot</th>
                    <th className="pb-2">Stake</th>
                    <th className="pb-2">Potential Payout</th>
                    <th className="pb-2 text-right">Time Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {activeDigitalContractsForCurrentAccount.map((c) => {
                    const isWinning =
                      c.direction === "HIGHER" ? mid > c.entryPrice : mid < c.entryPrice;
                    return (
                      <tr key={c.id}>
                        <td className="py-2 font-bold text-white">{c.symbol}</td>
                        <td className="py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.direction === "HIGHER" ? "bg-emerald-500/20 text-[#089981]" : "bg-red-500/20 text-[#f23645]"
                            }`}
                          >
                            {c.direction}
                          </span>
                        </td>
                        <td className="py-2 text-slate-300">{c.entryPrice}</td>
                        <td className={`py-2 font-bold ${isWinning ? "text-[#089981]" : "text-[#f23645]"}`}>
                          {mid}
                        </td>
                        <td className="py-2 text-slate-400">KES {c.stakeKes.toLocaleString()}</td>
                        <td className="py-2 text-emerald-400 font-bold">KES {c.payoutKes.toLocaleString()}</td>
                        <td className="py-2 text-right">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-bold text-xs animate-pulse">
                            {c.remainingSeconds}s
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content 4: Trade History */}
        {bottomTab === "HISTORY" && (
          <div className="overflow-x-auto">
            {closedTradesForCurrentAccount.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                <div>No closed trades found for {accountType === "DEMO" ? "Paper Trading" : "Live Real"} account.</div>
                <div className="text-[11px] text-slate-600">Positions closed during trading will be archived here in your permanent audit journal.</div>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-white/[0.04]">
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Volume</th>
                    <th className="pb-2 font-medium">Entry Price</th>
                    <th className="pb-2 font-medium">Exit Price</th>
                    <th className="pb-2 font-medium">Realized PnL</th>
                    <th className="pb-2 text-right font-medium">Closed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {closedTradesForCurrentAccount.map((t) => {
                    const isProfit = parseFloat(t.pnl || "0") >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === "BUY"
                                ? "bg-emerald-500/20 text-[#089981]"
                                : "bg-red-500/20 text-[#f23645]"
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300">{t.lotSize}</td>
                        <td className="py-2.5 text-slate-300">{t.entryPrice}</td>
                        <td className="py-2.5 text-slate-300">{t.exitPrice || "-"}</td>
                        <td className={`py-2.5 font-bold ${isProfit ? "text-[#089981]" : "text-[#f23645]"}`}>
                          KES {parseFloat(t.pnl || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-right text-slate-500">
                          {t.closedAt ? new Date(t.closedAt).toLocaleTimeString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab Content 5: Performance Analytics */}
        {bottomTab === "ANALYTICS" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 font-mono">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Total Closed Trades</div>
              <div className="text-lg font-bold text-white">{closedTrades.length}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Win Rate Ratio</div>
              <div className="text-lg font-bold text-[#089981]">{winRatePercent}%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Net Realized PnL</div>
              <div
                className={`text-lg font-bold ${netPnLTotal >= 0 ? "text-[#089981]" : "text-[#f23645]"}`}
              >
                KES {netPnLTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Regulatory Sandbox</div>
              <div className="text-lg font-bold text-amber-400">CMA Kenya</div>
            </div>
          </div>
        )}
      </div>

      {/* Asset Switcher Modal */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0c0d13] border border-white/[0.1] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#ff5722]" />
                Select Trading Asset
              </h3>
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search assets (e.g. EUR, BTC, Gold)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff5722]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(["ALL", "Forex", "Crypto", "Commodities"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAssetFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      assetFilter === cat
                        ? "bg-[#ff5722] text-white shadow-sm"
                        : "bg-white/[0.03] text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => {
                    setIsAssetModalOpen(false);
                    router.push(`/trade/${asset.symbol}`);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                    asset.symbol === symbol
                      ? "bg-[#ff5722]/10 border-[#ff5722]/40 text-white"
                      : "bg-white/[0.02] border-transparent hover:bg-white/[0.06] hover:border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff5722] to-amber-500 flex items-center justify-center text-white font-black text-xs">
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-xs text-white">{asset.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{asset.category}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white">
                      {asset.basePrice.toFixed(asset.decimals)}
                    </div>
                    <div className="text-[10px] text-[#089981]">+0.25%</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Multi-Channel Kenyan Payment Gateway Modal (IntaSend, Flutterwave, M-Pesa) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0c0d14] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#089981] to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  {isAuthenticated ? <Wallet className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {isAuthenticated ? "Deposit to Real Broker" : "Login or Register to Deposit"}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                      {isAuthenticated ? "CR-884920" : "AUTH REQUIRED"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAuthenticated
                      ? "Deposit via M-Pesa Express STK Push directly to your phone"
                      : "You must log in or register an account first before making any deposit"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-white/[0.05]"
              >
                &times;
              </button>
            </div>

            {/* STEP 1 GATE: Require Login or Registration if user is a Guest */}
            {!isAuthenticated ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Account Security & Compliance:</strong> Paper Trading (Demo) is open to everyone, but Real Broker deposits require a registered personal account so your funds and M-Pesa receipts are securely tied to your profile.
                  </div>
                </div>

                {/* Auth Mode Switcher: Log In vs Register */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/[0.08] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("LOGIN");
                      setAuthError(null);
                    }}
                    className={`py-2 rounded-lg transition-all ${
                      authMode === "LOGIN"
                        ? "bg-[#089981] text-white shadow-md shadow-[#089981]/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Log In to Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("REGISTER");
                      setAuthError(null);
                    }}
                    className={`py-2 rounded-lg transition-all ${
                      authMode === "REGISTER"
                        ? "bg-[#ff5722] text-white shadow-md shadow-[#ff5722]/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Create New Account
                  </button>
                </div>

                {authError && (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleInlineAuth} className="space-y-3">
                  {authMode === "REGISTER" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        placeholder="e.g. Brian Kipkorir"
                        className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5722]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="trader@example.com"
                      className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#089981]"
                    />
                  </div>

                  {authMode === "REGISTER" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Safaricom M-Pesa Phone Number
                      </label>
                      <input
                        type="text"
                        required
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="0712345678 or 254712345678"
                        className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ff5722]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password {authMode === "REGISTER" && <span className="text-[10px] text-slate-500">(Min 8 chars, 1 uppercase, 1 number)</span>}
                    </label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#089981]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 ${
                      authMode === "LOGIN"
                        ? "bg-gradient-to-r from-[#089981] to-emerald-600 hover:from-[#0ac2a4] hover:to-[#089981] shadow-[#089981]/25"
                        : "bg-gradient-to-r from-[#ff5722] to-amber-600 hover:from-[#f4511e] hover:to-amber-500 shadow-[#ff5722]/25"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {authLoading
                      ? authMode === "LOGIN"
                        ? "Signing In..."
                        : "Creating Account..."
                      : authMode === "LOGIN"
                      ? "Log In & Continue to Deposit"
                      : "Register & Continue to Deposit"}
                  </button>
                </form>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthenticated(true);
                      setAuthError(null);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
                  >
                    Or skip and deposit directly via M-Pesa Express &rarr;
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                  <span>Prefer full-screen pages?</span>
                  <div className="flex items-center gap-3">
                    <Link href="/login" className="text-[#089981] hover:underline font-bold">
                      Go to Login Page &rarr;
                    </Link>
                    <Link href="/register" className="text-[#ff5722] hover:underline font-bold">
                      Go to Register Page &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Signed-In Trader Identity Bar */}
                {currentUser && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-slate-300">Authenticated Trader: </span>
                        <strong className="text-white">{currentUser.fullName}</strong>
                        <span className="text-slate-400 font-mono text-[10px] ml-1.5">({currentUser.email})</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      VERIFIED
                    </span>
                  </div>
                )}

            {/* DIRECT M-PESA EXPRESS STK PUSH FORM */}
            <form onSubmit={handleQuickDeposit} className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    M-Pesa Express (STK Push)
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">
                    Instant KES Credit
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Enter your Safaricom M-Pesa phone number and amount below. An STK PIN prompt will be sent to your phone, and your Real Broker balance will be credited as soon as payment is verified.
                </p>
              </div>

              {stkStatusMessage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin" />
                    <div className="space-y-1">
                      <div className="font-bold text-white">Awaiting M-Pesa PIN Confirmation</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{stkStatusMessage}</p>
                      {pendingStkCheckoutId && (
                        <div className="text-[10px] font-mono text-amber-300">
                          Reference: {pendingStkCheckoutId}
                        </div>
                      )}
                    </div>
                  </div>
                  {pendingStkCheckoutId && (
                    <button
                      type="button"
                      disabled={reconcilingStk}
                      onClick={() => handleReconcileStk()}
                      className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {reconcilingStk ? "Verifying M-Pesa Payment..." : "Confirm M-Pesa Payment Status Now"}
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Safaricom M-Pesa Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={depositPhone}
                  onChange={(e) => setDepositPhone(e.target.value)}
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-300">Deposit Amount (KES)</label>
                  <span className="text-[10px] text-emerald-400 font-mono">Min KES 100</span>
                </div>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 100)}
                  className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[100, 250, 500, 1000, 2500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDepositAmount(val)}
                      className={`py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                        depositAmount === val
                          ? "bg-emerald-600 text-white border-emerald-500"
                          : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]"
                      }`}
                    >
                      {val >= 1000 ? `${val / 1000}k` : val}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={depositing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#089981] hover:from-emerald-500 hover:to-[#0ac2a4] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                {depositing
                  ? "Sending M-Pesa STK Push..."
                  : `Send M-Pesa STK Push (KES ${depositAmount.toLocaleString()})`}
              </button>
            </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Notice & Compliance Modal */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0d13] border border-white/[0.1] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                Withdrawal Notice
              </h3>
              <button
                onClick={() => setIsWithdrawalModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Withdrawals are not available yet. This feature will be introduced in a future update following full regulatory audit under Kenya CMA Guidelines 2017.
                </span>
              </div>
              <p>
                In the sandbox demo mode, paper trading profits are credited to your demo balance. Real M-Pesa automated withdrawals to your personal Safaricom line will be enabled once production B2C payout approval is granted.
              </p>
            </div>

            <button
              onClick={() => setIsWithdrawalModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Position Size & Risk Calculator Modal */}
      <RiskCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        currentSymbol={symbol}
        currentPrice={mid}
      />

      {/* Real-Time Price Alerts Modal */}
      <PriceAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        currentSymbol={symbol}
        currentPrice={mid}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onDeleteAlert={handleDeleteAlert}
      />

      {/* TradingView Style: Select Broker & Account Manager Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0a0b12] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff5722] to-amber-500 flex items-center justify-center text-white font-black text-xs">
                  TV
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">TradingView Account Manager</h3>
                  <p className="text-[11px] text-slate-400">Select broker account or switch to paper simulation</p>
                </div>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Account List */}
            <div className="space-y-3">
              {/* Card 1: Paper Trading (Demo) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  accountType === "DEMO"
                    ? "bg-amber-500/[0.08] border-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="font-bold text-sm text-white">Paper Trading by TradingView</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                        SIMULATED
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Practice strategies with zero capital risk using virtual simulated liquidity.
                    </p>
                  </div>
                  {accountType === "DEMO" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
                      CONNECTED
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        switchAccount("DEMO");
                        setIsAccountModalOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#ff5722] hover:bg-[#f4511e] text-white text-xs font-bold transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.06] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500">Balance:</span>
                    <div className="font-bold text-white">KES {parseFloat(demoBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Account ID:</span>
                    <div className="text-slate-300">VRTC-1002</div>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountModalOpen(false);
                        setIsResetModalOpen(true);
                      }}
                      className="text-xs text-[#ff5722] hover:underline flex items-center gap-1 justify-end font-sans font-semibold mt-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Funds
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Live Real Broker (M-Pesa) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  accountType === "REAL"
                    ? "bg-emerald-500/[0.08] border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-sm text-white">Tradepedia Live Broker</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                        REAL MONEY
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Live Kenyan financial execution funded directly via Safaricom Daraja M-Pesa.
                    </p>
                  </div>
                  {accountType === "REAL" ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
                      CONNECTED
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        switchAccount("REAL");
                        setIsAccountModalOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#089981] hover:bg-[#0ac2a4] text-white text-xs font-bold transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[0.06] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500">Balance:</span>
                    <div className="font-bold text-white">KES {parseFloat(realBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Clearing ID:</span>
                    <div className="text-slate-300">CR-884920</div>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountModalOpen(false);
                        setIsDepositModalOpen(true);
                      }}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 justify-end font-sans font-semibold mt-2"
                    >
                      <Zap className="w-3 h-3" />
                      Deposit M-Pesa
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TradingView Style: Reset Paper Trading Account Dialog */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0d14] border border-white/[0.1] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Reset Paper Trading Account</h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Reset your paper simulation account to your desired starting balance. All open paper positions will be closed.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400">
                Starting Paper Balance (KES)
              </label>
              <input
                type="number"
                min={1000}
                step={5000}
                value={customResetAmount}
                onChange={(e) => setCustomResetAmount(parseFloat(e.target.value) || 100000)}
                className="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#ff5722]"
              />

              {/* TradingView Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[50000, 100000, 250000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomResetAmount(amt)}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                      customResetAmount === amt
                        ? "bg-[#ff5722] text-white border-[#ff5722] shadow-sm shadow-[#ff5722]/30"
                        : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    {amt >= 1000000 ? "1M" : `${amt / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingBalance}
                onClick={() => handleResetDemoBalance(customResetAmount)}
                className="px-5 py-2 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#ff5722]/30 transition-all disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resettingBalance ? "animate-spin" : ""}`} />
                {resettingBalance ? "Resetting..." : `Reset to KES ${customResetAmount.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
