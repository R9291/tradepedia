import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoStore } from "@/lib/memory-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let deposit: any = null;
    try {
      deposit = await prisma.deposit.findUnique({
        where: { id: params.id },
        include: {
          ledgerEntries: true,
        },
      });
    } catch {
      // Fallback to in-memory store
    }

    if (!deposit) {
      deposit = (demoStore.deposits || []).find((d) => d.id === params.id);
    }

    if (!deposit) {
      return NextResponse.json({ success: false, error: "Deposit not found" }, { status: 404 });
    }

    // Permission check: only owner or admin can view
    const isAdmin = user.role === "ADMIN" || user.role === "COMPLIANCE";
    if (deposit.userId !== user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        deposit: {
          id: deposit.id,
          amount: deposit.amount.toString(),
          currency: deposit.currency,
          phoneNumber: deposit.phoneNumber,
          status: deposit.status,
          merchantRequestId: deposit.merchantRequestId,
          checkoutRequestId: deposit.checkoutRequestId,
          mpesaReceiptNumber: deposit.mpesaReceiptNumber,
          failureReason: deposit.failureReason,
          initiatedAt: deposit.initiatedAt,
          completedAt: deposit.completedAt,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch deposit details" }, { status: 500 });
  }
}
