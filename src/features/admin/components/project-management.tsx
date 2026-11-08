"use client";

import { useEffect, useState } from "react";

type Person = { id: string; fullName: string; email: string };
type Project = {
  id: string; name: string; status: string; systemType: string | null; address: string | null;
  owner: Person | null; reviewer: Person | null;
  client: { legalName: string; legalType: string | null; taxIdType: string | null; taxId: string | null; address: string | null; contactName: string | null; contactPhone: string | null; contactEmail: string | null };
  latestSimulation: {
    id: string; version: number; status: string; panelCount: number | null; reviewNotes: string | null;
    estimate: { version: number; currency: string; totalCop: string; includesVat: boolean; vatCop: string | null; status: string; validUntil: string | null } | null;
    internalFinance: { equipmentCostCop: string; laborCostCop: string; logisticsCostCop: string; otherDirectCostCop: string; contingencyCostCop: string; totalCostCop: string; saleCop: string; grossProfitCop: string | null; grossMarginPct: string | null } | null;
  } | null;
};

const statusLabels: Record<string, string> = {
  draft: "Borrador", in_review: "En revisión", needs_review: "Pendiente de revisión",
  approved: "Aprobado · versión final", rejected: "Devuelto para ajustes",
};

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [operators, setOperators] = useState<Person[]>([]);
  const [reviewers, setReviewers] = useState<Person[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [busyProjectId, setBusyProjectId] = useState("");

  async function fetchProjects() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los proyectos.");
    return data as { projects: Project[]; operators: Person[]; reviewers: Person[] };
  }
  async function load() {
    const data = await fetchProjects();
    setProjects(data.projects);
    setOperators(data.operators);
    setReviewers(data.reviewers);
  }
  useEffect(() => {
    let active = true;
    fetchProjects().then((data) => {
      if (active) { setProjects(data.projects); setOperators(data.operators); setReviewers(data.reviewers); }
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los proyectos."); });
    return () => { active = false; };
  }, []);

  async function assign(project: Project, field: "ownerId" | "reviewerId", value: string) {
    setError(""); setMessage(""); setBusyProjectId(project.id);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id, [field]: value || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar la asignación.");
      setMessage(field === "ownerId" ? "Responsable operativo actualizado." : "Revisor técnico actualizado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la asignación.");
    } finally {
      setBusyProjectId("");
    }
  }

  const filtered = projects.filter((project) => (project.name + " " + project.client.legalName + " " + (project.client.taxId ?? "") + " " + (project.owner?.fullName ?? "") + " " + (project.reviewer?.fullName ?? "")).toLowerCase().includes(search.toLowerCase()));
  return <main className="mx-auto max-w-7xl px-6 py-10">
    <nav aria-label="Administración" className="mb-7 grid gap-3 sm:grid-cols-2">
      <a className="rounded-xl border border-green-200 bg-white px-5 py-4 font-semibold text-[#005000] hover:bg-green-50" href="/admin">Usuarios y perfiles</a>
      <span aria-current="page" className="rounded-xl bg-[#005000] px-5 py-4 font-semibold text-white">Proyectos y asignaciones</span>
    </nav>
    <p className="text-xs font-bold uppercase tracking-widest text-[#005000]">Administración</p>
    <h1 className="mt-2 text-3xl font-semibold">Proyectos y asignaciones</h1>
    <p className="mt-2 max-w-3xl text-sm text-slate-600">Consulta proyectos, asigna al responsable operativo y designa o cambia la persona revisora. Las asignaciones quedan registradas en auditoría.</p>
    <label className="mt-6 block max-w-xl text-sm font-medium">Buscar proyecto, cliente, identificación, responsable o revisor
      <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Escribe para filtrar…" />
    </label>
    {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="mt-6 space-y-4">
      {filtered.map((project) => <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-slate-900">{project.name}</h2><p className="mt-1 text-sm text-slate-600">{project.client.legalName} · {project.client.legalType === "legal_entity" ? "Persona jurídica" : "Persona natural"} · {project.client.taxIdType?.toUpperCase() ?? "Documento pendiente"} {project.client.taxId ?? ""}</p></div>
          <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-[#005000]">{statusLabels[project.latestSimulation?.status ?? project.status] ?? project.latestSimulation?.status ?? project.status}</div>
        </div>
        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs text-slate-500">Contacto</p><p className="mt-1 font-medium">{project.client.contactName || project.client.legalName}</p><p className="text-slate-600">{project.client.contactPhone || "Sin teléfono"}</p><p className="text-slate-600">{project.client.address || "Sin dirección"}</p></div>
          <div><p className="text-xs text-slate-500">Cálculo más reciente</p><p className="mt-1 font-medium">{project.latestSimulation ? "Versión " + project.latestSimulation.version + " · " + (project.latestSimulation.panelCount ?? "—") + " paneles" : "Aún no hay cálculos"}</p><p className="text-slate-600">{project.systemType ?? "Modalidad sin definir"}{project.latestSimulation?.reviewNotes ? " · " + project.latestSimulation.reviewNotes : ""}</p></div>
          <label><span className="text-xs font-semibold text-slate-600">Responsable operativo</span><select aria-label={"Responsable operativo de " + project.name} disabled={busyProjectId === project.id} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={project.owner?.id ?? ""} onChange={(event) => void assign(project, "ownerId", event.target.value)}><option value="">Sin responsable</option>{operators.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.email}</option>)}</select></label>
          <label><span className="text-xs font-semibold text-slate-600">Revisor técnico / aprobador</span><select aria-label={"Revisor técnico de " + project.name} disabled={busyProjectId === project.id || reviewers.length === 0} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={project.reviewer?.id ?? ""} onChange={(event) => void assign(project, "reviewerId", event.target.value)}><option value="">Sin revisor asignado</option>{reviewers.map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.email}</option>)}</select>{reviewers.length === 0 && <span className="mt-1 block text-xs text-amber-800">Crea o activa una cuenta con perfil Revisor técnico para asignarla.</span>}</label>
        </div>
        {(project.latestSimulation?.estimate || project.latestSimulation?.internalFinance) && <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
          {project.latestSimulation.estimate && <div className="rounded-xl bg-green-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#005000]">Precio autorizado · v{project.latestSimulation.estimate.version}</p><p className="mt-2 text-xl font-semibold">{project.latestSimulation.estimate.currency} {Number(project.latestSimulation.estimate.totalCop).toLocaleString("es-CO")}</p><p className="mt-1 text-xs text-slate-600">{project.latestSimulation.estimate.includesVat ? "Incluye IVA · " + (project.latestSimulation.estimate.vatCop ?? "IVA sin detallar") : "No incluye IVA"} · Estado: {project.latestSimulation.estimate.status}{project.latestSimulation.estimate.validUntil ? " · Vigente hasta " + new Date(project.latestSimulation.estimate.validUntil).toLocaleDateString("es-CO") : ""}</p></div>}
          {project.latestSimulation.internalFinance && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-900">Finanzas internas · solo administración</p><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700"><span>Equipos</span><strong>{money(project.latestSimulation.internalFinance.equipmentCostCop)}</strong><span>Mano de obra</span><strong>{money(project.latestSimulation.internalFinance.laborCostCop)}</strong><span>Logística</span><strong>{money(project.latestSimulation.internalFinance.logisticsCostCop)}</strong><span>Otros costos</span><strong>{money(project.latestSimulation.internalFinance.otherDirectCostCop)}</strong><span>Contingencia</span><strong>{money(project.latestSimulation.internalFinance.contingencyCostCop)}</strong><span>Costo interno</span><strong>{money(project.latestSimulation.internalFinance.totalCostCop)}</strong><span>Utilidad bruta</span><strong>{money(project.latestSimulation.internalFinance.grossProfitCop)}</strong><span>Margen bruto</span><strong>{project.latestSimulation.internalFinance.grossMarginPct ? project.latestSimulation.internalFinance.grossMarginPct + "%" : "—"}</strong></div></div>}
        </div>}
      </article>)}
      {!filtered.length && <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{projects.length ? "No hay proyectos que coincidan con la búsqueda." : "Todavía no hay proyectos registrados."}</p>}
    </section>
  </main>;
}

function money(value: string | null) {
  return value === null ? "—" : "COP " + Number(value).toLocaleString("es-CO");
}
