import { SolarSolutions } from "@/features/solar/components/solar-solutions";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Energía solar, diseñada para ti</p>
          <h1>El sol trabaja.<br /><span>Tu energía avanza.</span></h1>
          <p className="hero-description">
            Soluciones fotovoltaicas inteligentes para hogares y empresas que quieren producir,
            ahorrar y avanzar hacia un futuro más sostenible.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#soluciones">Explorar soluciones <span aria-hidden="true">↗</span></a>
            <a className="button button-secondary" href="mailto:hola@voltica.co">Hablemos de tu proyecto</a>
          </div>
          <div className="trust-row">
            <div className="trust-mark" aria-hidden="true">V</div>
            <p><strong>Energía con propósito.</strong><br />Tecnología pensada para durar.</p>
          </div>
        </div>

        <div className="hero-art" aria-label="Ilustración de paneles solares bajo un sol verde">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="sun"><span /></div>
          <div className="mountain mountain-back" />
          <div className="mountain mountain-front" />
          <div className="solar-array" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
          </div>
          <div className="art-label"><span className="pulse-dot" /> Energía que se renueva</div>
          <div className="art-spark spark-one">✳</div>
          <div className="art-spark spark-two">✦</div>
        </div>
      </section>

      <section className="impact-strip" aria-label="Compromiso Voltica">
        <p>Diseñamos un mejor mañana</p><span /><p>con energía limpia</p><span /><p>para cada forma de vivir.</p>
      </section>

      <SolarSolutions />
    </main>
  );
}
