import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, newPassword } = body;

    if (!email || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Valid email and new password (min 8 chars) required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Avoid user enumeration
      return NextResponse.json({
        success: true,
        message: "If the account exists, password has been reset successfully.",
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await createAuditLog({
      actorId: user.id,
      action: "USER_PASSWORD_RESET",
      entityType: "User",
      entityId: user.id,
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Password reset failed" }, { status: 500 });
  }
}
