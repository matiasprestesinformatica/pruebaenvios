-- 00_schema_drop_all.sql
-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto" CASCADE;
DROP TABLE IF EXISTS "public"."envios" CASCADE;
DROP TABLE IF EXISTS "public"."envios_individuales" CASCADE; -- Added new table
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

-- Create Table for Envios (main operational shipments)
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
COMMENT ON TABLE "public"."envios" IS 'Stores individual operational shipment details managed by the company.';

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
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."envios_individuales" IS 'Stores shipment requests made directly by clients/users.';
COMMENT ON COLUMN "public"."envios_individuales"."cliente_id" IS 'Optional FK to an existing registered client.';
COMMENT ON COLUMN "public"."envios_individuales"."status" IS 'Status of the shipment request.';


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
CREATE POLICY "Allow public read access for tipos_paquete" ON "public"."tipos_paquete" FOR SELECT TO "anon", "authenticated" USING (true); -- Added public read

ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access for tipos_servicio" ON "public"."tipos_servicio" FOR SELECT TO "anon", "authenticated" USING (true); -- Added public read

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
CREATE POLICY "Allow admin full access for envios_individuales" ON "public"."envios_individuales" FOR ALL TO "authenticated" USING ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'); -- Placeholder for admin logic
CREATE POLICY "Allow authenticated general access for envios_individuales (fallback)" ON "public"."envios_individuales" FOR ALL TO "authenticated" USING (true) WITH CHECK (true); -- More permissive fallback


-- 04_data_config_seed.sql (and other seeds)
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
('svc_express_001', 'Envíos Express', 'Entrega urgente en la ciudad.', NULL, TRUE),
('svc_lowcost_002', 'Envíos LowCost', 'Entrega económica programada.', NULL, TRUE),
('svc_motofija_003', 'Moto Fija', 'Servicio de mensajería con moto asignada.', 50000.00, TRUE),
('svc_planemprend_004', 'Plan Emprendedores', 'Tarifas especiales y soluciones para emprendedores.', NULL, TRUE),
('svc_enviosflex_005', 'Envíos Flex', 'Servicio adaptable a necesidades específicas.', NULL, TRUE);

-- Sample Data for Tarifas Distancia Calculadora
INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('lowcost', 2.9, 2150.00, CURRENT_DATE),
('lowcost', 4.9, 2900.00, CURRENT_DATE),
('lowcost', 8.9, 4000.00, CURRENT_DATE),
('lowcost', 13.0, 5800.00, CURRENT_DATE),
('lowcost', 30.0, 8200.00, CURRENT_DATE);

INSERT INTO "public"."tarifas_distancia_calculadora" ("tipo_calculadora", "distancia_hasta_km", "precio", "fecha_vigencia_desde") VALUES
('express', 3.0, 2700.00, CURRENT_DATE),
('express', 5.0, 3400.00, CURRENT_DATE),
('express', 6.0, 4200.00, CURRENT_DATE),
('express', 7.0, 5000.00, CURRENT_DATE),
('express', 8.0, 5800.00, CURRENT_DATE),
('express', 9.0, 6500.00, CURRENT_DATE),
('express', 10.0, 7350.00, CURRENT_DATE);


-- Sample Data for Empresas
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "estado", "latitud", "longitud") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', TRUE, -38.0045, -57.5426),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'NUTRISABOR (Viandas)', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', TRUE, -38.0012, -57.5501),
('c3d4e5f6-a7b8-9012-3456-78901bcdef01', 'Librería El Saber', 'Peatonal San Martín 2500, Mar del Plata', 'info@elsaber.com', '+542235550300', TRUE, -38.0030, -57.5460);

-- Sample Data for Clientes
INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id", "latitud", "longitud", "estado") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Juan', 'Perez', 'Av. Colón 1234, Mar del Plata', '+542235550101', 'juan.perez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0005, -57.5560, TRUE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Maria', 'Garcia', 'Belgrano 5678, Mar del Plata', '+542235550102', 'maria.garcia@example.com', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0025, -57.5490, TRUE),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Moreno 9101, Mar del Plata', NULL, NULL, (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -37.9910, -57.5830, FALSE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE);

-- Sample Data for Repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez', FALSE);

-- Sample Data for Repartos
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-20', (SELECT id from repartidores WHERE nombre = 'Matias'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'en_curso', 'individual', NULL),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Maria Rodriguez'), 'completado', 'viaje_empresa_lote', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'));

-- Sample Data for Envios (Operational)
INSERT INTO "public"."envios" (
    "cliente_id", "client_location", "latitud", "longitud", "tipo_paquete_id", "package_weight", "status", "reparto_id", "tipo_servicio_id", "precio_servicio_final", "notas"
) VALUES
((SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 1234, Mar del Plata', -38.0005, -57.5560, (SELECT id from tipos_paquete WHERE nombre = 'Caja Mediana'), 1.5, 'asignado_a_reparto', 'df1e184e-71e6-4f00-a78d-b6e93034cd35', (SELECT id from tipos_servicio WHERE nombre = 'Envíos Express'), 1500.00, 'Entregar en recepción'),
((SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Belgrano 5678, Mar del Plata', -38.0025, -57.5490, (SELECT id from tipos_paquete WHERE nombre = 'Caja Pequeña'), 0.5, 'en_transito', 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', (SELECT id from tipos_servicio WHERE nombre = 'Envíos LowCost'), 800.00, 'Llamar antes de llegar'),
((SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Luro 3210, Mar del Plata', -38.0048, -57.5430, (SELECT id from tipos_paquete WHERE nombre = 'Documentos'), 0.2, 'pending', NULL, (SELECT id from tipos_servicio WHERE nombre = 'Envíos Express'), 1200.00, NULL);

-- Sample Data for Paradas_Reparto
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', id, 'entrega_cliente', 0 FROM envios WHERE cliente_id = (SELECT id from clientes WHERE email = 'juan.perez@example.com') AND reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35' LIMIT 1;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', id, 'entrega_cliente', 1 FROM envios WHERE cliente_id = (SELECT id from clientes WHERE email = 'ana.martinez@example.com') AND reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35' LIMIT 1;

INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', id, 'entrega_cliente', 0 FROM envios WHERE cliente_id = (SELECT id from clientes WHERE email = 'maria.garcia@example.com') AND reparto_id = 'caad29f1-cf73-42d4-b3d2-658a7814f1c4' LIMIT 1;

INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 'retiro_empresa', 0); -- Parada de retiro
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', id, 'entrega_cliente', 1 FROM envios WHERE cliente_id = (SELECT id from clientes WHERE email = 'carlos.lopez@example.com') AND reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908' LIMIT 1;
-- Add more seed data as needed
