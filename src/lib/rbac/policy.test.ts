import { describe, expect, it } from "vitest";
import { assertPermission, AuthorizationError, canAccessProject, hasPermission } from "@/lib/rbac/policy";
import { toPublicEstimateDto } from "@/lib/data/public-estimate-dto";

describe("autorización por rol", () => {
  it("permite finanzas y exportación interna solo a ADMIN", () => {
    expect(hasPermission("admin", "finance:read")).toBe(true);
    expect(() => assertPermission("operator", "finance:read")).toThrow(AuthorizationError);
    expect(() => assertPermission("engineer", "finance:read")).toThrow(AuthorizationError);
    expect(() => assertPermission("reviewer", "finance:read")).toThrow(AuthorizationError);
    expect(() => assertPermission("operator", "export:internal")).toThrow(AuthorizationError);
    expect(() => assertPermission("engineer", "export:internal")).toThrow(AuthorizationError);
  });

  it("solo revisor técnico aprueba simulaciones y operativo no administra usuarios", () => {
    expect(hasPermission("reviewer", "simulation:review")).toBe(true);
    expect(hasPermission("engineer", "simulation:review")).toBe(false);
    expect(hasPermission("reviewer", "simulation:write")).toBe(false);
    expect(hasPermission("operator", "simulation:review")).toBe(false);
    expect(() => assertPermission("operator", "user:manage")).toThrow(AuthorizationError);
  });

  it("rechaza proyectos sin asignación", () => {
    const project = { ownerId: "owner", memberships: [{ userId: "member", accessRole: "operator" }] };
    expect(canAccessProject("operator", "stranger", project)).toBe(false);
    expect(canAccessProject("operator", "member", project)).toBe(true);
    expect(canAccessProject("engineer", "member", project)).toBe(false);
    expect(canAccessProject("reviewer", "member", { ...project, memberships: [{ userId: "member", accessRole: "reviewer" }] })).toBe(true);
    expect(canAccessProject("admin", "stranger", project)).toBe(true);
  });

  it("DTO operativo contiene exactamente campos comerciales autorizados", () => {
    const result = toPublicEstimateDto({
      id: "estimate-1", version: 3, currency: "COP ", estimatedTotalCop: { toFixed: () => "1000.00" },
      includesVat: true, estimatedVatCop: { toFixed: () => "190.00" }, estimateStatus: "shared",
      validUntil: new Date("2027-01-31T00:00:00Z"), publicNotes: "Vigencia comercial",
    });
    expect(Object.keys(result).sort()).toEqual([
      "currency", "estimate_status", "estimated_total_cop", "estimated_vat_cop", "id", "version",
      "includes_vat", "public_notes", "valid_until",
    ].sort());
    expect(JSON.stringify(result)).not.toMatch(/cost|margin|supplier|profit|labor|contingency/i);
    expect(result).toMatchObject({ currency: "COP", estimated_total_cop: "1000.00", includes_vat: true });
  });
});
