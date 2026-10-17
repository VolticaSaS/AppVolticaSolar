"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible actualizar la contraseña.");
      router.push("/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible actualizar la contraseña."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-8 space-y-5">
    <label className="block text-sm font-medium text-slate-700">Contraseña actual<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /><span className="mt-1 block text-xs font-normal text-slate-500">Mínimo 12 caracteres, con letras, números y al menos un símbolo.</span></label>
    <label className="block text-sm font-medium text-slate-700">Nueva contraseña<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-[#005000] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Actualizando…" : "Actualizar contraseña"}</button>
  </form>;
}
