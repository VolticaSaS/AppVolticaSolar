-- Adopt Spanish physical PostgreSQL identifiers while preserving the v1/v2 migration history.
-- This migration only renames tables, columns, constraints, and indexes; it does not discard rows.
BEGIN;

ALTER TABLE "public"."app_users" RENAME TO "tb_usuarios";
ALTER TABLE "public"."password_reset_tokens" RENAME TO "tb_recuperacion_claves";
ALTER TABLE "public"."auth_sessions" RENAME TO "tb_sesiones";
ALTER TABLE "public"."clients" RENAME TO "tb_clientes";
ALTER TABLE "public"."projects" RENAME TO "tb_proyectos";
ALTER TABLE "public"."project_memberships" RENAME TO "tb_pertenencias_proyecto";
ALTER TABLE "public"."energy_consumption" RENAME TO "tb_consumos_energia";
ALTER TABLE "public"."equipment_catalog" RENAME TO "tb_catalogo_equipos";
ALTER TABLE "public"."solar_resource_inputs" RENAME TO "tb_recursos_solares";
ALTER TABLE "public"."project_loads" RENAME TO "tb_cargas_proyecto";
ALTER TABLE "public"."simulations" RENAME TO "tb_simulaciones";
ALTER TABLE "public"."project_price_estimates" RENAME TO "tb_precios_estimados";
ALTER TABLE "internal"."equipment_costs" RENAME TO "tb_costos_equipos";
ALTER TABLE "internal"."financial_analyses" RENAME TO "tb_analisis_financieros";
ALTER TABLE "internal"."legacy_financial_analyses_v1" RENAME TO "tb_analisis_financieros_legacy_v1";
ALTER TABLE "public"."app_settings" RENAME TO "tb_configuracion";
ALTER TABLE "public"."audit_events" RENAME TO "tb_auditoria";

ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "full_name" TO "nombre_completo";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "email" TO "correo_electronico";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "password_hash" TO "hash_clave";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "role" TO "rol";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "is_active" TO "activo";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "must_change_password" TO "debe_cambiar_clave";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "failed_login_attempts" TO "intentos_acceso_fallidos";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "locked_until" TO "bloqueado_hasta";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "last_login_at" TO "ultimo_acceso";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_usuarios" RENAME COLUMN "updated_at" TO "actualizado_en";
ALTER TABLE "public"."tb_recuperacion_claves" RENAME COLUMN "user_id" TO "usuario_id";
ALTER TABLE "public"."tb_recuperacion_claves" RENAME COLUMN "token_hash" TO "hash_token";
ALTER TABLE "public"."tb_recuperacion_claves" RENAME COLUMN "expires_at" TO "expira_en";
ALTER TABLE "public"."tb_recuperacion_claves" RENAME COLUMN "used_at" TO "usado_en";
ALTER TABLE "public"."tb_recuperacion_claves" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_sesiones" RENAME COLUMN "user_id" TO "usuario_id";
ALTER TABLE "public"."tb_sesiones" RENAME COLUMN "token_hash" TO "hash_token";
ALTER TABLE "public"."tb_sesiones" RENAME COLUMN "expires_at" TO "expira_en";
ALTER TABLE "public"."tb_sesiones" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_sesiones" RENAME COLUMN "last_seen_at" TO "ultimo_uso_en";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "legal_name" TO "nombre_legal";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "client_type" TO "tipo_cliente";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "tax_id" TO "identificacion_fiscal";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "contact_name" TO "nombre_contacto";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "contact_email" TO "correo_contacto";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "contact_phone" TO "telefono_contacto";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "created_by" TO "creado_por";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_clientes" RENAME COLUMN "updated_at" TO "actualizado_en";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "client_id" TO "cliente_id";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "reference_code" TO "codigo_referencia";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "city" TO "ciudad";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "department" TO "departamento";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "country" TO "pais";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "address" TO "direccion";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "latitude" TO "latitud";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "longitude" TO "longitud";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "grid_available" TO "red_disponible";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "system_type" TO "modalidad";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "status" TO "estado";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "owner_id" TO "responsable_id";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_proyectos" RENAME COLUMN "updated_at" TO "actualizado_en";
ALTER TABLE "public"."tb_pertenencias_proyecto" RENAME COLUMN "project_id" TO "proyecto_id";
ALTER TABLE "public"."tb_pertenencias_proyecto" RENAME COLUMN "user_id" TO "usuario_id";
ALTER TABLE "public"."tb_pertenencias_proyecto" RENAME COLUMN "access_role" TO "rol_acceso";
ALTER TABLE "public"."tb_pertenencias_proyecto" RENAME COLUMN "assigned_by" TO "asignado_por";
ALTER TABLE "public"."tb_pertenencias_proyecto" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "project_id" TO "proyecto_id";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "period_month" TO "periodo_mes";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "energy_kwh" TO "energia_kwh";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "total_bill_cop" TO "valor_factura_cop";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "energy_rate_cop_kwh" TO "tarifa_cop_kwh";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "peak_demand_kw" TO "demanda_maxima_kw";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "load_profile" TO "perfil_carga";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "source" TO "fuente";
ALTER TABLE "public"."tb_consumos_energia" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "category" TO "categoria";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "manufacturer" TO "fabricante";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "model" TO "modelo";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "nominal_power_kw" TO "potencia_nominal_kw";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "capacity_kwh" TO "capacidad_kwh";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "usable_dod_fraction" TO "fraccion_descarga_util";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "efficiency_fraction" TO "fraccion_eficiencia";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "specs" TO "especificaciones";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "is_active" TO "activo";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "is_demo" TO "es_demostracion";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_catalogo_equipos" RENAME COLUMN "updated_at" TO "actualizado_en";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "project_id" TO "proyecto_id";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "source" TO "fuente";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "source_reference" TO "referencia_fuente";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "period_start" TO "periodo_inicio";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "period_end" TO "periodo_fin";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "retrieved_at" TO "consultado_en";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "peak_sun_hours_day" TO "horas_sol_pico_dia";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "irradiance_kwh_m2_year" TO "irradiacion_kwh_m2_anio";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "tilt_degrees" TO "inclinacion_grados";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "azimuth_degrees" TO "azimut_grados";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "assumptions" TO "supuestos";
ALTER TABLE "public"."tb_recursos_solares" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "project_id" TO "proyecto_id";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "rated_power_kw" TO "potencia_nominal_kw";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "quantity" TO "cantidad";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "hours_per_day" TO "horas_por_dia";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "critical_for_backup" TO "critica_para_respaldo";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "simultaneity_fraction" TO "fraccion_simultaneidad";
ALTER TABLE "public"."tb_cargas_proyecto" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "project_id" TO "proyecto_id";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "created_by" TO "creado_por";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "title" TO "titulo";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "system_type" TO "modalidad";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "battery_enabled" TO "bateria_habilitada";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "panel_id" TO "equipo_panel_id";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "inverter_id" TO "equipo_inversor_id";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "battery_id" TO "equipo_bateria_id";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "solar_resource_id" TO "recurso_solar_id";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "desired_coverage_fraction" TO "fraccion_cobertura_objetivo";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "system_loss_fraction" TO "fraccion_perdidas_sistema";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "roof_usable_area_m2" TO "area_util_techo_m2";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "backup_hours" TO "horas_respaldo";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "backup_load_kw" TO "carga_respaldo_kw";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "design_inputs" TO "entradas_diseno";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "calculation_method_version" TO "version_metodologia_calculo";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_panel_count" TO "resultado_cantidad_paneles";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_pv_kwp" TO "resultado_potencia_fv_kwp";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_generation_kwh_month" TO "resultado_generacion_kwh_mes";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_generation_kwh_year" TO "resultado_generacion_kwh_anio";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_battery_nominal_kwh" TO "resultado_bateria_nominal_kwh";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_battery_usable_kwh" TO "resultado_bateria_util_kwh";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_backup_hours" TO "resultado_horas_respaldo";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "result_details" TO "detalle_resultados";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "warnings" TO "advertencias";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "status" TO "estado";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "reviewed_by" TO "revisado_por";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "reviewed_at" TO "revisado_en";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "review_notes" TO "notas_revision";
ALTER TABLE "public"."tb_simulaciones" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "simulation_id" TO "simulacion_id";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "currency" TO "moneda";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "estimated_total_cop" TO "total_estimado_cop";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "includes_vat" TO "incluye_iva";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "estimated_vat_cop" TO "iva_estimado_cop";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "estimate_status" TO "estado_estimacion";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "price_method_version" TO "version_metodologia_precio";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "valid_until" TO "vigente_hasta";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "public_notes" TO "notas_comerciales";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "created_by" TO "creado_por";
ALTER TABLE "public"."tb_precios_estimados" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "internal"."tb_costos_equipos" RENAME COLUMN "equipment_id" TO "equipo_id";
ALTER TABLE "internal"."tb_costos_equipos" RENAME COLUMN "unit_purchase_cost_cop" TO "costo_adquisicion_unitario_cop";
ALTER TABLE "internal"."tb_costos_equipos" RENAME COLUMN "supplier_name" TO "proveedor";
ALTER TABLE "internal"."tb_costos_equipos" RENAME COLUMN "effective_from" TO "vigente_desde";
ALTER TABLE "internal"."tb_costos_equipos" RENAME COLUMN "effective_to" TO "vigente_hasta";
ALTER TABLE "internal"."tb_costos_equipos" RENAME COLUMN "recorded_by" TO "registrado_por";
ALTER TABLE "internal"."tb_costos_equipos" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "simulation_id" TO "simulacion_id";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "price_estimate_id" TO "precio_estimado_id";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "currency" TO "moneda";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "equipment_cost_cop" TO "costo_equipos_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "labor_cost_cop" TO "costo_mano_obra_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "logistics_cost_cop" TO "costo_logistica_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "other_direct_cost_cop" TO "otros_costos_directos_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "contingency_cost_cop" TO "costo_contingencia_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "total_internal_cost_cop" TO "costo_interno_total_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "estimated_sale_value_cop" TO "valor_venta_estimado_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "estimated_gross_profit_cop" TO "utilidad_bruta_estimada_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "estimated_gross_margin_pct" TO "margen_bruto_estimado_pct";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "estimated_annual_savings_cop" TO "ahorro_anual_estimado_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "annual_opex_cop" TO "opex_anual_cop";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "simple_payback_years" TO "periodo_retorno_simple_anios";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "confidential_assumptions" TO "supuestos_confidenciales";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "created_by" TO "creado_por";
ALTER TABLE "internal"."tb_analisis_financieros" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "simulation_id" TO "simulacion_id";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "currency" TO "moneda";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "capex_cop" TO "inversion_inicial_cop";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "estimated_annual_savings_cop" TO "ahorro_anual_estimado_cop";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "annual_opex_cop" TO "opex_anual_cop";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "simple_payback_years" TO "periodo_retorno_simple_anios";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "assumptions" TO "supuestos";
ALTER TABLE "internal"."tb_analisis_financieros_legacy_v1" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "public"."tb_configuracion" RENAME COLUMN "setting_key" TO "clave_configuracion";
ALTER TABLE "public"."tb_configuracion" RENAME COLUMN "setting_value" TO "valor_configuracion";
ALTER TABLE "public"."tb_configuracion" RENAME COLUMN "description" TO "descripcion";
ALTER TABLE "public"."tb_configuracion" RENAME COLUMN "updated_by" TO "actualizado_por";
ALTER TABLE "public"."tb_configuracion" RENAME COLUMN "updated_at" TO "actualizado_en";
ALTER TABLE "public"."tb_auditoria" RENAME COLUMN "actor_id" TO "usuario_id";
ALTER TABLE "public"."tb_auditoria" RENAME COLUMN "action" TO "accion";
ALTER TABLE "public"."tb_auditoria" RENAME COLUMN "entity_type" TO "tipo_entidad";
ALTER TABLE "public"."tb_auditoria" RENAME COLUMN "entity_id" TO "entidad_id";
ALTER TABLE "public"."tb_auditoria" RENAME COLUMN "metadata" TO "metadatos";
ALTER TABLE "public"."tb_auditoria" RENAME COLUMN "created_at" TO "creado_en";

-- Normalize constraint names. Renaming a unique or foreign-key constraint also renames its backing index.
DO $$ DECLARE old_name text; new_name text; schema_name text; table_name text; BEGIN
  FOR old_name, new_name, schema_name, table_name IN
    SELECT * FROM (VALUES
      ('app_users_role_ck','ck_tb_usuarios_rol','public','tb_usuarios'),
      ('app_users_failed_login_attempts_ck','ck_tb_usuarios_intentos_acceso','public','tb_usuarios'),
      ('clients_client_type_ck','ck_tb_clientes_tipo','public','tb_clientes'),
      ('projects_latitude_ck','ck_tb_proyectos_latitud','public','tb_proyectos'),
      ('projects_longitude_ck','ck_tb_proyectos_longitud','public','tb_proyectos'),
      ('projects_status_ck','ck_tb_proyectos_estado','public','tb_proyectos'),
      ('projects_system_type_ck','ck_tb_proyectos_modalidad','public','tb_proyectos'),
      ('energy_consumption_values_ck','ck_tb_consumos_energia_valores','public','tb_consumos_energia'),
      ('energy_consumption_source_ck','ck_tb_consumos_energia_fuente','public','tb_consumos_energia'),
      ('energy_consumption_peak_demand_ck','ck_tb_consumos_energia_demanda','public','tb_consumos_energia'),
      ('equipment_catalog_category_ck','ck_tb_catalogo_equipos_categoria','public','tb_catalogo_equipos'),
      ('equipment_catalog_positive_specs_ck','ck_tb_catalogo_equipos_especificaciones','public','tb_catalogo_equipos'),
      ('equipment_catalog_nominal_power_kw_ck','ck_tb_catalogo_equipos_potencia_kw','public','tb_catalogo_equipos'),
      ('equipment_catalog_technical_specs_ck','ck_tb_catalogo_equipos_tecnica','public','tb_catalogo_equipos'),
      ('solar_resource_source_ck','ck_tb_recursos_solares_fuente','public','tb_recursos_solares'),
      ('solar_resource_values_ck','ck_tb_recursos_solares_valores','public','tb_recursos_solares'),
      ('solar_resource_period_ck','ck_tb_recursos_solares_periodo','public','tb_recursos_solares'),
      ('project_loads_values_ck','ck_tb_cargas_proyecto_valores','public','tb_cargas_proyecto'),
      ('project_loads_power_kw_ck','ck_tb_cargas_proyecto_potencia_kw','public','tb_cargas_proyecto'),
      ('simulations_type_battery_ck','ck_tb_simulaciones_modalidad_bateria','public','tb_simulaciones'),
      ('simulations_value_ranges_ck','ck_tb_simulaciones_rangos','public','tb_simulaciones'),
      ('simulations_status_ck','ck_tb_simulaciones_estado','public','tb_simulaciones'),
      ('simulations_backup_load_kw_ck','ck_tb_simulaciones_carga_respaldo_kw','public','tb_simulaciones'),
      ('project_memberships_access_role_ck','ck_tb_pertenencias_proyecto_rol','public','tb_pertenencias_proyecto'),
      ('project_price_estimates_version_ck','ck_tb_precios_estimados_version','public','tb_precios_estimados'),
      ('project_price_estimates_currency_ck','ck_tb_precios_estimados_moneda','public','tb_precios_estimados'),
      ('project_price_estimates_total_ck','ck_tb_precios_estimados_total','public','tb_precios_estimados'),
      ('project_price_estimates_vat_ck','ck_tb_precios_estimados_iva','public','tb_precios_estimados'),
      ('project_price_estimates_status_ck','ck_tb_precios_estimados_estado','public','tb_precios_estimados'),
      ('equipment_costs_value_ck','ck_tb_costos_equipos_valor','internal','tb_costos_equipos'),
      ('equipment_costs_dates_ck','ck_tb_costos_equipos_vigencia','internal','tb_costos_equipos'),
      ('internal_financial_analyses_values_ck','ck_tb_analisis_financieros_valores','internal','tb_analisis_financieros'),
      ('financial_analyses_values_ck','ck_tb_analisis_financieros_valores','internal','tb_analisis_financieros'),
      ('financial_analyses_values_ck','ck_tb_analisis_financieros_legacy_valores','internal','tb_analisis_financieros_legacy_v1'),
      ('projects_reference_code_key','uq_tb_proyectos_codigo_referencia','public','tb_proyectos'),
      ('energy_consumption_project_id_period_month_key','uq_tb_consumos_energia_proyecto_periodo','public','tb_consumos_energia'),
      ('equipment_catalog_category_manufacturer_model_key','uq_tb_catalogo_equipos_categoria_fabricante_modelo','public','tb_catalogo_equipos'),
      ('password_reset_tokens_token_hash_key','uq_tb_recuperacion_claves_hash_token','public','tb_recuperacion_claves'),
      ('auth_sessions_token_hash_key','uq_tb_sesiones_hash_token','public','tb_sesiones'),
      ('simulations_project_id_version_key','uq_tb_simulaciones_proyecto_version','public','tb_simulaciones'),
      ('project_price_estimates_simulation_id_version_key','uq_tb_precios_estimados_simulacion_version','public','tb_precios_estimados'),
      ('password_reset_tokens_user_id_fkey','fk_tb_recuperacion_claves_usuario','public','tb_recuperacion_claves'),
      ('auth_sessions_user_id_fkey','fk_tb_sesiones_usuario','public','tb_sesiones'),
      ('clients_created_by_fkey','fk_tb_clientes_creado_por','public','tb_clientes'),
      ('projects_client_id_fkey','fk_tb_proyectos_cliente','public','tb_proyectos'),
      ('projects_owner_id_fkey','fk_tb_proyectos_responsable','public','tb_proyectos'),
      ('project_memberships_project_id_fkey','fk_tb_pertenencias_proyecto_proyecto','public','tb_pertenencias_proyecto'),
      ('project_memberships_user_id_fkey','fk_tb_pertenencias_proyecto_usuario','public','tb_pertenencias_proyecto'),
      ('project_memberships_assigned_by_fkey','fk_tb_pertenencias_proyecto_asignado_por','public','tb_pertenencias_proyecto'),
      ('energy_consumption_project_id_fkey','fk_tb_consumos_energia_proyecto','public','tb_consumos_energia'),
      ('solar_resource_inputs_project_id_fkey','fk_tb_recursos_solares_proyecto','public','tb_recursos_solares'),
      ('project_loads_project_id_fkey','fk_tb_cargas_proyecto_proyecto','public','tb_cargas_proyecto'),
      ('simulations_project_id_fkey','fk_tb_simulaciones_proyecto','public','tb_simulaciones'),
      ('simulations_created_by_fkey','fk_tb_simulaciones_creado_por','public','tb_simulaciones'),
      ('simulations_reviewed_by_fkey','fk_tb_simulaciones_revisado_por','public','tb_simulaciones'),
      ('simulations_panel_id_fkey','fk_tb_simulaciones_equipo_panel','public','tb_simulaciones'),
      ('simulations_inverter_id_fkey','fk_tb_simulaciones_equipo_inversor','public','tb_simulaciones'),
      ('simulations_battery_id_fkey','fk_tb_simulaciones_equipo_bateria','public','tb_simulaciones'),
      ('simulations_solar_resource_id_fkey','fk_tb_simulaciones_recurso_solar','public','tb_simulaciones'),
      ('project_price_estimates_simulation_id_fkey','fk_tb_precios_estimados_simulacion','public','tb_precios_estimados'),
      ('project_price_estimates_created_by_fkey','fk_tb_precios_estimados_creado_por','public','tb_precios_estimados'),
      ('app_settings_updated_by_fkey','fk_tb_configuracion_actualizado_por','public','tb_configuracion'),
      ('audit_events_actor_id_fkey','fk_tb_auditoria_usuario','public','tb_auditoria'),
      ('equipment_costs_equipment_id_fkey','fk_tb_costos_equipos_equipo','internal','tb_costos_equipos'),
      ('equipment_costs_recorded_by_fkey','fk_tb_costos_equipos_registrado_por','internal','tb_costos_equipos'),
      ('financial_analyses_simulation_id_fkey','fk_tb_analisis_financieros_simulacion','internal','tb_analisis_financieros'),
      ('financial_analyses_price_estimate_id_fkey','fk_tb_analisis_financieros_precio_estimado','internal','tb_analisis_financieros'),
      ('financial_analyses_created_by_fkey','fk_tb_analisis_financieros_creado_por','internal','tb_analisis_financieros'),
      ('financial_analyses_simulation_id_fkey','fk_tb_analisis_financieros_legacy_simulacion','internal','tb_analisis_financieros_legacy_v1')
    ) AS names(old_name, new_name, schema_name, table_name)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('%I.%I', schema_name, table_name)) AND conname = old_name)
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass(format('%I.%I', schema_name, table_name)) AND conname = new_name) THEN
      EXECUTE format('ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I', schema_name, table_name, old_name, new_name);
    END IF;
  END LOOP;
END $$;

-- Rename ordinary and expression indexes generated by the previous schema.
DO $$ DECLARE old_name text; new_name text; BEGIN
  FOR old_name, new_name IN
    SELECT * FROM (VALUES
      ('uq_app_users_email_lower','uq_tb_usuarios_correo_electronico_lower'),
      ('ix_audit_events_actor','idx_tb_auditoria_usuario'),
      ('ix_audit_events_time','idx_tb_auditoria_creado'),
      ('ix_consumption_project','idx_tb_consumos_energia_proyecto'),
      ('ix_equipment_category','idx_tb_catalogo_equipos_categoria_activo'),
      ('ix_password_reset_user','idx_tb_recuperacion_claves_usuario'),
      ('ix_projects_client','idx_tb_proyectos_cliente'),
      ('ix_projects_owner','idx_tb_proyectos_responsable'),
      ('ix_simulations_project','idx_tb_simulaciones_proyecto_creado'),
      ('ix_simulations_status','idx_tb_simulaciones_estado'),
      ('ix_auth_sessions_user_expiry','idx_tb_sesiones_usuario_expira'),
      ('ix_project_memberships_user_role','idx_tb_pertenencias_proyecto_usuario_rol'),
      ('ix_price_estimates_simulation','idx_tb_precios_estimados_simulacion_creado'),
      ('ix_equipment_costs_equipment','idx_tb_costos_equipos_equipo_vigencia'),
      ('ix_internal_financial_analyses_simulation','idx_tb_analisis_financieros_simulacion_creado')
    ) AS names(old_name, new_name)
  LOOP
    IF to_regclass(format('public.%I', old_name)) IS NOT NULL AND to_regclass(format('public.%I', new_name)) IS NULL THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', old_name, new_name);
    ELSIF to_regclass(format('internal.%I', old_name)) IS NOT NULL AND to_regclass(format('internal.%I', new_name)) IS NULL THEN
      EXECUTE format('ALTER INDEX internal.%I RENAME TO %I', old_name, new_name);
    END IF;
  END LOOP;
END $$;

-- Keep existing updated_at triggers usable after physical column renames.
CREATE OR REPLACE FUNCTION app_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.actualizado_en = now(); RETURN NEW; END; $$;

COMMIT;
