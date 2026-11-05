import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const costSchema = z.object({
  unitPurchaseCostCop: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),
  supplierName: z.string().trim().max(160).optional(),
  effectiveFrom: z.string().date().optional(),
  effectiveTo: z.string().date().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ equipmentId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = costSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const { equipmentId } = await context.params;
    const cost = await getPrisma().internalEquipmentCost.create({
      data: {
        equipmentId,
        unitPurchaseCostCop: parsed.data.unitPurchaseCostCop,
        supplierName: parsed.data.supplierName || null,
        effectiveFrom: parsed.data.effectiveFrom ? new Date(`${parsed.data.effectiveFrom}T00:00:00.000Z`) : new Date(),
        effectiveTo: parsed.data.effectiveTo ? new Date(`${parsed.data.effectiveTo}T00:00:00.000Z`) : null,
        recordedBy: actor.id,
      },
      select: { id: true, equipmentId: true, unitPurchaseCostCop: true, supplierName: true, effectiveFrom: true, effectiveTo: true },
    });
    await writeAuditEvent({ actorId: actor.id, action: "finance.equipment_cost.create", entityType: "equipment_catalog", entityId: equipmentId });
    return NextResponse.json({ cost: {
      id: cost.id,
      equipment_id: cost.equipmentId,
      unit_purchase_cost_cop: cost.unitPurchaseCostCop.toFixed(2),
      supplier_name: cost.supplierName,
      effective_from: cost.effectiveFrom.toISOString().slice(0, 10),
      effective_to: cost.effectiveTo?.toISOString().slice(0, 10) ?? null,
    } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
