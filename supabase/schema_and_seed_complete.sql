
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

-- Drop enums if they exist
DROP TYPE IF EXISTS "public"."tipoparadaenum" CASCADE;

-- 01_schema_enums.sql
-- Create ENUM types if they don't exist

-- Enum para paradas_reparto.tipo_parada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoparadaenum') THEN
        CREATE TYPE "public"."tipoparadaenum" AS ENUM ('retiro_empresa', 'entrega_cliente');
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
    "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id") ON DELETE SET NULL, -- Replaced package_size
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

-- 03_schema_rls.sql
-- Enable RLS for all tables
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY "Allow all for authenticated users (empresas)" ON "public"."empresas"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users (clientes)" ON "public"."clientes"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users (repartidores)" ON "public"."repartidores"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users (tipos_paquete)" ON "public"."tipos_paquete"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto"
    FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- 04_data_seed.sql
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
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE),
('89dcdd25-3cdd-4adf-b92f-b638c6efd656', 'Andrea', 'Dentone', '25 de Mayo 3334, Mar del Plata', '+542235550105', 'a.dentone@topservice.net', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0022, -57.5450, TRUE),
('5e4a4569-b258-4bef-bdde-d119e9faf93c', 'Andrea', 'Almejun', 'F. Sanchez 2034, Mar del Plata', '+542235550106', 'a_almejun@unique-mail.com', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0150, -57.5500, TRUE),
('eab01d86-e550-4ae4-8783-2a179d99f40a', 'Andapez', 'Cliente', 'Av. Vertiz 3250, Mar del Plata', '+542235550107', 'andapez.contact@anotherdomain.co', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'), -38.0380, -57.5690, TRUE);

-- Sample Data for Repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez', FALSE);

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
('svc_express_001', 'Envío Express', 'Entrega en menos de 2 horas', 1500.00, TRUE),
('svc_lowcost_002', 'Envío LowCost', 'Entrega en 24-48 horas', 800.00, TRUE),
('svc_motofija_003', 'Moto Fija Mensual', 'Servicio de moto fija por mes', 120000.00, TRUE),
('svc_emprend_004', 'Plan Emprendedores', 'Tarifas especiales para emprendedores', NULL, TRUE),
('svc_flex_005', 'Envíos Flex', 'Servicio flexible adaptable', 1000.00, FALSE);

-- Sample Data for Repartos
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-20', (SELECT id from repartidores WHERE nombre = 'Matias'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'en_curso', 'individual', NULL),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Maria Rodriguez'), 'completado', 'viaje_empresa_lote', (SELECT id from empresas WHERE nombre = 'NUTRISABOR (Viandas)'));

-- Sample Data for Envios
INSERT INTO "public"."envios" (
    "cliente_id", "client_location", "latitud", "longitud", "tipo_paquete_id", "package_weight", "status", "reparto_id", "tipo_servicio_id", "precio_servicio_final"
) VALUES
((SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 1234, Mar del Plata', -38.0005, -57.5560, (SELECT id from tipos_paquete WHERE nombre = 'Caja Mediana'), 1.5, 'asignado_a_reparto', 'df1e184e-71e6-4f00-a78d-b6e93034cd35', (SELECT id from tipos_servicio WHERE nombre = 'Envío Express'), 1500.00),
((SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Belgrano 5678, Mar del Plata', -38.0025, -57.5490, (SELECT id from tipos_paquete WHERE nombre = 'Caja Pequeña'), 0.5, 'en_transito', 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', (SELECT id from tipos_servicio WHERE nombre = 'Envío LowCost'), 800.00),
((SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Moreno 9101, Mar del Plata', -37.9910, -57.5830, (SELECT id from tipos_paquete WHERE nombre = 'Caja Grande'), 5, 'entregado', 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 2500.00), -- Precio manual
((SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Luro 3210, Mar del Plata', -38.0048, -57.5430, (SELECT id from tipos_paquete WHERE nombre = 'Documentos'), 2.2, 'asignado_a_reparto', 'df1e184e-71e6-4f00-a78d-b6e93034cd35', (SELECT id from tipos_servicio WHERE nombre = 'Envío Express'), 1500.00),
((SELECT id from clientes WHERE email = 'a.dentone@topservice.net'), 'Colon 6130, B7600 Mar del Plata', -38.0022, -57.5450, (SELECT id from tipos_paquete WHERE nombre = 'Caja Mediana'), 1, 'asignado_a_reparto', 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, NULL),
((SELECT id from clientes WHERE email = 'a_almejun@unique-mail.com'), 'Irala 6249, B7600 Mar del Plata', -38.0150, -57.5500, (SELECT id from tipos_paquete WHERE nombre = 'Delivery Comida'), 1, 'pending', NULL, (SELECT id from tipos_servicio WHERE nombre = 'Envío Express'), 1500.00);

-- Sample Data for Paradas_Reparto
-- Reparto 1 (Tech Solutions)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', e.id, 'entrega_cliente', 0
FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'juan.perez@example.com') AND e.reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35' LIMIT 1;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', e.id, 'entrega_cliente', 1
FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'ana.martinez@example.com') AND e.reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35' LIMIT 1;

-- Reparto 2 (Individual)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', e.id, 'entrega_cliente', 0
FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'maria.garcia@example.com') AND e.reparto_id = 'caad29f1-cf73-42d4-b3d2-658a7814f1c4' LIMIT 1;

-- Reparto 3 (Nutrisabor Lote)
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 'retiro_empresa', 0); -- Parada de retiro
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', e.id, 'entrega_cliente', 1
FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'carlos.lopez@example.com') AND e.reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908' LIMIT 1;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', e.id, 'entrega_cliente', 2
FROM envios e WHERE e.cliente_id = (SELECT id from clientes WHERE email = 'a.dentone@topservice.net') AND e.reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908' LIMIT 1;

