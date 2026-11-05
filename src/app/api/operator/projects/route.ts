import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError } from "@/lib/http/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiRole(["operator", "engineer"]);
    const projects = await getPrisma().project.findMany({
      where: {
        status: { not: "archived" },
        OR: [
          { ownerId: user.id },
          { memberships: { some: { userId: user.id, accessRole: user.role } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, name: true, status: true, address: true, systemType: true, updatedAt: true,
        client: { select: { legalName: true, legalType: true, taxIdType: true, taxId: true, address: true, contactName: true, contactPhone: true } },
        simulations: {
          orderBy: { version: "desc" }, take: 1,
          select: { id: true, version: true, status: true, reviewNotes: true, resultPanelCount: true, resultPvKwp: true, designInputs: true },
        },
      },
    });
    return NextResponse.json({ projects: projects.map((project) => ({
      id: project.id, name: project.name, status: project.status, address: project.address,
      systemType: project.systemType, updatedAt: project.updatedAt.toISOString(), client: project.client,
      latestSimulation: project.simulations[0] ? {
        id: project.simulations[0].id, version: project.simulations[0].version,
        status: project.simulations[0].status, reviewNotes: project.simulations[0].reviewNotes,
        panelCount: project.simulations[0].resultPanelCount,
        pvKwp: project.simulations[0].resultPvKwp?.toString() ?? null,
        inputs: {
          energyKwhMonth: (project.simulations[0].designInputs as Record<string, unknown>).energy_kwh_month ?? null,
          peakSunHoursDay: (project.simulations[0].designInputs as Record<string, unknown>).peak_sun_hours_day ?? null,
          panelPowerW: (project.simulations[0].designInputs as Record<string, unknown>).panel_power_w ?? null,
          lossesPercent: (project.simulations[0].designInputs as Record<string, unknown>).losses_percent ?? null,
          autonomyDays: (project.simulations[0].designInputs as Record<string, unknown>).autonomy_days ?? null,
          energyRateCopKwh: (project.simulations[0].designInputs as Record<string, unknown>).energy_rate_cop_kwh ?? null,
          estimatedInvestmentCop: (project.simulations[0].designInputs as Record<string, unknown>).estimated_investment_cop ?? null,
          selfConsumptionPercent: (project.simulations[0].designInputs as Record<string, unknown>).self_consumption_percent ?? null,
          exportRateCopKwh: (project.simulations[0].designInputs as Record<string, unknown>).export_rate_cop_kwh ?? null,
          tariffEscalationPercent: (project.simulations[0].designInputs as Record<string, unknown>).tariff_escalation_percent ?? null,
          degradationPercent: (project.simulations[0].designInputs as Record<string, unknown>).degradation_percent ?? null,
          annualMaintenanceCop: (project.simulations[0].designInputs as Record<string, unknown>).annual_maintenance_cop ?? null,
          analysisYears: (project.simulations[0].designInputs as Record<string, unknown>).analysis_years ?? null,
          discountRatePercent: (project.simulations[0].designInputs as Record<string, unknown>).discount_rate_percent ?? null,
          municipality: (project.simulations[0].designInputs as Record<string, unknown>).municipality ?? null,
          roofOrientation: (project.simulations[0].designInputs as Record<string, unknown>).roof_orientation ?? null,
          roofTiltDegrees: (project.simulations[0].designInputs as Record<string, unknown>).roof_tilt_degrees ?? null,
          shadingPercent: (project.simulations[0].designInputs as Record<string, unknown>).shading_percent ?? null,
          observations: (project.simulations[0].designInputs as Record<string, unknown>).internal_observations ?? null,
        },
      } : null,
    })) });
  } catch (error) {
    return apiError(error);
  }
}
