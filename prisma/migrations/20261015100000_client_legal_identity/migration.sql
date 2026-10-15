-- Add customer legal identity and contact address without changing existing records.
ALTER TABLE "public"."tb_clientes"
  ADD COLUMN "tipo_persona" VARCHAR(20),
  ADD COLUMN "tipo_identificacion" VARCHAR(20),
  ADD COLUMN "direccion" TEXT;

ALTER TABLE "public"."tb_clientes"
  ADD CONSTRAINT "ck_tb_clientes_tipo_persona"
    CHECK ("tipo_persona" IS NULL OR "tipo_persona" IN ('natural_person', 'legal_entity')),
  ADD CONSTRAINT "ck_tb_clientes_tipo_identificacion"
    CHECK ("tipo_identificacion" IS NULL OR "tipo_identificacion" IN ('cedula', 'nit')),
  ADD CONSTRAINT "ck_tb_clientes_identificacion_coherente"
    CHECK (
      ("tipo_persona" IS NULL AND "tipo_identificacion" IS NULL)
      OR ("tipo_persona" = 'natural_person' AND "tipo_identificacion" = 'cedula')
      OR ("tipo_persona" = 'legal_entity' AND "tipo_identificacion" = 'nit')
    );
