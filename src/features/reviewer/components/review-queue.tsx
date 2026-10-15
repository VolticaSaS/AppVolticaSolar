"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string; title: string | null; version: number; systemType: string; panelCount: number | null;
  pvKwp: string | null; generationKwhMonth: string | null; warnings: unknown; createdAt: string;
  createdBy: string; project: { id: string; name: string; city: string | null; department: string | null };
};

export function ReviewQueue() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Review | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function fetchReviews() {
    const response = await fetch("/api/reviewer/reviews", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar la bandeja asignada.");
    return (await response.json() as { reviews: Review[] }).reviews;
  }
  async function load() { try { setReviews(await fetchReviews()); } catch { setError("No se pudo cargar la bandeja asignada."); } }
  useEffect(() => { void fetchReviews().then(setReviews).catch(() => setError("No se pudo cargar la bandeja asignada.")); }, []);
  async function decide(decision: "approved" | "rejected") {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/reviewer/reviews/${selected.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "No se pudo guardar la revisión.");
      setSelected(null); setNotes(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la revisión."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[.8fr_1.2fr]">
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#005000]">Ingeniería · control de calidad</p>
      <h1 className="mt-2 text-3xl font-semibold">Revisión técnica</h1>
      <p className="mt-2 text-sm text-slate-600">Aprueba o devuelve los cálculos asignados. No se muestran datos de costos.</p>
      <h2 className="mt-7 text-sm font-semibold">Pendientes ({reviews.length})</h2>
      <div className="mt-3 space-y-2">
        {reviews.map((review) => <button key={review.id} onClick={() => { setSelected(review); setError(""); }} className={`w-full rounded-xl border p-4 text-left ${selected?.id === review.id ? "border-[#005000] bg-green-50" : "border-slate-200 hover:border-green-700"}`}>
          <span className="block font-semibold">{review.project.name}</span>
          <span className="mt-1 block text-xs text-slate-500">{review.title || `Simulación v${review.version}`} · {review.systemType} · {review.createdBy}</span>
        </button>)}
        {!reviews.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No hay cálculos pendientes asignados.</p>}
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      {selected ? <>
        <p className="text-xs font-bold uppercase tracking-widest text-[#005000]">{selected.project.city || selected.project.department || "Proyecto"}</p>
        <h2 className="mt-2 text-2xl font-semibold">{selected.project.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{selected.title || `Versión ${selected.version}`} · Preparó {selected.createdBy}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3">
          <Metric label="Modalidad" value={selected.systemType} />
          <Metric label="Paneles" value={selected.panelCount?.toString() ?? "—"} />
          <Metric label="Potencia FV" value={selected.pvKwp ? `${selected.pvKwp} kWp` : "—"} />
          <Metric label="Generación mensual" value={selected.generationKwhMonth ? `${selected.generationKwhMonth} kWh` : "—"} />
        </dl>
        <label className="mt-6 block text-sm font-medium">Observaciones técnicas
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="Registra el fundamento de tu decisión" />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => void decide("approved")} className="rounded-lg bg-[#005000] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Aprobar cálculo</button>
          <button disabled={busy} onClick={() => void decide("rejected")} className="rounded-lg border border-red-300 px-5 py-3 text-sm font-semibold text-red-800 disabled:opacity-50">Devolver con observaciones</button>
        </div>
      </> : <div className="grid min-h-64 place-items-center text-center text-sm text-slate-500">Selecciona un cálculo pendiente para revisar.</div>}
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>;
}
