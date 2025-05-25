-- Crear la nueva tabla envios_individuales
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
    "precio_manual_servicio" NUMERIC(10, 2) NULL, -- Consider renaming to precio_final_servicio if it always stores the final price
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_solicitud" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "notas_cliente" TEXT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE "public"."envios_individuales" IS 'Stores client-initiated individual shipment requests.';
COMMENT ON COLUMN "public"."envios_individuales"."cliente_id" IS 'Optional FK to a registered client.';
COMMENT ON COLUMN "public"."envios_individuales"."precio_manual_servicio" IS 'Stores the manually entered price or the one derived from tipo_servicio.precio_base.';
COMMENT ON COLUMN "public"."envios_individuales"."status" IS 'Status of the shipment request (e.g., pendiente, confirmado, en_proceso, completado, cancelado).';

-- RLS Policies for envios_individuales
ALTER TABLE "public"."envios_individuales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for envios_individuales"
ON "public"."envios_individuales"
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow admin read access for envios_individuales"
ON "public"."envios_individuales"
FOR SELECT
TO authenticated -- Or a more specific admin role
USING (true);

CREATE POLICY "Allow admin update/delete for envios_individuales"
ON "public"."envios_individuales"
FOR UPDATE, DELETE
TO authenticated -- Or a more specific admin role
USING (true);


-- Ensure tipos_paquete and tipos_servicio tables exist if this script is run standalone
-- (though they should be in 02_schema_tables.sql)
CREATE TABLE IF NOT EXISTS "public"."tipos_paquete" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_paquete" IS 'Defines different types of packages.';

CREATE TABLE IF NOT EXISTS "public"."tipos_servicio" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "precio_base" NUMERIC(10, 2) NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_servicio" IS 'Defines different types of services and their base prices.';

-- RLS for tipos_paquete and tipos_servicio to allow read for form population
ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read for tipos_paquete"
ON "public"."tipos_paquete"
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY IF NOT EXISTS "Allow admin all for tipos_paquete"
ON "public"."tipos_paquete"
FOR ALL
TO authenticated -- Or specific admin role
USING (true) WITH CHECK (true);


ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow public read for tipos_servicio"
ON "public"."tipos_servicio"
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY IF NOT EXISTS "Allow admin all for tipos_servicio"
ON "public"."tipos_servicio"
FOR ALL
TO authenticated -- Or specific admin role
USING (true) WITH CHECK (true);
