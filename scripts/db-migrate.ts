import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { Client } from "pg";

loadEnv({ path: [".env.local", ".env"] });

const EXPECTED_DATABASE = "db_voltica_solar";
const EXPECTED_ENVIRONMENT = "Development";
const EXPECTED_SERVICE = "AppVolticaSolar";
const MIGRATIONS = [
  "20261011090000_v1_baseline",
  "20261011100000_v2_auth_and_finance",
  "20261012110000_spanish_physical_identifiers",
  "20261014120000_add_reviewer_role",
  "20261015100000_client_legal_identity",
];
const REQUIRED_TABLES = [
  ["public", "tb_usuarios"],
  ["public", "tb_recuperacion_claves"],
  ["public", "tb_sesiones"],
  ["public", "tb_clientes"],
  ["public", "tb_proyectos"],
  ["public", "tb_pertenencias_proyecto"],
  ["public", "tb_consumos_energia"],
  ["public", "tb_catalogo_equipos"],
  ["public", "tb_recursos_solares"],
  ["public", "tb_cargas_proyecto"],
  ["public", "tb_simulaciones"],
  ["public", "tb_precios_estimados"],
  ["public", "tb_configuracion"],
  ["public", "tb_auditoria"],
  ["internal", "tb_costos_equipos"],
  ["internal", "tb_analisis_financieros"],
  ["internal", "tb_analisis_financieros_legacy_v1"],
] as const;
const V1_TABLES = [
  "app_users",
  "password_reset_tokens",
  "clients",
  "projects",
  "energy_consumption",
  "equipment_catalog",
  "solar_resource_inputs",
  "project_loads",
  "simulations",
  "financial_analyses",
  "app_settings",
  "audit_events",
];

type MigrationRow = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

function fail(message: string): never {
  console.error(`[db-migrate] ERROR: ${message}`);
  process.exit(1);
}

function assertRailwayTarget(): void {
  if (process.env.RAILWAY_ENVIRONMENT_NAME !== EXPECTED_ENVIRONMENT) {
    fail(`RAILWAY_ENVIRONMENT_NAME debe ser exactamente "${EXPECTED_ENVIRONMENT}". No se ejecuta fuera de ese entorno.`);
  }
  if (process.env.RAILWAY_SERVICE_NAME !== EXPECTED_SERVICE) {
    fail(`RAILWAY_SERVICE_NAME debe ser exactamente "${EXPECTED_SERVICE}". Ejecuta este comando desde el servicio web correcto.`);
  }
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL no está configurada en el entorno de Railway.");
  }
}

async function connectToTarget(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    application_name: "voltica-prisma-migration-preflight",
  });
  try {
    await client.connect();
    const result = await client.query<{ database_name: string }>("SELECT current_database() AS database_name");
    const database = result.rows[0]?.database_name;
    if (database !== EXPECTED_DATABASE) {
      await client.end();
      fail(`SELECT current_database() devolvió "${database ?? "(sin resultado)"}"; se exige "${EXPECTED_DATABASE}". No se ejecutó Prisma.`);
    }
    console.log(`[db-migrate] Destino comprobado: ${database}; entorno ${EXPECTED_ENVIRONMENT}; servicio ${EXPECTED_SERVICE}.`);
    return client;
  } catch (error) {
    if (client) await client.end().catch(() => undefined);
    if (error instanceof Error && error.message.startsWith("[db-migrate] ERROR:")) throw error;
    fail("No se pudo validar la conexión PostgreSQL. Se ocultó el detalle para no exponer la URL ni credenciales.");
  }
}

async function rejectUntrackedExistingSchema(client: Client): Promise<void> {
  const history = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists",
  );
  if (history.rows[0]?.exists) return;

  const existing = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       AND (table_name = ANY($1::text[]) OR starts_with(table_name, 'tb_'))`,
    [V1_TABLES],
  );
  if (existing.rowCount) {
    const names = existing.rows.map((row) => row.table_name).join(", ");
    fail(`Hay tablas de Voltica sin historial Prisma (${names}). No se aplicará la baseline sobre estructuras existentes. Inspecciona y reconcilia la historia primero.`);
  }
}

function runPrisma(command: "status" | "deploy"): { code: number; output: string } {
  const cli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
  const result = spawnSync(process.execPath, [cli, "migrate", command], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const url = process.env.DATABASE_URL ?? "";
  const safeOutput = output
    .replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/gi, "[DATABASE_URL ocultada]")
    .split(url)
    .join("[DATABASE_URL ocultada]");
  if (safeOutput.trim()) console.log(safeOutput.trimEnd());
  if (result.error) fail(`No fue posible iniciar prisma migrate ${command}.`);
  return { code: result.status ?? 1, output: safeOutput };
}

function isOnlyPendingMigrations(output: string): boolean {
  const pending = /following migrations? have not yet been applied/i.test(output);
  const conflict = /migration history.*different|not found in (?:the )?local migrations directory|failed migration|database schema is not empty/i.test(output);
  return pending && !conflict;
}

async function verifyCompleted(client: Client): Promise<void> {
  const db = await client.query<{ database_name: string }>("SELECT current_database() AS database_name");
  if (db.rows[0]?.database_name !== EXPECTED_DATABASE) fail("El destino PostgreSQL cambió durante la ejecución.");

  const tables = await client.query<{ table_schema: string; table_name: string }>(
    `SELECT table_schema, table_name FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema IN ('public', 'internal')`,
  );
  const found = new Set(tables.rows.map((row) => `${row.table_schema}.${row.table_name}`));
  const missing = REQUIRED_TABLES.filter(([schema, table]) => !found.has(`${schema}.${table}`));
  if (missing.length) fail(`Migración finalizada, pero faltan tablas: ${missing.map(([schema, table]) => `${schema}.${table}`).join(", ")}. Revisa el historial antes de continuar.`);

  const history = await client.query<MigrationRow>(
    `SELECT migration_name, finished_at, rolled_back_at
     FROM public."_prisma_migrations" ORDER BY started_at`,
  );
  const byName = new Map(history.rows.map((row) => [row.migration_name, row]));
  const invalid = MIGRATIONS.filter((name) => {
    const row = byName.get(name);
    return !row || !row.finished_at || row.rolled_back_at;
  });
  if (invalid.length) fail(`El historial Prisma no confirma migraciones finalizadas: ${invalid.join(", ")}.`);

  console.log(`[db-migrate] Verificación correcta: ${REQUIRED_TABLES.length} tablas esperadas presentes y las ${MIGRATIONS.length} migraciones registradas como finalizadas.`);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command !== "status" && command !== "deploy") fail("Uso: npm run db:status | npm run db:deploy");
  assertRailwayTarget();
  const client = await connectToTarget();
  try {
    await rejectUntrackedExistingSchema(client);
    console.log(`[db-migrate] Ejecutando prisma migrate ${command}...`);
    const result = runPrisma(command);
    if (command === "status") {
      if (result.code === 0) {
        console.log("[db-migrate] Estado Prisma consultado; no se modificó la base de datos.");
        return;
      }
      if (isOnlyPendingMigrations(result.output)) {
        console.log("[db-migrate] Prisma reporta migraciones pendientes. No se modificó la base de datos.");
        process.exitCode = 2;
        return;
      }
      fail("Prisma detectó un error o una historia divergente; no se aplicó ninguna migración.");
    }

    if (result.code !== 0) fail("prisma migrate deploy falló; revisa el log de Railway y el historial antes de reintentar.");
    await verifyCompleted(client);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error && error.message.startsWith("[db-migrate] ERROR:")) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.error("[db-migrate] ERROR: fallo inesperado durante la operación; revisa el log sanitizado de Railway.");
  process.exitCode = 1;
});
