import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/http/api";

export const dynamic = "force-dynamic";

// Lista solo campos técnicos y proyectos asignados al revisor. Nunca incluye costos.
export async function GET() {
  try {
    const user = await requireApiRole(["reviewer"]);
    const rows = await getPrisma().simulation.findMany({
      where: {
        status: "needs_review",
        project: {
          OR: [
            { ownerId: user.id },
            { memberships: { some: { userId: user.id, accessRole: "reviewer" } } },
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, title: true, version: true, systemType: true, resultPanelCount: true,
        resultPvKwp: true, resultGenerationKwhMonth: true, warnings: true, createdAt: true,
        creator: { select: { fullName: true } },
        project: { select: { id: true, name: true, city: true, department: true } },
      },
    });
    const reviews = rows.map((row) => ({
      id: row.id, title: row.title, version: row.version, systemType: row.systemType,
      panelCount: row.resultPanelCount, pvKwp: row.resultPvKwp?.toString() ?? null,
      generationKwhMonth: row.resultGenerationKwhMonth?.toString() ?? null,
      warnings: row.warnings, createdAt: row.createdAt.toISOString(),
      createdBy: row.creator?.fullName ?? "Usuario", project: row.project,
    }));
    return NextResponse.json({ reviews });
  } catch (error) {
    return apiError(error);
  }
}
