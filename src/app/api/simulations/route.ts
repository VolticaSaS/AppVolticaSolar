import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole, requireProjectAccess, ResourceNotFoundError } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import { isValidBusinessName, isValidColombianIdentification, isValidPersonName, isValidPhone, normalizeIdentification } from "@/lib/validation/colombian-identification";
import { nextSimulationVersion } from "@/lib/simulations/lifecycle";

export const dynamic = "force-dynamic";
const schema = z.object({
  projectId: z.string().uuid().optional(),
  submitForReview: z.boolean().default(true),
  projectName: z.string().trim().min(2).max(200),
  legalType: z.enum(["natural_person", "legal_entity"]),
  legalName: z.string().trim().min(3).max(200),
  taxIdType: z.enum(["cedula", "nit"]),
  taxId: z.string().trim().min(6).max(20),
  contactName: z.string().trim().max(160).optional().default(""),
  clientAddress: z.string().trim().min(5).max(500),
  contactPhone: z.string().trim().min(7).max(25),
  installationAddress: z.string().trim().max(500).optional().default(""),
  sameInstallationAddress: z.boolean().default(true),
  systemType: z.enum(["on_grid", "hybrid", "off_grid"]),
  energyKwhMonth: z.number().positive().max(100_000),
  peakSunHoursDay: z.number().positive().max(10),
  panelPowerW: z.number().positive().max(1_000),
  lossesPercent: z.number().min(0).max(59),
  autonomyDays: z.number().positive().max(7),
  energyRateCopKwh: z.number().positive().max(1_000_000).optional(),
  estimatedInvestmentCop: z.number().positive().max(100_000_000_000).optional(),
}).superRefine((input, context) => {
  const expectedDocument = input.legalType === "natural_person" ? "cedula" : "nit";
  if ((input.energyRateCopKwh === undefined) !== (input.estimatedInvestmentCop === undefined)) {
    context.addIssue({ code: "custom", path: ["estimatedInvestmentCop"], message: "Para calcular el ROI, indica tanto la tarifa de energía como la inversión estimada." });
  }
  if (!input.sameInstallationAddress && input.installationAddress.trim().length < 5) {
    context.addIssue({ code: "custom", path: ["installationAddress"], message: "Indica una dirección de instalación válida o marca que coincide con la dirección del cliente." });
  }
  if (input.taxIdType !== expectedDocument) {
    context.addIssue({ code: "custom", path: ["taxIdType"], message: "El tipo de documento no corresponde al tipo de persona." });
  }
  if (input.legalType === "natural_person" && !isValidPersonName(input.legalName)) {
    context.addIssue({ code: "custom", path: ["legalName"], message: "El nombre debe contener solo letras, espacios, apóstrofes o guiones." });
  }
  if (input.legalType === "legal_entity" && !isValidBusinessName(input.legalName)) {
    context.addIssue({ code: "custom", path: ["legalName"], message: "Escribe una razón social válida." });
  }
  if (input.legalType === "legal_entity" && !isValidPersonName(input.contactName)) {
    context.addIssue({ code: "custom", path: ["contactName"], message: "Escribe el nombre de la persona de contacto usando solo letras." });
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
    if (input.submitForReview && !input.projectId) {
      return NextResponse.json({ error: "Guarda primero una versión como borrador antes de enviarla a revisión." }, { status: 409 });
    }
    const [reviewer, engineer] = await Promise.all([
      getPrisma().appUser.findFirst({ where: { role: "reviewer", isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } }),
      getPrisma().appUser.findFirst({ where: { role: "engineer", isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } }),
    ]);
    // Save the operator's calculation even when no reviewer exists; it remains a draft until review can be assigned.
    const workflowStatus = input.submitForReview && reviewer ? "needs_review" : "draft";

    let existingProject: { id: string; clientId: string } | null = null;
    let previous: { id: string; version: number; status: string } | null = null;
    if (input.projectId) {
      existingProject = await getPrisma().project.findUnique({ where: { id: input.projectId }, select: { id: true, clientId: true } });
      if (!existingProject) throw new ResourceNotFoundError();
      await requireProjectAccess(actor, existingProject.id);
      previous = await getPrisma().simulation.findFirst({
        where: { projectId: existingProject.id }, orderBy: { version: "desc" }, select: { id: true, version: true, status: true },
      });
      if (nextSimulationVersion(previous) === null) {
        return NextResponse.json({ error: "Este proyecto ya tiene una versión pendiente. Espera la revisión antes de enviar otra." }, { status: 409 });
      }
      if (input.submitForReview && previous?.status !== "draft") {
        return NextResponse.json({ error: "Guarda primero una versión como borrador antes de enviarla a revisión." }, { status: 409 });
      }
    }

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
      const clientData = {
        legalName: input.legalName,
        legalType: input.legalType,
        clientType: isLegalEntity ? "business" : "residential",
        taxIdType: input.taxIdType,
        taxId: normalizeIdentification(input.taxId),
        contactName: input.contactName.trim() || (isLegalEntity ? null : input.legalName),
        contactPhone: input.contactPhone.trim(),
        address: input.clientAddress,
      };
      let projectId = existingProject?.id;
      if (existingProject) {
        await tx.client.update({ where: { id: existingProject.clientId }, data: clientData });
        await tx.project.update({ where: { id: existingProject.id }, data: {
          name: input.projectName, address: input.sameInstallationAddress ? null : input.installationAddress || null, systemType: input.systemType,
          status: workflowStatus === "needs_review" ? "in_review" : "draft", updatedAt: now,
        } });
        if (workflowStatus === "needs_review" && reviewer) await tx.projectMembership.upsert({
          where: { projectId_userId: { projectId: existingProject.id, userId: reviewer.id } },
          create: { projectId: existingProject.id, userId: reviewer.id, accessRole: "reviewer", assignedBy: actor.id },
          update: {},
        });
        if (engineer) await tx.projectMembership.upsert({
          where: { projectId_userId: { projectId: existingProject.id, userId: engineer.id } },
          create: { projectId: existingProject.id, userId: engineer.id, accessRole: "engineer", assignedBy: actor.id },
          update: {},
        });
        await tx.energyConsumption.upsert({
          where: { projectId_periodMonth: { projectId: existingProject.id, periodMonth: month } },
          create: { projectId: existingProject.id, periodMonth: month, energyKwh: input.energyKwhMonth, source: "manual" },
          update: { energyKwh: input.energyKwhMonth, source: "manual" },
        });
        await tx.solarResourceInput.create({ data: {
          projectId: existingProject.id, source: "manual", peakSunHoursDay: input.peakSunHoursDay,
          retrievedAt: now, assumptions: { capture: "user_input" } as Prisma.InputJsonObject,
        } });
      } else {
        const client = await tx.client.create({ data: { ...clientData, createdBy: actor.id } });
        const project = await tx.project.create({ data: {
          clientId: client.id, name: input.projectName, address: input.sameInstallationAddress ? null : input.installationAddress || null, systemType: input.systemType, status: workflowStatus === "needs_review" ? "in_review" : "draft", ownerId: actor.id,
          memberships: { createMany: { data: [
            ...(workflowStatus === "needs_review" && reviewer ? [{ userId: reviewer.id, accessRole: "reviewer", assignedBy: actor.id }] : []),
            ...(engineer ? [{ userId: engineer.id, accessRole: "engineer", assignedBy: actor.id }] : []),
          ] } },
          energyConsumption: { create: { periodMonth: month, energyKwh: input.energyKwhMonth, source: "manual" } },
          solarResourceInputs: { create: { source: "manual", peakSunHoursDay: input.peakSunHoursDay, retrievedAt: now, assumptions: { capture: "user_input" } as Prisma.InputJsonObject } },
        } });
        projectId = project.id;
      }
      if (!projectId) throw new ResourceNotFoundError();
      const simulationData = {
        projectId, createdBy: actor.id, version: previous?.status === "draft" ? previous.version : nextSimulationVersion(previous) ?? 1, title: input.projectName,
        systemType: input.systemType, batteryEnabled: input.systemType !== "on_grid", desiredCoverageFraction: 1,
        systemLossFraction: lossFraction, backupHours: input.systemType === "on_grid" ? null : input.autonomyDays * 24,
        backupLoadKw: input.systemType === "on_grid" ? null : dailyKwh / 24,
        designInputs: {
          energy_kwh_month: input.energyKwhMonth, peak_sun_hours_day: input.peakSunHoursDay,
          panel_power_w: input.panelPowerW, losses_percent: input.lossesPercent, autonomy_days: input.autonomyDays,
          energy_rate_cop_kwh: input.energyRateCopKwh ?? null, estimated_investment_cop: input.estimatedInvestmentCop ?? null,
          client: { legal_type: input.legalType, legal_name: input.legalName, tax_id_type: input.taxIdType, tax_id: normalizeIdentification(input.taxId), address: input.clientAddress, contact_name: input.contactName, contact_phone: input.contactPhone },
        },
        calculationMethodVersion: "preliminary-v1", resultPanelCount: panelCount, resultPvKwp: pvKwpInstalled,
        resultGenerationKwhMonth: monthlyGeneration, resultGenerationKwhYear: monthlyGeneration * 12,
        resultBatteryNominalKwh: batteryNominal, resultBatteryUsableKwh: batteryUsable,
        resultDetails: { pv_kwp_required: pvKwpRequired, performance_ratio: performanceRatio, methodology: "consumo diario / HSP / rendimiento" },
        warnings: ["Dimensionamiento preliminar; requiere validación de ingeniería antes de cotizar o instalar."],
        status: workflowStatus,
      };
      const simulationSelect = { id: true, projectId: true, resultPanelCount: true, version: true } as const;
      if (previous?.status === "draft") {
        return tx.simulation.update({ where: { id: previous.id }, data: simulationData, select: simulationSelect });
      }
      return tx.simulation.create({ data: simulationData, select: simulationSelect });
    }, { isolationLevel: "Serializable" });
    await writeAuditEvent({ actorId: actor.id, action: workflowStatus === "needs_review" ? "simulation.submit_for_review" : "simulation.save_draft", entityType: "simulation", entityId: simulation.id });
    return NextResponse.json({ simulation: { id: simulation.id, projectId: simulation.projectId, version: simulation.version, panelCount: simulation.resultPanelCount, status: workflowStatus } }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error.code === "P2002" || error.code === "P2034")) {
      return NextResponse.json({ error: "El proyecto recibió otro envío al mismo tiempo. Recarga y vuelve a intentar." }, { status: 409 });
    }
    return apiError(error);
  }
}
