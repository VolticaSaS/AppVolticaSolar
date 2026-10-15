import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="app-header">
      <Link className="app-brand" href="/" aria-label="Voltica Solar, dimensionador">
        <span className="logo-window"><Image src="/voltica-logo.png" alt="Voltica" width={124} height={124} priority /></span>
        <span className="brand-divider" />
        <span className="brand-product">Solar <small>DIMENSIONAMIENTO</small></span>
      </Link>
      <div className="header-tools">
        <span className="environment-pill"><span /> Herramienta técnica</span>
        <Link className="login-link" href="/login">Ingresar <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
