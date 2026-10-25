import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminAdjustmentSchema } from "@/lib/validations";
import { recordAdminAdjustment } from "@/lib/ledger";

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUserFromRequest(req);
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Super Administrator access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = adminAdjustmentSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: validated.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { userId, amount, reason } = validated.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });

    if (!user || user.accounts.length === 0) {
      return NextResponse.json({ success: false, error: "User or trading account not found" }, { status: 404 });
    }

    const account = user.accounts[0];
    const ipAddress = req.ip || req.headers.get("x-forwarded-for") || undefined;

    const result = await prisma.$transaction(async (tx) => {
      return await recordAdminAdjustment(
        {
          accountId: account.id,
          userId: user.id,
          amount,
          reason,
          adminActorId: admin.id,
          ipAddress,
        },
        tx
      );
    });

    return NextResponse.json({
      success: true,
      message: "Balance adjustment successfully applied with immutable ledger audit record",
      data: {
        newBalance: result.account.availableBalance.toString(),
        ledgerEntryId: result.ledgerEntry.id,
      },
    });
  } catch (error: any) {
    console.error("Adjustment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute balance adjustment" },
      { status: 400 }
    );
  }
}
