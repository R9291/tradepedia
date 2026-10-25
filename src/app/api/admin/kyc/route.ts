import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminKycReviewSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { Prisma, LedgerEntryType } from "@prisma/client";
import { demoStore } from "@/lib/memory-store";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUserFromRequest(req);
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "COMPLIANCE")) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    let submissions: any[] = [];

    try {
      submissions = await prisma.user.findMany({
        where: {
          kycStatus: "PENDING",
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          kycStatus: true,
          createdAt: true,
          kycDocuments: {
            select: {
              id: true,
              documentType: true,
              fileUrl: true,
              idNumber: true,
              nationality: true,
              address: true,
              dateOfBirth: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // DB unreachable; check demo store
    }

    if (submissions.length === 0) {
      for (const u of Array.from(demoStore.users.values())) {
        if (u.kycStatus === "PENDING") {
          submissions.push({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            kycStatus: u.kycStatus,
            createdAt: u.createdAt,
            kycDocuments: u.kycDocuments,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { submissions },
    });
  } catch (error) {
    console.error("Admin KYC list error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch KYC submissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUserFromRequest(req);
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "COMPLIANCE")) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const validated = adminKycReviewSchema.safeParse(body);

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

    const { userId, decision, reviewerNote } = validated.data;

    // RULE: Admin cannot approve their own KYC in live compliance mode
    const isDemoMode = process.env.DEMO_MODE === "true" || !process.env.DEMO_MODE;
    if (admin.id === userId && !isDemoMode) {
      return NextResponse.json(
        {
          success: false,
          error: "Conflict of Interest: Administrators cannot review or approve their own KYC submission in live compliance mode",
        },
        { status: 403 }
      );
    }

    const demoGrantAmount = "100000.00"; // KES 100,000 demo paper credits

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { accounts: true },
      });

      if (targetUser) {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { kycStatus: decision },
          });

          await tx.kycDocument.updateMany({
            where: { userId },
            data: {
              status: decision,
              reviewedBy: admin.id,
              reviewedAt: new Date(),
              reviewerNote,
            },
          });

          if (decision === "APPROVED") {
            const primaryAccount = targetUser.accounts[0];
            if (primaryAccount && primaryAccount.availableBalance.isZero()) {
              const updatedAccount = await tx.account.update({
                where: { id: primaryAccount.id },
                data: {
                  availableBalance: new Prisma.Decimal(demoGrantAmount),
                  equity: new Prisma.Decimal(demoGrantAmount),
                },
              });

              await tx.ledgerEntry.create({
                data: {
                  userId: targetUser.id,
                  accountId: updatedAccount.id,
                  type: LedgerEntryType.DEPOSIT,
                  amount: new Prisma.Decimal(demoGrantAmount),
                  balanceAfter: new Prisma.Decimal(demoGrantAmount),
                  referenceType: "DEMO_GRANT",
                  referenceId: admin.id,
                  description: "Welcome Demo Trading Capital (Simulated Paper Funds KES 100,000)",
                },
              });
            }
          }
        });
      }
    } catch {
      // Fallback: update in demo store
    }

    const memUser = demoStore.users.get(userId);
    if (memUser) {
      memUser.kycStatus = decision;
      memUser.kycDocuments.forEach((d) => {
        d.status = decision;
        d.reviewerNote = reviewerNote;
        d.reviewedBy = admin.id;
        d.reviewedAt = new Date();
      });

      if (decision === "APPROVED" && memUser.accounts.length > 0) {
        const acc = memUser.accounts[0];
        if (parseFloat(acc.availableBalance) === 0) {
          acc.availableBalance = demoGrantAmount;
          acc.equity = demoGrantAmount;
          acc.ledgerEntries.unshift({
            id: `led_${Date.now()}`,
            type: "DEPOSIT",
            amount: demoGrantAmount,
            balanceAfter: demoGrantAmount,
            description: "Welcome Demo Trading Capital (Simulated Paper Funds KES 100,000)",
            createdAt: new Date(),
          });
        }
      }

      demoStore.users.set(userId, memUser);
      demoStore.users.set(memUser.email, memUser);
    }

    await createAuditLog({
      actorId: admin.id,
      action: `KYC_${decision}`,
      entityType: "User",
      entityId: userId,
      metadata: { decision, reviewerNote, reviewerEmail: admin.email },
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `KYC application marked as ${decision}`,
    });
  } catch (error: any) {
    console.error("KYC review error:", error);
    return NextResponse.json({ success: false, error: "Failed to process KYC review" }, { status: 500 });
  }
}
