-- Consolidate the old engineer profile into the technical reviewer profile.
-- Preserve existing accounts and project assignments; no rows or tables are deleted.
UPDATE "public"."tb_usuarios"
SET "rol" = 'reviewer', "actualizado_en" = CURRENT_TIMESTAMP
WHERE "rol" = 'engineer';

UPDATE "public"."tb_pertenencias_proyecto"
SET "rol_acceso" = 'reviewer'
WHERE "rol_acceso" = 'engineer';

ALTER TABLE "public"."tb_usuarios"
  DROP CONSTRAINT "ck_tb_usuarios_rol";
ALTER TABLE "public"."tb_usuarios"
  ADD CONSTRAINT "ck_tb_usuarios_rol"
  CHECK ("rol" IN ('admin', 'operator', 'reviewer'));

ALTER TABLE "public"."tb_pertenencias_proyecto"
  DROP CONSTRAINT "ck_tb_pertenencias_proyecto_rol";
ALTER TABLE "public"."tb_pertenencias_proyecto"
  ADD CONSTRAINT "ck_tb_pertenencias_proyecto_rol"
  CHECK ("rol_acceso" IN ('operator', 'reviewer'));
