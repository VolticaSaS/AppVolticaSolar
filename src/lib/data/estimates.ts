import "server-only";
import { getPrisma } from "@/lib/prisma";
import { toPublicEstimateDto, type PublicEstimateSource } from "@/lib/data/public-estimate-dto";
import type { PublicEstimateDto } from "@/lib/data/public-estimate-dto";

export type { PublicEstimateDto } from "@/lib/data/public-estimate-dto";

/** Explicit whitelist: never return a Prisma object or select internal finance fields. */
export async function findLatestPublicEstimate(projectId: string): Promise<PublicEstimateDto | null> {
  const estimate = await getPrisma().projectPriceEstimate.findFirst({
    where: {
      simulation: { projectId },
      estimateStatus: { in: ["reviewed", "shared", "expired"] },
    },
    orderBy: [{ createdAt: "desc" }, { version: "desc" }],
    select: {
      id: true,
      version: true,
      currency: true,
      estimatedTotalCop: true,
      includesVat: true,
      estimatedVatCop: true,
      estimateStatus: true,
      validUntil: true,
      publicNotes: true,
    },
  });
  return estimate ? toPublicEstimateDto(estimate as PublicEstimateSource) : null;
}
