
-- 00_schema_drop_all.sql (Adaptado)
-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto" CASCADE;
DROP TABLE IF EXISTS "public"."envios" CASCADE;
DROP TABLE IF EXISTS "public"."repartos" CASCADE;
DROP TABLE IF EXISTS "public"."clientes" CASCADE;
DROP TABLE IF EXISTS "public"."empresas" CASCADE;
DROP TABLE IF EXISTS "public"."repartidores" CASCADE;
DROP TABLE IF EXISTS "public"."tarifas_distancia_calculadora" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_paquete" CASCADE;
DROP TABLE IF EXISTS "public"."tipos_servicio" CASCADE;


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
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Validated by Zod: 'asignado', 'en_curso', 'completado'
    "tipo_reparto" TEXT NOT NULL, -- Validated by Zod: 'individual', 'viaje_empresa', 'viaje_empresa_lote'
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
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';
COMMENT ON COLUMN "public"."envios"."latitud" IS 'Latitude of the client_location for mapping.';
COMMENT ON COLUMN "public"."envios"."longitud" IS 'Longitude of the client_location for mapping.';
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
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence of stops (shipments or company pickup) within a delivery route.';
COMMENT ON COLUMN "public"."paradas_reparto"."envio_id" IS 'FK to envios. Null if tipo_parada is retiro_empresa.';
COMMENT ON COLUMN "public"."paradas_reparto"."tipo_parada" IS 'Type of stop: company pickup or client delivery.';

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
CREATE POLICY "Allow public read for Tipos Paquete" ON "public"."tipos_paquete" FOR SELECT TO "anon", "authenticated" USING (true);


ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read for Tipos Servicio" ON "public"."tipos_servicio" FOR SELECT TO "anon", "authenticated" USING (true);


ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

ALTER TABLE "public"."tarifas_distancia_calculadora" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tarifas_distancia_calculadora)" ON "public"."tarifas_distancia_calculadora" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access for Tarifas Calculadora" ON "public"."tarifas_distancia_calculadora" FOR SELECT TO "anon", "authenticated" USING (true);

-- 04_data_seed_config_only.sql
-- Essential Configuration Data for Tipos de Servicio
INSERT INTO "public"."tipos_servicio" ("id", "nombre", "descripcion", "precio_base", "activo") VALUES
('svc_express_001', 'Envíos Express', 'Entrega urgente en la ciudad.', NULL, TRUE),
('svc_lowcost_002', 'Envíos LowCost', 'Entrega económica programada.', NULL, TRUE),
('svc_motofija_003', 'Moto Fija', 'Servicio de mensajería con moto asignada.', 50000.00, TRUE),
('svc_planemprend_004', 'Plan Emprendedores', 'Tarifas especiales y soluciones para emprendedores.', NULL, TRUE),
('svc_enviosflex_005', 'Envíos Flex', 'Servicio adaptable a necesidades específicas.', NULL, TRUE);

-- Essential Configuration Data for Tipos de Paquete
INSERT INTO "public"."tipos_paquete" ("id", "nombre", "descripcion", "activo") VALUES
('pkg_caja_peq_001', 'Caja Pequeña', 'Cajas de hasta 30x30x30cm aprox.', TRUE),
('pkg_caja_med_002', 'Caja Mediana', 'Cajas de hasta 50x50x50cm aprox.', TRUE),
('pkg_caja_gra_003', 'Caja Grande', 'Cajas mayores a 50x50x50cm aprox.', TRUE),
('pkg_docs_004', 'Documentos', 'Sobres y documentación importante.', TRUE),
('pkg_delivery_005', 'Delivery Comida', 'Pedidos de comida, alimentos.', TRUE),
('pkg_otros_006', 'Otros', 'Consultar para formas o tamaños irregulares.', TRUE);

-- Sample Data for Tarifas Distancia Calculadora (Essential for calculator functionality)
-- LowCost Tariffs - Vigente desde 2024-01-01 (ejemplo)
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 3.0, 500.00, '2024-01-01'),
('lowcost', 5.0, 700.00, '2024-01-01'),
('lowcost', 10.0, 1000.00, '2024-01-01');

-- Express Tariffs - Vigente desde 2024-01-01 (ejemplo)
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('express', 2.0, 1000.00, '2024-01-01'),
('express', 4.0, 1500.00, '2024-01-01'),
('express', 8.0, 2000.00, '2024-01-01');

-- Sample data for Repartidores (essential for assigning deliveries)
INSERT INTO "public"."repartidores" ("nombre", "estado") VALUES
('Repartidor A', TRUE),
('Repartidor B', TRUE),
('Repartidor C', FALSE);

-- Sample data for Empresas (useful for testing client assignment and batch deliveries)
INSERT INTO "public"."empresas" ("nombre", "direccion", "latitud", "longitud", "estado") VALUES
('Empresa Demo 1', 'Calle Falsa 123, Mar del Plata', -38.001, -57.552, TRUE),
('Empresa Demo 2', 'Avenida Siempreviva 742, Mar del Plata', -38.005, -57.543, TRUE);

-- NO se incluyen INSERTs para clientes, repartos, envios (excepto los de configuración), paradas_reparto
-- ya que la solicitud era solo para datos de configuración esenciales.
-- Estos se crearían a través de la aplicación.
