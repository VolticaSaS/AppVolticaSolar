import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import { isValidColombianIdentification, isValidPhone, normalizeIdentification } from "@/lib/validation/colombian-identification";

export const dynamic = "force-dynamic";
const schema = z.object({
  projectName: z.string().trim().min(2).max(200),
  legalType: z.enum(["natural_person", "legal_entity"]),
  legalName: z.string().trim().min(3).max(200),
  taxIdType: z.enum(["cedula", "nit"]),
  taxId: z.string().trim().min(6).max(20),
  contactName: z.string().trim().max(160).optional().default(""),
  clientAddress: z.string().trim().min(5).max(500),
  contactPhone: z.string().trim().min(7).max(25),
  installationAddress: z.string().trim().max(500).optional().default(""),
  systemType: z.enum(["on_grid", "hybrid", "off_grid"]),
  energyKwhMonth: z.number().positive().max(100_000),
  peakSunHoursDay: z.number().positive().max(10),
  panelPowerW: z.number().positive().max(1_000),
  lossesPercent: z.number().min(0).max(59),
  autonomyDays: z.number().positive().max(7),
}).superRefine((input, context) => {
  const expectedDocument = input.legalType === "natural_person" ? "cedula" : "nit";
  if (input.taxIdType !== expectedDocument) {
    context.addIssue({ code: "custom", path: ["taxIdType"], message: "El tipo de documento no corresponde al tipo de persona." });
  }
  if (input.legalType === "legal_entity" && input.contactName.trim().length < 3) {
    context.addIssue({ code: "custom", path: ["contactName"], message: "Indica quién es el contacto responsable de la empresa." });
  }
  if (!isValidColombianIdentification(input.taxId, input.legalType)) {
    context.addIssue({ code: "custom", path: ["taxId"], message: "La cédula debe tener de 6 a 10 dígitos. El NIT debe tener 9 dígitos y un dígito de verificación válido." });
  }
  if (!isValidPhone(input.contactPhone)) {
    context.addIssue({ code: "custom", path: ["contactPhone"], message: "Escribe un teléfono válido, con indicativo opcional y entre 7 y 15 dígitos." });
  }
});

// Server-side recalculation is authoritative; only the resulting technical data is stored.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["engineer", "operator"]);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const input = parsed.data;
    const reviewers = await getPrisma().appUser.findMany({ where: { role: "reviewer", isActive: true }, select: { id: true } });
    if (!reviewers.length) return NextResponse.json({ error: "Administración debe crear al menos un revisor técnico antes de enviar cálculos." }, { status: 409 });

    const dailyKwh = input.energyKwhMonth / 30;
    const lossFraction = input.lossesPercent / 100;
    const performanceRatio = 1 - lossFraction;
    const pvKwpRequired = dailyKwh / (input.peakSunHoursDay * performanceRatio);
    const panelCount = Math.ceil(pvKwpRequired * 1000 / input.panelPowerW);
    const pvKwpInstalled = panelCount * input.panelPowerW / 1000;
    const monthlyGeneration = pvKwpInstalled * input.peakSunHoursDay * 30 * performanceRatio;
    const batteryUsable = input.systemType === "on_grid" ? null : dailyKwh * input.autonomyDays;
    const batteryNominal = batteryUsable === null ? null : batteryUsable / (0.8 * 0.9);
    const now = new Date();
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const simulation = await getPrisma().$transaction(async (tx) => {
      const isLegalEntity = input.legalType === "legal_entity";
      const client = await tx.client.create({ data: {
        legalName: input.legalName,
        legalType: input.legalType,
        clientType: isLegalEntity ? "business" : "residential",
        taxIdType: input.taxIdType,
        taxId: normalizeIdentification(input.taxId),
        contactName: input.contactName.trim() || (isLegalEntity ? null : input.legalName),
        contactPhone: input.contactPhone.trim(),
        address: input.clientAddress,
        createdBy: actor.id,
      } });
      const project = await tx.project.create({ data: {
        clientId: client.id, name: input.projectName, address: input.installationAddress || null, systemType: input.systemType, status: "in_review", ownerId: actor.id,
        memberships: { createMany: { data: reviewers.map((reviewer) => ({ userId: reviewer.id, accessRole: "reviewer", assignedBy: actor.id })) } },
        energyConsumption: { create: { periodMonth: month, energyKwh: input.energyKwhMonth, source: "manual" } },
        solarResourceInputs: { create: { source: "manual", peakSunHoursDay: input.peakSunHoursDay, retrievedAt: now, assumptions: { capture: "user_input" } as Prisma.InputJsonObject } },
      } });
      return tx.simulation.create({ data: {
        projectId: project.id, createdBy: actor.id, version: 1, title: input.projectName,
        systemType: input.systemType, batteryEnabled: input.systemType !== "on_grid", desiredCoverageFraction: 1,
        systemLossFraction: lossFraction, backupHours: input.systemType === "on_grid" ? null : input.autonomyDays * 24,
        backupLoadKw: input.systemType === "on_grid" ? null : dailyKwh / 24,
        designInputs: { energy_kwh_month: input.energyKwhMonth, peak_sun_hours_day: input.peakSunHoursDay, panel_power_w: input.panelPowerW, losses_percent: input.lossesPercent, autonomy_days: input.autonomyDays },
        calculationMethodVersion: "preliminary-v1", resultPanelCount: panelCount, resultPvKwp: pvKwpInstalled,
        resultGenerationKwhMonth: monthlyGeneration, resultGenerationKwhYear: monthlyGeneration * 12,
        resultBatteryNominalKwh: batteryNominal, resultBatteryUsableKwh: batteryUsable,
        resultDetails: { pv_kwp_required: pvKwpRequired, performance_ratio: performanceRatio, methodology: "consumo diario / HSP / rendimiento" },
        warnings: ["Dimensionamiento preliminar; requiere validación de ingeniería antes de cotizar o instalar."],
        status: "needs_review",
      }, select: { id: true, projectId: true, resultPanelCount: true } });
    });
    await writeAuditEvent({ actorId: actor.id, action: "simulation.submit_for_review", entityType: "simulation", entityId: simulation.id });
    return NextResponse.json({ simulation: { id: simulation.id, projectId: simulation.projectId, panelCount: simulation.resultPanelCount, status: "needs_review" } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
