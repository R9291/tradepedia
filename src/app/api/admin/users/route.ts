import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUserFromRequest(req);
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "COMPLIANCE")) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin or Compliance access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const kycFilter = searchParams.get("kycStatus");

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (kycFilter && kycFilter !== "ALL") {
      whereClause.kycStatus = kycFilter;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        kycStatus: true,
        isActive: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            currency: true,
            availableBalance: true,
            lockedMargin: true,
            equity: true,
          },
        },
        _count: {
          select: {
            trades: true,
            deposits: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}
