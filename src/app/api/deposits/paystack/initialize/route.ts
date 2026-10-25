import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import {
  initializePaystackTransaction,
  initiatePaystackMpesaStk,
  getPaystackPublicKey,
  getPaystackSecretKey,
} from "@/lib/paystack";
import { isSasaPayConfigured, initiateSasaPayMpesaStk } from "@/lib/sasapay";
import { initiateStkPush } from "@/lib/mpesa";
import { demoStore } from "@/lib/memory-store";
import { z } from "zod";

const paystackInitSchema = z.object({
  amount: z.number().min(100, "Minimum deposit is KES 100").max(500000),
  phoneNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  mode: z.enum(["CHECKOUT", "MPESA_STK"]).default("CHECKOUT"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user || user.isGuest) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required: Please log in or register an account before making a deposit.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = paystackInitSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: validated.error.errors[0]?.message || "Invalid deposit payload",
        },
        { status: 400 }
      );
    }

    const { amount, phoneNumber, phone, email, mode } = validated.data;
    const reference = `TP_PSK_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const customerEmail = email || user.email;
    const customerPhone = phoneNumber || phone || user.phone || "";
    const depositId = `dep_${Date.now()}`;

    if (mode === "MPESA_STK") {
      if (!customerPhone) {
        return NextResponse.json(
          { success: false, error: "M-Pesa phone number is required for STK Push." },
          { status: 400 }
        );
      }

      // 1. Primary: If SasaPay credentials are configured in .env, dispatch M-Pesa STK Push via SasaPay (NetworkCode 63902)
      if (isSasaPayConfigured()) {
        const sasaStk = await initiateSasaPayMpesaStk({
          amountKes: amount,
          phone: customerPhone,
          accountReference: reference,
          transactionDesc: "TRADEPEDIA Real Account Deposit",
        });

        const sasaRef = `SASA_${sasaStk.checkoutRequestId}`;
        demoStore.deposits = demoStore.deposits || [];
        demoStore.deposits.unshift({
          id: depositId,
          userId: user.id,
          userFullName: user.fullName,
          userEmail: user.email,
          amount: amount.toFixed(2),
          currency: "KES",
          phoneNumber: customerPhone,
          status: "PENDING_CONFIRMATION",
          provider: "SASAPAY",
          checkoutRequestId: sasaRef,
          mpesaReceiptNumber: null,
          initiatedAt: new Date(),
          completedAt: null,
        });

        return NextResponse.json({
          success: true,
          message: sasaStk.displayText,
          data: {
            depositId,
            reference: sasaRef,
            status: "pay_offline",
            displayText: sasaStk.displayText,
            amount,
          },
        });
      }

      const isLiveMode = process.env.DEMO_MODE === "false";
      const paystackKey = process.env.PAYSTACK_SECRET_KEY || "";

      // PRIMARY LIVE ROUTE: Safaricom Daraja production STK Push (Till / Buy Goods or Paybill)
      if ((process.env.MPESA_ENV || "sandbox").toLowerCase() === "production") {
        const darajaLive = await initiateStkPush({
          amount,
          phoneNumber: customerPhone,
          accountReference: "TRADEPEDIA",
          transactionDesc: "Account Deposit",
        });

        demoStore.deposits = demoStore.deposits || [];
        demoStore.deposits.unshift({
          id: depositId,
          userId: user.id,
          userFullName: user.fullName,
          userEmail: user.email,
          amount: amount.toFixed(2),
          currency: "KES",
          phoneNumber: customerPhone,
          status: "PENDING_CONFIRMATION",
          provider: "MPESA",
          checkoutRequestId: darajaLive.checkoutRequestId,
          mpesaReceiptNumber: null,
          initiatedAt: new Date(),
          completedAt: null,
        });

        return NextResponse.json({
          success: true,
          message: darajaLive.customerMessage,
          data: {
            depositId,
            reference: darajaLive.checkoutRequestId,
            status: "pay_offline",
            displayText: `M-Pesa prompt sent to ${customerPhone}. Enter your M-Pesa PIN, then tap "Confirm M-Pesa Payment Status Now".`,
            amount,
          },
        });
      }

      // LIVE MODE: never route real deposits through sandbox/test gateways (no fake money in Real accounts)
      if (isLiveMode && !paystackKey.startsWith("sk_live_")) {
        return NextResponse.json(
          {
            success: false,
            code: "LIVE_GATEWAY_NOT_CONFIGURED",
            error:
              "Live M-Pesa deposits are not enabled yet. No live payment gateway is configured (SasaPay live merchant code or Paystack sk_live key required).",
          },
          { status: 503 }
        );
      }

      const secretKey = getPaystackSecretKey();
      const cleanedDigits = customerPhone.replace(/\D/g, "");
      const isPaystackTestPhone =
        cleanedDigits.endsWith("710000000") || customerPhone.includes("710000000");

      // If Paystack is still in Test Mode (sk_test_) awaiting 7-day review and the user entered
      // their real Kenyan Safaricom phone number, dispatch the live M-Pesa STK Push via Safaricom Daraja!
      if (secretKey.startsWith("sk_test_") && !isPaystackTestPhone) {
        const darajaStk = await initiateStkPush({
          amount,
          phoneNumber: customerPhone,
          accountReference: "TRADEPEDIA",
          transactionDesc: "Trading Account Deposit",
        });

        demoStore.deposits = demoStore.deposits || [];
        demoStore.deposits.unshift({
          id: depositId,
          userId: user.id,
          userFullName: user.fullName,
          userEmail: user.email,
          amount: amount.toFixed(2),
          currency: "KES",
          phoneNumber: customerPhone,
          status: "PENDING_CONFIRMATION",
          provider: "MPESA",
          checkoutRequestId: darajaStk.checkoutRequestId,
          mpesaReceiptNumber: null,
          initiatedAt: new Date(),
          completedAt: null,
        });

        return NextResponse.json({
          success: true,
          message: `M-Pesa STK Push sent to ${customerPhone}. Please enter your M-Pesa PIN on your phone.`,
          data: {
            depositId,
            reference: darajaStk.checkoutRequestId,
            status: "pay_offline",
            displayText: `M-Pesa STK Push prompt sent to ${customerPhone}. Enter your M-Pesa PIN on your phone, then click "Confirm M-Pesa Payment Status Now".`,
            amount,
            publicKey: getPaystackPublicKey(),
          },
        });
      }

      const stk = await initiatePaystackMpesaStk({
        email: customerEmail,
        amountKes: amount,
        phone: customerPhone,
        reference,
      });

      demoStore.deposits = demoStore.deposits || [];
      demoStore.deposits.unshift({
        id: depositId,
        userId: user.id,
        userFullName: user.fullName,
        userEmail: user.email,
        amount: amount.toFixed(2),
        currency: "KES",
        phoneNumber: customerPhone,
        status: "PENDING_CONFIRMATION",
        provider: "PAYSTACK",
        checkoutRequestId: stk.reference,
        mpesaReceiptNumber: null,
        initiatedAt: new Date(),
        completedAt: null,
      });

      return NextResponse.json({
        success: true,
        message: stk.displayText,
        data: {
          depositId,
          reference: stk.reference,
          status: stk.status,
          displayText: stk.displayText,
          amount,
          publicKey: getPaystackPublicKey(),
        },
      });
    }

    const initialized = await initializePaystackTransaction({
      email: customerEmail,
      amountKes: amount,
      phone: customerPhone,
      reference,
    });

    demoStore.deposits = demoStore.deposits || [];
    demoStore.deposits.unshift({
      id: depositId,
      userId: user.id,
      userFullName: user.fullName,
      userEmail: user.email,
      amount: amount.toFixed(2),
      currency: "KES",
      phoneNumber: customerPhone,
      status: "PENDING_CONFIRMATION",
      provider: "PAYSTACK",
      checkoutRequestId: initialized.reference,
      mpesaReceiptNumber: null,
      initiatedAt: new Date(),
      completedAt: null,
    });

    return NextResponse.json({
      success: true,
      message: "Paystack checkout initialized",
      data: {
        depositId,
        reference: initialized.reference,
        authorizationUrl: initialized.authorizationUrl,
        accessCode: initialized.accessCode,
        amount,
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
      },
    });
  } catch (err: any) {
    console.error("Paystack init error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to initialize Paystack payment" },
      { status: 400 }
    );
  }
}
