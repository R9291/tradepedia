import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { UserRole, KycStatus } from "@prisma/client";
import { demoStore } from "./memory-store";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tradepedia_fallback_secret_must_be_changed_in_prod_at_least_32_characters"
);

export const SESSION_COOKIE_NAME = "tradepedia_auth_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromCookies(): Promise<{
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  kycStatus: KycStatus;
  isActive: boolean;
  isGuest?: boolean;
} | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          kycStatus: true,
          isActive: true,
        },
      });

      if (user && user.isActive) return { ...user, isGuest: false };
    } catch {
      // DB connection failed; check demo store
    }

    // Fallback: check demo store for explicitly logged-in user
    const memUser = demoStore.users.get(payload.userId);
    if (memUser && memUser.isActive && memUser.id !== "demo_trader_ke") {
      return {
        id: memUser.id,
        email: memUser.email,
        fullName: memUser.fullName,
        phone: memUser.phone,
        role: memUser.role as UserRole,
        kycStatus: memUser.kycStatus as KycStatus,
        isActive: memUser.isActive,
        isGuest: false,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromRequest(req: NextRequest): Promise<{
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  kycStatus: KycStatus;
  isActive: boolean;
  isGuest?: boolean;
} | null> {
  try {
    let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
    if (!token) {
      return null;
    }

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          kycStatus: true,
          isActive: true,
        },
      });

      if (user && user.isActive) return { ...user, isGuest: false };
    } catch {
      // DB connection failed; fallback
    }

    const memUser = demoStore.users.get(payload.userId);
    if (memUser && memUser.isActive && memUser.id !== "demo_trader_ke") {
      return {
        id: memUser.id,
        email: memUser.email,
        fullName: memUser.fullName,
        phone: memUser.phone,
        role: memUser.role as UserRole,
        kycStatus: memUser.kycStatus as KycStatus,
        isActive: memUser.isActive,
        isGuest: false,
      };
    }

    return null;
  } catch {
    return null;
  }
}
