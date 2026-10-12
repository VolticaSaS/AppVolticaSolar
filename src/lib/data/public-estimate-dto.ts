export type PublicEstimateSource = {
  id: string;
  version: number;
  currency: string;
  estimatedTotalCop: { toFixed(digits: number): string };
  includesVat: boolean;
  estimatedVatCop: { toFixed(digits: number): string } | null;
  estimateStatus: string;
  validUntil: Date | null;
  publicNotes: string | null;
};

export type PublicEstimateDto = {
  id: string;
  version: number;
  currency: string;
  estimated_total_cop: string;
  includes_vat: boolean;
  estimated_vat_cop: string | null;
  estimate_status: string;
  valid_until: string | null;
  public_notes: string | null;
};

/** Builds an explicit operator-safe DTO; never spread a database record here. */
export function toPublicEstimateDto(estimate: PublicEstimateSource): PublicEstimateDto {
  return {
    id: estimate.id,
    version: estimate.version,
    currency: estimate.currency.trim(),
    estimated_total_cop: estimate.estimatedTotalCop.toFixed(2),
    includes_vat: estimate.includesVat,
    estimated_vat_cop: estimate.estimatedVatCop?.toFixed(2) ?? null,
    estimate_status: estimate.estimateStatus,
    valid_until: estimate.validUntil?.toISOString().slice(0, 10) ?? null,
    public_notes: estimate.publicNotes,
  };
}
