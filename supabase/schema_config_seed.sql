-- 00_schema_drop_all.sql
-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto" CASCADE;
DROP TABLE IF EXISTS "public"."envios" CASCADE;
DROP TABLE IF EXISTS "public"."envios_individuales" CASCADE; -- Added
DROP TABLE IF EXISTS "public"."repartos" CASCADE;
DROP TABLE IF EXISTS "public"."clientes" CASCADE;
DROP TABLE IF EXISTS "public"."empresas" CASCADE;
DROP TABLE IF EXISTS "public"."repartidores" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_paquete" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_servicio" CASCADE;
DROP TABLE IF EXISTS "public"."tarifas_distancia_calculadora" CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS "public"."tipoparadaenum" CASCADE;
DROP TYPE IF EXISTS "public"."tipocalculadoraservicioenum" CASCADE;

-- 01_schema_enums.sql
-- Create ENUM types if they don't exist

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoparadaenum') THEN
        CREATE TYPE "public"."tipoparadaenum" AS ENUM ('retiro_empresa', 'entrega_cliente');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipocalculadoraservicioenum') THEN
        CREATE TYPE "public"."tipocalculadoraservicioenum" AS ENUM ('lowcost', 'express');
    END IF;
END$$;

-- 02_schema_tables.sql
-- Create Table for Repartidores
CREATE TABLE "public"."repartidores" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';

-- Create Table for Empresas
CREATE TABLE "public"."empresas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL,
    "notas" TEXT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

-- Create Table for Clientes
CREATE TABLE "public"."clientes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL,
    "notas" TEXT NULL,
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT clientes_email_key UNIQUE (email)
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information and their link to a company.';

-- Create Table for Tipos de Paquete
CREATE TABLE "public"."tipos_paquete" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_paquete" IS 'Defines different types of packages.';

-- Create Table for Tipos de Servicio
CREATE TABLE "public"."tipos_servicio" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "precio_base" NUMERIC(10, 2) NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_servicio" IS 'Defines different types of services and their base prices.';

-- Create Table for Repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID NULL REFERENCES "public"."repartidores"("id") ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado',
    "tipo_reparto" TEXT NOT NULL,
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';

-- Create Table for Envios
CREATE TABLE "public"."envios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "cliente_id" UUID NULL REFERENCES "public"."clientes"("id") ON DELETE SET NULL,
    "nombre_cliente_temporal" TEXT NULL,
    "client_location" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id") ON DELETE SET NULL,
    "package_weight" NUMERIC NOT NULL DEFAULT 0.1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "suggested_options" JSON NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"("id") ON DELETE SET NULL,
    "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL,
    "precio_servicio_final" NUMERIC(10, 2) NULL,
    "notas" TEXT NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores internal shipment details, linked to clients and repartos.';

-- Create Table for Paradas_Reparto
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"("id") ON DELETE CASCADE,
    "envio_id" UUID NULL REFERENCES "public"."envios"("id") ON DELETE CASCADE,
    "tipo_parada" public.tipoparadaenum NULL,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id) DEFERRABLE INITIALLY DEFERRED
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence of stops (shipments or company pickup) within a delivery route.';

-- Create Table for Tarifas Distancia Calculadora
CREATE TABLE "public"."tarifas_distancia_calculadora" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tipo_calculadora" public.tipocalculadoraservicioenum NOT NULL,
    "distancia_hasta_km" NUMERIC NOT NULL,
    "precio" NUMERIC(10, 2) NOT NULL,
    "fecha_vigencia_desde" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_tarifa_distancia_calculadora UNIQUE (tipo_calculadora, fecha_vigencia_desde, distancia_hasta_km)
);
COMMENT ON TABLE "public"."tarifas_distancia_calculadora" IS 'Stores distance-based pricing tiers for calculator services like LowCost and Express.';

-- Create Table for Envios_Individuales (Public facing requests)
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
    "precio_final_servicio" NUMERIC(10, 2) NULL, -- Final price for the service
    "status" TEXT NOT NULL DEFAULT 'pendiente', -- Status of this individual request
    "fecha_solicitud" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "notas_cliente" TEXT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."envios_individuales" IS 'Stores individual shipment requests made by clients/users, typically from a public form.';


-- 03_schema_rls.sql
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (empresas)" ON "public"."empresas" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access for Empresas" ON "public"."empresas" FOR SELECT TO "anon", "authenticated" USING (true);

ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (clientes)" ON "public"."clientes" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartidores)" ON "public"."repartidores" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_paquete)" ON "public"."tipos_paquete" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access for tipos_paquete" ON "public"."tipos_paquete" FOR SELECT TO "anon", "authenticated" USING (true); -- Added for public form

ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access for tipos_servicio" ON "public"."tipos_servicio" FOR SELECT TO "anon", "authenticated" USING (true); -- Added for public form

ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."tarifas_distancia_calculadora" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tarifas_distancia_calculadora)" ON "public"."tarifas_distancia_calculadora" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access for Tarifas Calculadora" ON "public"."tarifas_distancia_calculadora" FOR SELECT TO "anon", "authenticated" USING (true);

ALTER TABLE "public"."envios_individuales" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for envios_individuales" ON "public"."envios_individuales" FOR INSERT TO "anon", "authenticated" WITH CHECK (true);
CREATE POLICY "Allow admin read for envios_individuales" ON "public"."envios_individuales" FOR SELECT TO "authenticated" USING (true); -- Adjust role if needed


-- 04_data_seed.sql (Focus on configuration data)
-- Sample Data for Tipos de Paquete
INSERT INTO "public"."tipos_paquete" ("id", "nombre", "descripcion", "activo") VALUES
('pkg_caja_peq_001', 'Caja Pequeña', 'Cajas de hasta 30x30x30cm', TRUE),
('pkg_caja_med_002', 'Caja Mediana', 'Cajas de hasta 50x50x50cm', TRUE),
('pkg_caja_gra_003', 'Caja Grande', 'Cajas mayores a 50x50x50cm', FALSE),
('pkg_docs_004', 'Documentos', 'Sobres y documentación', TRUE),
('pkg_delivery_005', 'Delivery Comida', 'Pedidos de comida', TRUE),
('pkg_otros_006', 'Otros', 'Paquetes con formas irregulares u otros', TRUE);

-- Sample Data for Tipos de Servicio
INSERT INTO "public"."tipos_servicio" ("id", "nombre", "descripcion", "precio_base", "activo") VALUES
('svc_express_001', 'Envíos Express', 'Entrega urgente en la ciudad. Precio según calculadora.', NULL, TRUE),
('svc_lowcost_002', 'Envíos LowCost', 'Entrega económica programada. Precio según calculadora.', NULL, TRUE),
('svc_motofija_003', 'Moto Fija', 'Servicio de mensajería con moto asignada.', 50000.00, TRUE),
('svc_planemprend_004', 'Plan Emprendedores', 'Tarifas especiales y soluciones para emprendedores.', NULL, TRUE),
('svc_enviosflex_005', 'Envíos Flex', 'Servicio adaptable a necesidades específicas.', NULL, TRUE);

-- Sample Data for Tarifas Distancia Calculadora
-- LowCost Tariffs
INSERT INTO "public"."tarifas_distancia_calculadora" (tipo_calculadora, distancia_hasta_km, precio, fecha_vigencia_desde) VALUES
('lowcost', 2.9, 2150.00, CURRENT_DATE),
('lowcost', 4.9, 2900.00, CURRENT_DATE),
('lowcost', 8.9, 4000.00, CURRENT_DATE),
('lowcost', 13.0, 5800.00, CURRENT_DATE),
('lowcost', 30.0, 8200.00, CURRENT_DATE);

-- Express Tariffs
INSERT INTO "public"."tarifas_distancia_calculadora" (tipo_calculadora, distancia_hasta_km, precio, fecha_vigencia_desde) VALUES
('express', 3.0, 2700.00, CURRENT_DATE),
('express', 5.0, 3400.00, CURRENT_DATE),
('express', 6.0, 4200.00, CURRENT_DATE),
('express', 7.0, 5000.00, CURRENT_DATE),
('express', 8.0, 5800.00, CURRENT_DATE),
('express', 9.0, 6500.00, CURRENT_DATE),
('express', 10.0, 7350.00, CURRENT_DATE);

-- Minimal Repartidores and Empresas for dropdowns in forms
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias (Disponible)', TRUE);

INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "estado", "latitud", "longitud") VALUES
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'NUTRISABOR (Ejemplo)', 'Av. Independencia 456, Mar del Plata', TRUE, -38.0012, -57.5501);

-- No sample data for clientes, envios, repartos, paradas_reparto, envios_individuales in this config-focused seed.
