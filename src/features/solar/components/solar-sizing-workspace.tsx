"use client";

import { useEffect, useMemo, useState } from "react";
import { isValidBusinessName, isValidColombianIdentification, isValidPersonName, isValidPhone } from "@/lib/validation/colombian-identification";

type SystemType = "on_grid" | "hybrid" | "off_grid";
type CalculationSnapshot = { system: SystemType; monthlyUse: number; sunHours: number; panelWatts: number; lossPercent: number; autonomyDays: number; energyRateCopKwh: number; estimatedInvestmentCop: number; selfConsumptionPercent: number; exportRateCopKwh: number; tariffEscalationPercent: number; degradationPercent: number; annualMaintenanceCop: number; analysisYears: number; discountRatePercent: number; municipality: string; roofOrientation: string; roofTiltDegrees: number; shadingPercent: number };
type SavedProject = {
  id: string; name: string; status: string; updatedAt: string; address: string | null; systemType: SystemType | null;
  client: { legalName: string; legalType: "natural_person" | "legal_entity" | null; taxIdType: "cedula" | "nit" | null; taxId: string | null; address: string | null; contactName: string | null; contactPhone: string | null };
  latestSimulation: { id: string; version: number; status: string; reviewNotes: string | null; panelCount: number | null; pvKwp: string | null; inputs: { energyKwhMonth: unknown; peakSunHoursDay: unknown; panelPowerW: unknown; lossesPercent: unknown; autonomyDays: unknown; energyRateCopKwh: unknown; estimatedInvestmentCop: unknown; selfConsumptionPercent: unknown; exportRateCopKwh: unknown; tariffEscalationPercent: unknown; degradationPercent: unknown; annualMaintenanceCop: unknown; analysisYears: unknown; discountRatePercent: unknown; municipality: unknown; roofOrientation: unknown; roofTiltDegrees: unknown; shadingPercent: unknown } } | null;
};

const systemLabels: Record<SystemType, string> = {
  on_grid: "On-Grid",
  hybrid: "Híbrido",
  off_grid: "Off-Grid",
};

function Field({
  label,
  unit,
  value,
  min,
  max,
  step = "any",
  optional = false,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number | string;
  optional?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="sizer-field">
      <span className="sizer-label">{label}{optional ? <span className="unit-hint"> (opcional)</span> : " *"}</span>
      <span className="sizer-input-wrap">
        <input
          type="number"
          required={!optional}
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={optional && value === 0 ? "" : value}
          onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
          onBlur={(event) => {
            const normalizedValue = Number(event.currentTarget.value);
            if (Number.isFinite(normalizedValue)) {
              event.currentTarget.value = optional && normalizedValue === 0 ? "" : String(normalizedValue);
              onChange(normalizedValue);
            }
          }}
        />
        <span className="sizer-unit">{unit}</span>
      </span>
    </label>
  );
}

export function SolarSizingWorkspace({ role }: { role: "operator" | "engineer" }) {
  const [activeSection, setActiveSection] = useState<"sizing" | "projects">("sizing");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [legalType, setLegalType] = useState<"natural_person" | "legal_entity">("natural_person");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactName, setContactName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [installationAddress, setInstallationAddress] = useState("");
  const [sameInstallationAddress, setSameInstallationAddress] = useState(true);
  const [system, setSystem] = useState<SystemType>("on_grid");
  const [monthlyUse, setMonthlyUse] = useState(650);
  const [sunHours, setSunHours] = useState(4.5);
  const [panelWatts, setPanelWatts] = useState(585);
  const [lossPercent, setLossPercent] = useState(20);
  const [autonomyDays, setAutonomyDays] = useState(1);
  const [energyRateCopKwh, setEnergyRateCopKwh] = useState(0);
  const [estimatedInvestmentCop, setEstimatedInvestmentCop] = useState(0);
  const [selfConsumptionPercent, setSelfConsumptionPercent] = useState(0);
  const [exportRateCopKwh, setExportRateCopKwh] = useState(0);
  const [tariffEscalationPercent, setTariffEscalationPercent] = useState(0);
  const [degradationPercent, setDegradationPercent] = useState(0.5);
  const [annualMaintenanceCop, setAnnualMaintenanceCop] = useState(0);
  const [analysisYears, setAnalysisYears] = useState(20);
  const [discountRatePercent, setDiscountRatePercent] = useState(0);
  const [municipality, setMunicipality] = useState("");
  const [roofOrientation, setRoofOrientation] = useState("sur");
  const [roofTiltDegrees, setRoofTiltDegrees] = useState(10);
  const [shadingPercent, setShadingPercent] = useState(0);
  const [calculationSnapshot, setCalculationSnapshot] = useState<CalculationSnapshot>({ system: "on_grid", monthlyUse: 650, sunHours: 4.5, panelWatts: 585, lossPercent: 20, autonomyDays: 1, energyRateCopKwh: 0, estimatedInvestmentCop: 0, selfConsumptionPercent: 0, exportRateCopKwh: 0, tariffEscalationPercent: 0, degradationPercent: 0.5, annualMaintenanceCop: 0, analysisYears: 20, discountRatePercent: 0, municipality: "", roofOrientation: "sur", roofTiltDegrees: 10, shadingPercent: 0 });
  const [hasCalculated, setHasCalculated] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [submitted, setSubmitted] = useState("");

  async function loadProjects() {
    const response = await fetch("/api/operator/projects", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudieron cargar tus proyectos.");
    setProjects((await response.json() as { projects: SavedProject[] }).projects);
  }

  useEffect(() => {
    let active = true;
    if (new URLSearchParams(window.location.search).get("section") === "projects") {
      setActiveSection("projects");
    }
    fetch("/api/operator/projects", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron cargar tus proyectos.");
        return response.json() as Promise<{ projects: SavedProject[] }>;
      })
      .then((data) => { if (active) setProjects(data.projects); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  function selectProject(nextId: string) {
    setProjectId(nextId);
    const project = projects.find((item) => item.id === nextId);
    setHasSavedDraft(project?.latestSimulation?.status === "draft");
    if (!project) return;
    setProjectName(project.name);
    setLegalType(project.client.legalType ?? "natural_person");
    setLegalName(project.client.legalName);
    setTaxId(project.client.taxId ?? "");
    setContactName(project.client.contactName ?? "");
    setClientAddress(project.client.address ?? "");
    setContactPhone(project.client.contactPhone ?? "");
    const installationMatchesClient = !project.address || project.address === project.client.address;
    setSameInstallationAddress(installationMatchesClient);
    setInstallationAddress(installationMatchesClient ? "" : project.address ?? "");
    if (project.systemType) setSystem(project.systemType);
    const inputs = project.latestSimulation?.inputs;
    setEnergyRateCopKwh(Number(inputs?.energyRateCopKwh ?? 0));
    setEstimatedInvestmentCop(Number(inputs?.estimatedInvestmentCop ?? 0));
    setSelfConsumptionPercent(Number(inputs?.selfConsumptionPercent ?? 0));
    setExportRateCopKwh(Number(inputs?.exportRateCopKwh ?? 0));
    setTariffEscalationPercent(Number(inputs?.tariffEscalationPercent ?? 0));
    setDegradationPercent(Number(inputs?.degradationPercent ?? 0.5));
    setAnnualMaintenanceCop(Number(inputs?.annualMaintenanceCop ?? 0));
    setAnalysisYears(Number(inputs?.analysisYears ?? 20));
    setDiscountRatePercent(Number(inputs?.discountRatePercent ?? 0));
    setMunicipality(String(inputs?.municipality ?? ""));
    setRoofOrientation(String(inputs?.roofOrientation ?? "sur"));
    setRoofTiltDegrees(Number(inputs?.roofTiltDegrees ?? 10));
    setShadingPercent(Number(inputs?.shadingPercent ?? 0));
    if (inputs) {
      if (inputs.energyKwhMonth != null) setMonthlyUse(Number(inputs.energyKwhMonth));
      if (inputs.peakSunHoursDay != null) setSunHours(Number(inputs.peakSunHoursDay));
      if (inputs.panelPowerW != null) setPanelWatts(Number(inputs.panelPowerW));
      if (inputs.lossesPercent != null) setLossPercent(Number(inputs.lossesPercent));
      if (inputs.autonomyDays != null) setAutonomyDays(Number(inputs.autonomyDays));
    }
    setError(""); setSubmitted(""); setHasCalculated(false);
  }

  const result = useMemo(() => {
    const { monthlyUse: calculatedUse, sunHours: calculatedSunHours, panelWatts: calculatedPanelWatts, lossPercent: calculatedLossPercent, autonomyDays: calculatedAutonomyDays } = calculationSnapshot;
    const dailyUse = calculatedUse / 30;
    const performanceRatio = Math.max(0.01, 1 - calculatedLossPercent / 100);
    const safeSunHours = Math.max(0.1, calculatedSunHours);
    const safePanelWatts = Math.max(1, calculatedPanelWatts);
    const arrayKwp = dailyUse / (safeSunHours * performanceRatio);
    const panelCount = Math.ceil((arrayKwp * 1000) / safePanelWatts);
    const installedKwp = (panelCount * safePanelWatts) / 1000;
    const monthlyProduction = installedKwp * safeSunHours * 30 * performanceRatio;
    const batteryKwh = dailyUse * Math.max(0, calculatedAutonomyDays) / (0.8 * 0.9);
    return { dailyUse, arrayKwp, panelCount, installedKwp, monthlyProduction, batteryKwh };
  }, [calculationSnapshot]);

  const selectedProject = projects.find((project) => project.id === projectId);
  const isReviewLocked = selectedProject?.latestSimulation?.status === "needs_review" || selectedProject?.latestSimulation?.status === "in_review";

  const roi = useMemo(() => {
    const monthlyOffsetKwh = Math.min(calculationSnapshot.monthlyUse, result.monthlyProduction);
    const hasFinancialProjection = calculationSnapshot.selfConsumptionPercent > 0 && calculationSnapshot.energyRateCopKwh > 0 && calculationSnapshot.estimatedInvestmentCop > 0;
    const projectionRows: { year: number; generationKwh: number; netSavingsCop: number; cumulativeCop: number }[] = [];
    let cumulativeCop = -calculationSnapshot.estimatedInvestmentCop;
    let paybackYears = 0;
    let npvCop = -calculationSnapshot.estimatedInvestmentCop;
    for (let year = 1; year <= calculationSnapshot.analysisYears; year += 1) {
      const generationKwh = result.monthlyProduction * 12 * Math.pow(1 - calculationSnapshot.degradationPercent / 100, year - 1);
      const selfConsumedKwh = Math.min(calculationSnapshot.monthlyUse * 12, generationKwh * calculationSnapshot.selfConsumptionPercent / 100);
      const exportedKwh = Math.max(0, generationKwh - selfConsumedKwh);
      const tariff = calculationSnapshot.energyRateCopKwh * Math.pow(1 + calculationSnapshot.tariffEscalationPercent / 100, year - 1);
      const netSavingsCop = selfConsumedKwh * tariff + exportedKwh * calculationSnapshot.exportRateCopKwh - calculationSnapshot.annualMaintenanceCop;
      const priorCumulative = cumulativeCop;
      cumulativeCop += netSavingsCop;
      npvCop += netSavingsCop / Math.pow(1 + calculationSnapshot.discountRatePercent / 100, year);
      if (paybackYears === 0 && priorCumulative < 0 && cumulativeCop >= 0 && netSavingsCop > 0) {
        paybackYears = year - 1 + (Math.abs(priorCumulative) / netSavingsCop);
      }
      projectionRows.push({ year, generationKwh, netSavingsCop, cumulativeCop });
    }
    const annualSavingsCop = hasFinancialProjection
      ? projectionRows[0]?.netSavingsCop ?? 0
      : monthlyOffsetKwh * calculationSnapshot.energyRateCopKwh * 12;
    return {
      annualSavingsCop,
      roiPercent: calculationSnapshot.estimatedInvestmentCop > 0 ? (annualSavingsCop / calculationSnapshot.estimatedInvestmentCop) * 100 : 0,
      paybackYears: hasFinancialProjection ? paybackYears : annualSavingsCop > 0 ? calculationSnapshot.estimatedInvestmentCop / annualSavingsCop : 0,
      hasFinancialProjection,
      npvCop,
      cumulativeNetGainCop: cumulativeCop,
      projectionRows,
    };
  }, [calculationSnapshot, result.monthlyProduction]);

  function calculate(): boolean {
    setSubmitted("");
    if ((energyRateCopKwh > 0) !== (estimatedInvestmentCop > 0)) {
      setError("Para calcular el ROI, completa tanto la tarifa de energía como la inversión estimada.");
      setHasCalculated(false);
      return false;
    }
    if (
      monthlyUse <= 0 || monthlyUse > 100_000 ||
      sunHours <= 0 || sunHours > 10 ||
      panelWatts <= 0 || panelWatts > 1_000 ||
      lossPercent < 0 || lossPercent >= 60 ||
      autonomyDays <= 0 || autonomyDays > 7 ||
      energyRateCopKwh < 0 || energyRateCopKwh > 1_000_000 ||
      estimatedInvestmentCop < 0 || estimatedInvestmentCop > 100_000_000_000 ||
      selfConsumptionPercent < 0 || selfConsumptionPercent > 100 ||
      exportRateCopKwh < 0 || exportRateCopKwh > 1_000_000 ||
      tariffEscalationPercent < 0 || tariffEscalationPercent > 30 ||
      degradationPercent < 0 || degradationPercent > 5 ||
      annualMaintenanceCop < 0 || annualMaintenanceCop > 100_000_000 ||
      analysisYears < 1 || analysisYears > 40 ||
      discountRatePercent < 0 || discountRatePercent > 50 ||
      roofTiltDegrees < 0 || roofTiltDegrees > 90 ||
      shadingPercent < 0 || shadingPercent > 100
    ) {
      setError("Revisa los datos: consumo, irradiación, panel y pérdidas deben estar dentro de rangos válidos.");
      setHasCalculated(false);
      return false;
    }
    setCalculationSnapshot({ system, monthlyUse, sunHours, panelWatts, lossPercent, autonomyDays, energyRateCopKwh, estimatedInvestmentCop, selfConsumptionPercent, exportRateCopKwh, tariffEscalationPercent, degradationPercent, annualMaintenanceCop, analysisYears, discountRatePercent, municipality, roofOrientation, roofTiltDegrees, shadingPercent });
    setError("");
    setHasCalculated(true);
    return true;
  }

  async function submitForReview(action: "draft" | "submit") {
    if (!projectName.trim()) { setError("Escribe el nombre del proyecto antes de enviarlo a revisión."); return; }
    if (legalType === "natural_person" && !isValidPersonName(legalName)) { setError("El nombre debe usar solo letras, espacios, apóstrofes o guiones."); return; }
    if (legalType === "legal_entity" && !isValidBusinessName(legalName)) { setError("Escribe una razón social válida."); return; }
    if (!isValidColombianIdentification(taxId, legalType)) {
      setError(legalType === "natural_person" ? "La cédula debe tener entre 6 y 10 dígitos." : "El NIT debe tener 9 dígitos y un dígito de verificación válido.");
      return;
    }
    if (legalType === "legal_entity" && !isValidPersonName(contactName)) { setError("El contacto responsable debe tener un nombre válido, usando solo letras."); return; }
    if (clientAddress.trim().length < 5) { setError("Escribe la dirección del cliente."); return; }
    if (!sameInstallationAddress && installationAddress.trim().length < 5) { setError("Escribe la dirección de instalación o marca que es la misma del cliente."); return; }
    if (!isValidPhone(contactPhone)) { setError("Escribe un teléfono válido, con indicativo opcional y entre 7 y 15 dígitos."); return; }
    if (!hasCalculated && !calculate()) return;
    setSaving(true); setError(""); setSubmitted("");
    try {
      const response = await fetch("/api/simulations", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: projectId || undefined, projectName, legalType, legalName, taxIdType: legalType === "natural_person" ? "cedula" : "nit", taxId, contactName, clientAddress, contactPhone, installationAddress: sameInstallationAddress ? "" : installationAddress, sameInstallationAddress, systemType: system, energyKwhMonth: monthlyUse, peakSunHoursDay: sunHours, panelPowerW: panelWatts, lossesPercent: lossPercent, autonomyDays, energyRateCopKwh: energyRateCopKwh > 0 ? energyRateCopKwh : undefined, estimatedInvestmentCop: estimatedInvestmentCop > 0 ? estimatedInvestmentCop : undefined, selfConsumptionPercent: selfConsumptionPercent > 0 ? selfConsumptionPercent : undefined, exportRateCopKwh: exportRateCopKwh > 0 ? exportRateCopKwh : undefined, tariffEscalationPercent, degradationPercent, annualMaintenanceCop, analysisYears, discountRatePercent, municipality, roofOrientation, roofTiltDegrees, shadingPercent, submitForReview: action === "submit" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar el cálculo.");
      setProjectId(data.simulation.projectId);
      setHasSavedDraft(data.simulation.status === "draft");
      setSubmitted(data.simulation.status === "needs_review"
        ? `Versión ${data.simulation.version} enviada a revisión técnica. El contenido quedó bloqueado.`
        : action === "draft"
          ? `Borrador ${data.simulation.version} guardado. Puedes retomarlo y editarlo desde Mis proyectos.`
          : "Borrador guardado, pero no se envió porque todavía no hay un revisor asignado.");
      void loadProjects().catch(() => undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo enviar el cálculo."); }
    finally { setSaving(false); }
  }

  function reset() {
    setProjectName("");
    setProjectId("");
    setHasSavedDraft(false);
    setLegalType("natural_person");
    setLegalName("");
    setTaxId("");
    setContactName("");
    setClientAddress("");
    setContactPhone("");
    setInstallationAddress("");
    setSameInstallationAddress(true);
    setSystem("on_grid");
    setMonthlyUse(650);
    setSunHours(4.5);
    setPanelWatts(585);
    setLossPercent(20);
    setAutonomyDays(1);
    setEnergyRateCopKwh(0);
    setEstimatedInvestmentCop(0);
    setSelfConsumptionPercent(0);
    setExportRateCopKwh(0);
    setTariffEscalationPercent(0);
    setDegradationPercent(0.5);
    setAnnualMaintenanceCop(0);
    setAnalysisYears(20);
    setDiscountRatePercent(0);
    setMunicipality("");
    setRoofOrientation("sur");
    setRoofTiltDegrees(10);
    setShadingPercent(0);
    setCalculationSnapshot({ system: "on_grid", monthlyUse: 650, sunHours: 4.5, panelWatts: 585, lossPercent: 20, autonomyDays: 1, energyRateCopKwh: 0, estimatedInvestmentCop: 0, selfConsumptionPercent: 0, exportRateCopKwh: 0, tariffEscalationPercent: 0, degradationPercent: 0.5, annualMaintenanceCop: 0, analysisYears: 20, discountRatePercent: 0, municipality: "", roofOrientation: "sur", roofTiltDegrees: 10, shadingPercent: 0 });
    setError("");
    setSubmitted("");
    setHasCalculated(false);
  }

  return (
    <div className="workbench">
      <aside className="workbench-sidebar" aria-label="Navegación del sistema">
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <button type="button" className={`workspace-nav-item ${activeSection === "sizing" ? "active" : ""}`} onClick={() => setActiveSection("sizing")} aria-current={activeSection === "sizing" ? "page" : undefined}>
          <span className="nav-glyph" aria-hidden="true">⌁</span>
          <span>Dimensionador</span>
        </button>
        <button type="button" className={`workspace-nav-item ${activeSection === "projects" ? "active" : ""}`} onClick={() => setActiveSection("projects")} aria-current={activeSection === "projects" ? "page" : undefined}>
          <span className="nav-glyph" aria-hidden="true">▤</span>
          <span>Mis proyectos</span>
          <span className="project-nav-count">{projects.length}</span>
        </button>
        <div className="workspace-nav-item disabled" aria-disabled="true" title="Disponible próximamente">
          <span className="nav-glyph" aria-hidden="true">▦</span>
          <span>Equipos</span>
          <span className="nav-soon">Próximo</span>
        </div>
        <div className="sidebar-help">
          <span className="help-icon" aria-hidden="true">i</span>
          <div><strong>Estimación preliminar</strong><p>Verifica cada diseño en sitio antes de instalar.</p></div>
        </div>
      </aside>

      <main className="sizer-main" id="dimensionador">
        {activeSection === "projects" && <section className="projects-page" aria-labelledby="projects-page-title">
          <div className="sizer-page-heading">
            <div><div className="breadcrumbs"><span>Espacio de trabajo</span><span aria-hidden="true">/</span><strong>Mis proyectos</strong></div><p className="sizer-kicker">SEGUIMIENTO</p><h1 id="projects-page-title">Mis proyectos</h1><p className="sizer-intro">Consulta tus cálculos, revisa su estado y continúa trabajando cuando estén disponibles.</p></div>
            <button type="button" className="button-reset" onClick={() => { reset(); setActiveSection("sizing"); }}>＋ <span>Nuevo cálculo</span></button>
          </div>
          {projects.length === 0 ? <div className="sizer-card projects-empty"><span className="empty-project-icon" aria-hidden="true">▤</span><h2>Aún no tienes proyectos</h2><p>Cuando guardes un cálculo, aparecerá aquí para que puedas consultarlo y continuar.</p><button type="button" className="calculate-button" onClick={() => { reset(); setActiveSection("sizing"); }}>Crear primer cálculo</button></div> : <div className="projects-list" aria-label="Lista de proyectos">
            {projects.map((project) => {
              const simulation = project.latestSimulation;
              const statusLabel: Record<string, string> = { draft: "Borrador", in_review: "En revisión", needs_review: "En revisión", approved: "Aprobado", rejected: "Requiere ajustes", archived: "Archivado" };
              const status = simulation?.status ?? project.status;
              const canContinue = status !== "in_review" && status !== "needs_review";
              return <article className="project-list-card" key={project.id}>
                <div className="project-list-main"><div className="project-list-title"><h2>{project.name}</h2><span className={`project-status-chip ${status === "approved" ? "approved" : status === "rejected" ? "attention" : status === "in_review" || status === "needs_review" ? "review" : ""}`}>{statusLabel[status] ?? status.replaceAll("_", " ")}</span></div><p>{project.client.legalName}{project.systemType ? ` · ${systemLabels[project.systemType]}` : ""}</p><div className="project-list-meta"><span>{simulation ? `Versión ${simulation.version}` : "Sin cálculo guardado"}</span><span>Actualizado {new Date(project.updatedAt).toLocaleDateString("es-CO")}</span>{simulation?.panelCount ? <span>{simulation.panelCount} paneles · {Number(simulation.pvKwp ?? 0).toFixed(2)} kWp</span> : null}</div>{status === "rejected" && simulation?.reviewNotes && <p className="project-review-notes"><strong>Observación técnica:</strong> {simulation.reviewNotes}</p>}</div>
                <div className="project-list-actions"><button type="button" className="button-reset project-open-button" onClick={() => { selectProject(project.id); setActiveSection("sizing"); }}>{canContinue ? "Abrir proyecto" : "Ver proyecto"}</button>{role === "operator" && simulation && <a className="button-reset project-open-button project-report-link" href={`/operator/projects/${project.id}/report`} target="_blank" rel="noreferrer">Ficha para cliente</a>}{!canContinue && <span className="field-hint">Edición disponible después de la revisión.</span>}</div>
              </article>;
            })}
          </div>}
        </section>}
        <div className="sizer-content" style={{ display: activeSection === "sizing" ? "contents" : "none" }}>
        <div className="sizer-page-heading">
          <div>
            <div className="breadcrumbs"><span>Herramientas</span><span aria-hidden="true">/</span><strong>Dimensionador solar</strong></div>
            <p className="sizer-kicker">DISEÑO TÉCNICO</p>
            <h1>Dimensionador solar</h1>
            <p className="sizer-intro">Estima la cantidad de paneles a partir del consumo y el recurso solar del proyecto.</p>
          </div>
          <button className="button-reset" type="button" onClick={reset}>＋ <span>Nuevo cálculo</span></button>
        </div>

        {isReviewLocked && <div className="review-lock-banner" role="status"><strong>Versión enviada a revisión</strong><span>Este cálculo está bloqueado para conservar lo enviado. Podrás preparar cambios cuando el revisor responda.</span></div>}
        <div className="sizer-grid">
          <fieldset disabled={isReviewLocked} className="input-stack sizer-form-lock">
          <section className="sizer-card input-card" aria-labelledby="project-input-title">
            <div className="card-heading">
              <div className="step-badge">01</div>
              <div><h2 id="project-input-title">Proyecto y cliente</h2><p>Completa los datos obligatorios del proyecto y del cliente.</p></div>
            </div>

            <label className="sizer-field project-name-field">
              <span className="sizer-label">Nombre del proyecto</span>
              <input className="text-input" required maxLength={200} placeholder="Ej. Bodega La Esperanza" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>
            <div className="project-picker-row">
              <label className="sizer-field">
                <span className="sizer-label">Continuar un proyecto</span>
                <select className="text-input" value={projectId} onChange={(event) => selectProject(event.target.value)}>
                  <option value="">Nuevo proyecto…</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.latestSimulation ? `v${project.latestSimulation.version} · ${project.latestSimulation.status}` : project.status}</option>)}
                </select>
              </label>
              {projectId && <button type="button" className="button-reset project-new-button" onClick={reset}>Nuevo</button>}
            </div>
            {projects.find((project) => project.id === projectId)?.latestSimulation?.status === "needs_review" && <p className="form-hint-box">Esta versión está en revisión. Podrás preparar una nueva cuando el revisor la apruebe o la devuelva.</p>}
            {projects.find((project) => project.id === projectId)?.latestSimulation?.status === "rejected" && <p className="form-hint-box">Devuelto por el revisor: {projects.find((project) => project.id === projectId)?.latestSimulation?.reviewNotes || "Revisa las observaciones y guarda una nueva versión."}</p>}

            <div className="form-section-title"><span>Datos del cliente</span><span className="unit-hint">Se guardan con el proyecto</span></div>
            <label className="sizer-field project-name-field">
              <span className="sizer-label">Tipo de persona</span>
              <select className="text-input" required value={legalType} onChange={(event) => { setLegalType(event.target.value as "natural_person" | "legal_entity"); setTaxId(""); setContactName(""); }}>
                <option value="natural_person">Persona natural</option>
                <option value="legal_entity">Persona jurídica</option>
              </select>
            </label>
            <label className="sizer-field project-name-field">
              <span className="sizer-label">{legalType === "natural_person" ? "Nombre completo" : "Razón social"}</span>
              <input className="text-input" required maxLength={200} autoComplete="name" placeholder={legalType === "natural_person" ? "Nombre y apellidos" : "Nombre legal de la empresa"} value={legalName} onChange={(event) => setLegalName(event.target.value)} aria-describedby="legal-name-hint" />
              <span className="field-hint" id="legal-name-hint">{legalType === "natural_person" ? "Usa letras, espacios, apóstrofes o guiones." : "Ingresa la razón social registrada."}</span>
            </label>
            <label className="sizer-field project-name-field">
              <span className="sizer-label">{legalType === "natural_person" ? "Cédula" : "NIT"}</span>
              <input className="text-input" required inputMode="numeric" autoComplete="off" placeholder={legalType === "natural_person" ? "Número de identificación" : "Ej. 900123456-3"} value={taxId} onChange={(event) => setTaxId(event.target.value.replace(/[^\d.\-]/g, ""))} aria-describedby="tax-id-hint" />
              <span className="field-hint" id="tax-id-hint">{legalType === "natural_person" ? "De 6 a 10 dígitos." : "9 dígitos más el dígito de verificación; se valida automáticamente."}</span>
            </label>
            {legalType === "legal_entity" && <label className="sizer-field project-name-field">
              <span className="sizer-label">Persona de contacto responsable</span>
              <input className="text-input" required maxLength={160} autoComplete="name" placeholder="Nombre de quien solicita el análisis" value={contactName} onChange={(event) => setContactName(event.target.value)} />
            </label>}
            <div className="input-fields client-contact-fields">
              <label className="sizer-field">
                <span className="sizer-label">Teléfono</span>
                <input className="text-input" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 123 4567" value={contactPhone} onChange={(event) => setContactPhone(event.target.value.replace(/[^\d+\s().-]/g, ""))} aria-describedby="phone-hint" />
                <span className="field-hint" id="phone-hint">Solo números; puedes usar +, espacios o guiones.</span>
              </label>
              <label className="sizer-field">
                <span className="sizer-label">Dirección del cliente</span>
                <input className="text-input" required maxLength={500} autoComplete="street-address" placeholder="Dirección de contacto" value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} />
              </label>
            </div>
            <label className="same-address-toggle"><input type="checkbox" checked={sameInstallationAddress} onChange={(event) => { setSameInstallationAddress(event.target.checked); if (event.target.checked) setInstallationAddress(""); }} /><span>La instalación será en la dirección del cliente</span></label>
            {!sameInstallationAddress && <label className="sizer-field project-name-field">
              <span className="sizer-label">Dirección de instalación</span>
              <input className="text-input" required maxLength={500} placeholder="Dirección donde se instalará el sistema" value={installationAddress} onChange={(event) => setInstallationAddress(event.target.value)} />
            </label>}
            <p className="field-hint address-purpose-hint">La dirección del cliente sirve para contacto. Indica otra dirección solo si el sistema se instalará en un lugar distinto.</p>

          </section>
          <section className="sizer-card input-card" aria-labelledby="technical-input-title">
            <div className="card-heading">
              <div className="step-badge">02</div>
              <div><h2 id="technical-input-title">Diseño y cálculo</h2><p>Define la modalidad, los parámetros solares y el retorno estimado.</p></div>
            </div>
            <fieldset className="system-selector">
              <legend className="sizer-label">Modalidad del sistema</legend>
              <div className="system-options">
                {(Object.keys(systemLabels) as SystemType[]).map((type) => (
                  <button key={type} className={`system-option ${system === type ? "selected" : ""}`} type="button" aria-pressed={system === type} onClick={() => { setSystem(type); setHasCalculated(false); setSubmitted(""); }}>
                    <span className="system-option-mark" aria-hidden="true">{system === type ? "●" : "○"}</span>{systemLabels[type]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="input-divider" />
            <div className="form-section-title"><span>Consumo y recurso solar</span><span className="unit-hint">Unidades estándar</span></div>
            <div className="input-fields">
              <Field label="Consumo promedio mensual" unit="kWh/mes" value={monthlyUse} min={1} max={100000} onChange={(value) => { setMonthlyUse(value); setHasCalculated(false); setSubmitted(""); }} />
              <Field label="Horas sol pico promedio" unit="h/día" value={sunHours} min={0.1} max={10} step={0.1} onChange={(value) => { setSunHours(value); setHasCalculated(false); setSubmitted(""); }} />
              <Field label="Potencia del panel" unit="Wp" value={panelWatts} min={1} max={1000} onChange={(value) => { setPanelWatts(value); setHasCalculated(false); setSubmitted(""); }} />
            </div>

            <label className="sizer-field loss-field">
              <span className="loss-label-row"><span className="sizer-label">Pérdidas estimadas</span><strong>{lossPercent}%</strong></span>
              <input className="loss-slider" type="range" min={0} max={50} step={1} value={lossPercent} onChange={(event) => { setLossPercent(Number(event.target.value)); setHasCalculated(false); setSubmitted(""); }} aria-label="Pérdidas estimadas en porcentaje" />
              <span className="field-hint">Incluye temperatura, cableado, inversor y suciedad.</span>
            </label>

            <div className="input-divider" />
            <div className="form-section-title"><span>Retorno estimado para el cliente</span><span className="unit-hint">Opcional · COP</span></div>
            <p className="field-hint">Ingresa la tarifa de energía y el valor total estimado de la oferta. No se usan costos internos.</p>
            <div className="input-fields">
              <Field label="Valor de energía sustituida" unit="COP/kWh" value={energyRateCopKwh} min={0} max={1000000} step={100} optional onChange={(value) => { setEnergyRateCopKwh(value); setHasCalculated(false); setSubmitted(""); }} />
              <Field label="Inversión total estimada" unit="COP" value={estimatedInvestmentCop} min={0} max={100000000000} step={100000} optional onChange={(value) => { setEstimatedInvestmentCop(value); setHasCalculated(false); setSubmitted(""); }} />
            </div>
            <details className="advanced-assumptions">
              <summary>Datos adicionales para afinar la propuesta</summary>
              <p className="field-hint">Estos supuestos amplían el ROI. Los datos del sitio se guardan para revisión técnica; las horas sol pico siguen siendo el dato que alimenta el dimensionamiento.</p>
              <div className="input-divider" />
              <div className="form-section-title"><span>Proyección financiera</span><span className="unit-hint">Supuestos editables</span></div>
              <div className="input-fields">
                <Field label="Autoconsumo estimado de la generación" unit="%" value={selfConsumptionPercent} min={0} max={100} optional onChange={(value) => { setSelfConsumptionPercent(value); setHasCalculated(false); setSubmitted(""); }} />
                <Field label="Compensación por excedentes" unit="COP/kWh" value={exportRateCopKwh} min={0} max={1000000} step={100} optional onChange={(value) => { setExportRateCopKwh(value); setHasCalculated(false); setSubmitted(""); }} />
                <Field label="Aumento anual de tarifa" unit="%" value={tariffEscalationPercent} min={0} max={30} step={0.1} optional onChange={(value) => { setTariffEscalationPercent(value); setHasCalculated(false); setSubmitted(""); }} />
                <Field label="Degradación anual de paneles" unit="%" value={degradationPercent} min={0} max={5} step={0.1} optional onChange={(value) => { setDegradationPercent(value); setHasCalculated(false); setSubmitted(""); }} />
                <Field label="Mantenimiento anual estimado" unit="COP" value={annualMaintenanceCop} min={0} max={100000000} step={100000} optional onChange={(value) => { setAnnualMaintenanceCop(value); setHasCalculated(false); setSubmitted(""); }} />
                <Field label="Horizonte de análisis" unit="años" value={analysisYears} min={1} max={40} step={1} onChange={(value) => { setAnalysisYears(value); setHasCalculated(false); setSubmitted(""); }} />
                <Field label="Tasa de descuento" unit="%" value={discountRatePercent} min={0} max={50} step={0.1} optional onChange={(value) => { setDiscountRatePercent(value); setHasCalculated(false); setSubmitted(""); }} />
              </div>
              <p className="field-hint assumption-defaults-hint">Los campos opcionales vacíos se toman como 0; el horizonte inicial es 20 años. Ajusta estos valores con datos de la tarifa, la oferta y el perfil real del cliente.</p>
              <div className="input-divider" />
              <div className="form-section-title"><span>Referencia del sitio</span><span className="unit-hint">Para revisión de ingeniería</span></div>
              <div className="input-fields">
                <label className="sizer-field"><span className="sizer-label">Municipio</span><input className="text-input" maxLength={120} placeholder="Ej. Medellín, Antioquia" value={municipality} onChange={(event) => { setMunicipality(event.target.value); setHasCalculated(false); setSubmitted(""); }} /></label>
                <label className="sizer-field"><span className="sizer-label">Orientación del techo</span><select className="text-input" value={roofOrientation} onChange={(event) => { setRoofOrientation(event.target.value); setHasCalculated(false); setSubmitted(""); }}><option value="sur">Sur</option><option value="norte">Norte</option><option value="este">Este</option><option value="oeste">Oeste</option><option value="mixta">Mixta / por confirmar</option></select></label>
                <Field label="Inclinación del techo" unit="°" value={roofTiltDegrees} min={0} max={90} step={1} optional onChange={(value) => { setRoofTiltDegrees(value); setHasCalculated(false); setSubmitted(""); }} />
                <Field label="Sombreado estimado del sitio" unit="%" value={shadingPercent} min={0} max={100} step={1} optional onChange={(value) => { setShadingPercent(value); setHasCalculated(false); setSubmitted(""); }} />
              </div>
              <p className="field-hint assumption-defaults-hint">La orientación, inclinación y sombra quedan como referencia; no sustituyen una visita ni cambian automáticamente las horas sol pico.</p>
            </details>

            {system !== "on_grid" && <div className="battery-input">
              <Field label="Autonomía de almacenamiento" unit="días" value={autonomyDays} min={0.5} max={7} step={0.5} onChange={(value) => { setAutonomyDays(value); setHasCalculated(false); setSubmitted(""); }} />
              <p>Estimación preliminar de batería útil al 80% de profundidad de descarga.</p>
            </div>}

            {error && <p className="form-error" role="alert">{error}</p>}
            {!hasCalculated && <p className="form-hint-box" role="status">Hay cambios sin recalcular. Al guardar o enviar, se actualizará el cálculo con estos datos.</p>}
            <button className="calculate-button" type="button" onClick={calculate}><span aria-hidden="true">↗</span> Calcular dimensionamiento</button>
            <div className="form-action-row"><button className="calculate-button" type="button" onClick={() => void submitForReview("draft")} disabled={saving}>{saving ? "Guardando…" : "Guardar borrador"}</button><button className="calculate-button submit-review-button" type="button" onClick={() => void submitForReview("submit")} disabled={saving || !projectId || !hasSavedDraft} title={!projectId || !hasSavedDraft ? "Guarda primero una versión como borrador." : undefined}>{saving ? "Enviando…" : "Enviar versión a revisión técnica"}</button></div>
            {!projectId || !hasSavedDraft ? <p className="field-hint draft-before-submit-hint">Primero guarda una versión como borrador. Después podrás enviarla a revisión.</p> : null}
            {submitted && <p role="status" className="form-success">{submitted}</p>}
          </section>
          </fieldset>

          <section className="results-column" aria-labelledby="result-title">
            <div className="result-card">
              <div className="result-card-heading">
                <div><p className="result-overline">RESULTADO PRELIMINAR</p><h2 id="result-title">{hasCalculated && projectName.trim() ? projectName : "Tu dimensionamiento"}</h2></div>
                <span className={`result-status ${hasCalculated ? "" : "stale"}`}><span /> {hasCalculated ? "Actualizado" : "Recalcular"}</span>
              </div>
              <div className="system-summary"><span>{systemLabels[calculationSnapshot.system]}</span><span>Panel de {calculationSnapshot.panelWatts} Wp</span></div>
              <div className="panel-count">
                <span className="panel-count-label">Cantidad recomendada de paneles</span>
                <strong>{result.panelCount}</strong>
                <span className="panel-count-foot">módulos fotovoltaicos</span>
              </div>
              <div className="result-metrics">
                <div><span>Potencia instalada</span><strong>{result.installedKwp.toFixed(2)} <small>kWp</small></strong></div>
                <div><span>Producción estimada</span><strong>{Math.round(result.monthlyProduction).toLocaleString("es-CO")} <small>kWh/mes</small></strong></div>
                {calculationSnapshot.system !== "on_grid" && <div><span>Batería útil estimada</span><strong>{result.batteryKwh.toFixed(1)} <small>kWh</small></strong></div>}
              </div>
              <div className="result-note"><span aria-hidden="true">ⓘ</span><p>El cálculo considera {result.dailyUse.toFixed(1)} kWh/día y {calculationSnapshot.lossPercent}% de pérdidas. Ajusta las horas sol pico con datos de la ubicación.</p></div>
              <div className="input-divider" />
              <div className="form-section-title"><span>ROI simple preliminar</span><span className="unit-hint">Sin financiación ni O&amp;M</span></div>
              {calculationSnapshot.energyRateCopKwh > 0 && calculationSnapshot.estimatedInvestmentCop > 0 ? <>
                <div className="result-metrics">
                  <div><span>Ahorro neto año 1</span><strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(roi.annualSavingsCop)}</strong></div>
                  <div><span>Retorno anual simple</span><strong>{roi.roiPercent.toFixed(1)}%</strong></div>
                  <div><span>Recuperación estimada</span><strong>{roi.paybackYears > 0 ? `${roi.paybackYears.toFixed(1)} años` : "No se recupera en el horizonte"}</strong></div>
                </div>
                {roi.hasFinancialProjection && <>
                  <div className="result-metrics projection-highlights">
                    <div><span>Valor presente neto</span><strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(roi.npvCop)}</strong></div>
                    <div><span>Ganancia neta acumulada ({calculationSnapshot.analysisYears} años)</span><strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(roi.cumulativeNetGainCop)}</strong></div>
                  </div>
                  <details className="projection-table-details"><summary>Ver flujo anual proyectado</summary><div className="projection-table-wrap"><table><thead><tr><th>Año</th><th>Generación</th><th>Ahorro neto</th><th>Acumulado</th></tr></thead><tbody>{roi.projectionRows.map((row) => <tr key={row.year}><td>{row.year}</td><td>{Math.round(row.generationKwh).toLocaleString("es-CO")} kWh</td><td>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(row.netSavingsCop)}</td><td>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(row.cumulativeCop)}</td></tr>)}</tbody></table></div></details>
                </>}
                <div className="result-note"><span aria-hidden="true">ⓘ</span><p>{roi.hasFinancialProjection ? `Proyección preliminar con ${calculationSnapshot.selfConsumptionPercent}% de autoconsumo, tarifa creciendo ${calculationSnapshot.tariffEscalationPercent}% anual, degradación ${calculationSnapshot.degradationPercent}% y O&M indicado. No incluye financiación ni impuestos.` : "ROI simple: asume que la generación desplaza consumo hasta el consumo mensual ingresado. Abre los datos adicionales e indica autoconsumo para estimar excedentes y flujo de caja."}</p></div>
              </> : <p className="field-hint">Completa tarifa e inversión total. Para proyección avanzada, indica también el autoconsumo estimado.</p>}
            </div>

            <div className="method-card">
              <h3>¿Cómo se calcula?</h3>
              <p>Potencia FV = consumo diario ÷ horas sol pico ÷ rendimiento del sistema. La cantidad se redondea al siguiente panel completo.</p>
              <div className="method-stats"><span>Rendimiento aplicado</span><strong>{(100 - calculationSnapshot.lossPercent)}%</strong></div>
              <div className="method-stats"><span>Potencia FV requerida</span><strong>{result.arrayKwp.toFixed(2)} kWp</strong></div>
            </div>
          </section>
        </div>
        </div>

        <footer className="sizer-footer"><span>Voltica Solar · Herramienta de dimensionamiento</span><span>Versión preliminar · Validar ingeniería antes de instalar</span></footer>
      </main>
    </div>
  );
}
