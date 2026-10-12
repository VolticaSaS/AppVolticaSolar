import "server-only";
import { redirect } from "next/navigation";
import { AuthorizationError, type AppRole, assertPermission } from "@/lib/rbac/policy";
import { getCurrentUser, type AuthenticatedUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "AuthenticationError";
  }
}

export class ResourceNotFoundError extends Error {
  readonly status = 404;
  constructor() {
    super("Not found");
    this.name = "ResourceNotFoundError";
  }
}

export class PasswordChangeRequiredError extends Error {
  readonly status = 403;
  constructor() { super("Password change required"); this.name = "PasswordChangeRequiredError"; }
}

export async function requireApiUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

export async function requireApiRole(roles: readonly AppRole[]): Promise<AuthenticatedUser> {
  const user = await requireApiUser();
  if (user.mustChangePassword) throw new PasswordChangeRequiredError();
  if (!roles.includes(user.role)) throw new AuthorizationError();
  return user;
}

export async function requireApiPermission(permission: Parameters<typeof assertPermission>[1]): Promise<AuthenticatedUser> {
  const user = await requireApiUser();
  if (user.mustChangePassword) throw new PasswordChangeRequiredError();
  assertPermission(user.role, permission);
  return user;
}

export async function requirePageRole(roles: readonly AppRole[], fallback = "/login"): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect(fallback);
  if (user.mustChangePassword) redirect("/change-password");
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

export async function requireProjectAccess(user: AuthenticatedUser, projectId: string): Promise<void> {
  if (user.role === "admin") return;
  const project = await getPrisma().project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: user.id },
        { memberships: { some: { userId: user.id, accessRole: user.role } } },
      ],
    },
    select: { id: true },
  });
  if (!project) throw new ResourceNotFoundError();
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new AuthorizationError();
  try {
    if (new URL(origin).host !== new URL(request.url).host) throw new AuthorizationError();
  } catch {
    throw new AuthorizationError();
  }
}
