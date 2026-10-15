import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { AuthorizationError } from "@/lib/rbac/policy";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  role: z.enum(["admin", "operator", "engineer", "reviewer"]).optional(),
  isActive: z.boolean().optional(),
}).refine((value) => value.role !== undefined || value.isActive !== undefined);

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = updateUserSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const { userId } = await context.params;
    if (actor.id === userId && (parsed.data.role !== undefined || parsed.data.isActive === false)) {
      throw new AuthorizationError();
    }
    const user = await getPrisma().appUser.update({
      where: { id: userId },
      data: parsed.data,
      select: { id: true, fullName: true, email: true, role: true, isActive: true, mustChangePassword: true },
    });
    await writeAuditEvent({ actorId: actor.id, action: "user.update_access", entityType: "app_user", entityId: user.id });
    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
