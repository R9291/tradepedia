import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { demoStore } from "@/lib/memory-store";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getCurrentUserFromRequest(req);
    const isAuthenticated = Boolean(authUser && !authUser.isGuest);
    const guestUser = demoStore.users.get("demo_trader_ke");
    const user = authUser || (guestUser ? {
      id: guestUser.id,
      email: guestUser.email,
      fullName: guestUser.fullName,
      phone: guestUser.phone,
      role: guestUser.role as any,
      kycStatus: guestUser.kycStatus as any,
      isActive: true,
      isGuest: true,
    } : null);

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isDemo = process.env.DEMO_MODE !== "false";

    try {
      const userAccounts = await prisma.account.findMany({
        where: { userId: user.id },
        include: {
          ledgerEntries: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (userAccounts.length > 0) {
        const demoAcc = userAccounts.find((a) => a.isDemo) || userAccounts[0];
        const realAcc = userAccounts.find((a) => !a.isDemo);

        return NextResponse.json({
          success: true,
          data: {
            isAuthenticated,
            user: isAuthenticated
              ? {
                  id: user.id,
                  fullName: user.fullName,
                  email: user.email,
                  phone: user.phone,
                  isGuest: false,
                }
              : null,
            account: {
              id: demoAcc.id,
              currency: demoAcc.currency,
              availableBalance: demoAcc.availableBalance.toString(),
              lockedMargin: demoAcc.lockedMargin.toString(),
              equity: demoAcc.equity.toString(),
              isDemo: demoAcc.isDemo,
            },
            demoAccount: {
              id: demoAcc.id,
              currency: demoAcc.currency,
              availableBalance: demoAcc.availableBalance.toString(),
              lockedMargin: demoAcc.lockedMargin.toString(),
              equity: demoAcc.equity.toString(),
              isDemo: true,
            },
            realAccount: {
              id: realAcc ? realAcc.id : `acc_real_${user.id}`,
              currency: realAcc ? realAcc.currency : "KES",
              availableBalance: !user.isGuest && realAcc ? realAcc.availableBalance.toString() : "0.00",
              lockedMargin: !user.isGuest && realAcc ? realAcc.lockedMargin.toString() : "0.00",
              equity: !user.isGuest && realAcc ? realAcc.equity.toString() : "0.00",
              isDemo: false,
            },
            compliance: {
              demoMode: isDemo,
              kycStatus: user.kycStatus,
              canTrade: user.kycStatus === "APPROVED",
              canDeposit: !user.isGuest && user.kycStatus === "APPROVED",
            },
            recentTransactions: demoAcc.ledgerEntries.map((l) => ({
              id: l.id,
              type: l.type,
              amount: l.amount.toString(),
              balanceAfter: l.balanceAfter.toString(),
              description: l.description,
              createdAt: l.createdAt,
            })),
          },
        });
      }
    } catch {
      // DB unreachable
    }

    // Fallback: Demo Store
    const memUser = demoStore.users.get(user.id);
    const effectiveKyc = memUser?.kycStatus || user.kycStatus;

    let demoAcc = memUser?.accounts?.find((a) => a.isDemo);
    let realAcc = memUser?.accounts?.find((a) => !a.isDemo);

    if (!demoAcc) {
      demoAcc = {
        id: `acc_demo_${user.id}`,
        userId: user.id,
        currency: "KES",
        availableBalance: effectiveKyc === "APPROVED" ? "100000.00" : "0.00",
        lockedMargin: "0.00",
        equity: effectiveKyc === "APPROVED" ? "100000.00" : "0.00",
        isDemo: true,
        ledgerEntries: [],
      };
      if (memUser) memUser.accounts.push(demoAcc);
    }

    if (!realAcc) {
      realAcc = {
        id: `acc_real_${user.id}`,
        userId: user.id,
        currency: "KES",
        availableBalance: "0.00", // Initial real balance is strictly KES 0.00 until an actual M-Pesa deposit is confirmed
        lockedMargin: "0.00",
        equity: "0.00",
        isDemo: false,
        ledgerEntries: [],
      };
      if (memUser) memUser.accounts.push(realAcc);
    }

    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated,
        user: isAuthenticated
          ? {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              isGuest: false,
            }
          : null,
        account: {
          id: demoAcc.id,
          currency: demoAcc.currency,
          availableBalance: demoAcc.availableBalance,
          lockedMargin: demoAcc.lockedMargin,
          equity: demoAcc.equity,
          isDemo: true,
        },
        demoAccount: {
          id: demoAcc.id,
          currency: demoAcc.currency,
          availableBalance: demoAcc.availableBalance,
          lockedMargin: demoAcc.lockedMargin,
          equity: demoAcc.equity,
          isDemo: true,
        },
        realAccount: {
          id: realAcc.id,
          currency: realAcc.currency,
          availableBalance: !user.isGuest ? realAcc.availableBalance : "0.00",
          lockedMargin: !user.isGuest ? realAcc.lockedMargin : "0.00",
          equity: !user.isGuest ? realAcc.equity : "0.00",
          isDemo: false,
        },
        compliance: {
          demoMode: isDemo,
          kycStatus: effectiveKyc,
          canTrade: effectiveKyc === "APPROVED",
          canDeposit: !user.isGuest && effectiveKyc === "APPROVED",
        },
        recentTransactions: demoAcc.ledgerEntries || [],
      },
    });
  } catch (error) {
    console.error("Account summary error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch account summary" }, { status: 500 });
  }
}
