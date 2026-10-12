import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { AppRole } from "@/lib/rbac/policy";
import { getPrisma } from "@/lib/prisma";

export const SESSION_COOKIE = "voltica_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  mustChangePassword: boolean;
};

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await getPrisma().authSession.create({
    data: { userId, tokenHash: digest(token), expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getPrisma().authSession.findFirst({
    where: {
      tokenHash: digest(token),
      expiresAt: { gt: new Date() },
      user: { isActive: true },
    },
    select: {
      user: {
        select: { id: true, fullName: true, email: true, role: true, mustChangePassword: true },
      },
    },
  });
  if (!session || !isAppRole(session.user.role)) return null;

  return {
    id: session.user.id,
    fullName: session.user.fullName,
    email: session.user.email,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await getPrisma().authSession.deleteMany({ where: { tokenHash: digest(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export function isAppRole(value: string): value is AppRole {
  return value === "admin" || value === "operator" || value === "engineer";
}
