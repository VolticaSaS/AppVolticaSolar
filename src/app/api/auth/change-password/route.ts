import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, assertSameOrigin } from "@/lib/auth/guards";
import { createSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { writeAuditEvent } from "@/lib/audit";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE, PASSWORD_MAX_LENGTH } from "@/lib/security/password-policy";

export const dynamic = "force-dynamic";
const schema = z.object({ currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH), newPassword: z.string().min(12).max(PASSWORD_MAX_LENGTH) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    if (!isStrongPassword(parsed.data.newPassword)) {
      return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }
    const prisma = getPrisma();
    const credential = await prisma.appUser.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!credential || !(await verifyPassword(credential.passwordHash, parsed.data.currentPassword))) {
      return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.appUser.update({
        where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false },
        select: { id: true },
      });
      await tx.authSession.deleteMany({ where: { userId: user.id } });
    });
    await writeAuditEvent({ actorId: user.id, action: "auth.password_change", entityType: "app_user", entityId: user.id });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
