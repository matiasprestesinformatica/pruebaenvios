
ALTER TABLE "public"."envios"
ADD COLUMN "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL,
ADD COLUMN "precio_servicio_final" NUMERIC(10, 2) NULL;

COMMENT ON COLUMN "public"."envios"."tipo_servicio_id" IS 'FK to the selected tipo_servicio for this shipment, if any.';
COMMENT ON COLUMN "public"."envios"."precio_servicio_final" IS 'Final service price for this shipment, can be manual or from a selected tipo_servicio.';
