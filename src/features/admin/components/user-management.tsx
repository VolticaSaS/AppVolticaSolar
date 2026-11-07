"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Role = "admin" | "operator" | "reviewer";
type User = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};
type TemporaryCredential = { fullName: string; email: string; password: string };
type UserDraft = { fullName: string; email: string; role: Role };

const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  operator: "Operativo",
  reviewer: "Revisor técnico",
};

export function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [temporaryCredential, setTemporaryCredential] = useState<TemporaryCredential | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft>({ fullName: "", email: "", role: "operator" });

  async function loadUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la lista de usuarios.");
    setUsers((data as { users: User[] }).users);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la lista de usuarios.");
        return data as { users: User[] };
      })
      .then((data) => { if (active) setUsers(data.users); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar la lista de usuarios."); })
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, []);

  function clearFeedback() {
    setError("");
    setMessage("");
    setTemporaryCredential(null);
    setCopied(false);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    clearFeedback();
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName: form.get("fullName"), email: form.get("email"), role: form.get("role") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo crear el usuario.");
      const user = data.user as User;
      setTemporaryCredential({ fullName: user.fullName, email: user.email, password: data.temporaryPassword as string });
      setMessage("Cuenta creada. Copia la contraseña temporal y entrégasela al usuario por un canal seguro.");
      formElement.reset();
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(user: User) {
    clearFeedback();
    setEditingUserId(user.id);
    setDraft({ fullName: user.fullName, email: user.email, role: user.role });
  }

  async function saveUser(user: User) {
    setBusy(true);
    clearFeedback();
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el usuario.");
      setEditingUserId(null);
      setMessage(`Cambios guardados para ${user.email}.`);
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el usuario.");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(user: User, isActive: boolean) {
    setBusy(true);
    clearFeedback();
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el acceso.");
      setMessage(isActive ? "Cuenta reactivada." : "Acceso retirado. El historial se conservó.");
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el acceso.");
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(user: User) {
    const confirmed = window.confirm(
      `¿Retirar el acceso de ${user.fullName}? No podrá iniciar sesión; sus proyectos y registros de auditoría se conservarán.`,
    );
    if (!confirmed) return;
    setBusy(true);
    clearFeedback();
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo retirar el usuario.");
      setMessage(`Se retiró el acceso de ${user.fullName}; sus registros se conservaron.`);
      await loadUsers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo retirar el usuario.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user: User) {
    setBusy(true);
    clearFeedback();
    try {
      const response = await fetch(`/api/admin/users/${user.id}/password`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo restablecer la contraseña.");
      setTemporaryCredential({ fullName: user.fullName, email: user.email, password: data.temporaryPassword as string });
      setMessage("Contraseña temporal generada. Entrégala al usuario por un canal seguro; deberá cambiarla al ingresar.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo restablecer la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  async function copyTemporaryPassword() {
    if (!temporaryCredential) return;
    try {
      await navigator.clipboard.writeText(temporaryCredential.password);
      setCopied(true);
    } catch {
      setError("No se pudo copiar automáticamente. Selecciona la contraseña y cópiala manualmente.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#005000]">Administración</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Usuarios y perfiles</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Crea cuentas, cambia sus datos o permisos y restablece su acceso. Las contraseñas se generan automáticamente y se muestran una sola vez.</p>
        </div>
        <Link href="/admin/projects" className="rounded-lg border border-green-200 px-4 py-2 text-sm font-semibold text-[#005000]">Administrar proyectos →</Link>
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-950">
        <span className="font-semibold">¿Cómo volver aquí?</span>
        <span>Después de iniciar sesión como administrador, abre “Consola de administración” en la barra superior.</span>
        <Link href="/change-password" className="font-semibold underline underline-offset-2">Cambiar mi contraseña</Link>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Administrador", "Gestiona usuarios, catálogos, precios, costos y auditoría."],
          ["Operativo", "Crea proyectos, prepara simulaciones y consulta el precio total autorizado."],
          ["Revisor técnico", "Aprueba una versión final o la devuelve con observaciones; no ve costos ni márgenes."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-green-100 bg-white p-4">
            <strong className="text-sm text-[#005000]">{title}</strong>
            <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form onSubmit={createUser} className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#005000]">Nueva cuenta</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Agregar usuario</h2>
          <p className="mt-2 text-sm leading-5 text-slate-600">La aplicación crea una contraseña temporal y exige cambiarla al primer ingreso.</p>
          <label className="mt-5 block text-sm font-medium text-slate-800">Nombre completo
            <input name="fullName" required minLength={2} maxLength={160} autoComplete="name" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-800">Correo electrónico
            <input name="email" type="email" required maxLength={255} autoComplete="email" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-800">Perfil
            <select name="role" defaultValue="operator" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button disabled={busy} className="mt-6 w-full rounded-lg bg-[#005000] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Procesando…" : "Crear cuenta"}</button>
        </form>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#005000]">Acceso al equipo</p><h2 className="mt-2 text-xl font-semibold text-slate-900">Cuentas registradas</h2></div>
            <span className="text-sm text-slate-500">{users.length} {users.length === 1 ? "cuenta" : "cuentas"}</span>
          </div>
          {loading ? <p className="py-10 text-center text-sm text-slate-500">Cargando usuarios…</p> : users.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Aún no hay cuentas registradas.</p> : (
            <div className="mt-4 space-y-3">
              {users.map((user) => {
                const isEditing = editingUserId === user.id;
                return (
                  <article key={user.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-xs font-semibold text-slate-600">Nombre
                              <input value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} required minLength={2} maxLength={160} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Correo
                              <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} type="email" required maxLength={255} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                            </label>
                            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Perfil
                              <select value={draft.role} disabled={user.id === currentUserId} onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100">
                                {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </label>
                          </div>
                        ) : <><h3 className="truncate font-semibold text-slate-900">{user.fullName}{user.id === currentUserId ? " · Tú" : ""}</h3><p className="mt-1 break-all text-sm text-slate-600">{user.email}</p></>}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`}>{user.isActive ? "Activo" : "Sin acceso"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="text-xs text-slate-600"><span className="font-semibold text-slate-800">{roleLabels[user.role]}</span><span className="mx-2 text-slate-300">·</span>Último acceso: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("es-CO") : "Sin ingresos"}</div>
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? <>
                          <button type="button" disabled={busy} onClick={() => void saveUser(user)} className="rounded-lg bg-[#005000] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Guardar</button>
                          <button type="button" onClick={() => setEditingUserId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancelar</button>
                        </> : <>
                          <button type="button" disabled={busy} onClick={() => beginEdit(user)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Editar</button>
                          <button type="button" disabled={busy || !user.isActive || user.id === currentUserId} onClick={() => void resetPassword(user)} className="rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-[#005000] disabled:opacity-40">Nueva contraseña temporal</button>
                          {user.id !== currentUserId && user.isActive && <button type="button" disabled={busy} onClick={() => void removeUser(user)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Eliminar acceso</button>}
                          {user.id !== currentUserId && !user.isActive && <button type="button" disabled={busy} onClick={() => void setActive(user, true)} className="rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-[#005000] disabled:opacity-50">Reactivar</button>}
                        </>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {temporaryCredential && <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-amber-900">Contraseña temporal · visible ahora</p><h2 className="mt-1 text-lg font-semibold text-amber-950">{temporaryCredential.fullName}</h2><p className="text-sm text-amber-900">{temporaryCredential.email}</p></div>
          <button type="button" onClick={() => { setTemporaryCredential(null); setCopied(false); }} className="text-sm font-semibold text-amber-900 underline">Ocultar</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="select-all rounded-lg border border-amber-200 bg-white px-4 py-3 font-mono text-base tracking-wider text-slate-900">{temporaryCredential.password}</code>
          <button type="button" onClick={() => void copyTemporaryPassword()} className="rounded-lg bg-[#005000] px-4 py-3 text-sm font-semibold text-white">{copied ? "Copiada" : "Copiar contraseña"}</button>
        </div>
        <p className="mt-3 text-xs leading-5 text-amber-900">Compártela directamente con la persona. No vuelvas a cerrar esta ventana hasta copiarla; después, el usuario deberá crear su propia contraseña al iniciar sesión.</p>
      </section>}

      {message && !temporaryCredential && <p role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-900">{message}</p>}
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </main>
  );
}
