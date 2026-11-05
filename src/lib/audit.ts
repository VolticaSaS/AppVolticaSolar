import "server-only";
import { getPrisma } from "@/lib/prisma";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
};

/** Records identifiers and action names only; never pass request bodies or finance values. */
export async function writeAuditEvent(input: AuditInput): Promise<void> {
  await getPrisma().auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action.slice(0, 100),
      entityType: input.entityType?.slice(0, 80),
      entityId: input.entityId ?? null,
      metadata: {},
    },
  });
}
