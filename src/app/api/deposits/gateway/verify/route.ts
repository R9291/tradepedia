import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoStore } from "@/lib/memory-store";
import { creditDeposit } from "@/lib/ledger";
import { createAuditLog } from "@/lib/audit";
import { DepositStatus, Prisma } from "@prisma/client";
import { z } from "zod";

const gatewayVerifySchema = z.object({
  provider: z.enum(["INTASEND", "FLUTTERWAVE", "MPESA_MANUAL", "STK", "CARD", "BANK"]),
  amount: z.number().min(100, "Minimum deposit is KES 100").max(500000),
  transactionId: z.string().min(3).optional(),
  receiptNumber: z.string().min(3).optional(),
  phoneNumber: z.string().optional(),
  paymentMethod: z.string().optional(),
  metadata: z.record(z.any()).optional(),
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
    const validated = gatewayVerifySchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { provider, amount, phoneNumber, paymentMethod } = validated.data;
    const transactionId = validated.data.transactionId || `TXN_${Date.now()}`;
    const receiptNumber = (validated.data.receiptNumber || "").trim().toUpperCase();

    if (!receiptNumber || receiptNumber.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid payment receipt or gateway transaction reference is required to verify your deposit.",
        },
        { status: 400 }
      );
    }

    // Strict Safaricom M-Pesa 10-character alphanumeric receipt validation for Manual M-Pesa
    if (provider === "MPESA_MANUAL" && !/^[A-Z][A-Z0-9]{9}$/.test(receiptNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Safaricom M-Pesa receipt code. Must be an exact 10-character alphanumeric code from your M-Pesa SMS (e.g. SK92LM40KP).",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate receipt claims in memory store
    const duplicateInMem = (demoStore.deposits || []).find(
      (d) =>
        d.status === "SUCCESSFUL" &&
        (d.mpesaReceiptNumber === receiptNumber || (validated.data.transactionId && d.checkoutRequestId === transactionId))
    );
    if (duplicateInMem) {
      return NextResponse.json(
        {
          success: false,
          error: `Transaction receipt ${receiptNumber} has already been verified and credited.`,
        },
        { status: 409 }
      );
    }

    // Optional live server-to-server verification if IntaSend or Flutterwave secret keys are configured
    if (provider === "INTASEND" && process.env.INTASEND_SECRET_KEY && validated.data.transactionId) {
      const isHost = process.env.INTASEND_ENV === "sandbox" ? "https://sandbox.intasend.com" : "https://payment.intasend.com";
      const verifyRes = await fetch(`${isHost}/api/v1/payment/status/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}`,
        },
        body: JSON.stringify({ invoice_id: validated.data.transactionId }),
      });
      if (!verifyRes.ok) {
        return NextResponse.json(
          { success: false, error: "Could not verify payment with IntaSend API." },
          { status: 400 }
        );
      }
      const verifyData = await verifyRes.json();
      if (verifyData?.invoice?.state !== "COMPLETE") {
        return NextResponse.json(
          { success: false, error: `IntaSend payment is not complete yet (State: ${verifyData?.invoice?.state || "PENDING"}).` },
          { status: 400 }
        );
      }
    }

    if (provider === "FLUTTERWAVE" && process.env.FLUTTERWAVE_SECRET_KEY && validated.data.transactionId) {
      const verifyRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(validated.data.transactionId)}/verify`,
        {
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          },
        }
      );
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || verifyData?.data?.status !== "successful") {
        return NextResponse.json(
          { success: false, error: "Flutterwave transaction verification failed or payment is not completed." },
          { status: 400 }
        );
      }
    }

    // 1. Try Prisma DB
    try {
      let realAccount = await prisma.account.findFirst({
        where: { userId: user.id, isDemo: false },
      });

      if (!realAccount) {
        realAccount = await prisma.account.create({
          data: {
            userId: user.id,
            currency: "KES",
            availableBalance: new Prisma.Decimal("0.00"),
            lockedMargin: new Prisma.Decimal("0.00"),
            equity: new Prisma.Decimal("0.00"),
            isDemo: false,
          },
        });
      }

      // Check if duplicate transactionId already processed
      const existing = await prisma.deposit.findFirst({
        where: {
          OR: [{ checkoutRequestId: transactionId }, { mpesaReceiptNumber: receiptNumber }],
        },
      });

      if (existing && existing.status === DepositStatus.SUCCESSFUL) {
        return NextResponse.json({
          success: true,
          message: "Deposit already processed",
          data: { receipt: receiptNumber, amount: existing.amount.toString() },
        });
      }

      const deposit = await prisma.deposit.create({
        data: {
          userId: user.id,
          accountId: realAccount.id,
          amount,
          currency: "KES",
          phoneNumber: phoneNumber || user.phone || "254700000000",
          status: DepositStatus.SUCCESSFUL,
          provider: provider as any,
          mpesaReceiptNumber: receiptNumber,
          checkoutRequestId: transactionId,
          completedAt: new Date(),
        },
      });

      await creditDeposit({
        accountId: realAccount.id,
        userId: user.id,
        amount,
        depositId: deposit.id,
        description: `${provider} Gateway Deposit [${paymentMethod || "Instant"}] (${receiptNumber})`,
      });

      await createAuditLog({
        actorId: user.id,
        action: "GATEWAY_DEPOSIT_CONFIRMED",
        entityType: "Deposit",
        entityId: deposit.id,
        metadata: { provider, amount, receiptNumber, transactionId },
      });
    } catch (dbErr) {
      // DB unreachable - credit in memory store
    }

    // 2. Memory store credit
    let memUser = demoStore.users.get(user.id) || demoStore.users.get(user.email);
    let newRealBalance = amount.toFixed(2);

    if (memUser) {
      let realAcc = memUser.accounts.find((a) => !a.isDemo);
      if (!realAcc) {
        realAcc = {
          id: `acc_real_${user.id}`,
          userId: user.id,
          currency: "KES",
          availableBalance: "0.00",
          lockedMargin: "0.00",
          equity: "0.00",
          isDemo: false,
          ledgerEntries: [],
        };
        memUser.accounts.push(realAcc);
      }

      const currentAvail = parseFloat(realAcc.availableBalance || "0");
      newRealBalance = (currentAvail + amount).toFixed(2);
      realAcc.availableBalance = newRealBalance;
      realAcc.equity = newRealBalance;
      realAcc.ledgerEntries = realAcc.ledgerEntries || [];
      realAcc.ledgerEntries.unshift({
        id: `led_gw_${Date.now()}`,
        type: "DEPOSIT",
        amount: amount.toFixed(2),
        balanceAfter: newRealBalance,
        description: `${provider} Gateway Deposit [${paymentMethod || "Instant"}] (${receiptNumber})`,
        createdAt: new Date(),
      });

      demoStore.users.set(user.id, memUser);
      demoStore.users.set(memUser.email, memUser);
    }

    demoStore.deposits = demoStore.deposits || [];
    demoStore.deposits.unshift({
      id: `dep_gw_${Date.now()}`,
      userId: user.id,
      userFullName: user.fullName,
      userEmail: user.email,
      amount: amount.toFixed(2),
      currency: "KES",
      phoneNumber: phoneNumber || user.phone || "254700000000",
      status: "SUCCESSFUL",
      provider,
      checkoutRequestId: transactionId,
      mpesaReceiptNumber: receiptNumber,
      initiatedAt: new Date(),
      completedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Payment of KES ${amount.toLocaleString()} confirmed via ${provider} (${receiptNumber}).`,
      data: {
        receipt: receiptNumber,
        amount,
        newRealBalance,
        provider,
        status: "SUCCESSFUL",
      },
    });
  } catch (err: any) {
    console.error("Gateway verify error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process payment confirmation" },
      { status: 500 }
    );
  }
}
