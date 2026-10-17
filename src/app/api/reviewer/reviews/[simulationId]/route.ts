import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole, requireProjectAccess, ResourceNotFoundError } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { AuthorizationError } from "@/lib/rbac/policy";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";
const reviewSchema = z.object({ decision: z.enum(["approved", "rejected"]), notes: z.string().trim().max(2000).optional() });

export async function GET(_request: Request, context: { params: Promise<{ simulationId: string }> }) {
  try {
    const user = await requireApiRole(["reviewer"]);
    const { simulationId } = await context.params;
    const simulation = await getPrisma().simulation.findUnique({
      where: { id: simulationId },
      select: {
        id: true, projectId: true, createdBy: true, title: true, version: true, systemType: true,
        batteryEnabled: true, desiredCoverageFraction: true, systemLossFraction: true, designInputs: true,
        calculationMethodVersion: true, resultPanelCount: true, resultPvKwp: true,
        resultGenerationKwhMonth: true, resultGenerationKwhYear: true,
        resultBatteryNominalKwh: true, resultBatteryUsableKwh: true, warnings: true,
        status: true, reviewNotes: true,
      },
    });
    if (!simulation) throw new ResourceNotFoundError();
    await requireProjectAccess(user, simulation.projectId);
    const { createdBy: _creator, ...technicalFields } = simulation;
    void _creator;
    const rawInputs = technicalFields.designInputs && typeof technicalFields.designInputs === "object"
      ? technicalFields.designInputs as Record<string, unknown> : {};
    return NextResponse.json({ simulation: {
      id: technicalFields.id, projectId: technicalFields.projectId, title: technicalFields.title,
      version: technicalFields.version, systemType: technicalFields.systemType,
      batteryEnabled: technicalFields.batteryEnabled,
      desiredCoverageFraction: technicalFields.desiredCoverageFraction?.toString() ?? null,
      systemLossFraction: technicalFields.systemLossFraction?.toString() ?? null,
      designInputs: {
        observations: rawInputs.internal_observations,
        energy_kwh_month: rawInputs.energy_kwh_month,
        peak_sun_hours_day: rawInputs.peak_sun_hours_day,
        panel_power_w: rawInputs.panel_power_w,
        losses_percent: rawInputs.losses_percent,
        autonomy_days: rawInputs.autonomy_days,
      }, calculationMethodVersion: technicalFields.calculationMethodVersion,
      resultPanelCount: technicalFields.resultPanelCount, resultPvKwp: technicalFields.resultPvKwp?.toString() ?? null,
      resultGenerationKwhMonth: technicalFields.resultGenerationKwhMonth?.toString() ?? null,
      resultGenerationKwhYear: technicalFields.resultGenerationKwhYear?.toString() ?? null,
      resultBatteryNominalKwh: technicalFields.resultBatteryNominalKwh?.toString() ?? null,
      resultBatteryUsableKwh: technicalFields.resultBatteryUsableKwh?.toString() ?? null,
      warnings: technicalFields.warnings, status: technicalFields.status, reviewNotes: technicalFields.reviewNotes,
    } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ simulationId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole(["reviewer"]);
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const { simulationId } = await context.params;
    const simulation = await getPrisma().simulation.findUnique({
      where: { id: simulationId }, select: { id: true, projectId: true, createdBy: true, status: true },
    });
    if (!simulation) throw new ResourceNotFoundError();
    await requireProjectAccess(user, simulation.projectId);
    if (simulation.createdBy === user.id) throw new AuthorizationError();
    if (simulation.status !== "needs_review") throw new AuthorizationError();
    const changed = await getPrisma().$transaction(async (tx) => {
      const simulationUpdate = await tx.simulation.updateMany({
        where: { id: simulationId, status: "needs_review" },
        data: { status: parsed.data.decision, reviewedBy: user.id, reviewedAt: new Date(), reviewNotes: parsed.data.notes ?? null },
      });
      if (simulationUpdate.count === 1) {
        await tx.project.update({ where: { id: simulation.projectId }, data: { status: parsed.data.decision, updatedAt: new Date() } });
      }
      return simulationUpdate;
    });
    if (changed.count !== 1) throw new AuthorizationError();
    await writeAuditEvent({ actorId: user.id, action: `simulation.${parsed.data.decision}`, entityType: "simulation", entityId: simulationId });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
