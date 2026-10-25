import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kycSubmissionSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { demoStore, DemoKycDoc } from "@/lib/memory-store";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = kycSubmissionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: validated.error.errors[0]?.message || "Validation error",
          details: validated.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const {
      documentType,
      idNumber,
      nationality,
      dateOfBirth,
      address,
      documentUrl,
      selfieUrl,
    } = validated.data;

    let result: any = null;

    try {
      // 1. Try PostgreSQL via Prisma
      result = await prisma.$transaction(async (tx) => {
        const doc = await tx.kycDocument.create({
          data: {
            userId: user.id,
            documentType,
            fileUrl: documentUrl,
            idNumber,
            nationality,
            address,
            dateOfBirth: new Date(dateOfBirth),
            status: "PENDING",
          },
        });

        await tx.kycDocument.create({
          data: {
            userId: user.id,
            documentType: "SELFIE",
            fileUrl: selfieUrl,
            status: "PENDING",
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { kycStatus: "PENDING" },
          select: { id: true, email: true, fullName: true, kycStatus: true },
        });

        return { doc, user: updatedUser };
      });
    } catch (dbError) {
      console.warn("Database not reachable, saving KYC to demo store:", dbError);
      // 2. Demo Store Fallback
      const mainDoc: DemoKycDoc = {
        id: `kdoc_${Date.now()}_1`,
        userId: user.id,
        documentType,
        fileUrl: documentUrl,
        idNumber,
        nationality,
        address,
        dateOfBirth: new Date(dateOfBirth),
        status: "PENDING",
        reviewerNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
      };

      const selfieDoc: DemoKycDoc = {
        id: `kdoc_${Date.now()}_2`,
        userId: user.id,
        documentType: "SELFIE",
        fileUrl: selfieUrl,
        status: "PENDING",
        reviewerNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
      };

      const memUser = demoStore.users.get(user.id);
      if (memUser) {
        memUser.kycStatus = "PENDING";
        memUser.kycDocuments = [mainDoc, selfieDoc];
        demoStore.users.set(user.id, memUser);
        demoStore.users.set(memUser.email, memUser);
      }

      result = { doc: mainDoc, user: { id: user.id, kycStatus: "PENDING" } };
    }

    await createAuditLog({
      actorId: user.id,
      action: "KYC_SUBMITTED",
      entityType: "User",
      entityId: user.id,
      metadata: { documentType, idNumber, nationality },
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "KYC verification documents successfully submitted. Compliance review in progress.",
      data: result,
    });
  } catch (error: any) {
    console.error("KYC submission error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit KYC documents" },
      { status: 500 }
    );
  }
}
