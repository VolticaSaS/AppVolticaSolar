"use client";

import { useEffect, useState, type FormEvent } from "react";

type Role = "admin" | "operator" | "engineer" | "reviewer";
type User = { id: string; fullName: string; email: string; role: Role; isActive: boolean; createdAt: string; lastLoginAt: string | null };
const roleLabels: Record<Role, string> = { admin: "Administrador", operator: "Operativo", engineer: "Ingeniero", reviewer: "Revisor técnico" };

export function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function fetchUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar la lista de usuarios.");
    return (await response.json() as { users: User[] }).users;
  }
  async function load() { try { setUsers(await fetchUsers()); } catch { setError("No se pudo cargar la lista de usuarios."); } }
  useEffect(() => { void fetchUsers().then(setUsers).catch(() => setError("No se pudo cargar la lista de usuarios.")); }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: form.get("fullName"), email: form.get("email"), role: form.get("role"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo crear el usuario.");
      event.currentTarget.reset(); setMessage("Usuario creado. Deberá cambiar la contraseña al iniciar sesión."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario."); }
    finally { setBusy(false); }
  }
  async function update(user: User, change: { role?: Role; isActive?: boolean }) {
    setError(""); setMessage("");
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(change) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "No se pudo actualizar el usuario."); return; }
    setMessage("Permisos actualizados."); await load();
  }
  return <div className="mx-auto max-w-6xl px-6 py-10">
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-widest text-[#005000]">Administración</p><h1 className="mt-2 text-3xl font-semibold">Usuarios y perfiles</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Asigna solo los permisos necesarios. Las contraseñas iniciales no se guardan en texto abierto y cada usuario deberá cambiarlas al ingresar.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Administrador", "Gestiona usuarios, catálogos, precios, costos y auditoría."],
        ["Operativo", "Crea el proyecto, registra cliente y consumo, prepara versiones y consulta solo el precio total autorizado."],
        ["Ingeniero", "Ajusta el dimensionamiento en proyectos asignados y revisa supuestos técnicos; no ve costos ni márgenes."],
        ["Revisor técnico", "Revisa de forma independiente, aprueba la versión final o la devuelve con observaciones; no ve costos ni márgenes."],
      ].map(([title, detail]) => <div key={title} className="rounded-xl border border-green-100 bg-green-50 p-4"><strong className="text-sm text-[#005000]">{title}</strong><p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p></div>)}</div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={create} className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Crear usuario</h2>
        <label className="mt-5 block text-sm font-medium">Nombre<input name="fullName" required minLength={2} maxLength={160} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="mt-4 block text-sm font-medium">Correo<input name="email" type="email" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <label className="mt-4 block text-sm font-medium">Perfil<select name="role" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="mt-4 block text-sm font-medium">Contraseña temporal<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-slate-500">Mínimo 12 caracteres, con letras, números y al menos un símbolo. Entrégala por un canal seguro.</span></label>
        <button disabled={busy} className="mt-5 w-full rounded-lg bg-[#005000] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creando…" : "Crear usuario"}</button>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Cuentas del equipo</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-3">Persona</th><th>Perfil</th><th>Estado</th><th>Acceso</th></tr></thead><tbody>
          {users.map((user) => <tr key={user.id} className="border-b last:border-0"><td className="py-4 pr-3"><strong className="block">{user.fullName}</strong><span className="text-xs text-slate-500">{user.email}</span></td><td><select aria-label={`Perfil de ${user.fullName}`} value={user.role} disabled={user.id === currentUserId} onChange={(event) => void update(user, { role: event.target.value as Role })} className="rounded border border-slate-300 bg-white px-2 py-1.5 disabled:opacity-50">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td>{user.isActive ? "Activo" : "Inactivo"}</td><td><button disabled={user.id === currentUserId} onClick={() => void update(user, { isActive: !user.isActive })} className="text-xs font-semibold text-[#005000] underline disabled:text-slate-400">{user.isActive ? "Desactivar" : "Activar"}</button></td></tr>)}
          {!users.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">Cargando usuarios…</td></tr>}
        </tbody></table></div>
      </section>
    </div>
    {message && <p role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-900">{message}</p>}
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </div>;
}
