import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const money = z.string().regex(/^\d{1,16}(\.\d{1,2})?$/);
const analysisSchema = z.object({
  priceEstimateId: z.string().uuid().nullable().optional(),
  equipmentCostCop: money,
  laborCostCop: money,
  logisticsCostCop: money,
  otherDirectCostCop: money,
  contingencyCostCop: money,
  estimatedSaleValueCop: money,
  estimatedAnnualSavingsCop: money.nullable().optional(),
  annualOpexCop: money.nullable().optional(),
  simplePaybackYears: z.string().regex(/^\d{1,7}(\.\d{1,3})?$/).nullable().optional(),
  confidentialAssumptions: z.record(z.string(), z.unknown()).optional(),
});

function toCents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function fromCents(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}

export async function GET(_request: Request, context: { params: Promise<{ simulationId: string }> }) {
  try {
    await requireApiRole(["admin"]);
    const { simulationId } = await context.params;
    const records = await getPrisma().internalFinancialAnalysis.findMany({
      where: { simulationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        currency: true,
        equipmentCostCop: true,
        laborCostCop: true,
        logisticsCostCop: true,
        otherDirectCostCop: true,
        contingencyCostCop: true,
        totalInternalCostCop: true,
        estimatedSaleValueCop: true,
        estimatedGrossProfitCop: true,
        estimatedGrossMarginPct: true,
        estimatedAnnualSavingsCop: true,
        annualOpexCop: true,
        simplePaybackYears: true,
        confidentialAssumptions: true,
        createdAt: true,
      },
    });
    const finance = records.map((record) => ({
      id: record.id,
      currency: record.currency.trim(),
      equipment_cost_cop: record.equipmentCostCop.toFixed(2),
      labor_cost_cop: record.laborCostCop.toFixed(2),
      logistics_cost_cop: record.logisticsCostCop.toFixed(2),
      other_direct_cost_cop: record.otherDirectCostCop.toFixed(2),
      contingency_cost_cop: record.contingencyCostCop.toFixed(2),
      total_internal_cost_cop: record.totalInternalCostCop.toFixed(2),
      estimated_sale_value_cop: record.estimatedSaleValueCop.toFixed(2),
      estimated_gross_profit_cop: record.estimatedGrossProfitCop?.toFixed(2) ?? null,
      estimated_gross_margin_pct: record.estimatedGrossMarginPct?.toFixed(4) ?? null,
      estimated_annual_savings_cop: record.estimatedAnnualSavingsCop?.toFixed(2) ?? null,
      annual_opex_cop: record.annualOpexCop?.toFixed(2) ?? null,
      simple_payback_years: record.simplePaybackYears?.toFixed(3) ?? null,
      confidential_assumptions: record.confidentialAssumptions,
      created_at: record.createdAt.toISOString(),
    }));
    return NextResponse.json({ finance });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ simulationId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = analysisSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
    const { simulationId } = await context.params;
    const fields = parsed.data;
    if (fields.priceEstimateId) {
      const estimate = await getPrisma().projectPriceEstimate.findUnique({
        where: { id: fields.priceEstimateId }, select: { simulationId: true },
      });
      if (!estimate || estimate.simulationId !== simulationId) return NextResponse.json({ error: "La estimación no corresponde a esta simulación." }, { status: 400 });
    }
    const totalCents = [fields.equipmentCostCop, fields.laborCostCop, fields.logisticsCostCop, fields.otherDirectCostCop, fields.contingencyCostCop]
      .reduce((sum, amount) => sum + toCents(amount), 0n);
    if (totalCents >= 1000000000000000000n) return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
    const record = await getPrisma().internalFinancialAnalysis.create({
      data: {
        simulationId,
        priceEstimateId: fields.priceEstimateId ?? null,
        equipmentCostCop: fields.equipmentCostCop,
        laborCostCop: fields.laborCostCop,
        logisticsCostCop: fields.logisticsCostCop,
        otherDirectCostCop: fields.otherDirectCostCop,
        contingencyCostCop: fields.contingencyCostCop,
        totalInternalCostCop: fromCents(totalCents),
        estimatedSaleValueCop: fields.estimatedSaleValueCop,
        estimatedAnnualSavingsCop: fields.estimatedAnnualSavingsCop ?? null,
        annualOpexCop: fields.annualOpexCop ?? null,
        simplePaybackYears: fields.simplePaybackYears ?? null,
        confidentialAssumptions: (fields.confidentialAssumptions ?? {}) as Prisma.InputJsonObject,
        createdBy: actor.id,
      },
      select: {
        id: true, currency: true, equipmentCostCop: true, laborCostCop: true, logisticsCostCop: true,
        otherDirectCostCop: true, contingencyCostCop: true, totalInternalCostCop: true,
        estimatedSaleValueCop: true, estimatedGrossProfitCop: true, estimatedGrossMarginPct: true, createdAt: true,
      },
    });
    await writeAuditEvent({ actorId: actor.id, action: "finance.analysis.create", entityType: "internal_financial_analysis", entityId: record.id });
    return NextResponse.json({ analysis: {
      id: record.id, currency: record.currency.trim(), equipment_cost_cop: record.equipmentCostCop.toFixed(2),
      labor_cost_cop: record.laborCostCop.toFixed(2), logistics_cost_cop: record.logisticsCostCop.toFixed(2),
      other_direct_cost_cop: record.otherDirectCostCop.toFixed(2), contingency_cost_cop: record.contingencyCostCop.toFixed(2),
      total_internal_cost_cop: record.totalInternalCostCop.toFixed(2), estimated_sale_value_cop: record.estimatedSaleValueCop.toFixed(2),
      estimated_gross_profit_cop: record.estimatedGrossProfitCop?.toFixed(2) ?? null,
      estimated_gross_margin_pct: record.estimatedGrossMarginPct?.toFixed(4) ?? null,
      created_at: record.createdAt.toISOString(),
    } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
