import { describe, expect, it } from "vitest";
import { isFinalSimulation, nextSimulationVersion } from "./lifecycle";

describe("versiones del proyecto", () => {
  it("empieza en versión 1 y permite nueva versión tras devolución o aprobación", () => {
    expect(nextSimulationVersion(null)).toBe(1);
    expect(nextSimulationVersion({ version: 1, status: "rejected" })).toBe(2);
    expect(nextSimulationVersion({ version: 2, status: "approved" })).toBe(3);
  });

  it("impide crear otra versión mientras existe una pendiente de revisión", () => {
    expect(nextSimulationVersion({ version: 4, status: "needs_review" })).toBeNull();
  });

  it("solo marca como final una versión aprobada por el revisor", () => {
    expect(isFinalSimulation("approved")).toBe(true);
    expect(isFinalSimulation("needs_review")).toBe(false);
    expect(isFinalSimulation("rejected")).toBe(false);
  });
});
