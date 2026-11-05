import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/guards";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { isAppRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
let dummyHash: Promise<string> | undefined;

async function verifyUnknownAccount(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(32).toString("base64url"));
  await verifyPassword(await dummyHash, password);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();

    const email = parsed.data.email.toLowerCase();
    const prisma = getPrisma();
    const user = await prisma.appUser.findFirst({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      await verifyUnknownAccount(parsed.data.password);
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const now = new Date();
    const isLocked = user.lockedUntil !== null && user.lockedUntil > now;
    const lockoutExpired = user.lockedUntil !== null && user.lockedUntil <= now;
    const passwordIsValid = await verifyPassword(user.passwordHash, parsed.data.password);
    if (!user.isActive || isLocked || !passwordIsValid || !isAppRole(user.role)) {
      if (user.isActive && !isLocked && !passwordIsValid) {
        const nextAttempts = (lockoutExpired ? 0 : user.failedLoginAttempts) + 1;
        await prisma.appUser.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: nextAttempts,
            ...(nextAttempts >= MAX_FAILED_ATTEMPTS ? { lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : {}),
          },
        });
      }
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    await prisma.appUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await writeAuditEvent({ actorId: user.id, action: "auth.login", entityType: "app_user", entityId: user.id });
    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword },
    });
  } catch (error) {
    return apiError(error);
  }
}
