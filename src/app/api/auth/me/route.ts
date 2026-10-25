import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoStore } from "@/lib/memory-store";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          role: true,
          kycStatus: true,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          accounts: {
            select: {
              id: true,
              currency: true,
              availableBalance: true,
              lockedMargin: true,
              equity: true,
              isDemo: true,
            },
          },
          kycDocuments: {
            select: {
              id: true,
              documentType: true,
              status: true,
              reviewerNote: true,
              createdAt: true,
            },
          },
        },
      });

      if (fullUser) {
        return NextResponse.json({
          success: true,
          data: {
            isAuthenticated: !user.isGuest,
            user: { ...fullUser, isGuest: Boolean(user.isGuest) },
          },
        });
      }
    } catch {
      // Fallback to demo store
    }

    const memUser = demoStore.users.get(user.id);
    if (memUser) {
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: !user.isGuest,
          user: { ...memUser, isGuest: Boolean(user.isGuest) },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: !user.isGuest,
        user: {
          ...user,
          isGuest: Boolean(user.isGuest),
          accounts: [
            {
              id: `acc_${user.id}`,
              currency: "KES",
              availableBalance: "100000.00",
              lockedMargin: "0.00",
              equity: "100000.00",
              isDemo: true,
            },
          ],
          kycDocuments: [],
        },
      },
    });
  } catch (error) {
    console.error("Me endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
