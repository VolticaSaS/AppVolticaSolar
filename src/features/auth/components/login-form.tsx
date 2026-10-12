"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible iniciar sesión.");
      router.push("/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "No fue posible iniciar sesión."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-8 space-y-5">
    <label className="block text-sm font-medium text-slate-700">Correo electrónico
      <input name="email" type="email" autoComplete="username" required maxLength={255} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#005000]" />
    </label>
    <label className="block text-sm font-medium text-slate-700">Contraseña
      <input name="password" type="password" autoComplete="current-password" required maxLength={128} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#005000]" />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-[#005000] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Validando…" : "Entrar"}</button>
  </form>;
}
