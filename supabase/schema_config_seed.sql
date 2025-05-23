
-- 00_schema_drop_all.sql
-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto" CASCADE;
DROP TABLE IF EXISTS "public"."envios" CASCADE;
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
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Validated by Zod
    "tipo_reparto" TEXT NOT NULL, -- Validated by Zod
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
    "status" TEXT NOT NULL DEFAULT 'pending', -- Validated by Zod
    "suggested_options" JSON NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"("id") ON DELETE SET NULL,
    "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") ON DELETE SET NULL,
    "precio_servicio_final" NUMERIC(10, 2) NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
COMMENT ON COLUMN "public"."envios"."tipo_paquete_id" IS 'Foreign key to the type of package.';
COMMENT ON COLUMN "public"."envios"."tipo_servicio_id" IS 'Foreign key to the type of service.';
COMMENT ON COLUMN "public"."envios"."precio_servicio_final" IS 'Final price for the service of this shipment.';

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
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence of stops within a delivery route.';

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

ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."tarifas_distancia_calculadora" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tarifas_distancia_calculadora)" ON "public"."tarifas_distancia_calculadora" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access for Tarifas Calculadora" ON "public"."tarifas_distancia_calculadora" FOR SELECT TO "anon", "authenticated" USING (true);

-- 04_data_config_seed.sql
-- Sample Data for Tipos de Servicio
-- Limpia la tabla antes de insertar para evitar conflictos de UNIQUE constraint si se re-ejecuta
-- ¡CUIDADO! Esto borrará los datos existentes en esta tabla si se ejecuta sobre una BD con datos.
DELETE FROM "public"."tipos_servicio";
INSERT INTO "public"."tipos_servicio" ("nombre", "descripcion", "precio_base", "activo") VALUES
('Envíos Express', 'Entrega urgente en la ciudad.', NULL, TRUE),
('Envíos LowCost', 'Entrega económica programada.', NULL, TRUE),
('Moto Fija', 'Servicio de mensajería con moto asignada para cliente.', 50000.00, TRUE),
('Plan Emprendedores', 'Tarifas especiales y soluciones para emprendedores.', NULL, TRUE),
('Envíos Flex', 'Servicio adaptable a necesidades específicas.', NULL, TRUE);

-- Sample Data for Tipos de Paquete
DELETE FROM "public"."tipos_paquete";
INSERT INTO "public"."tipos_paquete" ("nombre", "descripcion", "activo") VALUES
('Caja Pequeña', 'Paquetes pequeños, ej: hasta 30x30x15cm, <2kg', TRUE),
('Caja Mediana', 'Paquetes medianos, ej: hasta 50x40x30cm, <5kg', TRUE),
('Caja Grande', 'Paquetes grandes, ej: >50x40x30cm, >5kg', FALSE),
('Sobre Documentos', 'Sobres tamaño A4/Oficio, documentación', TRUE),
('Delivery Comida', 'Pedidos de comida, típicamente en contenedores térmicos', TRUE),
('Especial', 'Paquetes con formas irregulares o que requieren cuidado especial', TRUE);

-- Sample Data for Tarifas Distancia Calculadora
DELETE FROM "public"."tarifas_distancia_calculadora";
-- LowCost Tariffs - Vigente desde 2024-01-01
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 3.0, 500.00, '2024-01-01'),
('lowcost', 5.0, 700.00, '2024-01-01'),
('lowcost', 10.0, 1000.00, '2024-01-01'),
('lowcost', 15.0, 1300.00, '2024-01-01');

-- LowCost Tariffs - Vigente desde 2024-06-01 (ejemplo de actualización de precios)
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 3.0, 550.00, '2024-06-01'),
('lowcost', 5.0, 770.00, '2024-06-01'),
('lowcost', 10.0, 1100.00, '2024-06-01'),
('lowcost', 15.0, 1500.00, '2024-06-01');

-- Express Tariffs - Vigente desde 2024-01-01
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('express', 2.0, 1000.00, '2024-01-01'),
('express', 4.0, 1500.00, '2024-01-01'),
('express', 8.0, 2000.00, '2024-01-01'),
('express', 12.0, 2500.00, '2024-01-01');

-- Express Tariffs - Vigente desde 2024-07-01 (ejemplo para mostrar la funcionalidad de historial)
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('express', 2.0, 1100.00, '2024-07-01'),
('express', 4.0, 1650.00, '2024-07-01'),
('express', 8.0, 2200.00, '2024-07-01'),
('express', 12.0, 2800.00, '2024-07-01');

-- NOTA: Los datos de ejemplo para empresas, clientes, repartidores, repartos, envios, paradas_reparto
-- se pueden añadir aquí si se desea un seed completo, pero se omiten para este archivo de config.
-- Ejemplo (deben existir primero las empresas y repartidores para que estos FK funcionen):
/*
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "estado", "latitud", "longitud") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', TRUE, -38.0045, -57.5426),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'NUTRISABOR (Viandas)', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', TRUE, -38.0012, -57.5501);

INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE);
*/
