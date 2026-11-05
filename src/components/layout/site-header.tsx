import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/features/auth/components/logout-button";

const roleNames = { admin: "Administrador", operator: "Operativo", engineer: "Ingeniero", reviewer: "Revisor técnico" } as const;

export async function SiteHeader() {
  const user = await getCurrentUser();
  const workHref = user?.role === "admin" ? "/admin" : user?.role === "reviewer" ? "/reviewer" : "/";
  return (
    <header className="app-header">
      <Link className="app-brand" href="/" aria-label="Voltica Solar, dimensionador">
        <span className="logo-window"><Image src="/voltica-logo.png" alt="Voltica" width={124} height={124} priority /></span>
        <span className="brand-divider" />
        <span className="brand-product">Solar <small>DIMENSIONAMIENTO</small></span>
      </Link>
      <div className="header-tools">
        <span className="environment-pill"><span /> {user ? roleNames[user.role] : "Herramienta técnica"}</span>
        {user ? <><Link className="login-link" href={workHref}>Mi espacio</Link><LogoutButton /></> : <Link className="login-link" href="/login">Ingresar <span aria-hidden="true">↗</span></Link>}
      </div>
    </header>
  );
}
