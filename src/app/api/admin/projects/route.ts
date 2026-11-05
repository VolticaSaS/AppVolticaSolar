import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole, ResourceNotFoundError } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiRole(["admin"]);
    const [rows, operators] = await Promise.all([
      getPrisma().project.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, name: true, status: true, systemType: true, address: true, createdAt: true, updatedAt: true,
          owner: { select: { id: true, fullName: true, email: true } },
          client: { select: { legalName: true, legalType: true, taxIdType: true, taxId: true, address: true, contactName: true, contactPhone: true, contactEmail: true } },
          simulations: { orderBy: { version: "desc" }, take: 1, select: {
            id: true, version: true, status: true, resultPanelCount: true, reviewNotes: true,
            priceEstimates: { orderBy: { version: "desc" }, take: 1, select: { version: true, currency: true, estimatedTotalCop: true, includesVat: true, estimatedVatCop: true, estimateStatus: true, validUntil: true } },
            internalAnalyses: { orderBy: { createdAt: "desc" }, take: 1, select: { equipmentCostCop: true, laborCostCop: true, logisticsCostCop: true, otherDirectCostCop: true, contingencyCostCop: true, totalInternalCostCop: true, estimatedSaleValueCop: true, estimatedGrossProfitCop: true, estimatedGrossMarginPct: true } },
          } },
        },
      }),
      getPrisma().appUser.findMany({ where: { role: "operator", isActive: true }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
    ]);
    const projects = rows.map((project) => ({
      id: project.id, name: project.name, status: project.status, systemType: project.systemType,
      address: project.address, createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString(),
      owner: project.owner, client: project.client,
      latestSimulation: project.simulations[0] ? {
        id: project.simulations[0].id, version: project.simulations[0].version,
        status: project.simulations[0].status, panelCount: project.simulations[0].resultPanelCount,
        reviewNotes: project.simulations[0].reviewNotes,
        estimate: project.simulations[0].priceEstimates[0] ? {
          version: project.simulations[0].priceEstimates[0].version,
          currency: project.simulations[0].priceEstimates[0].currency.trim(),
          totalCop: project.simulations[0].priceEstimates[0].estimatedTotalCop.toString(),
          includesVat: project.simulations[0].priceEstimates[0].includesVat,
          vatCop: project.simulations[0].priceEstimates[0].estimatedVatCop?.toString() ?? null,
          status: project.simulations[0].priceEstimates[0].estimateStatus,
          validUntil: project.simulations[0].priceEstimates[0].validUntil?.toISOString() ?? null,
        } : null,
        internalFinance: project.simulations[0].internalAnalyses[0] ? {
          equipmentCostCop: project.simulations[0].internalAnalyses[0].equipmentCostCop.toString(),
          laborCostCop: project.simulations[0].internalAnalyses[0].laborCostCop.toString(),
          logisticsCostCop: project.simulations[0].internalAnalyses[0].logisticsCostCop.toString(),
          otherDirectCostCop: project.simulations[0].internalAnalyses[0].otherDirectCostCop.toString(),
          contingencyCostCop: project.simulations[0].internalAnalyses[0].contingencyCostCop.toString(),
          totalCostCop: project.simulations[0].internalAnalyses[0].totalInternalCostCop.toString(),
          saleCop: project.simulations[0].internalAnalyses[0].estimatedSaleValueCop.toString(),
          grossProfitCop: project.simulations[0].internalAnalyses[0].estimatedGrossProfitCop?.toString() ?? null,
          grossMarginPct: project.simulations[0].internalAnalyses[0].estimatedGrossMarginPct?.toString() ?? null,
        } : null,
      } : null,
    }));
    return NextResponse.json({ projects, operators });
  } catch (error) { return apiError(error); }
}

const assignSchema = z.object({ projectId: z.string().uuid(), ownerId: z.string().uuid().nullable() });

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = assignSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const { projectId, ownerId } = parsed.data;
    const project = await getPrisma().project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new ResourceNotFoundError();
    if (ownerId) {
      const operator = await getPrisma().appUser.findFirst({ where: { id: ownerId, role: "operator", isActive: true }, select: { id: true } });
      if (!operator) return NextResponse.json({ error: "El responsable debe ser una cuenta operativa activa." }, { status: 400 });
    }
    await getPrisma().project.update({ where: { id: projectId }, data: { ownerId, updatedAt: new Date() } });
    await writeAuditEvent({ actorId: actor.id, action: "project.assign_operator", entityType: "project", entityId: projectId });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
