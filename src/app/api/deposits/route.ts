import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { depositInitiateSchema } from "@/lib/validations";
import { formatKenyanPhoneNumber, initiateStkPush } from "@/lib/mpesa";
import { createAuditLog } from "@/lib/audit";
import { creditDeposit } from "@/lib/ledger";
import { demoStore } from "@/lib/memory-store";
import { DepositStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isAdmin = user.role === "ADMIN" || user.role === "COMPLIANCE";
    const requestedAll = searchParams.get("all") === "true";

    const whereClause: any = {};
    if (!isAdmin || !requestedAll) {
      whereClause.userId = user.id;
    }

    let deposits: any[] = [];
    try {
      const dbDeposits = await prisma.deposit.findMany({
        where: whereClause,
        include: {
          user: {
            select: { fullName: true, email: true },
          },
        },
        orderBy: { initiatedAt: "desc" },
        take: 50,
      });

      deposits = dbDeposits.map((d) => ({
        id: d.id,
        userId: d.userId,
        userFullName: d.user?.fullName,
        userEmail: d.user?.email,
        amount: d.amount.toString(),
        currency: d.currency,
        phoneNumber: d.phoneNumber,
        status: d.status,
        merchantRequestId: d.merchantRequestId,
        checkoutRequestId: d.checkoutRequestId,
        mpesaReceiptNumber: d.mpesaReceiptNumber,
        failureReason: d.failureReason,
        initiatedAt: d.initiatedAt,
        completedAt: d.completedAt,
      }));
    } catch {
      // Fallback to in-memory deposits store
      deposits = (demoStore.deposits || []).filter((d) => {
        if (!isAdmin || !requestedAll) {
          return d.userId === user.id;
        }
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        deposits,
      },
    });
  } catch (error) {
    console.error("Deposits fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch deposits" }, { status: 500 });
  }
}

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

    if (user.kycStatus !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Identity verification (KYC) must be APPROVED before depositing." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = depositInitiateSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { amount, phoneNumber } = validated.data;
    const formattedPhone = formatKenyanPhoneNumber(phoneNumber);
    const depositId = `dep_${Date.now()}`;

    // Trigger live Safaricom Daraja STK Push prompt to phone
    const stkResponse = await initiateStkPush({
      amount,
      phoneNumber: formattedPhone,
      accountReference: "TRADEPEDIA",
      transactionDesc: "Real Trading Account Deposit",
    });

    // 1. Try Prisma DB (Record as PENDING_CONFIRMATION until Safaricom callback/reconcile confirms payment)
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

      await prisma.deposit.create({
        data: {
          id: depositId,
          userId: user.id,
          accountId: realAccount.id,
          amount,
          currency: "KES",
          phoneNumber: formattedPhone,
          status: DepositStatus.PENDING_CONFIRMATION,
          provider: "MPESA",
          merchantRequestId: stkResponse.merchantRequestId,
          checkoutRequestId: stkResponse.checkoutRequestId,
        },
      });
    } catch {
      // DB unreachable - store pending deposit in memory store
    }

    demoStore.deposits = demoStore.deposits || [];
    demoStore.deposits.unshift({
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
    });

    return NextResponse.json({
      success: true,
      message: `M-Pesa STK Push initiated to ${formattedPhone}. Please enter your M-Pesa PIN to complete the deposit.`,
      data: {
        depositId,
        checkoutRequestId: stkResponse.checkoutRequestId,
        status: "PENDING_CONFIRMATION",
        amount,
      },
    });
  } catch (err: any) {
    console.error("Deposit error:", err);
    return NextResponse.json({ success: false, error: err.message || "Deposit processing failed" }, { status: 500 });
  }
}
