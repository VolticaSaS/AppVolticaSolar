import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { hashPassword } from "@/lib/security/password";
import { generateTemporaryPassword } from "@/lib/security/temporary-password";
import { normalizeAppRole } from "@/lib/rbac/policy";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  role: z.enum(["admin", "operator", "reviewer"]),
});

export async function GET() {
  try {
    await requireApiRole(["admin"]);
    const users = await getPrisma().appUser.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    });
    return NextResponse.json({ users: users.map((user) => ({ ...user, role: normalizeAppRole(user.role) })) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const email = parsed.data.email.toLowerCase();
    const prisma = getPrisma();
    if (await prisma.appUser.findFirst({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }
    const temporaryPassword = generateTemporaryPassword();
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.appUser.create({
        data: {
          fullName: parsed.data.fullName,
          email,
          passwordHash: await hashPassword(temporaryPassword),
          role: parsed.data.role,
          mustChangePassword: true,
        },
        select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
      });
      await tx.auditEvent.create({
        data: { actorId: actor.id, action: "user.create", entityType: "app_user", entityId: created.id },
      });
      return created;
    });
    return NextResponse.json({ user, temporaryPassword }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
