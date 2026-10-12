export type AppRole = "admin" | "operator" | "engineer";
export type Permission =
  | "project:read"
  | "project:write"
  | "simulation:write"
  | "simulation:review"
  | "estimate:read"
  | "finance:read"
  | "finance:write"
  | "user:manage"
  | "catalog:write"
  | "audit:read"
  | "export:internal";

const permissionMap: Record<AppRole, ReadonlySet<Permission>> = {
  admin: new Set([
    "project:read", "project:write", "simulation:write", "simulation:review", "estimate:read",
    "finance:read", "finance:write", "user:manage", "catalog:write", "audit:read", "export:internal",
  ]),
  operator: new Set(["project:read", "project:write", "simulation:write", "estimate:read"]),
  engineer: new Set(["project:read", "simulation:review", "estimate:read"]),
};

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden");
    this.name = "AuthorizationError";
  }
}

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return permissionMap[role].has(permission);
}

export function assertPermission(role: AppRole, permission: Permission): void {
  if (!hasPermission(role, permission)) throw new AuthorizationError();
}

export type ProjectAccess = {
  ownerId: string | null;
  memberships: ReadonlyArray<{ userId: string; accessRole: string }>;
};

export function canAccessProject(
  role: AppRole,
  userId: string,
  project: ProjectAccess,
): boolean {
  if (role === "admin") return true;
  if (project.ownerId === userId) return true;
  return project.memberships.some((membership) =>
    membership.userId === userId && membership.accessRole === role,
  );
}
