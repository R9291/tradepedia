import fs from "fs";
import path from "path";

/**
 * SasaPay Kenya C2B M-Pesa STK Push Integration
 * NetworkCode "63902" triggers direct Safaricom M-Pesa Express STK Push.
 */

function readEnvKey(keyName: string): string {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return process.env[keyName] || "";
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(new RegExp(`^${keyName}=["']?([^"'\\r\\n]+)["']?`, "m"));
    return match ? match[1].trim() : process.env[keyName] || "";
  } catch {
    return process.env[keyName] || "";
  }
}

export function isSasaPayConfigured(): boolean {
  const clientId = readEnvKey("SASAPAY_CLIENT_ID");
  const clientSecret = readEnvKey("SASAPAY_CLIENT_SECRET");
  const merchantCode = readEnvKey("SASAPAY_MERCHANT_CODE");
  // Only use SasaPay directly when a real live MerchantCode (not sandbox 600980) is provided
  return Boolean(
    clientId &&
      clientSecret &&
      merchantCode &&
      merchantCode !== "600980" &&
      !clientId.startsWith("your_")
  );
}

function getSasaPayBaseUrl(): string {
  const env = (readEnvKey("SASAPAY_ENV") || "sandbox").toLowerCase();
  return env === "production" || env === "live"
    ? "https://api.sasapay.app"
    : "https://sandbox.sasapay.app";
}

export function formatSasaPayPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
    cleaned = "254" + cleaned;
  }
  if (!/^254(7|1)\d{8}$/.test(cleaned)) {
    throw new Error(`Invalid Kenyan phone number: ${phone}. Use 07XXXXXXXX or 2547XXXXXXXX.`);
  }
  return cleaned;
}

export async function getSasaPayAccessToken(): Promise<string> {
  const clientId = readEnvKey("SASAPAY_CLIENT_ID");
  const clientSecret = readEnvKey("SASAPAY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "SasaPay credentials missing. Add SASAPAY_CLIENT_ID, SASAPAY_CLIENT_SECRET, and SASAPAY_MERCHANT_CODE to .env."
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = `${getSasaPayBaseUrl()}/api/v1/auth/token/?grant_type=client_credentials`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.detail || data.message || `SasaPay OAuth failed (${res.status})`);
  }

  return data.access_token as string;
}

export async function initiateSasaPayMpesaStk(params: {
  amountKes: number;
  phone: string;
  accountReference: string;
  transactionDesc?: string;
}) {
  const token = await getSasaPayAccessToken();
  const merchantCode = readEnvKey("SASAPAY_MERCHANT_CODE") || "600980";
  const formattedPhone = formatSasaPayPhone(params.phone);
  const callbackUrl =
    readEnvKey("SASAPAY_CALLBACK_URL") || "https://tradepedia.co.ke/api/deposits/sasapay/callback";

  const payload = {
    MerchantCode: merchantCode,
    NetworkCode: "63902", // 63902 = Safaricom M-Pesa STK Push
    TransactionFee: 0,
    Currency: "KES",
    Amount: params.amountKes.toFixed(2),
    CallBackURL: callbackUrl,
    PhoneNumber: formattedPhone,
    TransactionDesc: params.transactionDesc || "TRADEPEDIA Real Account Deposit",
    AccountReference: params.accountReference,
  };

  const res = await fetch(`${getSasaPayBaseUrl()}/api/v1/payments/request-payment/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.status === false || (data.ResponseCode && data.ResponseCode !== "0")) {
    throw new Error(
      data.detail || data.ResponseDescription || data.message || "SasaPay M-Pesa STK Push failed"
    );
  }

  const checkoutRequestId =
    data.CheckoutRequestID || data.MerchantRequestID || `SASA_${Date.now()}`;

  return {
    checkoutRequestId: String(checkoutRequestId),
    merchantRequestId: String(data.MerchantRequestID || checkoutRequestId),
    displayText:
      data.CustomerMessage ||
      data.detail ||
      `M-Pesa STK Push sent to ${formattedPhone} via SasaPay. Please enter your M-Pesa PIN on your phone.`,
  };
}

export async function verifySasaPayTransaction(checkoutRequestId: string) {
  const token = await getSasaPayAccessToken();
  const merchantCode = readEnvKey("SASAPAY_MERCHANT_CODE") || "600980";
  const callbackUrl =
    readEnvKey("SASAPAY_CALLBACK_URL") || "https://tradepedia.co.ke/api/deposits/sasapay/callback";

  const res = await fetch(`${getSasaPayBaseUrl()}/api/v1/transactions/status-query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      MerchantCode: merchantCode,
      CheckoutRequestId: checkoutRequestId,
      CallbackUrl: callbackUrl,
    }),
    cache: "no-store",
  });

  const data = await res.json();
  const resultCode = String(data.ResultCode ?? data.ResponseCode ?? data.data?.ResultCode ?? "");
  // SasaPay status-query is asynchronous ("request received, check your callback url").
  // Only an explicit ResultCode "0" counts as paid; the real confirmation arrives via the callback route.
  const isPaid = data.status === true && resultCode === "0";

  const receipt =
    data.TransactionCode ||
    data.data?.TransactionCode ||
    data.data?.MpesaReceiptNumber ||
    `SP${checkoutRequestId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;

  return {
    verified: isPaid,
    status: isPaid ? "SUCCESSFUL" : "PENDING",
    receiptNumber: String(receipt),
    detail:
      data.ResultDesc ||
      data.data?.ResultDesc ||
      data.detail ||
      data.message ||
      "Waiting for M-Pesa PIN confirmation on phone",
  };
}
