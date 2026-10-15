import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, requireApiRole } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { apiError, invalidInput } from "@/lib/http/api";
import { writeAuditEvent } from "@/lib/audit";
import { hashPassword } from "@/lib/security/password";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE, PASSWORD_MAX_LENGTH } from "@/lib/security/password-policy";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  role: z.enum(["admin", "operator", "engineer", "reviewer"]),
  password: z.string().min(12).max(PASSWORD_MAX_LENGTH),
});

export async function GET() {
  try {
    await requireApiRole(["admin"]);
    const users = await getPrisma().appUser.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiRole(["admin"]);
    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    if (!isStrongPassword(parsed.data.password)) {
      return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const user = await getPrisma().appUser.create({
      data: {
        fullName: parsed.data.fullName,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        mustChangePassword: true,
      },
      select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
    });
    await writeAuditEvent({ actorId: actor.id, action: "user.create", entityType: "app_user", entityId: user.id });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
