
-- Make sure tipos_paquete and tipos_servicio tables exist before running this.
-- Run scripts from supabase/02_schema_tables.sql if they don't.

-- Alter envios table
ALTER TABLE "public"."envios"
DROP COLUMN IF EXISTS "package_size", -- Remove old enum-like text column
ADD COLUMN IF NOT EXISTS "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."envios"."tipo_paquete_id" IS 'Foreign key to the selected tipo_paquete.';

-- Columns tipo_servicio_id and precio_servicio_final should already exist from a previous migration.
-- If not, uncomment and adapt:
-- ALTER TABLE "public"."envios"
-- ADD COLUMN IF NOT EXISTS "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL,
-- ADD COLUMN IF NOT EXISTS "precio_servicio_final" NUMERIC(10, 2) NULL;

-- COMMENT ON COLUMN "public"."envios"."tipo_servicio_id" IS 'FK to tipos_servicio if price is based on a predefined service.';
-- COMMENT ON COLUMN "public"."envios"."precio_servicio_final" IS 'Final price for the service, either from tipo_servicio or manually entered.';

-- It might be useful to add an index on tipo_paquete_id and tipo_servicio_id
CREATE INDEX IF NOT EXISTS idx_envios_tipo_paquete_id ON "public"."envios" ("tipo_paquete_id");
CREATE INDEX IF NOT EXISTS idx_envios_tipo_servicio_id ON "public"."envios" ("tipo_servicio_id");

-- Update RLS policies if necessary, though existing permissive ones should cover new columns.
-- Example:
-- ALTER POLICY "Allow all for authenticated users (envios)" ON "public"."envios"
--   USING (true)
--   WITH CHECK (true);
