-- Create table for envios_individuales (customer-requested shipments)
CREATE TABLE "public"."envios_individuales" (
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
    "precio_manual_servicio" NUMERIC(10, 2) NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente', -- e.g., pendiente, confirmado, en_proceso, completado, cancelado
    "fecha_solicitud" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "notas_cliente" TEXT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL -- Added created_at as per other tables
);

COMMENT ON TABLE "public"."envios_individuales" IS 'Stores shipment requests made directly by clients/users.';
COMMENT ON COLUMN "public"."envios_individuales"."cliente_id" IS 'Optional FK to an existing registered client.';
COMMENT ON COLUMN "public"."envios_individuales"."status" IS 'Status of the shipment request.';

-- RLS Policies for envios_individuales
ALTER TABLE "public"."envios_individuales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for envios_individuales" ON "public"."envios_individuales"
    FOR INSERT TO "anon", "authenticated" WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read/update their own envios_individuales" ON "public"."envios_individuales"
    FOR SELECT USING (auth.uid() = cliente_id); -- Example: only if linked to a registered client

CREATE POLICY "Allow admin full access for envios_individuales" ON "public"."envios_individuales"
    FOR ALL TO "authenticated" USING (
        (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin' -- Assuming you have a roles system
    ) WITH CHECK (
        (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
    );

-- Fallback for authenticated users if no specific role/ownership policy matches (adjust as needed)
CREATE POLICY "Allow authenticated general access for envios_individuales" ON "public"."envios_individuales"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Ensure tipos_paquete and tipos_servicio tables exist (idempotent creation)
-- This might be redundant if they are already in your main seed, but ensures standalone execution.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'tipos_paquete') THEN
        CREATE TABLE "public"."tipos_paquete" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "nombre" TEXT NOT NULL UNIQUE,
            "descripcion" TEXT NULL,
            "activo" BOOLEAN NOT NULL DEFAULT TRUE,
            "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
        COMMENT ON TABLE "public"."tipos_paquete" IS 'Defines different types of packages.';
        ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all for authenticated users (tipos_paquete_standalone)" ON "public"."tipos_paquete"
            FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
        CREATE POLICY "Allow public read access for tipos_paquete_standalone" ON "public"."tipos_paquete"
            FOR SELECT TO "anon", "authenticated" USING (true);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'tipos_servicio') THEN
        CREATE TABLE "public"."tipos_servicio" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "nombre" TEXT NOT NULL UNIQUE,
            "descripcion" TEXT NULL,
            "precio_base" NUMERIC(10, 2) NULL,
            "activo" BOOLEAN NOT NULL DEFAULT TRUE,
            "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
        COMMENT ON TABLE "public"."tipos_servicio" IS 'Defines different types of services and their base prices.';
        ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all for authenticated users (tipos_servicio_standalone)" ON "public"."tipos_servicio"
            FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
        CREATE POLICY "Allow public read access for tipos_servicio_standalone" ON "public"."tipos_servicio"
            FOR SELECT TO "anon", "authenticated" USING (true);
    END IF;
END$$;
