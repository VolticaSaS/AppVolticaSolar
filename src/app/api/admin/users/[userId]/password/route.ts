import { NextResponse } from "next/server";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/http/api";
import { hashPassword } from "@/lib/security/password";
import { generateTemporaryPassword } from "@/lib/security/temporary-password";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const { userId } = await context.params;
    if (actor.id === userId) return NextResponse.json({ error: "Para tu cuenta, usa la opción Cambiar contraseña." }, { status: 403 });
    const prisma = getPrisma();
    const target = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    const temporaryPassword = generateTemporaryPassword();

    await prisma.$transaction(async (tx) => {
      await tx.appUser.update({
        where: { id: target.id },
        data: {
          passwordHash: await hashPassword(temporaryPassword),
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
    return NextResponse.json({ ok: true, temporaryPassword });
  } catch (error) {
    return apiError(error);
  }
}
