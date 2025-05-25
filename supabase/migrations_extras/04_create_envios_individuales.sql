-- Ensure ENUM types exist if they are referenced by FKs or used directly,
-- though for envios_individuales, we're using FKs to tables that manage these.

-- Create tipos_paquete table if it doesn't exist (as per prompt instructions)
CREATE TABLE IF NOT EXISTS "public"."tipos_paquete" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_paquete" IS 'Defines different types of packages.';

-- Create tipos_servicio table if it doesn't exist (as per prompt instructions)
CREATE TABLE IF NOT EXISTS "public"."tipos_servicio" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "precio_base" NUMERIC(10, 2) NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_servicio" IS 'Defines different types of services and their base prices.';

-- Create Table for Envios Individuales (Solicitudes de Envío)
CREATE TABLE IF NOT EXISTS "public"."envios_individuales" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cliente_id" UUID NULL REFERENCES "public"."clientes"("id") ON DELETE SET NULL, -- Opcional
    "nombre_cliente" TEXT NOT NULL, -- Nombre del solicitante/contacto para este envío
    "email_cliente" TEXT NULL,
    "telefono_cliente" TEXT NULL,
    "direccion_retiro" TEXT NOT NULL,
    "latitud_retiro" NUMERIC NULL,
    "longitud_retiro" NUMERIC NULL,
    "direccion_entrega" TEXT NOT NULL,
    "latitud_entrega" NUMERIC NULL,
    "longitud_entrega" NUMERIC NULL,
    "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id") ON DELETE SET NULL, -- FK a tipos_paquete
    "descripcion_paquete" TEXT NULL,
    "peso_paquete" NUMERIC NULL,
    "dimensiones_paquete" TEXT NULL,
    "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL, -- FK a tipos_servicio
    "precio_final_servicio" NUMERIC(10, 2) NULL, -- Precio final, ya sea manual o de tipo_servicio
    "status" TEXT NOT NULL DEFAULT 'pendiente', -- ej: 'pendiente', 'confirmado', 'en_proceso', 'cancelado_por_cliente'
    "fecha_solicitud" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "notas_cliente" TEXT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."envios_individuales" IS 'Stores individual shipment requests made by clients/users.';

-- RLS Policies for envios_individuales
ALTER TABLE "public"."envios_individuales" ENABLE ROW LEVEL SECURITY;

-- Allow public insert for new requests
CREATE POLICY "Allow public insert for envios_individuales" ON "public"."envios_individuales"
    FOR INSERT TO "anon", "authenticated" WITH CHECK (true);

-- Allow authenticated users to manage (select, update, delete potentially) their own requests, or admins to manage all.
-- This is a placeholder; more specific RLS for select/update/delete would be needed for production.
CREATE POLICY "Allow admin all access to envios_individuales" ON "public"."envios_individuales"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- Placeholder, refine for roles

-- RLS Policies for tipos_paquete (if not already created)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read access for Tipos Paquete (Solicitar)' AND polrelid = 'public.tipos_paquete'::regclass) THEN
        ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow public read access for Tipos Paquete (Solicitar)" ON "public"."tipos_paquete"
            FOR SELECT TO "anon", "authenticated" USING (activo = TRUE);
        CREATE POLICY "Allow admin all access for Tipos Paquete (Solicitar)" ON "public"."tipos_paquete"
            FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- Placeholder for admin role
    END IF;
END$$;

-- RLS Policies for tipos_servicio (if not already created)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read access for Tipos Servicio (Solicitar)' AND polrelid = 'public.tipos_servicio'::regclass) THEN
        ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow public read access for Tipos Servicio (Solicitar)" ON "public"."tipos_servicio"
            FOR SELECT TO "anon", "authenticated" USING (activo = TRUE);
        CREATE POLICY "Allow admin all access for Tipos Servicio (Solicitar)" ON "public"."tipos_servicio"
            FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- Placeholder for admin role
    END IF;
END$$;
