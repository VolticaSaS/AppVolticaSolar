import Image from "next/image";
import { notFound } from "next/navigation";
import { requirePageRole, requireProjectAccess } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { findLatestPublicEstimate } from "@/lib/data/estimates";
import { PrintReportButton } from "@/features/solar/components/print-report-button";

export const dynamic = "force-dynamic";

const systemNames: Record<string, string> = {
  on_grid: "On-Grid",
  hybrid: "Híbrido",
  off_grid: "Off-Grid",
};
const statusNames: Record<string, string> = {
  draft: "Preliminar · borrador",
  needs_review: "Preliminar · en revisión",
  in_review: "Preliminar · en revisión",
  rejected: "Preliminar · requiere ajustes",
  approved: "Aprobado por ingeniería",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}
function money(value: number | string | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value));
}

export default async function ClientReportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requirePageRole(["operator"]);
  const { projectId } = await params;
  await requireProjectAccess(user, projectId);

  const project = await getPrisma().project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      address: true,
      systemType: true,
      updatedAt: true,
      client: { select: { legalName: true, contactName: true, address: true } },
      simulations: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          version: true,
          status: true,
          createdAt: true,
          resultPanelCount: true,
          resultPvKwp: true,
          resultGenerationKwhMonth: true,
          resultGenerationKwhYear: true,
          resultBatteryNominalKwh: true,
          resultBatteryUsableKwh: true,
          designInputs: true,
          resultDetails: true,
          warnings: true,
        },
      },
    },
  });
  if (!project || !project.simulations[0]) notFound();

  const simulation = project.simulations[0];
  const inputs = record(simulation.designInputs);
  const details = record(simulation.resultDetails);
  const financial = record(details.financial_projection);
  const assumptions = record(financial.assumptions);
  const cashFlows = Array.isArray(financial.cash_flows) ? financial.cash_flows.map(record) : [];
  const estimate = await findLatestPublicEstimate(project.id);
  const estimateIsValid = !!estimate && estimate.estimate_status !== "expired" &&
    (!estimate.valid_until || new Date(estimate.valid_until + "T23:59:59Z").getTime() >= Date.now());
  const estimateTotal = estimateIsValid ? Number(estimate?.estimated_total_cop) : null;

  const monthlyUse = numberValue(inputs.energy_kwh_month);
  const monthlyGeneration = numberValue(simulation.resultGenerationKwhMonth);
  const energyRate = numberValue(inputs.energy_rate_cop_kwh);
  let annualSavings: number | null = null;
  let simplePayback: number | null = null;
  let roiPercent: number | null = null;
  let npv: number | null = null;
  let cumulativeNetGain: number | null = null;
  if (estimateTotal && estimateTotal > 0 && cashFlows.length > 0) {
    const discount = numberValue(assumptions.discount_rate_percent) ?? 0;
    let cumulative = -estimateTotal;
    let presentValue = -estimateTotal;
    for (let index = 0; index < cashFlows.length; index += 1) {
      const year = numberValue(cashFlows[index].year) ?? index + 1;
      const yearlyNet = numberValue(cashFlows[index].net_savings_cop) ?? 0;
      const previous = cumulative;
      cumulative += yearlyNet;
      presentValue += yearlyNet / Math.pow(1 + discount / 100, year);
      if (simplePayback === null && previous < 0 && cumulative >= 0 && yearlyNet > 0) {
        simplePayback = year - 1 + Math.abs(previous) / yearlyNet;
      }
      if (year === 1) annualSavings = yearlyNet;
    }
    npv = presentValue;
    cumulativeNetGain = cumulative;
    if (annualSavings !== null) roiPercent = annualSavings / estimateTotal * 100;
  } else if (estimateTotal && estimateTotal > 0 && monthlyUse && monthlyGeneration && energyRate) {
    annualSavings = Math.min(monthlyUse, monthlyGeneration) * energyRate * 12;
    roiPercent = annualSavings / estimateTotal * 100;
    simplePayback = annualSavings > 0 ? estimateTotal / annualSavings : null;
  }

  const warnings = Array.isArray(simulation.warnings)
    ? simulation.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
  const generatedOn = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(simulation.createdAt);
  const installationAddress = project.address || project.client.address;
  const statusLabel = statusNames[simulation.status] ?? "Preliminar";
  const systemLabel = project.systemType ? systemNames[project.systemType] ?? project.systemType : "Por definir";
  const estimateStatusLabel = estimate?.estimate_status === "expired" || !estimateIsValid
    ? "Precio vencido · solicita actualización"
    : estimate?.estimate_status === "shared" ? "Precio autorizado" : "Precio aprobado";
  const analysisYears = numberValue(assumptions.analysis_years);

  return (
    <main className="client-report-page">
      <div className="report-toolbar">
        <p>Ficha para compartir con el cliente</p>
        <PrintReportButton />
      </div>
      <article className="client-report">
        <header className="client-report-header">
          <Image src="/voltica-logo.png" alt="Voltica" width={150} height={90} priority />
          <div className="report-status">{statusLabel}</div>
        </header>

        <section className="report-title">
          <p>PROPUESTA DE DIMENSIONAMIENTO SOLAR</p>
          <h1>{project.name}</h1>
          <div className="report-meta"><span>Versión {simulation.version}</span><span>Generada el {generatedOn}</span></div>
        </section>

        <section className="report-section">
          <h2>Cliente e instalación</h2>
          <div className="report-grid">
            <div><span>Cliente</span><strong>{project.client.legalName}</strong></div>
            {project.client.contactName && <div><span>Contacto</span><strong>{project.client.contactName}</strong></div>}
            <div><span>Dirección de instalación</span><strong>{installationAddress || "Pendiente de confirmar"}</strong></div>
            <div><span>Municipio</span><strong>{String(inputs.municipality || "Pendiente de confirmar")}</strong></div>
          </div>
        </section>

        <section className="report-section">
          <h2>Dimensionamiento preliminar</h2>
          <div className="report-badges"><span>{systemLabel}</span><span>Panel de {numberValue(inputs.panel_power_w) ?? "—"} Wp</span></div>
          <div className="report-metrics">
            <div><span>Paneles recomendados</span><strong>{simulation.resultPanelCount ?? "—"}</strong><small>módulos fotovoltaicos</small></div>
            <div><span>Potencia instalada</span><strong>{simulation.resultPvKwp?.toString() ?? "—"} kWp</strong></div>
            <div><span>Producción estimada</span><strong>{Math.round(Number(simulation.resultGenerationKwhMonth ?? 0)).toLocaleString("es-CO")} kWh/mes</strong></div>
            {project.systemType !== "on_grid" && simulation.resultBatteryNominalKwh && <div><span>Almacenamiento estimado</span><strong>{Number(simulation.resultBatteryNominalKwh).toFixed(1)} kWh</strong><small>capacidad nominal</small></div>}
          </div>
          <div className="report-grid report-assumptions">
            <div><span>Consumo de referencia</span><strong>{monthlyUse?.toLocaleString("es-CO") ?? "—"} kWh/mes</strong></div>
            <div><span>Horas sol pico</span><strong>{numberValue(inputs.peak_sun_hours_day) ?? "—"} h/día</strong></div>
            <div><span>Pérdidas consideradas</span><strong>{numberValue(inputs.losses_percent) ?? "—"}%</strong></div>
            <div><span>Orientación / inclinación</span><strong>{String(inputs.roof_orientation ?? "Por confirmar")} · {numberValue(inputs.roof_tilt_degrees) ?? "—"}°</strong></div>
            <div><span>Sombreado estimado</span><strong>{numberValue(inputs.shading_percent) ?? 0}%</strong></div>
          </div>
        </section>

        <section className="report-section report-price-section">
          <h2>Inversión y retorno estimado</h2>
          {estimateIsValid && estimate ? <>
            <div className="report-price"><div><span>{estimateStatusLabel}</span><strong>{money(estimate.estimated_total_cop)}</strong></div><span>{estimate.includes_vat ? "IVA incluido" : "IVA no incluido"}{estimate.estimated_vat_cop ? ` · IVA estimado ${money(estimate.estimated_vat_cop)}` : ""}</span></div>
            {estimate.valid_until && <p className="report-small">Vigencia del precio hasta {new Intl.DateTimeFormat("es-CO").format(new Date(estimate.valid_until + "T00:00:00"))}</p>}
            {estimate.public_notes && <p className="report-public-notes">{estimate.public_notes}</p>}
            {annualSavings !== null && <div className="report-financial-grid">
              <div><span>Ahorro neto estimado · año 1</span><strong>{money(annualSavings)}</strong></div>
              {roiPercent !== null && <div><span>Retorno simple anual</span><strong>{roiPercent.toFixed(1)}%</strong></div>}
              {simplePayback !== null && <div><span>Recuperación estimada</span><strong>{simplePayback.toFixed(1)} años</strong></div>}
              {npv !== null && <div><span>Valor presente neto</span><strong>{money(npv)}</strong></div>}
              {cumulativeNetGain !== null && <div><span>Resultado neto proyectado{analysisYears ? ` · ${analysisYears} años` : ""}</span><strong>{money(cumulativeNetGain)}</strong></div>}
            </div>}
            {annualSavings === null && <p className="report-small">Completa la tarifa de energía y los supuestos de retorno para estimar el ahorro.</p>}
          </> : <p className="report-pending-price">El precio de la propuesta está pendiente de aprobación o actualización por administración. Los indicadores financieros se omiten hasta contar con un valor autorizado vigente.</p>}
        </section>

        {warnings.length > 0 && <section className="report-section report-warning"><h2>Consideraciones</h2><ul>{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></section>}
        <footer className="report-footer">
          <strong>Voltica Solar</strong>
          <p>Este resultado es una estimación preliminar para orientar la propuesta. No constituye un diseño certificado ni reemplaza la visita, el análisis de cargas y la validación de ingeniería antes de instalar.</p>
          <span>Generado desde Voltica Solar · {statusLabel}</span>
        </footer>
      </article>
    </main>
  );
}
