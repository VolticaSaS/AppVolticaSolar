import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { AuthorizationError } from "@/lib/rbac/policy";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().max(255).optional(),
  role: z.enum(["admin", "operator", "engineer", "reviewer"]).optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined));

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = updateUserSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const { userId } = await context.params;
    const prisma = getPrisma();
    const current = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!current) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (actor.id === userId && (parsed.data.isActive === false || (parsed.data.role !== undefined && parsed.data.role !== current.role))) {
      throw new AuthorizationError();
    }
    const email = parsed.data.email?.toLowerCase();
    if (email) {
      const duplicate = await prisma.appUser.findFirst({ where: { email }, select: { id: true } });
      if (duplicate && duplicate.id !== userId) {
        return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
      }
    }
    const losesLastAdmin = current.role === "admin" && current.isActive
      && ((parsed.data.role !== undefined && parsed.data.role !== "admin") || parsed.data.isActive === false);
    if (losesLastAdmin && await prisma.appUser.count({ where: { role: "admin", isActive: true } }) <= 1) {
      return NextResponse.json({ error: "Debe quedar al menos un administrador activo." }, { status: 409 });
    }
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.appUser.update({
        where: { id: userId },
        data: { ...parsed.data, ...(email ? { email } : {}) },
        select: { id: true, fullName: true, email: true, role: true, isActive: true, mustChangePassword: true },
      });
      if (parsed.data.isActive === false) await tx.authSession.deleteMany({ where: { userId } });
      await tx.auditEvent.create({
        data: { actorId: actor.id, action: "user.update", entityType: "app_user", entityId: userId },
      });
      return updated;
    });
    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}

/** Soft removal preserves project and audit history while revoking account access. */
export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const { userId } = await context.params;
    if (actor.id === userId) throw new AuthorizationError();
    const prisma = getPrisma();
    const target = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    if (target.role === "admin" && target.isActive
      && await prisma.appUser.count({ where: { role: "admin", isActive: true } }) <= 1) {
      return NextResponse.json({ error: "Debe quedar al menos un administrador activo." }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.appUser.update({ where: { id: userId }, data: { isActive: false }, select: { id: true } });
      await tx.authSession.deleteMany({ where: { userId } });
      await tx.auditEvent.create({
        data: { actorId: actor.id, action: "user.remove_access", entityType: "app_user", entityId: userId },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
