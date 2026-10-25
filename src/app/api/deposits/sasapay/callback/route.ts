import { NextRequest, NextResponse } from "next/server";
import { demoStore } from "@/lib/memory-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const checkoutId =
      body.CheckoutRequestID ||
      body.CheckoutRequestId ||
      body.MerchantRequestID ||
      "";
    const resultCode = String(body.ResultCode ?? body.ResponseCode ?? "");
    const receipt =
      body.TransID ||
      body.TransactionCode ||
      body.ThirdPartyTransID ||
      body.MpesaReceiptNumber ||
      `SP${String(checkoutId).slice(-8).toUpperCase()}`;

    if (checkoutId && (resultCode === "0" || body.status === true)) {
      const sasaRef = `SASA_${checkoutId}`;
      const pendingDep = (demoStore.deposits || []).find(
        (d) => d.checkoutRequestId === sasaRef || d.checkoutRequestId === checkoutId
      );

      if (pendingDep && pendingDep.status !== "SUCCESSFUL") {
        // Reject callbacks whose paid amount doesn't match what the user requested
        const paidAmount = parseFloat(String(body.TransAmount ?? body.Amount ?? pendingDep.amount));
        if (Math.abs(paidAmount - parseFloat(pendingDep.amount || "0")) > 0.01) {
          return NextResponse.json({ ResponseCode: "1", ResponseDescription: "Amount mismatch" });
        }

        pendingDep.status = "SUCCESSFUL";
        pendingDep.mpesaReceiptNumber = String(receipt);
        pendingDep.completedAt = new Date();

        const amount = parseFloat(pendingDep.amount || "0");
        const memUser =
          demoStore.users.get(pendingDep.userId) ||
          demoStore.users.get(pendingDep.userEmail);

        if (memUser && amount > 0) {
          let realAcc = memUser.accounts.find((a) => !a.isDemo);
          if (realAcc) {
            const currentAvail = parseFloat(realAcc.availableBalance || "0");
            const newBal = (currentAvail + amount).toFixed(2);
            realAcc.availableBalance = newBal;
            realAcc.equity = newBal;
            realAcc.ledgerEntries = realAcc.ledgerEntries || [];
            realAcc.ledgerEntries.unshift({
              id: `led_sasa_${Date.now()}`,
              type: "DEPOSIT",
              amount: amount.toFixed(2),
              balanceAfter: newBal,
              description: `M-Pesa STK Deposit (${receipt})`,
              createdAt: new Date(),
            });
          }
        }
      }
    }

    return NextResponse.json({
      ResponseCode: "0",
      ResponseDescription: "Callback received successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ResponseCode: "1", ResponseDescription: err.message || "Error" },
      { status: 200 }
    );
  }
}
