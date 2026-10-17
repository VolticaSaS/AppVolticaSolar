export type PreviousSimulation = { version: number; status: string } | null;

/** Each technical submission is an immutable snapshot; only reviewed versions can be followed by another. */
export function nextSimulationVersion(previous: PreviousSimulation): number | null {
  if (previous?.status === "needs_review") return null;
  return (previous?.version ?? 0) + 1;
}

export function isFinalSimulation(status: string): boolean {
  return status === "approved";
}
