import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { creditDeposit } from "@/lib/ledger";
import { createAuditLog } from "@/lib/audit";
import { getUsdToKesRate, convertKesToUsd } from "@/lib/fx";
import { DepositStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const callback = rawBody?.Body?.stkCallback;

    if (!callback) {
      console.warn("Invalid M-Pesa callback payload received:", rawBody);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callback;

    // 1. Locate the corresponding initiated deposit record
    const deposit = await prisma.deposit.findFirst({
      where: {
        OR: [
          { checkoutRequestId: CheckoutRequestID },
          { merchantRequestId: MerchantRequestID },
        ],
      },
    });

    if (!deposit) {
      console.warn(`No deposit found matching CheckoutRequestID: ${CheckoutRequestID}`);
      // Safaricom requires 200 OK acceptance
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 2. IDEMPOTENCY CHECK: If already successful, do not credit twice
    if (deposit.status === DepositStatus.SUCCESSFUL) {
      console.log(`Deposit ${deposit.id} has already been reconciled successfully. Skipping.`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    // 3. Extract metadata fields if payment succeeded (Safaricom sends Amount in KES)
    let mpesaReceiptNumber: string | null = null;
    let paidKesAmount: number | null = null;

    if (CallbackMetadata?.Item && Array.isArray(CallbackMetadata.Item)) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") {
          mpesaReceiptNumber = item.Value?.toString() || null;
        } else if (item.Name === "Amount" && item.Value) {
          paidKesAmount = Number(item.Value);
        }
      }
    }

    // Determine USD amount to credit
    let creditUsdAmount = deposit.amount;
    if (deposit.currency !== "USD" && paidKesAmount && Number.isFinite(paidKesAmount)) {
      const { rate } = await getUsdToKesRate();
      creditUsdAmount = convertKesToUsd(paidKesAmount, rate) as any;
    }

    // 4. Handle Successful Payment (ResultCode == 0)
    if (ResultCode === 0) {
      await prisma.$transaction(async (tx) => {
        // Mark deposit successful
        await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: DepositStatus.SUCCESSFUL,
            mpesaReceiptNumber: mpesaReceiptNumber || `MP_${Date.now()}`,
            completedAt: new Date(),
            callbackPayload: rawBody,
          },
        });

        // Atomically credit trading account in USD and create immutable LedgerEntry
        await creditDeposit(
          {
            accountId: deposit.accountId,
            userId: deposit.userId,
            amount: creditUsdAmount,
            depositId: deposit.id,
            description: `M-Pesa STK Push Deposit (Receipt: ${mpesaReceiptNumber || "N/A"}${paidKesAmount ? `, Paid KES ${paidKesAmount}` : ""})`,
          },
          tx
        );
      });

      await createAuditLog({
        actorId: deposit.userId,
        action: "MPESA_DEPOSIT_CONFIRMED",
        entityType: "Deposit",
        entityId: deposit.id,
        metadata: {
          amountUsd: creditUsdAmount.toString(),
          paidKesAmount,
          mpesaReceiptNumber,
          checkoutRequestId: CheckoutRequestID,
        },
      });

      console.log(`Successfully credited deposit ${deposit.id} ($${creditUsdAmount} USD)`);
    } else {
      // 5. Handle Payment Failure or Cancellation (ResultCode != 0)
      const failedStatus =
        ResultCode === 1032 ? DepositStatus.CANCELLED : DepositStatus.FAILED;

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: failedStatus,
          failureReason: ResultDesc || `M-Pesa error code ${ResultCode}`,
          completedAt: new Date(),
          callbackPayload: rawBody,
        },
      });

      await createAuditLog({
        actorId: deposit.userId,
        action: `MPESA_DEPOSIT_${failedStatus}`,
        entityType: "Deposit",
        entityId: deposit.id,
        metadata: {
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          checkoutRequestId: CheckoutRequestID,
        },
      });

      console.log(`Deposit ${deposit.id} marked as ${failedStatus}: ${ResultDesc}`);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("Critical error in M-Pesa callback processor:", error);
    // Return Accepted so Safaricom does not keep flooding with retries on syntax errors
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
