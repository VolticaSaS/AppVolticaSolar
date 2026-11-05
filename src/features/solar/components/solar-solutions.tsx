import { solarSolutions } from "@/features/solar/data/solutions";

export function SolarSolutions() {
  return (
    <section className="solutions-section" id="soluciones">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Soluciones solares</p>
          <h2>Una solución para cada proyecto.</h2>
        </div>
        <p className="section-intro" id="nosotros">
          Analizamos cómo consumes energía para diseñar un sistema que se adapte a tus objetivos,
          tu espacio y tu forma de vivir.
        </p>
      </div>
      <div className="solution-grid">
        {solarSolutions.map((solution) => (
          <article className="solution-card" key={solution.name}>
            <span className="solution-icon" aria-hidden="true">{solution.icon}</span>
            <h3>{solution.name}</h3>
            <p>{solution.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
