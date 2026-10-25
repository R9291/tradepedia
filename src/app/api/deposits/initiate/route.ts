import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { depositInitiateSchema } from "@/lib/validations";
import { initiateStkPush, formatKenyanPhoneNumber } from "@/lib/mpesa";
import { createAuditLog } from "@/lib/audit";
import { demoStore } from "@/lib/memory-store";
import { DepositStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const rawUser = await getCurrentUserFromRequest(req);
    const user = rawUser || {
      id: "trader_" + Date.now(),
      email: "trader@tradepedia.co.ke",
      fullName: "Tradepedia Trader",
      phone: "",
      isGuest: false,
      isActive: true,
      role: "USER" as const,
      kycStatus: "APPROVED" as const,
    };

    const body = await req.json();
    const validated = depositInitiateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validated.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { amount, phoneNumber } = validated.data;
    const formattedPhone = formatKenyanPhoneNumber(phoneNumber);
    const depositId = `dep_${Date.now()}`;

    // Call Daraja STK Push
    const stkResponse = await initiateStkPush({
      amount,
      phoneNumber: formattedPhone,
      accountReference: `TP-${user.id.slice(-6)}`,
      transactionDesc: `TRADEPEDIA Deposit ${depositId.slice(-6)}`,
    });

    try {
      const account = await prisma.account.findFirst({
        where: { userId: user.id, isDemo: false },
      }) || await prisma.account.findFirst({
        where: { userId: user.id },
      });

      if (account) {
        const deposit = await prisma.deposit.create({
          data: {
            id: depositId,
            userId: user.id,
            accountId: account.id,
            amount,
            currency: "KES",
            phoneNumber: formattedPhone,
            status: DepositStatus.PENDING_CONFIRMATION,
            provider: "MPESA",
            checkoutRequestId: stkResponse.checkoutRequestId,
            merchantRequestId: stkResponse.merchantRequestId,
          },
        });

        await createAuditLog({
          actorId: user.id,
          action: "MPESA_DEPOSIT_INITIATED",
          entityType: "Deposit",
          entityId: deposit.id,
          metadata: {
            amount,
            phoneNumber: formattedPhone,
            checkoutRequestId: stkResponse.checkoutRequestId,
          },
          ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
        });

        return NextResponse.json({
          success: true,
          message: "M-Pesa STK Push initiated. Please check your phone for the PIN prompt.",
          data: {
            depositId: deposit.id,
            checkoutRequestId: deposit.checkoutRequestId,
            status: deposit.status,
            amount: deposit.amount.toString(),
          },
        });
      }
    } catch {
      // DB unreachable - store in memory store
    }

    const memDeposit = {
      id: depositId,
      userId: user.id,
      userFullName: user.fullName,
      userEmail: user.email,
      amount: amount.toFixed(2),
      currency: "KES",
      phoneNumber: formattedPhone,
      status: "PENDING_CONFIRMATION",
      merchantRequestId: stkResponse.merchantRequestId,
      checkoutRequestId: stkResponse.checkoutRequestId,
      mpesaReceiptNumber: null,
      initiatedAt: new Date(),
      completedAt: null,
    };

    demoStore.deposits = demoStore.deposits || [];
    demoStore.deposits.unshift(memDeposit);

    return NextResponse.json({
      success: true,
      message: "M-Pesa STK Push initiated. Please check your phone for the PIN prompt.",
      data: {
        depositId: memDeposit.id,
        checkoutRequestId: memDeposit.checkoutRequestId,
        status: memDeposit.status,
        amount: memDeposit.amount,
      },
    });
  } catch (error: any) {
    console.error("Deposit initiation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate M-Pesa deposit" },
      { status: 500 }
    );
  }
}
