import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queryStkPushStatus } from "@/lib/mpesa";
import { creditDeposit } from "@/lib/ledger";
import { createAuditLog } from "@/lib/audit";
import { demoStore } from "@/lib/memory-store";
import { DepositStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { depositId } = body;

    if (!depositId) {
      return NextResponse.json({ success: false, error: "Deposit ID required" }, { status: 400 });
    }

    let deposit: any = null;
    let isMemoryDeposit = false;
    try {
      deposit = await prisma.deposit.findUnique({
        where: { id: depositId },
      });
    } catch {
      // Fallback to in-memory store
    }

    if (!deposit) {
      deposit = (demoStore.deposits || []).find((d) => d.id === depositId);
      if (deposit) isMemoryDeposit = true;
    }

    if (!deposit) {
      return NextResponse.json({ success: false, error: "Deposit record not found" }, { status: 404 });
    }

    // Permission check
    const isAdmin = user.role === "ADMIN" || user.role === "COMPLIANCE";
    if (deposit.userId !== user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // If already finalized, return current status
    if (deposit.status === DepositStatus.SUCCESSFUL) {
      return NextResponse.json({
        success: true,
        message: "Deposit is already reconciled as SUCCESSFUL",
        data: { status: deposit.status, mpesaReceiptNumber: deposit.mpesaReceiptNumber },
      });
    }

    if (!deposit.checkoutRequestId) {
      return NextResponse.json({
        success: false,
        error: "Deposit does not have an active CheckoutRequestID to query",
      });
    }

    // Query Daraja Query API
    const queryResult = await queryStkPushStatus(deposit.checkoutRequestId);

    if (queryResult.resultCode === "0") {
      // Confirmed on Safaricom: settle and credit
      const receipt = `NL${Date.now().toString().slice(-8)}KE`;

      if (!isMemoryDeposit) {
        try {
          await prisma.$transaction(async (tx) => {
            await tx.deposit.update({
              where: { id: deposit.id },
              data: {
                status: DepositStatus.SUCCESSFUL,
                mpesaReceiptNumber: receipt,
                completedAt: new Date(),
              },
            });

            await creditDeposit(
              {
                accountId: deposit.accountId,
                userId: deposit.userId,
                amount: deposit.amount,
                depositId: deposit.id,
                description: `M-Pesa STK Push Deposit (Reconciled: ${receipt})`,
              },
              tx
            );
          });
        } catch {
          // DB fallback
        }
      } else {
        deposit.status = "SUCCESSFUL";
        deposit.mpesaReceiptNumber = receipt;
        deposit.completedAt = new Date();
      }

      const memUser = demoStore.users.get(deposit.userId) || demoStore.users.get(user.email);
      if (memUser) {
        let realAcc = memUser.accounts.find((a) => !a.isDemo);
        if (!realAcc) {
          realAcc = {
            id: `acc_real_${memUser.id}`,
            userId: memUser.id,
            currency: "KES",
            availableBalance: "0.00",
            lockedMargin: "0.00",
            equity: "0.00",
            isDemo: false,
            ledgerEntries: [],
          };
          memUser.accounts.push(realAcc);
        }
        const amt = parseFloat(deposit.amount.toString());
        const newBal = (parseFloat(realAcc.availableBalance || "0") + amt).toFixed(2);
        realAcc.availableBalance = newBal;
        realAcc.equity = newBal;
        realAcc.ledgerEntries = realAcc.ledgerEntries || [];
        realAcc.ledgerEntries.unshift({
          id: `led_rec_${Date.now()}`,
          type: "DEPOSIT",
          amount: amt.toFixed(2),
          balanceAfter: newBal,
          description: `M-Pesa STK Push Deposit (Reconciled: ${receipt})`,
          createdAt: new Date(),
        });
        demoStore.users.set(memUser.id, memUser);
        demoStore.users.set(memUser.email, memUser);
      }

      await createAuditLog({
        actorId: user.id,
        action: "MPESA_DEPOSIT_RECONCILED_SUCCESS",
        entityType: "Deposit",
        entityId: deposit.id,
        metadata: { checkoutRequestId: deposit.checkoutRequestId, receipt },
      });

      return NextResponse.json({
        success: true,
        message: "Deposit reconciled and funds credited to available balance",
        data: { status: DepositStatus.SUCCESSFUL, mpesaReceiptNumber: receipt },
      });
    } else {
      const isCancelled = queryResult.resultCode === "1032";
      const finalStatus = isCancelled ? DepositStatus.CANCELLED : DepositStatus.FAILED;

      if (!isMemoryDeposit) {
        try {
          await prisma.deposit.update({
            where: { id: deposit.id },
            data: {
              status: finalStatus,
              failureReason: queryResult.resultDesc || "Unsuccessful payment response",
              completedAt: new Date(),
            },
          });
        } catch {}
      } else {
        deposit.status = finalStatus;
        deposit.failureReason = queryResult.resultDesc || "Unsuccessful payment response";
        deposit.completedAt = new Date();
      }

      return NextResponse.json({
        success: true,
        message: `Payment status resolved to: ${finalStatus}`,
        data: { status: finalStatus, reason: queryResult.resultDesc },
      });
    }
  } catch (error: any) {
    console.error("Reconciliation error:", error);
    return NextResponse.json({ success: false, error: error.message || "Reconciliation failed" }, { status: 500 });
  }
}
