-- Este archivo podría ser obsoleto si la funcionalidad de /solicitar-envios
-- ahora escribe directamente en la tabla "public.envios".
-- Si la tabla "envios_individuales" ya no se usa, considera eliminar este archivo
-- y la tabla de tu base de datos.

/*
CREATE TABLE IF NOT EXISTS "public"."tipos_paquete" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_paquete" IS 'Defines different types of packages.';
ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for TiposPaquete (envios_individuales)" ON "public"."tipos_paquete" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin all for TiposPaquete (envios_individuales)" ON "public"."tipos_paquete" FOR ALL TO authenticated USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS "public"."tipos_servicio" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "precio_base" NUMERIC(10, 2) NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_servicio" IS 'Defines different types of services and their base prices.';
ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for TiposServicio (envios_individuales)" ON "public"."tipos_servicio" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow admin all for TiposServicio (envios_individuales)" ON "public"."tipos_servicio" FOR ALL TO authenticated USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS "public"."envios_individuales" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cliente_id" UUID NULL REFERENCES "public"."clientes"("id") ON DELETE SET NULL,
    "nombre_cliente" TEXT NOT NULL,
    "email_cliente" TEXT NULL,
    "telefono_cliente" TEXT NULL,
    "direccion_retiro" TEXT NOT NULL,
    "latitud_retiro" NUMERIC NULL,
    "longitud_retiro" NUMERIC NULL,
    "direccion_entrega" TEXT NOT NULL,
    "latitud_entrega" NUMERIC NULL,
    "longitud_entrega" NUMERIC NULL,
    "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id") ON DELETE SET NULL,
    "descripcion_paquete" TEXT NULL,
    "peso_paquete" NUMERIC NULL,
    "dimensiones_paquete" TEXT NULL,
    "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL,
    "precio_manual_servicio" NUMERIC(10,2) NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_solicitud" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "notas_cliente" TEXT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."envios_individuales" IS 'Stores shipment requests made through the public form. CONSIDER IF THIS TABLE IS STILL NEEDED.';
ALTER TABLE "public"."envios_individuales" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for EnviosIndividuales" ON "public"."envios_individuales" FOR INSERT TO "anon", "authenticated" WITH CHECK (true);
CREATE POLICY "Allow admin read access for EnviosIndividuales" ON "public"."envios_individuales" FOR SELECT TO "authenticated" USING (true); -- Adjust role for admin access
CREATE POLICY "Allow admin update/delete for EnviosIndividuales" ON "public"."envios_individuales" FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- Adjust role for admin access
*/

-- Comentando todo el contenido ya que la acción ahora escribe en la tabla "envios".
-- Si decides eliminar la tabla "envios_individuales" de tu base de datos,
-- también deberías eliminar este archivo de migración y sus referencias en los tipos.
SELECT 'Contenido de 04_create_envios_individuales.sql comentado porque la funcionalidad ahora usa la tabla principal envios.';
