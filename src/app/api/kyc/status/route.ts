import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoStore } from "@/lib/memory-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
      const documents = await prisma.kycDocument.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (documents.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            kycStatus: user.kycStatus,
            documents,
          },
        });
      }
    } catch {
      // DB unreachable
    }

    const memUser = demoStore.users.get(user.id);
    return NextResponse.json({
      success: true,
      data: {
        kycStatus: memUser?.kycStatus || user.kycStatus,
        documents: memUser?.kycDocuments || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch KYC status" },
      { status: 500 }
    );
  }
}
