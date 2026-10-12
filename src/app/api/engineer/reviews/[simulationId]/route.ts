import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole, requireProjectAccess } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ simulationId: string }> }) {
  try {
    const user = await requireApiRole(["engineer"]);
    const { simulationId } = await context.params;
    const simulation = await getPrisma().simulation.findUnique({
      where: { id: simulationId },
      select: {
        id: true,
        projectId: true,
        version: true,
        systemType: true,
        batteryEnabled: true,
        desiredCoverageFraction: true,
        systemLossFraction: true,
        designInputs: true,
        calculationMethodVersion: true,
        resultPanelCount: true,
        resultPvKwp: true,
        resultGenerationKwhMonth: true,
        resultGenerationKwhYear: true,
        resultBatteryNominalKwh: true,
        resultBatteryUsableKwh: true,
        warnings: true,
        status: true,
        reviewNotes: true,
      },
    });
    if (!simulation) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
    await requireProjectAccess(user, simulation.projectId);
    return NextResponse.json({
      simulation: {
        id: simulation.id,
        project_id: simulation.projectId,
        version: simulation.version,
        system_type: simulation.systemType,
        battery_enabled: simulation.batteryEnabled,
        desired_coverage_fraction: simulation.desiredCoverageFraction?.toString() ?? null,
        system_loss_fraction: simulation.systemLossFraction?.toString() ?? null,
        design_inputs: simulation.designInputs,
        calculation_method_version: simulation.calculationMethodVersion,
        result_panel_count: simulation.resultPanelCount,
        result_pv_kwp: simulation.resultPvKwp?.toString() ?? null,
        result_generation_kwh_month: simulation.resultGenerationKwhMonth?.toString() ?? null,
        result_generation_kwh_year: simulation.resultGenerationKwhYear?.toString() ?? null,
        result_battery_nominal_kwh: simulation.resultBatteryNominalKwh?.toString() ?? null,
        result_battery_usable_kwh: simulation.resultBatteryUsableKwh?.toString() ?? null,
        warnings: simulation.warnings,
        status: simulation.status,
        review_notes: simulation.reviewNotes,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ simulationId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireApiRole(["engineer"]);
    const body = reviewSchema.safeParse(await request.json());
    if (!body.success) return invalidInput();
    const { simulationId } = await context.params;
    const simulation = await getPrisma().simulation.findUnique({
      where: { id: simulationId },
      select: { id: true, projectId: true },
    });
    if (!simulation) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
    await requireProjectAccess(user, simulation.projectId);
    await getPrisma().simulation.update({
      where: { id: simulationId },
      data: {
        status: body.data.decision,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: body.data.notes ?? null,
      },
      select: { id: true },
    });
    await writeAuditEvent({ actorId: user.id, action: `simulation.${body.data.decision}`, entityType: "simulation", entityId: simulationId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
