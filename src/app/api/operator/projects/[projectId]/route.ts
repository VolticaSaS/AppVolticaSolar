import { NextResponse } from "next/server";
import { assertSameOrigin, requireApiRole, requireProjectAccess, ResourceNotFoundError } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/http/api";
import { AuthorizationError } from "@/lib/rbac/policy";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole(["operator"]);
    const { projectId } = await context.params;
    const project = await getPrisma().project.findUnique({
      where: { id: projectId },
      select: {
        id: true, ownerId: true,
        simulations: { orderBy: { version: "desc" }, take: 1, select: { status: true } },
      },
    });
    if (!project) throw new ResourceNotFoundError();
    await requireProjectAccess(user, project.id);
    if (project.ownerId !== user.id || project.simulations[0]?.status !== "draft") {
      throw new AuthorizationError();
    }
    await getPrisma().project.update({
      where: { id: projectId },
      data: { status: "archived", updatedAt: new Date() },
    });
    await writeAuditEvent({ actorId: user.id, action: "project.archive", entityType: "project", entityId: projectId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
