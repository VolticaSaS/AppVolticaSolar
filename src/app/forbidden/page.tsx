import Link from "next/link";

export default function ForbiddenPage() {
  return <main className="mx-auto max-w-2xl px-6 py-20 text-center">
    <p className="text-sm font-bold uppercase tracking-widest text-[#005000]">Voltica Solar</p>
    <h1 className="mt-3 text-3xl font-semibold">No tienes acceso a esta pantalla</h1>
    <p className="mt-3 text-slate-600">Si necesitas este permiso, solicítalo a administración.</p>
    <Link href="/" className="mt-6 inline-flex rounded-lg bg-[#005000] px-5 py-3 font-semibold text-white">Ir a mi espacio</Link>
  </main>;
}
