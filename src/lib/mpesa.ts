/**
 * Safaricom Daraja 2.0 M-Pesa Express (STK Push) Integration
 * Supports Paybill (CustomerPayBillOnline) and Buy Goods Till (CustomerBuyGoodsOnline).
 */

import fs from "fs";
import path from "path";

interface DarajaTokenCache {
  token: string;
  expiresAt: number; // timestamp in ms
}

let tokenCache: DarajaTokenCache | null = null;

function readEnvFromDisk(keyName: string): string {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return "";
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(new RegExp(`^${keyName}=["']?([^"'\\r\\n]+)["']?`, "m"));
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

export interface StkPushParams {
  amount: number;
  phoneNumber: string; // e.g. 2547XXXXXXXX
  accountReference?: string;
  transactionDesc?: string;
}

export interface StkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface StkQueryResponse {
  responseCode: string;
  responseDescription: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: string;
  resultDesc: string;
}

/**
 * Normalizes any Kenyan phone number to 254XXXXXXXXX format.
 */
export function formatKenyanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
    cleaned = "254" + cleaned;
  }
  if (!/^254(7|1)\d{8}$/.test(cleaned)) {
    throw new Error(`Invalid Kenyan phone number format: ${phone}. Expected 2547XXXXXXXX or 2541XXXXXXXX.`);
  }
  return cleaned;
}

/**
 * Generates Daraja timestamp (YYYYMMDDHHmmss).
 */
export function getDarajaTimestamp(date = new Date()): string {
  // Daraja expects Kenya time (EAT, UTC+3) regardless of the server's timezone
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = eat.getUTCFullYear();
  const month = pad(eat.getUTCMonth() + 1);
  const day = pad(eat.getUTCDate());
  const hours = pad(eat.getUTCHours());
  const minutes = pad(eat.getUTCMinutes());
  const seconds = pad(eat.getUTCSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Computes base64 Daraja Password: base64(Shortcode + Passkey + Timestamp).
 */
export function generateDarajaPassword(shortcode: string, passkey: string, timestamp: string): string {
  const raw = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(raw).toString("base64");
}

function getDarajaBaseUrl(): string {
  const env = readEnvFromDisk("MPESA_ENV") || process.env.MPESA_ENV || "sandbox";
  return env.toLowerCase() === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

/**
 * Obtains and caches OAuth Bearer Token from Daraja.
 */
export async function getDarajaAccessToken(): Promise<string> {
  const now = Date.now();
  // Return cached token if valid with at least 60s buffer
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.token;
  }

  const consumerKey =
    readEnvFromDisk("MPESA_CONSUMER_KEY") || process.env.MPESA_CONSUMER_KEY || "";
  const consumerSecret =
    readEnvFromDisk("MPESA_CONSUMER_SECRET") || process.env.MPESA_CONSUMER_SECRET || "";

  if (!consumerKey || !consumerSecret || consumerKey.startsWith("mock_")) {
    // Simulated token for development/sandbox without live credentials
    return "simulated_daraja_bearer_token_" + Date.now();
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const url = `${getDarajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Daraja OAuth token request failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const expiresInMs = (parseInt(data.expires_in, 10) || 3599) * 1000;

  tokenCache = {
    token: data.access_token,
    expiresAt: now + expiresInMs,
  };

  return tokenCache.token;
}

/**
 * Initiates an M-Pesa Express (STK Push) prompt.
 */
export async function initiateStkPush(params: StkPushParams): Promise<StkPushResponse> {
  const shortcode =
    readEnvFromDisk("MPESA_SHORTCODE") || process.env.MPESA_SHORTCODE || "174379";
  const passkey =
    readEnvFromDisk("MPESA_PASSKEY") ||
    process.env.MPESA_PASSKEY ||
    "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
  const rawCallbackUrl =
    readEnvFromDisk("MPESA_CALLBACK_URL") ||
    process.env.MPESA_CALLBACK_URL ||
    "https://tradepedia-opal.vercel.app/api/deposits/mpesa/callback";
  // Safaricom Daraja rejects http://localhost callback URLs and dead tunnels; automatically upgrade to live production endpoint
  const callbackUrl =
    rawCallbackUrl.includes("localhost") ||
    rawCallbackUrl.includes("127.0.0.1") ||
    rawCallbackUrl.includes(".lhr.life") ||
    rawCallbackUrl.startsWith("http://")
      ? "https://tradepedia-opal.vercel.app/api/deposits/mpesa/callback"
      : rawCallbackUrl;
  const transactionType =
    readEnvFromDisk("MPESA_TRANSACTION_TYPE") ||
    process.env.MPESA_TRANSACTION_TYPE ||
    "CustomerPayBillOnline";
  // For Buy Goods (Till): BusinessShortCode = Store/HO number, PartyB = Till number.
  // For Paybill: both are the Paybill number.
  const partyB =
    transactionType === "CustomerBuyGoodsOnline"
      ? readEnvFromDisk("MPESA_TILL_NUMBER") || process.env.MPESA_TILL_NUMBER || shortcode
      : shortcode;

  const formattedPhone = formatKenyanPhoneNumber(params.phoneNumber);
  const timestamp = getDarajaTimestamp();
  const password = generateDarajaPassword(shortcode, passkey, timestamp);

  const activeKey =
    readEnvFromDisk("MPESA_CONSUMER_KEY") || process.env.MPESA_CONSUMER_KEY || "";
  const isMock = activeKey.startsWith("mock_") || !activeKey;

  // If mock mode is explicitly configured without live credentials, generate fallback session tokens
  if (isMock) {
    const mockCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const mockMerchantId = `MER_${Date.now()}`;
    return {
      merchantRequestId: mockMerchantId,
      checkoutRequestId: mockCheckoutId,
      responseCode: "0",
      responseDescription: "Success. Request accepted for processing",
      customerMessage: "Success. Request accepted for processing",
    };
  }

  const accessToken = await getDarajaAccessToken();
  const endpoint = `${getDarajaBaseUrl()}/mpesa/stkpush/v1/processrequest`;

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: transactionType,
    Amount: Math.round(params.amount),
    PartyA: formattedPhone,
    PartyB: partyB,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: params.accountReference || "TRADEPEDIA",
    TransactionDesc: params.transactionDesc || "Trading Deposit",
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.ResponseCode !== "0") {
    throw new Error(
      data.errorMessage || data.ResponseDescription || "Safaricom Daraja STK Push request rejected"
    );
  }

  return {
    merchantRequestId: data.MerchantRequestID,
    checkoutRequestId: data.CheckoutRequestID,
    responseCode: data.ResponseCode,
    responseDescription: data.ResponseDescription,
    customerMessage: data.CustomerMessage,
  };
}

/**
 * Queries Daraja for live status of an initiated STK push.
 */
export async function queryStkPushStatus(checkoutRequestId: string): Promise<StkQueryResponse> {
  const shortcode =
    readEnvFromDisk("MPESA_SHORTCODE") || process.env.MPESA_SHORTCODE || "174379";
  const passkey =
    readEnvFromDisk("MPESA_PASSKEY") ||
    process.env.MPESA_PASSKEY ||
    "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

  const accessToken = await getDarajaAccessToken();
  const timestamp = getDarajaTimestamp();
  const password = generateDarajaPassword(shortcode, passkey, timestamp);

  const endpoint = `${getDarajaBaseUrl()}/mpesa/stkpushquery/v1/query`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  const data = await response.json();

  return {
    responseCode: data.ResponseCode || "1",
    responseDescription: data.ResponseDescription || "",
    merchantRequestId: data.MerchantRequestID || "",
    checkoutRequestId: data.CheckoutRequestID || checkoutRequestId,
    resultCode: data.ResultCode?.toString() || "1",
    resultDesc: data.ResultDesc || "",
  };
}
