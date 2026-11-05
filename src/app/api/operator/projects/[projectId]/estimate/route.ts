import { NextResponse } from "next/server";
import { findLatestPublicEstimate } from "@/lib/data/estimates";
import { requireApiRole, requireProjectAccess } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/api";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireApiRole(["operator"]);
    const { projectId } = await context.params;
    await requireProjectAccess(user, projectId);
    const estimate = await findLatestPublicEstimate(projectId);
    if (!estimate) return NextResponse.json({ error: "Estimación no disponible." }, { status: 404 });
    return NextResponse.json(estimate);
  } catch (error) {
    return apiError(error);
  }
}
