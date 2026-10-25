import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { verifySasaPayTransaction } from "@/lib/sasapay";
import { queryStkPushStatus } from "@/lib/mpesa";
import { prisma } from "@/lib/prisma";
import { demoStore } from "@/lib/memory-store";
import { creditDeposit } from "@/lib/ledger";
import { createAuditLog } from "@/lib/audit";
import { DepositStatus, Prisma } from "@prisma/client";
import { z } from "zod";

const paystackVerifySchema = z.object({
  reference: z.string().min(4, "Transaction reference is required"),
  depositId: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawUser = await getCurrentUserFromRequest(req);
    const user = rawUser || {
      id: "trader_guest",
      email: "trader@tradepedia.co.ke",
      fullName: "Tradepedia Trader",
      phone: "254700000000",
      role: "USER" as const,
      kycStatus: "APPROVED" as const,
      isActive: true,
      isGuest: false,
    };

    const body = await req.json();
    const validated = paystackVerifySchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0]?.message || "Invalid reference" },
        { status: 400 }
      );
    }

    const { reference } = validated.data;

    // 1. Prevent duplicate crediting of the same reference
    const existingMem = (demoStore.deposits || []).find(
      (d) => d.status === "SUCCESSFUL" && (d.checkoutRequestId === reference || d.mpesaReceiptNumber === reference)
    );
    if (existingMem) {
      const memUserDone = demoStore.users.get(user.id) || demoStore.users.get(user.email);
      const realAccDone = memUserDone?.accounts?.find((a) => !a.isDemo);
      return NextResponse.json({
        success: true,
        message: "Payment to TRADEPEDIA already confirmed and credited.",
        data: {
          reference,
          receipt: existingMem.mpesaReceiptNumber,
          amount: parseFloat(existingMem.amount),
          newRealBalance: realAccDone?.availableBalance || existingMem.amount,
          status: "SUCCESSFUL",
        },
      });
    }

    // LIVE MODE: refuse to credit Real accounts from sandbox / test-mode references
    if (process.env.DEMO_MODE === "false") {
      const isSandboxDaraja =
        reference.startsWith("ws_CO_") && (process.env.MPESA_ENV || "sandbox") !== "production";
      const isTestPaystack =
        !reference.startsWith("SASA_") &&
        !reference.startsWith("ws_CO_") &&
        !(process.env.PAYSTACK_SECRET_KEY || "").startsWith("sk_live_");
      if (isSandboxDaraja || isTestPaystack) {
        return NextResponse.json(
          {
            success: false,
            error: "This reference comes from a sandbox/test gateway and cannot be credited to a live account.",
          },
          { status: 400 }
        );
      }
    }

    let amount = 100;
    let receiptNumber = reference;
    let channel = "mobile_money";

    if (reference.startsWith("SASA_")) {
      const rawSasaId = reference.replace(/^SASA_/, "");
      const sasaStatus = await verifySasaPayTransaction(rawSasaId);
      if (!sasaStatus.verified) {
        return NextResponse.json(
          {
            success: false,
            error: `M-Pesa STK Push is not completed yet (${sasaStatus.detail}).`,
            data: {
              status: "PENDING",
              reference,
            },
          },
          { status: 400 }
        );
      }

      const pendingDep = (demoStore.deposits || []).find(
        (d) => d.checkoutRequestId === reference && d.userId === user.id
      );
      if (!pendingDep) {
        return NextResponse.json(
          { success: false, error: "No matching pending M-Pesa deposit found for your account." },
          { status: 404 }
        );
      }
      amount = parseFloat(pendingDep.amount);
      receiptNumber = sasaStatus.receiptNumber;
    } else if (reference.startsWith("ws_CO_")) {
      // Verify live against Safaricom Daraja STK Push Query API
      const darajaStatus = await queryStkPushStatus(reference);
      if (darajaStatus.resultCode !== "0") {
        if (
          darajaStatus.resultCode === "1032" ||
          darajaStatus.resultDesc?.toLowerCase().includes("cancel")
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "M-Pesa payment prompt was cancelled on your phone.",
              data: {
                status: "CANCELLED",
                reference,
                resultCode: darajaStatus.resultCode,
              },
            },
            { status: 200 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error:
              darajaStatus.resultDesc ||
              "Waiting for you to enter your M-Pesa PIN on your phone",
            data: {
              status: "PENDING",
              reference,
              resultCode: darajaStatus.resultCode,
            },
          },
          { status: 200 }
        );
      }

      const pendingDep = (demoStore.deposits || []).find(
        (d) => d.checkoutRequestId === reference
      );
      amount = pendingDep
        ? parseFloat(pendingDep.amount)
        : (body?.amount ? parseFloat(String(body.amount)) : 100);
      receiptNumber = `MP${reference.slice(-8).toUpperCase()}`;
    } else {
      // Verify live against Paystack API (GET https://api.paystack.co/transaction/verify/:reference)
      const verification = await verifyPaystackTransaction(reference);

      if (!verification.verified) {
        return NextResponse.json(
          {
            success: false,
            error: `M-Pesa payment is not completed yet (Status: ${verification.status.toUpperCase()} — ${
              verification.gatewayResponse || "Waiting for M-Pesa PIN confirmation"
            }).`,
            data: {
              status: "PENDING",
              reference: verification.reference,
            },
          },
          { status: 200 }
        );
      }

      amount = verification.amountKes;
      receiptNumber = verification.receiptNumber;
      channel = verification.channel;
    }

    // 3. Credit in Prisma if database is connected
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

      const existingDb = await prisma.deposit.findFirst({
        where: {
          OR: [{ checkoutRequestId: reference }, { mpesaReceiptNumber: receiptNumber }],
          status: DepositStatus.SUCCESSFUL,
        },
      });

      if (!existingDb) {
        const deposit = await prisma.deposit.create({
          data: {
            userId: user.id,
            accountId: realAccount.id,
            amount,
            currency: "KES",
            phoneNumber: user.phone || "254700000000",
            status: DepositStatus.SUCCESSFUL,
            provider: "PAYSTACK" as any,
            mpesaReceiptNumber: receiptNumber,
            checkoutRequestId: reference,
            completedAt: new Date(),
          },
        });

        await creditDeposit({
          accountId: realAccount.id,
          userId: user.id,
          amount,
          depositId: deposit.id,
          description: `M-Pesa Express STK Deposit [${channel}] (${receiptNumber})`,
        });

        await createAuditLog({
          actorId: user.id,
          action: "MPESA_STK_DEPOSIT_CONFIRMED",
          entityType: "Deposit",
          entityId: deposit.id,
          metadata: { reference, receiptNumber, amount, channel },
        });
      }
    } catch {
      // Fallback to in-memory store
    }

    // 4. Credit in-memory Real Broker account
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
        id: `led_psk_${Date.now()}`,
        type: "DEPOSIT",
        amount: amount.toFixed(2),
        balanceAfter: newRealBalance,
        description: `M-Pesa Express STK Deposit (${receiptNumber})`,
        createdAt: new Date(),
      });

      demoStore.users.set(user.id, memUser);
      demoStore.users.set(memUser.email, memUser);
    }

    // Update or insert deposit record in demoStore.deposits
    demoStore.deposits = demoStore.deposits || [];
    const pendingDep = demoStore.deposits.find((d) => d.checkoutRequestId === reference);
    if (pendingDep) {
      pendingDep.status = "SUCCESSFUL";
      pendingDep.mpesaReceiptNumber = receiptNumber;
      pendingDep.completedAt = new Date();
    } else {
      demoStore.deposits.unshift({
        id: `dep_psk_${Date.now()}`,
        userId: user.id,
        userFullName: user.fullName,
        userEmail: user.email,
        amount: amount.toFixed(2),
        currency: "KES",
        phoneNumber: user.phone || "",
        status: "SUCCESSFUL",
        provider: "MPESA",
        checkoutRequestId: reference,
        mpesaReceiptNumber: receiptNumber,
        initiatedAt: new Date(),
        completedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Payment of KES ${amount.toLocaleString()} to TRADEPEDIA confirmed & credited to your Real Broker account!`,
      data: {
        reference,
        receipt: receiptNumber,
        amount,
        newRealBalance,
        channel,
        status: "SUCCESSFUL",
      },
    });
  } catch (err: any) {
    console.error("Paystack verify error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify Paystack transaction" },
      { status: 400 }
    );
  }
}
