import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const estimateSchema = z.object({
  estimatedTotalCop: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),
  includesVat: z.boolean(),
  estimatedVatCop: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).nullable().optional(),
  estimateStatus: z.enum(["draft", "reviewed", "shared", "expired"]),
  validUntil: z.string().date().nullable().optional(),
  publicNotes: z.string().max(4000).nullable().optional(),
  priceMethodVersion: z.string().trim().min(1).max(40),
});

/** Creates a new immutable version of the client-facing total; only ADMIN can call it. */
export async function POST(request: Request, context: { params: Promise<{ simulationId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = estimateSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const { simulationId } = await context.params;
    const prisma = getPrisma();
    const created = await prisma.$transaction(async (tx) => {
      const simulation = await tx.simulation.findUnique({ where: { id: simulationId }, select: { id: true } });
      if (!simulation) return null;
      const latest = await tx.projectPriceEstimate.findFirst({
        where: { simulationId }, orderBy: { version: "desc" }, select: { version: true },
      });
      return tx.projectPriceEstimate.create({
        data: {
          simulationId, version: (latest?.version ?? 0) + 1,
          estimatedTotalCop: parsed.data.estimatedTotalCop,
          includesVat: parsed.data.includesVat,
          estimatedVatCop: parsed.data.estimatedVatCop ?? null,
          estimateStatus: parsed.data.estimateStatus,
          validUntil: parsed.data.validUntil ? new Date(`${parsed.data.validUntil}T00:00:00.000Z`) : null,
          publicNotes: parsed.data.publicNotes ?? null,
          priceMethodVersion: parsed.data.priceMethodVersion,
          createdBy: actor.id,
        },
        select: { id: true, version: true, currency: true, estimatedTotalCop: true, includesVat: true, estimatedVatCop: true, estimateStatus: true, validUntil: true },
      });
    });
    if (!created) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
    await writeAuditEvent({ actorId: actor.id, action: "finance.estimate.create", entityType: "project_price_estimate", entityId: created.id });
    return NextResponse.json({ estimate: {
      id: created.id, version: created.version, currency: created.currency.trim(),
      estimated_total_cop: created.estimatedTotalCop.toFixed(2), includes_vat: created.includesVat,
      estimated_vat_cop: created.estimatedVatCop?.toFixed(2) ?? null,
      estimate_status: created.estimateStatus, valid_until: created.validUntil?.toISOString().slice(0, 10) ?? null,
    } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
