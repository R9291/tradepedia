import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { Prisma, LedgerEntryType } from "@prisma/client";
import { demoStore, DemoKycDoc } from "@/lib/memory-store";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const demoGrantAmount = "100000.00"; // KES 100,000 demo paper capital

    // 1. Try PostgreSQL via Prisma
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { accounts: true, kycDocuments: true },
      });

      if (targetUser) {
        await prisma.$transaction(async (tx) => {
          // If no documents exist yet, create default approved sample documents
          if (targetUser.kycDocuments.length === 0) {
            await tx.kycDocument.create({
              data: {
                userId: user.id,
                documentType: "NATIONAL_ID",
                fileUrl: "/uploads/kyc/national_id_sample.jpg",
                idNumber: "38920145",
                nationality: "Kenyan",
                address: "Nairobi, Kenya",
                dateOfBirth: new Date("1998-05-14"),
                status: "APPROVED",
                reviewerNote: "Automated Sandbox Verification: Instant Demo Approval",
                reviewedAt: new Date(),
              },
            });
            await tx.kycDocument.create({
              data: {
                userId: user.id,
                documentType: "SELFIE",
                fileUrl: "/uploads/kyc/selfie_sample.jpg",
                status: "APPROVED",
                reviewerNote: "Biometric live check passed",
                reviewedAt: new Date(),
              },
            });
          } else {
            await tx.kycDocument.updateMany({
              where: { userId: user.id },
              data: {
                status: "APPROVED",
                reviewerNote: "Automated Sandbox Verification: Instant Demo Approval",
                reviewedAt: new Date(),
              },
            });
          }

          // Update user status
          await tx.user.update({
            where: { id: user.id },
            data: { kycStatus: "APPROVED" },
          });

          // Check if primary account has balance, credit paper demo trading funds if zero
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
                userId: user.id,
                accountId: updatedAccount.id,
                type: LedgerEntryType.DEPOSIT,
                amount: new Prisma.Decimal(demoGrantAmount),
                balanceAfter: new Prisma.Decimal(demoGrantAmount),
                referenceType: "DEMO_GRANT",
                referenceId: `sandbox_${Date.now()}`,
                description: "Welcome Demo Trading Capital (Paper Funds KES 100,000)",
              },
            });
          }
        });
      }
    } catch (dbErr) {
      console.warn("Prisma unavailable during demo approval; falling back to memory store:", dbErr);
    }

    // 2. Fallback / Update in memory store
    let memUser = demoStore.users.get(user.id);
    if (!memUser) {
      memUser = demoStore.users.get(user.email);
    }

    if (memUser) {
      memUser.kycStatus = "APPROVED";
      if (!memUser.kycDocuments || memUser.kycDocuments.length === 0) {
        const sampleDoc1: DemoKycDoc = {
          id: `kdoc_${Date.now()}_1`,
          userId: user.id,
          documentType: "NATIONAL_ID",
          fileUrl: "/uploads/kyc/national_id_sample.jpg",
          idNumber: "38920145",
          nationality: "Kenyan",
          address: "Nairobi, Kenya",
          dateOfBirth: new Date("1998-05-14"),
          status: "APPROVED",
          reviewerNote: "Automated Sandbox Verification: Instant Demo Approval",
          reviewedBy: "SYSTEM_SANDBOX",
          reviewedAt: new Date(),
          createdAt: new Date(),
        };
        const sampleDoc2: DemoKycDoc = {
          id: `kdoc_${Date.now()}_2`,
          userId: user.id,
          documentType: "SELFIE",
          fileUrl: "/uploads/kyc/selfie_sample.jpg",
          status: "APPROVED",
          reviewerNote: "Biometric live check passed",
          reviewedBy: "SYSTEM_SANDBOX",
          reviewedAt: new Date(),
          createdAt: new Date(),
        };
        memUser.kycDocuments = [sampleDoc1, sampleDoc2];
      } else {
        memUser.kycDocuments.forEach((doc) => {
          doc.status = "APPROVED";
          doc.reviewerNote = "Automated Sandbox Verification: Instant Demo Approval";
          doc.reviewedBy = "SYSTEM_SANDBOX";
          doc.reviewedAt = new Date();
        });
      }

      if (memUser.accounts && memUser.accounts.length > 0) {
        const acc = memUser.accounts[0];
        if (parseFloat(acc.availableBalance) === 0) {
          acc.availableBalance = demoGrantAmount;
          acc.equity = demoGrantAmount;
          acc.ledgerEntries = acc.ledgerEntries || [];
          acc.ledgerEntries.unshift({
            id: `led_${Date.now()}`,
            type: "DEPOSIT",
            amount: demoGrantAmount,
            balanceAfter: demoGrantAmount,
            description: "Welcome Demo Trading Capital (Paper Funds KES 100,000)",
            createdAt: new Date(),
          });
        }
      }

      demoStore.users.set(user.id, memUser);
      demoStore.users.set(memUser.email, memUser);
    }

    await createAuditLog({
      actorId: user.id,
      action: "KYC_DEMO_APPROVED",
      entityType: "User",
      entityId: user.id,
      metadata: { note: "Instant sandbox approval executed" },
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "KYC verification instantly approved! KES 100,000 demo paper funds credited.",
      data: {
        kycStatus: "APPROVED",
        balance: demoGrantAmount,
      },
    });
  } catch (error: any) {
    console.error("Demo approve error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process instant demo approval" },
      { status: 500 }
    );
  }
}
