import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { isStrongPassword, PASSWORD_MAX_LENGTH, PASSWORD_POLICY_MESSAGE } from "@/lib/security/password-policy";
import { hashPassword } from "@/lib/security/password";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(12).max(PASSWORD_MAX_LENGTH) });

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    if (!isStrongPassword(parsed.data.password)) {
      return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }
    const { userId } = await context.params;
    const prisma = getPrisma();
    const target = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.appUser.update({
        where: { id: target.id },
        data: {
          passwordHash: await hashPassword(parsed.data.password),
          mustChangePassword: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        select: { id: true },
      });
      await tx.authSession.deleteMany({ where: { userId: target.id } });
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          action: "user.password_reset",
          entityType: "app_user",
          entityId: target.id,
          metadata: {},
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
