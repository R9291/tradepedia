import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { demoStore, DemoUser } from "@/lib/memory-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      const firstError = validated.error.errors[0]?.message || "Validation failed";
      return NextResponse.json(
        {
          success: false,
          error: firstError,
          details: validated.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { fullName, email, phone, password } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Clean phone number (strip spaces, dashes, etc.)
    let cleanedPhone = phone.replace(/[\s\-\(\)\+]/g, "").trim();
    if (cleanedPhone.startsWith("0")) {
      cleanedPhone = "254" + cleanedPhone.substring(1);
    } else if (cleanedPhone.startsWith("7") || cleanedPhone.startsWith("1")) {
      cleanedPhone = "254" + cleanedPhone;
    }

    const passwordHash = await hashPassword(password);
    const isDemo = process.env.DEMO_MODE !== "false";

    let user: any = null;

    try {
      // 1. Try PostgreSQL via Prisma
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ email: normalizedEmail }, { phone: cleanedPhone }],
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email or phone number already exists",
          },
          { status: 409 }
        );
      }

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            fullName,
            email: normalizedEmail,
            phone: cleanedPhone,
            passwordHash,
            role: "USER",
            kycStatus: "APPROVED",
          },
        });

        await tx.account.createMany({
          data: [
            {
              userId: newUser.id,
              currency: "KES",
              availableBalance: 100000,
              lockedMargin: 0,
              equity: 100000,
              isDemo: true,
            },
            {
              userId: newUser.id,
              currency: "KES",
              availableBalance: 0,
              lockedMargin: 0,
              equity: 0,
              isDemo: false,
            },
          ],
        });

        return newUser;
      });
    } catch (dbError) {
      console.warn("Database not reachable, using in-memory demo store fallback:", dbError);
      // 2. In-memory fallback
      // Check duplicate email in memory (ignore guest placeholder demo_trader_ke)
      for (const existingUser of Array.from(demoStore.users.values())) {
        if (existingUser.id === "demo_trader_ke") continue;
        if (existingUser.email === normalizedEmail) {
          return NextResponse.json(
            { success: false, error: "An account with this email address already exists. Please log in instead." },
            { status: 409 }
          );
        }
      }

      const userId = `usr_${Date.now()}`;

      const newDemoUser: DemoUser = {
        id: userId,
        fullName,
        email: normalizedEmail,
        phone: cleanedPhone,
        passwordHash,
        role: "USER",
        kycStatus: "APPROVED",
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date(),
        accounts: [
          {
            id: `acc_demo_${userId}`,
            userId,
            currency: "KES",
            availableBalance: "100000.00",
            lockedMargin: "0.00",
            equity: "100000.00",
            isDemo: true,
            ledgerEntries: [
              {
                id: `led_init_${userId}`,
                type: "DEPOSIT",
                amount: "100000.00",
                balanceAfter: "100000.00",
                description: "Initial Paper Trading virtual liquidity",
                createdAt: new Date(),
              },
            ],
          },
          {
            id: `acc_real_${userId}`,
            userId,
            currency: "KES",
            availableBalance: "0.00",
            lockedMargin: "0.00",
            equity: "0.00",
            isDemo: false,
            ledgerEntries: [],
          },
        ],
        kycDocuments: [],
      };

      demoStore.users.set(userId, newDemoUser);
      demoStore.users.set(normalizedEmail, newDemoUser);
      user = newDemoUser;
    }

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    await createAuditLog({
      actorId: user.id,
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email, isDemo },
      ipAddress: req.ip || req.headers.get("x-forwarded-for") || undefined,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Account registered successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName,
            role: user.role,
            kycStatus: user.kycStatus,
          },
        },
      },
      { status: 201 }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during registration" },
      { status: 500 }
    );
  }
}
