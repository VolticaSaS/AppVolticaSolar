"use client";

export function PrintReportButton() {
  return <button type="button" className="report-print-button" onClick={() => window.print()}>Guardar como PDF / Imprimir</button>;
}
