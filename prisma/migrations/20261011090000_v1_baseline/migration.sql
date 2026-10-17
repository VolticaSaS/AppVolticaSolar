-- Prisma-generated baseline for voltica_solar_schema_v1.sql.
-- Supplemental checks, expression index, and updated_at triggers are kept in this migration.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "app_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'operator',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "legal_name" VARCHAR(200) NOT NULL,
    "client_type" VARCHAR(30) NOT NULL DEFAULT 'business',
    "tax_id" VARCHAR(40),
    "contact_name" VARCHAR(160),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(40),
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "reference_code" VARCHAR(60),
    "city" VARCHAR(120),
    "department" VARCHAR(120),
    "country" VARCHAR(80) NOT NULL DEFAULT 'Colombia',
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "grid_available" BOOLEAN,
    "status" VARCHAR(25) NOT NULL DEFAULT 'draft',
    "owner_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_consumption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "energy_kwh" DECIMAL(14,3) NOT NULL,
    "total_bill_cop" DECIMAL(16,2),
    "energy_rate_cop_kwh" DECIMAL(14,4),
    "source" VARCHAR(25) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_consumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_catalog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" VARCHAR(20) NOT NULL,
    "manufacturer" VARCHAR(120) NOT NULL,
    "model" VARCHAR(160) NOT NULL,
    "nominal_power_w" DECIMAL(13,3),
    "capacity_kwh" DECIMAL(13,3),
    "usable_dod_fraction" DECIMAL(5,4),
    "efficiency_fraction" DECIMAL(5,4),
    "area_m2" DECIMAL(10,3),
    "unit_cost_cop" DECIMAL(16,2),
    "specs" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solar_resource_inputs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "source_reference" TEXT,
    "retrieved_at" TIMESTAMPTZ(6),
    "peak_sun_hours_day" DECIMAL(6,3),
    "irradiance_kwh_m2_year" DECIMAL(10,3),
    "tilt_degrees" DECIMAL(5,2),
    "azimuth_degrees" DECIMAL(6,2),
    "assumptions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solar_resource_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_loads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "rated_power_w" DECIMAL(14,3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "hours_per_day" DECIMAL(6,2) NOT NULL,
    "critical_for_backup" BOOLEAN NOT NULL DEFAULT false,
    "simultaneity_fraction" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "project_loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "created_by" UUID,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(160),
    "system_type" VARCHAR(20) NOT NULL,
    "battery_enabled" BOOLEAN NOT NULL,
    "panel_id" UUID,
    "inverter_id" UUID,
    "battery_id" UUID,
    "solar_resource_id" UUID,
    "desired_coverage_fraction" DECIMAL(5,4),
    "system_loss_fraction" DECIMAL(5,4),
    "roof_usable_area_m2" DECIMAL(12,3),
    "backup_hours" DECIMAL(9,2),
    "backup_load_w" DECIMAL(14,3),
    "design_inputs" JSONB NOT NULL DEFAULT '{}',
    "calculation_method_version" VARCHAR(40) NOT NULL,
    "result_panel_count" INTEGER,
    "result_pv_kwp" DECIMAL(14,4),
    "result_generation_kwh_month" DECIMAL(14,3),
    "result_generation_kwh_year" DECIMAL(14,3),
    "result_battery_nominal_kwh" DECIMAL(14,3),
    "result_battery_usable_kwh" DECIMAL(14,3),
    "result_backup_hours" DECIMAL(12,3),
    "result_details" JSONB NOT NULL DEFAULT '{}',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(24) NOT NULL DEFAULT 'draft',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "simulation_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "capex_cop" DECIMAL(18,2),
    "estimated_annual_savings_cop" DECIMAL(18,2),
    "annual_opex_cop" DECIMAL(18,2),
    "simple_payback_years" DECIMAL(10,3),
    "assumptions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "setting_key" VARCHAR(120) NOT NULL,
    "setting_value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("setting_key")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(80),
    "entity_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "ix_password_reset_user" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_reference_code_key" ON "projects"("reference_code");

-- CreateIndex
CREATE INDEX "ix_projects_client" ON "projects"("client_id");

-- CreateIndex
CREATE INDEX "ix_projects_owner" ON "projects"("owner_id");

-- CreateIndex
CREATE INDEX "ix_consumption_project" ON "energy_consumption"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "energy_consumption_project_id_period_month_key" ON "energy_consumption"("project_id", "period_month");

-- CreateIndex
CREATE INDEX "ix_equipment_category" ON "equipment_catalog"("category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_catalog_category_manufacturer_model_key" ON "equipment_catalog"("category", "manufacturer", "model");

-- CreateIndex
CREATE INDEX "ix_simulations_project" ON "simulations"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_simulations_status" ON "simulations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "simulations_project_id_version_key" ON "simulations"("project_id", "version");

-- CreateIndex
CREATE INDEX "ix_audit_events_time" ON "audit_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_audit_events_actor" ON "audit_events"("actor_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_consumption" ADD CONSTRAINT "energy_consumption_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solar_resource_inputs" ADD CONSTRAINT "solar_resource_inputs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_loads" ADD CONSTRAINT "project_loads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "equipment_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_inverter_id_fkey" FOREIGN KEY ("inverter_id") REFERENCES "equipment_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_battery_id_fkey" FOREIGN KEY ("battery_id") REFERENCES "equipment_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_solar_resource_id_fkey" FOREIGN KEY ("solar_resource_id") REFERENCES "solar_resource_inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_analyses" ADD CONSTRAINT "financial_analyses_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constraints present in the v1 reference SQL and not representable in Prisma Schema Language.
CREATE UNIQUE INDEX "uq_app_users_email_lower" ON "app_users" (lower("email"));
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_role_ck" CHECK ("role" IN ('admin', 'operator', 'engineer'));
ALTER TABLE "clients" ADD CONSTRAINT "clients_client_type_ck" CHECK ("client_type" IN ('business', 'residential', 'property_management', 'other'));
ALTER TABLE "projects" ADD CONSTRAINT "projects_latitude_ck" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "projects" ADD CONSTRAINT "projects_longitude_ck" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_ck" CHECK ("status" IN ('draft', 'in_review', 'approved', 'quoted', 'archived'));
ALTER TABLE "energy_consumption" ADD CONSTRAINT "energy_consumption_values_ck" CHECK ("energy_kwh" >= 0 AND ("total_bill_cop" IS NULL OR "total_bill_cop" >= 0) AND ("energy_rate_cop_kwh" IS NULL OR "energy_rate_cop_kwh" > 0));
ALTER TABLE "energy_consumption" ADD CONSTRAINT "energy_consumption_source_ck" CHECK ("source" IN ('manual', 'invoice', 'meter', 'import'));
ALTER TABLE "equipment_catalog" ADD CONSTRAINT "equipment_catalog_category_ck" CHECK ("category" IN ('panel', 'inverter', 'battery'));
ALTER TABLE "equipment_catalog" ADD CONSTRAINT "equipment_catalog_positive_specs_ck" CHECK (("nominal_power_w" IS NULL OR "nominal_power_w" > 0) AND ("capacity_kwh" IS NULL OR "capacity_kwh" > 0) AND ("usable_dod_fraction" IS NULL OR "usable_dod_fraction" > 0 AND "usable_dod_fraction" <= 1) AND ("efficiency_fraction" IS NULL OR "efficiency_fraction" > 0 AND "efficiency_fraction" <= 1) AND ("area_m2" IS NULL OR "area_m2" > 0) AND ("unit_cost_cop" IS NULL OR "unit_cost_cop" >= 0));
ALTER TABLE "solar_resource_inputs" ADD CONSTRAINT "solar_resource_source_ck" CHECK ("source" IN ('manual', 'PVGIS', 'NASA_POWER', 'other'));
ALTER TABLE "solar_resource_inputs" ADD CONSTRAINT "solar_resource_values_ck" CHECK (("peak_sun_hours_day" IS NULL OR "peak_sun_hours_day" > 0 AND "peak_sun_hours_day" <= 24) AND ("irradiance_kwh_m2_year" IS NULL OR "irradiance_kwh_m2_year" > 0) AND ("tilt_degrees" IS NULL OR "tilt_degrees" BETWEEN 0 AND 90) AND ("azimuth_degrees" IS NULL OR "azimuth_degrees" BETWEEN -180 AND 360));
ALTER TABLE "project_loads" ADD CONSTRAINT "project_loads_values_ck" CHECK ("rated_power_w" > 0 AND "quantity" > 0 AND "hours_per_day" BETWEEN 0 AND 24 AND "simultaneity_fraction" > 0 AND "simultaneity_fraction" <= 1);
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_type_battery_ck" CHECK (("system_type" = 'on_grid' AND "battery_enabled" = false) OR ("system_type" IN ('hybrid', 'off_grid') AND "battery_enabled" = true));
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_value_ranges_ck" CHECK (("version" > 0) AND ("desired_coverage_fraction" IS NULL OR "desired_coverage_fraction" > 0 AND "desired_coverage_fraction" <= 1) AND ("system_loss_fraction" IS NULL OR "system_loss_fraction" >= 0 AND "system_loss_fraction" < 1) AND ("roof_usable_area_m2" IS NULL OR "roof_usable_area_m2" >= 0) AND ("backup_hours" IS NULL OR "backup_hours" >= 0) AND ("backup_load_w" IS NULL OR "backup_load_w" >= 0) AND ("result_panel_count" IS NULL OR "result_panel_count" >= 0) AND ("result_pv_kwp" IS NULL OR "result_pv_kwp" >= 0) AND ("result_generation_kwh_month" IS NULL OR "result_generation_kwh_month" >= 0) AND ("result_generation_kwh_year" IS NULL OR "result_generation_kwh_year" >= 0) AND ("result_battery_nominal_kwh" IS NULL OR "result_battery_nominal_kwh" >= 0) AND ("result_battery_usable_kwh" IS NULL OR "result_battery_usable_kwh" >= 0) AND ("result_backup_hours" IS NULL OR "result_backup_hours" >= 0));
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_status_ck" CHECK ("status" IN ('draft', 'calculated', 'needs_review', 'approved', 'rejected'));
ALTER TABLE "financial_analyses" ADD CONSTRAINT "financial_analyses_values_ck" CHECK (("capex_cop" IS NULL OR "capex_cop" >= 0) AND ("annual_opex_cop" IS NULL OR "annual_opex_cop" >= 0) AND ("simple_payback_years" IS NULL OR "simple_payback_years" >= 0));

CREATE OR REPLACE FUNCTION app_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['app_users','clients','projects','equipment_catalog'] LOOP
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION app_set_updated_at()', t);
  END LOOP;
END $$;
