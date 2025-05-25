-- Create table for envios_individuales
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
    "precio_final_servicio" NUMERIC(10, 2) NULL, -- Renamed from precio_manual_servicio for clarity
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_solicitud" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "notas_cliente" TEXT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE "public"."envios_individuales" IS 'Stores individual shipment requests made by clients/users.';
COMMENT ON COLUMN "public"."envios_individuales"."cliente_id" IS 'Optional foreign key to an existing client.';
COMMENT ON COLUMN "public"."envios_individuales"."precio_final_servicio" IS 'The final agreed price for the service, whether from a type or manual.';

-- RLS Policies for envios_individuales
ALTER TABLE "public"."envios_individuales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for envios_individuales" ON "public"."envios_individuales"
    FOR INSERT TO "anon", "authenticated" WITH CHECK (true);

CREATE POLICY "Allow admin all access for envios_individuales" ON "public"."envios_individuales"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- Adjust for specific roles in production

-- Ensure tipos_paquete and tipos_servicio tables exist (idempotent)
CREATE TABLE IF NOT EXISTS "public"."tipos_paquete" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for tipos_paquete" ON "public"."tipos_paquete" FOR SELECT TO "anon", "authenticated" USING (true);
CREATE POLICY "Allow admin all for tipos_paquete" ON "public"."tipos_paquete" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS "public"."tipos_servicio" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "precio_base" NUMERIC(10, 2) NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for tipos_servicio" ON "public"."tipos_servicio" FOR SELECT TO "anon", "authenticated" USING (true);
CREATE POLICY "Allow admin all for tipos_servicio" ON "public"."tipos_servicio" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
