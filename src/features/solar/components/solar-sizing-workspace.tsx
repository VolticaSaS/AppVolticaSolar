"use client";

import { useMemo, useState } from "react";
import { isValidColombianIdentification, isValidPhone } from "@/lib/validation/colombian-identification";

type SystemType = "on_grid" | "hybrid" | "off_grid";

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
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number | string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="sizer-field">
      <span className="sizer-label">{label}</span>
      <span className="sizer-input-wrap">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="sizer-unit">{unit}</span>
      </span>
    </label>
  );
}

export function SolarSizingWorkspace() {
  const [projectName, setProjectName] = useState("");
  const [legalType, setLegalType] = useState<"natural_person" | "legal_entity">("natural_person");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactName, setContactName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [installationAddress, setInstallationAddress] = useState("");
  const [system, setSystem] = useState<SystemType>("on_grid");
  const [monthlyUse, setMonthlyUse] = useState(650);
  const [sunHours, setSunHours] = useState(4.5);
  const [panelWatts, setPanelWatts] = useState(585);
  const [lossPercent, setLossPercent] = useState(20);
  const [autonomyDays, setAutonomyDays] = useState(1);
  const [hasCalculated, setHasCalculated] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState("");

  const result = useMemo(() => {
    const dailyUse = monthlyUse / 30;
    const performanceRatio = Math.max(0.01, 1 - lossPercent / 100);
    const safeSunHours = Math.max(0.1, sunHours);
    const safePanelWatts = Math.max(1, panelWatts);
    const arrayKwp = dailyUse / (safeSunHours * performanceRatio);
    const panelCount = Math.ceil((arrayKwp * 1000) / safePanelWatts);
    const installedKwp = (panelCount * safePanelWatts) / 1000;
    const monthlyProduction = installedKwp * safeSunHours * 30 * performanceRatio;
    const batteryKwh = dailyUse * Math.max(0, autonomyDays) / (0.8 * 0.9);
    return { dailyUse, arrayKwp, panelCount, installedKwp, monthlyProduction, batteryKwh };
  }, [autonomyDays, lossPercent, monthlyUse, panelWatts, sunHours]);

  function calculate() {
    setSubmitted("");
    if (
      monthlyUse <= 0 || monthlyUse > 100_000 ||
      sunHours <= 0 || sunHours > 10 ||
      panelWatts <= 0 || panelWatts > 1_000 ||
      lossPercent < 0 || lossPercent >= 60 ||
      autonomyDays <= 0 || autonomyDays > 7
    ) {
      setError("Revisa los datos: consumo, irradiación, panel y pérdidas deben estar dentro de rangos válidos.");
      setHasCalculated(false);
      return;
    }
    setError("");
    setHasCalculated(true);
  }

  async function submitForReview() {
    if (!projectName.trim()) { setError("Escribe el nombre del proyecto antes de enviarlo a revisión."); return; }
    if (legalName.trim().length < 3) { setError(legalType === "natural_person" ? "Escribe el nombre completo del cliente." : "Escribe la razón social de la empresa."); return; }
    if (!isValidColombianIdentification(taxId, legalType)) {
      setError(legalType === "natural_person" ? "La cédula debe tener entre 6 y 10 dígitos." : "El NIT debe tener 9 dígitos y un dígito de verificación válido.");
      return;
    }
    if (legalType === "legal_entity" && contactName.trim().length < 3) { setError("Indica quién es el contacto responsable de la empresa."); return; }
    if (clientAddress.trim().length < 5) { setError("Escribe la dirección del cliente."); return; }
    if (!isValidPhone(contactPhone)) { setError("Escribe un teléfono válido, con indicativo opcional y entre 7 y 15 dígitos."); return; }
    if (!hasCalculated) { setError("Primero calcula el dimensionamiento con datos válidos."); return; }
    setSaving(true); setError(""); setSubmitted("");
    try {
      const response = await fetch("/api/simulations", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectName, legalType, legalName, taxIdType: legalType === "natural_person" ? "cedula" : "nit", taxId, contactName, clientAddress, contactPhone, installationAddress, systemType: system, energyKwhMonth: monthlyUse, peakSunHoursDay: sunHours, panelPowerW: panelWatts, lossesPercent: lossPercent, autonomyDays }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar el cálculo.");
      setSubmitted(`Cálculo ${data.simulation.id.slice(0, 8)} enviado a revisión técnica.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo enviar el cálculo."); }
    finally { setSaving(false); }
  }

  function reset() {
    setProjectName("");
    setLegalType("natural_person");
    setLegalName("");
    setTaxId("");
    setContactName("");
    setClientAddress("");
    setContactPhone("");
    setInstallationAddress("");
    setSystem("on_grid");
    setMonthlyUse(650);
    setSunHours(4.5);
    setPanelWatts(585);
    setLossPercent(20);
    setAutonomyDays(1);
    setError("");
    setSubmitted("");
    setHasCalculated(false);
  }

  return (
    <div className="workbench">
      <aside className="workbench-sidebar" aria-label="Navegación del sistema">
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <a className="workspace-nav-item active" href="#dimensionador" aria-current="page">
          <span className="nav-glyph" aria-hidden="true">⌁</span>
          <span>Dimensionador</span>
        </a>
        <div className="workspace-nav-item disabled" aria-disabled="true" title="Disponible próximamente">
          <span className="nav-glyph" aria-hidden="true">▤</span>
          <span>Proyectos</span>
          <span className="nav-soon">Próximo</span>
        </div>
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
        <div className="sizer-page-heading">
          <div>
            <div className="breadcrumbs"><span>Herramientas</span><span aria-hidden="true">/</span><strong>Dimensionador solar</strong></div>
            <p className="sizer-kicker">DISEÑO TÉCNICO</p>
            <h1>Dimensionador solar</h1>
            <p className="sizer-intro">Estima la cantidad de paneles a partir del consumo y el recurso solar del proyecto.</p>
          </div>
          <button className="button-reset" type="button" onClick={reset}>＋ <span>Nuevo cálculo</span></button>
        </div>

        <div className="sizer-grid">
          <section className="sizer-card input-card" aria-labelledby="project-input-title">
            <div className="card-heading">
              <div className="step-badge">01</div>
              <div><h2 id="project-input-title">Datos del proyecto</h2><p>Completa los datos de entrada del sistema.</p></div>
            </div>

            <label className="sizer-field project-name-field">
              <span className="sizer-label">Nombre del proyecto</span>
              <input className="text-input" placeholder="Ej. Bodega La Esperanza" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>

            <div className="form-section-title"><span>Datos del cliente</span><span className="unit-hint">Se guardan con el proyecto</span></div>
            <label className="sizer-field project-name-field">
              <span className="sizer-label">Tipo de persona</span>
              <select className="text-input" value={legalType} onChange={(event) => { setLegalType(event.target.value as "natural_person" | "legal_entity"); setTaxId(""); }}>
                <option value="natural_person">Persona natural</option>
                <option value="legal_entity">Persona jurídica</option>
              </select>
            </label>
            <label className="sizer-field project-name-field">
              <span className="sizer-label">{legalType === "natural_person" ? "Nombre completo" : "Razón social"}</span>
              <input className="text-input" autoComplete="name" placeholder={legalType === "natural_person" ? "Nombre y apellidos" : "Nombre legal de la empresa"} value={legalName} onChange={(event) => setLegalName(event.target.value)} />
            </label>
            <label className="sizer-field project-name-field">
              <span className="sizer-label">{legalType === "natural_person" ? "Cédula" : "NIT"}</span>
              <input className="text-input" inputMode="numeric" autoComplete="off" placeholder={legalType === "natural_person" ? "Número de identificación" : "Ej. 900123456-3"} value={taxId} onChange={(event) => setTaxId(event.target.value)} aria-describedby="tax-id-hint" />
              <span className="field-hint" id="tax-id-hint">{legalType === "natural_person" ? "De 6 a 10 dígitos." : "9 dígitos más el dígito de verificación; se valida automáticamente."}</span>
            </label>
            {legalType === "legal_entity" && <label className="sizer-field project-name-field">
              <span className="sizer-label">Persona de contacto responsable</span>
              <input className="text-input" autoComplete="name" placeholder="Nombre de quien solicita el análisis" value={contactName} onChange={(event) => setContactName(event.target.value)} />
            </label>}
            <div className="input-fields client-contact-fields">
              <label className="sizer-field">
                <span className="sizer-label">Teléfono</span>
                <input className="text-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 123 4567" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
              </label>
              <label className="sizer-field">
                <span className="sizer-label">Dirección del cliente</span>
                <input className="text-input" autoComplete="street-address" placeholder="Dirección de contacto" value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} />
              </label>
            </div>
            <label className="sizer-field project-name-field">
              <span className="sizer-label">Dirección de instalación <span className="unit-hint">(si es distinta)</span></span>
              <input className="text-input" placeholder="Lugar donde se instalaría el sistema" value={installationAddress} onChange={(event) => setInstallationAddress(event.target.value)} />
            </label>

            <fieldset className="system-selector">
              <legend className="sizer-label">Modalidad del sistema</legend>
              <div className="system-options">
                {(Object.keys(systemLabels) as SystemType[]).map((type) => (
                  <button key={type} className={`system-option ${system === type ? "selected" : ""}`} type="button" aria-pressed={system === type} onClick={() => setSystem(type)}>
                    <span className="system-option-mark" aria-hidden="true">{system === type ? "●" : "○"}</span>{systemLabels[type]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="input-divider" />
            <div className="form-section-title"><span>Consumo y recurso solar</span><span className="unit-hint">Unidades estándar</span></div>
            <div className="input-fields">
              <Field label="Consumo promedio mensual" unit="kWh/mes" value={monthlyUse} min={1} max={100000} onChange={setMonthlyUse} />
              <Field label="Horas sol pico promedio" unit="h/día" value={sunHours} min={0.1} max={10} step={0.1} onChange={setSunHours} />
              <Field label="Potencia del panel" unit="Wp" value={panelWatts} min={1} max={1000} onChange={setPanelWatts} />
            </div>

            <label className="sizer-field loss-field">
              <span className="loss-label-row"><span className="sizer-label">Pérdidas estimadas</span><strong>{lossPercent}%</strong></span>
              <input className="loss-slider" type="range" min={0} max={50} step={1} value={lossPercent} onChange={(event) => setLossPercent(Number(event.target.value))} aria-label="Pérdidas estimadas en porcentaje" />
              <span className="field-hint">Incluye temperatura, cableado, inversor y suciedad.</span>
            </label>

            {system !== "on_grid" && <div className="battery-input">
              <Field label="Autonomía de almacenamiento" unit="días" value={autonomyDays} min={0.5} max={7} step={0.5} onChange={setAutonomyDays} />
              <p>Estimación preliminar de batería útil al 80% de profundidad de descarga.</p>
            </div>}

            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="calculate-button" type="button" onClick={calculate}><span aria-hidden="true">↗</span> Calcular dimensionamiento</button>
            <button className="calculate-button" type="button" onClick={() => void submitForReview()} disabled={saving} style={{ marginTop: 9, background: "#fff", color: "#005000", border: "1px solid #005000" }}>{saving ? "Enviando…" : "Guardar y enviar a revisión técnica"}</button>
            {submitted && <p role="status" className="form-success">{submitted}</p>}
          </section>

          <section className="results-column" aria-labelledby="result-title">
            <div className="result-card">
              <div className="result-card-heading">
                <div><p className="result-overline">RESULTADO PRELIMINAR</p><h2 id="result-title">{hasCalculated && projectName.trim() ? projectName : "Tu dimensionamiento"}</h2></div>
                <span className="result-status"><span /> Estimado</span>
              </div>
              <div className="system-summary"><span>{systemLabels[system]}</span><span>Panel de {panelWatts} Wp</span></div>
              <div className="panel-count">
                <span className="panel-count-label">Cantidad recomendada de paneles</span>
                <strong>{result.panelCount}</strong>
                <span className="panel-count-foot">módulos fotovoltaicos</span>
              </div>
              <div className="result-metrics">
                <div><span>Potencia instalada</span><strong>{result.installedKwp.toFixed(2)} <small>kWp</small></strong></div>
                <div><span>Producción estimada</span><strong>{Math.round(result.monthlyProduction).toLocaleString("es-CO")} <small>kWh/mes</small></strong></div>
                {system !== "on_grid" && <div><span>Batería útil estimada</span><strong>{result.batteryKwh.toFixed(1)} <small>kWh</small></strong></div>}
              </div>
              <div className="result-note"><span aria-hidden="true">ⓘ</span><p>El cálculo considera {result.dailyUse.toFixed(1)} kWh/día y {lossPercent}% de pérdidas. Ajusta las horas sol pico con datos de la ubicación.</p></div>
            </div>

            <div className="method-card">
              <h3>¿Cómo se calcula?</h3>
              <p>Potencia FV = consumo diario ÷ horas sol pico ÷ rendimiento del sistema. La cantidad se redondea al siguiente panel completo.</p>
              <div className="method-stats"><span>Rendimiento aplicado</span><strong>{(100 - lossPercent)}%</strong></div>
              <div className="method-stats"><span>Potencia FV requerida</span><strong>{result.arrayKwp.toFixed(2)} kWp</strong></div>
            </div>
          </section>
        </div>

        <footer className="sizer-footer"><span>Voltica Solar · Herramienta de dimensionamiento</span><span>Versión preliminar · Validar ingeniería antes de instalar</span></footer>
      </main>
    </div>
  );
}
