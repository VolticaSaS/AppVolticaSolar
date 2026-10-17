import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const user = await requirePageRole(["admin", "operator", "engineer", "reviewer"]);
  if (user.role === "admin") redirect("/admin");
  if (user.role === "reviewer") redirect("/reviewer");
  if (user.role === "operator" || user.role === "engineer") redirect("/");
  const copy = { title: "Panel de trabajo", detail: "Selecciona una tarea para continuar." };
  return <main className="mx-auto max-w-6xl px-6 py-16">
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#005000]">Panel de trabajo · {user.role}</p>
    <h1 className="mt-3 text-4xl font-semibold text-slate-900">Hola, {user.fullName}</h1>
    <section className="mt-10 rounded-3xl bg-[#f3f8f3] p-8">
      <h2 className="text-2xl font-semibold text-[#005000]">{copy.title}</h2>
      <p className="mt-3 max-w-2xl text-slate-700">{copy.detail}</p>
      {user.mustChangePassword && <p className="mt-5 rounded-xl bg-white p-4 text-sm text-amber-900">Debes actualizar tu contraseña antes de continuar con tus tareas.</p>}
      <Link href="/" className="mt-6 inline-flex rounded-xl border border-[#005000] px-5 py-3 font-medium text-[#005000]">Volver al inicio</Link>
    </section>
  </main>;
}
