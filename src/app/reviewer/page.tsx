import { requirePageRole } from "@/lib/auth/guards";
import { ReviewQueue } from "@/features/reviewer/components/review-queue";

export default async function ReviewerPage() {
  await requirePageRole(["reviewer"]);
  return <ReviewQueue />;
}
