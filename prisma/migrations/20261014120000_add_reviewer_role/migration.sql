-- Add the dedicated technical reviewer profile without changing or deleting data.
ALTER TABLE "public"."tb_usuarios"
  DROP CONSTRAINT "ck_tb_usuarios_rol";
ALTER TABLE "public"."tb_usuarios"
  ADD CONSTRAINT "ck_tb_usuarios_rol"
  CHECK ("rol" IN ('admin', 'operator', 'engineer', 'reviewer'));

ALTER TABLE "public"."tb_pertenencias_proyecto"
  DROP CONSTRAINT "ck_tb_pertenencias_proyecto_rol";
ALTER TABLE "public"."tb_pertenencias_proyecto"
  ADD CONSTRAINT "ck_tb_pertenencias_proyecto_rol"
  CHECK ("rol_acceso" IN ('operator', 'engineer', 'reviewer'));
