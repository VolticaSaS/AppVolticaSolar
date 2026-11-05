-- Prisma-generated v1 -> v2 migration, adjusted to preserve v1 data.
-- This migration is prepared for review and has not been run against any database.
BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "internal";

-- Keep v1 financial history in the restricted schema instead of dropping the table.
ALTER TABLE "public"."financial_analyses" SET SCHEMA "internal";
ALTER TABLE "internal"."financial_analyses" RENAME TO "legacy_financial_analyses_v1";
ALTER TABLE "internal"."legacy_financial_analyses_v1" RENAME CONSTRAINT "financial_analyses_pkey" TO "legacy_financial_analyses_v1_pkey";

-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "failed_login_attempts" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "system_type" VARCHAR(20);

-- AlterTable
ALTER TABLE "energy_consumption" ADD COLUMN     "load_profile" JSONB,
ADD COLUMN     "peak_demand_kw" DECIMAL(14,3);

-- Convert nameplate power from W to kW without losing the catalog record.
-- The old v1 check includes unit_cost_cop, so replace it before migrating that value.
ALTER TABLE "public"."equipment_catalog" DROP CONSTRAINT "equipment_catalog_positive_specs_ck";
ALTER TABLE "public"."equipment_catalog" RENAME COLUMN "nominal_power_w" TO "nominal_power_kw";
ALTER TABLE "public"."equipment_catalog" ALTER COLUMN "nominal_power_kw" TYPE DECIMAL(13,6)
  USING ("nominal_power_kw" / 1000.0)::DECIMAL(13,6);

-- AlterTable
ALTER TABLE "solar_resource_inputs" ADD COLUMN     "period_end" DATE,
ADD COLUMN     "period_start" DATE;

-- Convert load power from W to kW without dropping load records.
ALTER TABLE "public"."project_loads" RENAME COLUMN "rated_power_w" TO "rated_power_kw";
ALTER TABLE "public"."project_loads" ALTER COLUMN "rated_power_kw" TYPE DECIMAL(14,6)
  USING ("rated_power_kw" / 1000.0)::DECIMAL(14,6);

-- Convert backup load power from W to kW without dropping simulation data.
ALTER TABLE "public"."simulations" RENAME COLUMN "backup_load_w" TO "backup_load_kw";
ALTER TABLE "public"."simulations" ALTER COLUMN "backup_load_kw" TYPE DECIMAL(14,6)
  USING ("backup_load_kw" / 1000.0)::DECIMAL(14,6);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_memberships" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_role" VARCHAR(20) NOT NULL,
    "assigned_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "project_price_estimates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "simulation_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "estimated_total_cop" DECIMAL(18,2) NOT NULL,
    "includes_vat" BOOLEAN NOT NULL DEFAULT false,
    "estimated_vat_cop" DECIMAL(18,2),
    "estimate_status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "price_method_version" VARCHAR(40) NOT NULL,
    "valid_until" DATE,
    "public_notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_price_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal"."equipment_costs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "unit_purchase_cost_cop" DECIMAL(18,2) NOT NULL,
    "supplier_name" VARCHAR(160),
    "effective_from" DATE NOT NULL DEFAULT CURRENT_DATE,
    "effective_to" DATE,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_costs_pkey" PRIMARY KEY ("id")
);

-- Preserve v1 purchase costs in the restricted schema before removing the public column.
INSERT INTO "internal"."equipment_costs"
  ("equipment_id", "unit_purchase_cost_cop", "effective_from", "created_at")
SELECT "id", "unit_cost_cop"::DECIMAL(18,2), "created_at"::DATE, "created_at"
FROM "public"."equipment_catalog"
WHERE "unit_cost_cop" IS NOT NULL;
ALTER TABLE "public"."equipment_catalog" DROP COLUMN "unit_cost_cop";

-- CreateTable
CREATE TABLE "internal"."financial_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "simulation_id" UUID NOT NULL,
    "price_estimate_id" UUID,
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "equipment_cost_cop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "labor_cost_cop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "logistics_cost_cop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "other_direct_cost_cop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "contingency_cost_cop" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_internal_cost_cop" DECIMAL(18,2) NOT NULL,
    "estimated_sale_value_cop" DECIMAL(18,2) NOT NULL,
    "estimated_gross_profit_cop" DECIMAL(18,2) GENERATED ALWAYS AS ("estimated_sale_value_cop" - "total_internal_cost_cop") STORED,
    "estimated_gross_margin_pct" DECIMAL(9,4) GENERATED ALWAYS AS (
      CASE WHEN "estimated_sale_value_cop" > 0 THEN
        ROUND(100 * ("estimated_sale_value_cop" - "total_internal_cost_cop") / "estimated_sale_value_cop", 4)
      ELSE NULL END
    ) STORED,
    "estimated_annual_savings_cop" DECIMAL(18,2),
    "annual_opex_cop" DECIMAL(18,2),
    "simple_payback_years" DECIMAL(10,3),
    "confidential_assumptions" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "ix_auth_sessions_user_expiry" ON "auth_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "ix_project_memberships_user_role" ON "project_memberships"("user_id", "access_role");

-- CreateIndex
CREATE INDEX "ix_price_estimates_simulation" ON "project_price_estimates"("simulation_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "project_price_estimates_simulation_id_version_key" ON "project_price_estimates"("simulation_id", "version");

-- CreateIndex
CREATE INDEX "ix_equipment_costs_equipment" ON "internal"."equipment_costs"("equipment_id", "effective_from" DESC);

-- CreateIndex
CREATE INDEX "ix_internal_financial_analyses_simulation" ON "internal"."financial_analyses"("simulation_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_price_estimates" ADD CONSTRAINT "project_price_estimates_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_price_estimates" ADD CONSTRAINT "project_price_estimates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal"."equipment_costs" ADD CONSTRAINT "equipment_costs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal"."equipment_costs" ADD CONSTRAINT "equipment_costs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal"."financial_analyses" ADD CONSTRAINT "financial_analyses_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal"."financial_analyses" ADD CONSTRAINT "financial_analyses_price_estimate_id_fkey" FOREIGN KEY ("price_estimate_id") REFERENCES "project_price_estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal"."financial_analyses" ADD CONSTRAINT "financial_analyses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The renamed legacy table keeps its existing v1 foreign key to public.simulations.

-- Checks from the v2 reference schema and application-specific access model.
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_failed_login_attempts_ck" CHECK ("failed_login_attempts" >= 0);
ALTER TABLE "projects" ADD CONSTRAINT "projects_system_type_ck" CHECK ("system_type" IS NULL OR "system_type" IN ('on_grid', 'hybrid', 'off_grid'));
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_access_role_ck" CHECK ("access_role" IN ('operator', 'engineer'));
ALTER TABLE "energy_consumption" ADD CONSTRAINT "energy_consumption_peak_demand_ck" CHECK ("peak_demand_kw" IS NULL OR "peak_demand_kw" >= 0);
ALTER TABLE "equipment_catalog" ADD CONSTRAINT "equipment_catalog_nominal_power_kw_ck" CHECK ("nominal_power_kw" IS NULL OR "nominal_power_kw" > 0);
ALTER TABLE "equipment_catalog" ADD CONSTRAINT "equipment_catalog_technical_specs_ck" CHECK (
  ("capacity_kwh" IS NULL OR "capacity_kwh" > 0) AND
  ("usable_dod_fraction" IS NULL OR "usable_dod_fraction" > 0 AND "usable_dod_fraction" <= 1) AND
  ("efficiency_fraction" IS NULL OR "efficiency_fraction" > 0 AND "efficiency_fraction" <= 1) AND
  ("area_m2" IS NULL OR "area_m2" > 0)
);
ALTER TABLE "solar_resource_inputs" ADD CONSTRAINT "solar_resource_period_ck" CHECK ("period_start" IS NULL OR "period_end" IS NULL OR "period_end" >= "period_start");
ALTER TABLE "project_loads" ADD CONSTRAINT "project_loads_power_kw_ck" CHECK ("rated_power_kw" > 0);
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_backup_load_kw_ck" CHECK ("backup_load_kw" IS NULL OR "backup_load_kw" >= 0);
ALTER TABLE "project_price_estimates" ADD CONSTRAINT "project_price_estimates_version_ck" CHECK ("version" > 0);
ALTER TABLE "project_price_estimates" ADD CONSTRAINT "project_price_estimates_currency_ck" CHECK ("currency" = 'COP');
ALTER TABLE "project_price_estimates" ADD CONSTRAINT "project_price_estimates_total_ck" CHECK ("estimated_total_cop" >= 0);
ALTER TABLE "project_price_estimates" ADD CONSTRAINT "project_price_estimates_vat_ck" CHECK ("estimated_vat_cop" IS NULL OR "estimated_vat_cop" >= 0);
ALTER TABLE "project_price_estimates" ADD CONSTRAINT "project_price_estimates_status_ck" CHECK ("estimate_status" IN ('draft', 'reviewed', 'shared', 'expired'));
ALTER TABLE "internal"."equipment_costs" ADD CONSTRAINT "equipment_costs_value_ck" CHECK ("unit_purchase_cost_cop" >= 0);
ALTER TABLE "internal"."equipment_costs" ADD CONSTRAINT "equipment_costs_dates_ck" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");
ALTER TABLE "internal"."financial_analyses" ADD CONSTRAINT "internal_financial_analyses_values_ck" CHECK (
  "equipment_cost_cop" >= 0 AND "labor_cost_cop" >= 0 AND "logistics_cost_cop" >= 0 AND
  "other_direct_cost_cop" >= 0 AND "contingency_cost_cop" >= 0 AND
  "total_internal_cost_cop" = "equipment_cost_cop" + "labor_cost_cop" + "logistics_cost_cop" +
    "other_direct_cost_cop" + "contingency_cost_cop" AND "estimated_sale_value_cop" >= 0 AND
  ("annual_opex_cop" IS NULL OR "annual_opex_cop" >= 0) AND
  ("simple_payback_years" IS NULL OR "simple_payback_years" >= 0)
);

COMMIT;
