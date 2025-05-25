-- Este archivo define la creación de la tabla envios_individuales y tablas de soporte si no existen.
-- Asegúrate de que tipos_paquete y tipos_servicio se creen si este script se ejecuta de forma aislada.

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

-- Create Table for Envios_Individuales
CREATE TABLE "public"."envios_individuales" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cliente_id" UUID NULL REFERENCES "public"."clientes"("id") ON DELETE SET NULL,
    "nombre_cliente" TEXT NOT NULL, -- Nombre del solicitante/contacto principal
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
    "precio_final_servicio" NUMERIC(10, 2) NULL, -- Renombrado de precio_manual_servicio para claridad
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_solicitud" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "notas_cliente" TEXT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."envios_individuales" IS 'Stores individual shipment requests made by clients/users.';
COMMENT ON COLUMN "public"."envios_individuales"."nombre_cliente" IS 'Name of the person requesting or primary contact for the shipment.';
COMMENT ON COLUMN "public"."envios_individuales"."precio_final_servicio" IS 'Final service price, either from a service type or manually entered.';

-- RLS Policies for envios_individuales
ALTER TABLE "public"."envios_individuales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for envios_individuales" ON "public"."envios_individuales"
    FOR INSERT TO "anon", "authenticated" WITH CHECK (true);

CREATE POLICY "Allow admin read access for envios_individuales" ON "public"."envios_individuales"
    FOR SELECT TO "authenticated" USING (true); -- O un rol específico de admin

-- RLS Policies for tipos_paquete (if not already more permissively defined)
ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for tipos_paquete" ON "public"."tipos_paquete"
    FOR SELECT TO "anon", "authenticated" USING (true);
CREATE POLICY "Allow admin all access for tipos_paquete" ON "public"."tipos_paquete"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- O un rol específico de admin

-- RLS Policies for tipos_servicio (if not already more permissively defined)
ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for tipos_servicio" ON "public"."tipos_servicio"
    FOR SELECT TO "anon", "authenticated" USING (true);
CREATE POLICY "Allow admin all access for tipos_servicio" ON "public"."tipos_servicio"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- O un rol específico de admin
