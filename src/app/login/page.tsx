import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center px-6 py-16">
      <section className="mx-auto w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-950/5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#005000]">Voltica Solar</p>
        <h1 className="text-3xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">Acceso seguro para operación, ingeniería, revisión técnica y administración.</p>
        <LoginForm />
      </section>
    </main>
  );
}
