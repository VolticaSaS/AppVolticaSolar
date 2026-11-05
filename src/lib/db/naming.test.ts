import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
const initialMigration = readFileSync(
  resolve(root, "prisma/migrations/20261011090000_v1_baseline/migration.sql"),
  "utf8",
);
const upgrade = readFileSync(
  resolve(root, "prisma/migrations/20261012110000_spanish_physical_identifiers/migration.sql"),
  "utf8",
);

const requiredTables = [
  "tb_usuarios",
  "tb_sesiones",
  "tb_recuperacion_claves",
  "tb_auditoria",
  "tb_clientes",
  "tb_proyectos",
  "tb_consumos_energia",
  "tb_catalogo_equipos",
  "tb_recursos_solares",
  "tb_cargas_proyecto",
  "tb_simulaciones",
  "tb_precios_estimados",
  "tb_costos_equipos",
  "tb_analisis_financieros",
  "tb_configuracion",
];

const isSnakeCase = (value: string) => /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(value);

describe("nomenclatura fisica de PostgreSQL", () => {
  it("mapea las entidades de negocio a tablas tb_ en los esquemas correctos", () => {
    const mappedTables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((match) => match[1]);
    for (const table of requiredTables) expect(mappedTables).toContain(table);
    expect(mappedTables.every((table) => table.startsWith("tb_") && isSnakeCase(table))).toBe(true);
    expect(schema).toContain('@@schema("public")');
    expect(schema).toContain('@@schema("internal")');
  });

  it("mapea todos los campos escalares con nombres fisicos en snake_case sin tildes", () => {
    for (const block of schema.matchAll(/model\s+\w+\s*\{([\s\S]*?)\n\}/g)) {
      for (const line of block[1].split("\n")) {
        const field = line.match(/^\s+\w+\s+(String|Boolean|Int|BigInt|Float|Decimal|DateTime|Json)(\?|\[\])?\b/);
        if (!field) continue;
        const mapped = line.match(/@map\("([^"]+)"\)/);
        expect(mapped, line.trim()).toBeTruthy();
        expect(isSnakeCase(mapped![1]), line.trim()).toBe(true);
      }
    }
    expect(schema).toContain('@map("modelo")');
  });

  it("usa prefijos idx_, uq_ y fk_ en indices, unicos y claves foraneas", () => {
    for (const match of schema.matchAll(/@@index\([^\n]*map:\s*"([^"]+)"/g)) {
      expect(match[1]).toMatch(/^idx_/);
    }
    for (const match of schema.matchAll(/@@unique\([^\n]*map:\s*"([^"]+)"/g)) {
      expect(match[1]).toMatch(/^uq_/);
    }
    for (const match of schema.matchAll(/@unique\(map:\s*"([^"]+)"/g)) {
      expect(match[1]).toMatch(/^uq_/);
    }
    for (const match of schema.matchAll(/@relation\([^\n]*map:\s*"([^"]+)"/g)) {
      expect(match[1]).toMatch(/^fk_/);
    }
  });

  it("genera la baseline con tablas tb_ y mantiene una conversion incremental sin borrar filas", () => {
    const renamedTables = [...upgrade.matchAll(/RENAME TO "(tb_[^"]+)"/g)].map((match) => match[1]);
    for (const table of requiredTables) expect(renamedTables).toContain(table);
    expect(initialMigration).toContain('CREATE TABLE "app_users"');
    expect(upgrade).not.toMatch(/DROP TABLE\b/i);
    expect(upgrade).not.toMatch(/DROP COLUMN\b/i);
    expect(upgrade).toContain('RENAME COLUMN "nominal_power_kw" TO "potencia_nominal_kw"');
    expect(upgrade).toContain('RENAME COLUMN "backup_load_kw" TO "carga_respaldo_kw"');
    expect(upgrade).toContain('RENAME COLUMN "notes" TO "notas"');
    expect(upgrade).toContain('ALTER TABLE "internal"."financial_analyses" RENAME TO "tb_analisis_financieros"');
    expect(upgrade).toContain('ALTER TABLE "internal"."legacy_financial_analyses_v1" RENAME TO "tb_analisis_financieros_legacy_v1"');
    expect(upgrade).toContain('NEW.actualizado_en = now()');
  });
});
