/**
 * Paystack Kenya Real-Time Payment Integration
 * Supports M-Pesa Express (STK Push), Airtel Money, Visa/Mastercard, and PesaLink Bank Transfers
 * without requiring a Safaricom Daraja Paybill or Buy Goods Till number.
 */

import fs from "fs";
import path from "path";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function readEnvKeyFromDisk(keyName: string): string {
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

export function formatPaystackKenyanPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
    cleaned = "254" + cleaned;
  }
  if (!/^254(7|1)\d{8}$/.test(cleaned)) {
    throw new Error(`Invalid Kenyan phone number: ${phone}. Use 07XXXXXXXX or +2547XXXXXXXX.`);
  }
  return `+${cleaned}`;
}

export function getPaystackPublicKey(): string {
  return (
    readEnvKeyFromDisk("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY") ||
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    ""
  );
}

export function getPaystackSecretKey(): string {
  const key =
    readEnvKeyFromDisk("PAYSTACK_SECRET_KEY") ||
    process.env.PAYSTACK_SECRET_KEY ||
    "";
  if (!key || key.startsWith("sk_placeholder")) {
    throw new Error(
      "Paystack Secret Key is not configured yet. Please add PAYSTACK_SECRET_KEY and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to your .env file."
    );
  }
  return key;
}

/**
 * Initializes a Paystack Checkout transaction (M-Pesa, Card, Bank Transfer).
 */
export async function initializePaystackTransaction(params: {
  email: string;
  amountKes: number;
  phone?: string;
  reference: string;
  callbackUrl?: string;
}) {
  const secretKey = getPaystackSecretKey();
  const amountSubunit = Math.round(params.amountKes * 100); // KES cents

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: amountSubunit,
      currency: "KES",
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: ["mobile_money", "card", "bank", "bank_transfer"],
      metadata: {
        phone_number: params.phone || "",
        platform: "TRADEPEDIA_KENYA",
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Failed to initialize Paystack transaction");
  }

  return {
    authorizationUrl: data.data.authorization_url as string,
    accessCode: data.data.access_code as string,
    reference: data.data.reference as string,
  };
}

/**
 * Triggers a direct M-Pesa Express STK Push to the user's phone via Paystack Charge API.
 */
export async function initiatePaystackMpesaStk(params: {
  email: string;
  amountKes: number;
  phone: string;
  reference: string;
}) {
  const secretKey = getPaystackSecretKey();
  const formattedPhone = formatPaystackKenyanPhone(params.phone);
  const amountSubunit = Math.round(params.amountKes * 100);

  const res = await fetch(`${PAYSTACK_BASE_URL}/charge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: amountSubunit,
      currency: "KES",
      reference: params.reference,
      mobile_money: {
        phone: formattedPhone,
        provider: "mpesa",
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    const detail = data.data?.message || data.message || "M-Pesa STK Push initiation failed";
    if (detail.toLowerCase().includes("test mobile money number")) {
      throw new Error(
        `${detail} (Gateway is in Test Mode: use 0710000000 to test, or switch your Paystack key to sk_live_... to send a real M-Pesa STK push to ${formattedPhone}).`
      );
    }
    throw new Error(detail);
  }

  return {
    reference: (data.data?.reference || params.reference) as string,
    status: (data.data?.status || "pay_offline") as string,
    displayText:
      (data.data?.display_text as string) ||
      `M-Pesa STK Push sent to ${formattedPhone}. Please enter your M-Pesa PIN on your phone.`,
  };
}

/**
 * Verifies a Paystack transaction server-to-server using GET /transaction/verify/:reference.
 */
export async function verifyPaystackTransaction(reference: string) {
  const secretKey = getPaystackSecretKey();

  const res = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();
  if (!res.ok || !data.status || !data.data) {
    throw new Error(data.message || "Could not verify transaction with Paystack");
  }

  const tx = data.data;
  const amountKes = Number(tx.amount) / 100;
  const receipt =
    tx.receipt_number ||
    tx.authorization?.signature ||
    tx.reference ||
    reference;

  return {
    verified: tx.status === "success",
    status: tx.status as string, // "success" | "ongoing" | "pending" | "failed" | "abandoned"
    amountKes,
    currency: tx.currency as string,
    reference: tx.reference as string,
    receiptNumber: String(receipt),
    channel: (tx.channel || "mobile_money") as string,
    paidAt: tx.paid_at as string | null,
    gatewayResponse: (tx.gateway_response || "") as string,
  };
}
