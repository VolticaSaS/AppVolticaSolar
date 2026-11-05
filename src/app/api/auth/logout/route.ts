import { NextResponse } from "next/server";
import { getCurrentUser, revokeCurrentSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    await revokeCurrentSession();
    if (user) await writeAuditEvent({ actorId: user.id, action: "auth.logout", entityType: "app_user", entityId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
