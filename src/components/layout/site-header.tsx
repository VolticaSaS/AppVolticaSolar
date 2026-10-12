import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Voltica Solar, inicio">
        <span className="brand-icon" aria-hidden="true">✳</span>
        <span className="brand-label">Voltica <span>Solar</span></span>
      </Link>
      <nav className="main-nav" aria-label="Navegación principal">
        <a href="#soluciones">Soluciones</a>
        <a href="#nosotros">Nosotros</a>
        <a className="header-cta" href="mailto:hola@voltica.co">Conversemos <span aria-hidden="true">↗</span></a>
      </nav>
      <details className="mobile-menu">
        <summary aria-label="Abrir menú">☰</summary>
        <nav className="mobile-menu-panel" aria-label="Navegación móvil">
          <a href="#soluciones">Soluciones</a>
          <a href="#nosotros">Nosotros</a>
          <a href="mailto:hola@voltica.co">Conversemos ↗</a>
        </nav>
      </details>
    </header>
  );
}
