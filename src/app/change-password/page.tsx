import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/dashboard");
  return <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center px-6 py-16"><section className="mx-auto w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-950/5"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#005000]">Voltica Solar</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Actualiza tu contraseña</h1><p className="mt-2 text-sm text-slate-600">Por seguridad, crea una contraseña propia antes de acceder al panel.</p><ChangePasswordForm /></section></main>;
}
