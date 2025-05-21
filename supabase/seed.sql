
-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto";
DROP TABLE IF EXISTS "public"."envios";
DROP TABLE IF EXISTS "public"."repartos";
DROP TABLE IF EXISTS "public"."clientes";
DROP TABLE IF EXISTS "public"."tipos_servicio"; -- Nuevo
DROP TABLE IF EXISTS "public"."tipos_paquete"; -- Nuevo
DROP TABLE IF EXISTS "public"."empresas";
DROP TABLE IF EXISTS "public"."repartidores";

-- Drop enums if they exist (handle with care in production)
DROP TYPE IF EXISTS "public"."tipoparadaenum"; -- Movido aquí porque paradas_reparto depende de él

-- Create ENUM types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipoparadaenum') THEN
        CREATE TYPE "public"."tipoparadaenum" AS ENUM ('retiro_empresa', 'entrega_cliente');
    END IF;
END$$;

-- Create Table for Empresas
CREATE TABLE "public"."empresas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL UNIQUE,
    "direccion" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL UNIQUE,
    "notas" TEXT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (empresas)" ON "public"."empresas" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

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
    "email" TEXT NULL UNIQUE,
    "notas" TEXT NULL,
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information and their link to a company.';
ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (clientes)" ON "public"."clientes" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Repartidores
CREATE TABLE "public"."repartidores" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';
ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartidores)" ON "public"."repartidores" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Tipos de Paquete (NUEVO)
CREATE TABLE "public"."tipos_paquete" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_paquete" IS 'Stores different types of packages.';
ALTER TABLE "public"."tipos_paquete" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_paquete)" ON "public"."tipos_paquete" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Tipos de Servicio (NUEVO)
CREATE TABLE "public"."tipos_servicio" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL UNIQUE,
    "descripcion" TEXT NULL,
    "precio_base" NUMERIC(10, 2) NULL, -- Ej: 12345.67
    "activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE "public"."tipos_servicio" IS 'Stores different types of services and their base prices.';
ALTER TABLE "public"."tipos_servicio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (tipos_servicio)" ON "public"."tipos_servicio" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID NULL REFERENCES "public"."repartidores"("id") ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Zod enum: 'asignado', 'en_curso', 'completado'
    "tipo_reparto" TEXT NOT NULL, -- Zod enum: 'individual', 'viaje_empresa', 'viaje_empresa_lote'
    "empresa_id" UUID NULL REFERENCES "public"."empresas"("id") ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';
ALTER TABLE "public"."repartos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (repartos)" ON "public"."repartos" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Envios
CREATE TABLE "public"."envios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "cliente_id" UUID NULL REFERENCES "public"."clientes"("id") ON DELETE SET NULL,
    "nombre_cliente_temporal" TEXT NULL,
    "client_location" TEXT NOT NULL,
    "latitud" NUMERIC NULL,
    "longitud" NUMERIC NULL,
    "package_size" TEXT NOT NULL, -- Zod enum: 'small', 'medium', 'large' (ahora podría ser FK a tipos_paquete)
    "package_weight" NUMERIC NOT NULL DEFAULT 0.1,
    "status" TEXT NOT NULL DEFAULT 'pending', -- Zod enum
    "suggested_options" JSON NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"("id") ON DELETE SET NULL
    -- "tipo_paquete_id" UUID NULL REFERENCES "public"."tipos_paquete"("id"), -- Considerar para el futuro
    -- "tipo_servicio_id" UUID NULL REFERENCES "public"."tipos_servicio"("id") -- Considerar para el futuro
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Paradas_Reparto
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"("id") ON DELETE CASCADE,
    "envio_id" UUID NULL REFERENCES "public"."envios"("id") ON DELETE CASCADE, -- Permite NULL para parada de retiro
    "tipo_parada" "public"."tipoparadaenum" NULL, -- 'retiro_empresa' o 'entrega_cliente'
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id) DEFERRABLE INITIALLY DEFERRED -- Permite NULLs únicos
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence of stops within a delivery route.';
ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Sample Data
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "estado", "latitud", "longitud") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', TRUE, -38.0054, -57.5426),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Nutrisabor (Viandas)', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', TRUE, -37.9989, -57.5513);

INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id", "latitud", "longitud", "estado") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Juan', 'Perez', 'Av. Colón 1234, Mar del Plata', '+542235550101', 'juan.perez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0005, -57.5560, TRUE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Maria', 'Garcia', 'Belgrano 5678, Mar del Plata', '+542235550102', 'maria.garcia@example.com', (SELECT id from empresas WHERE nombre = 'Nutrisabor (Viandas)'), -38.0025, -57.5490, TRUE),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Moreno 9101, Mar del Plata', NULL, NULL, (SELECT id from empresas WHERE nombre = 'Nutrisabor (Viandas)'), -37.9910, -57.5830, FALSE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE);

INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez', FALSE);

-- Sample Tipos de Paquete
INSERT INTO "public"."tipos_paquete" ("nombre", "descripcion") VALUES
('Caja Pequeña', 'Hasta 30x30x30 cm'),
('Caja Mediana', 'Hasta 50x50x50 cm'),
('Caja Grande', 'Más de 50x50x50 cm'),
('Documentos', 'Sobres o carpetas con documentos'),
('Delivery Comida', 'Paquetes de comida para entrega rápida'),
('Otros', 'Paquetes con características especiales');

-- Sample Tipos de Servicio
INSERT INTO "public"."tipos_servicio" ("nombre", "descripcion", "precio_base") VALUES
('Envíos Express', 'Entrega prioritaria en menos de 2 horas.', 1500.00),
('Envíos LowCost', 'Entrega económica en 24-48 horas.', 800.00),
('Moto Fija', 'Servicio de mensajería con moto asignada por horas/día.', 5000.00),
('Plan Emprendedores', 'Tarifas especiales para envíos frecuentes de emprendedores.', 700.00),
('Envíos Flex', 'Envíos programados con flexibilidad horaria.', 950.00);

-- Sample Repartos
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-20', (SELECT id from repartidores WHERE nombre = 'Matias'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'en_curso', 'individual', NULL),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Maria Rodriguez'), 'completado', 'viaje_empresa_lote', (SELECT id from empresas WHERE nombre = 'Nutrisabor (Viandas)'));

-- Sample Envios, algunos asignados a repartos
INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud", "reparto_id") VALUES
('31326385-0208-4c49-90ac-12a76d61c899', (SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 1234, Mar del Plata', 'medium', 1.5, 'asignado_a_reparto', -38.0005, -57.5560, 'df1e184e-71e6-4f00-a78d-b6e93034cd35'),
('48379f7b-11a4-4476-8025-4f3c21b9e19d', (SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Belgrano 5678, Mar del Plata', 'small', 0.5, 'en_transito', -38.0025, -57.5490, 'caad29f1-cf73-42d4-b3d2-658a7814f1c4'),
('2e47d785-9105-4759-b4b3-f6728b55796f', (SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Moreno 9101, Mar del Plata', 'large', 5, 'entregado', -37.9910, -57.5830, 'a7a9309f-6bbf-4029-9f61-4d0a3724b908'),
('609f63bb-10a3-47be-ae08-066b5e0768f8', (SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Luro 3210, Mar del Plata', 'medium', 2.2, 'pending', -38.0048, -57.5430, NULL);

-- Sample Paradas Reparto
-- Para Reparto Lote de Nutrisabor
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', NULL, 'retiro_empresa', 0),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2e47d785-9105-4759-b4b3-f6728b55796f', 'entrega_cliente', 1);

-- Para Reparto Individual de Juan Perez
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '48379f7b-11a4-4476-8025-4f3c21b9e19d', 'entrega_cliente', 0);

-- Para Reparto Viaje por Empresa de Tech Solutions
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '31326385-0208-4c49-90ac-12a76d61c899', 'entrega_cliente', 0);

-- Ajustar los INSERT siguientes si es necesario o eliminarlos si ya están cubiertos.
INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud", "reparto_id") VALUES
('4068601d-34dc-4983-9834-68c630af1b31', (SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Defensa 567, San Telmo', 'medium', '2.5', 'asignado_a_reparto', -34.6175, -58.3703, 'df1e184e-71e6-4f00-a78d-b6e93034cd35');
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', id, 'entrega_cliente', 1 FROM envios WHERE id = '4068601d-34dc-4983-9834-68c630af1b31' AND reparto_id IS NOT NULL ON CONFLICT (reparto_id, envio_id) DO NOTHING;

INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud", "reparto_id") VALUES
('46990e54-0a24-4756-a6b8-96f7229246c5', (SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Honduras 4800, Palermo', 'small', '0.8', 'asignado_a_reparto', -34.5833, -58.4294, 'df1e184e-71e6-4f00-a78d-b6e93034cd35');
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', id, 'entrega_cliente', 2 FROM envios WHERE id = '46990e54-0a24-4756-a6b8-96f7229246c5' AND reparto_id IS NOT NULL ON CONFLICT (reparto_id, envio_id) DO NOTHING;

-- Los siguientes envíos no parecen pertenecer a los repartos de ejemplo creados, así que no se crearán paradas para ellos
-- a menos que se ajusten los reparto_id
INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud", "reparto_id") VALUES
('62ceba09-7a0f-43dc-bef0-b5340f6f83d4', (SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Colon 1234, Mar del Plata', 'medium', '0.1', 'entregado', -38.0005, -57.5560, 'a7a9309f-6bbf-4029-9f61-4d0a3724b908');
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', id, 'entrega_cliente', 1 FROM envios WHERE id = '62ceba09-7a0f-43dc-bef0-b5340f6f83d4' AND reparto_id IS NOT NULL ON CONFLICT (reparto_id, envio_id) DO NOTHING;

INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud", "reparto_id") VALUES
('6a9dd307-1f2e-4eca-9f8b-f887697c4841', (SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Av. Rivadavia 7000, Flores', 'large', '10.2', 'pending', -34.6265, -58.4656, NULL);

INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud", "reparto_id") VALUES
('ee0a5dbe-4542-4b52-89ec-a339e1482f0b', (SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Defensa 567, San Telmo (Oficina)', 'small', '0.5', 'en_transito', -34.6175, -58.3703, 'caad29f1-cf73-42d4-b3d2-658a7814f1c4');
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "tipo_parada", "orden")
SELECT 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', id, 'entrega_cliente', 1 FROM envios WHERE id = 'ee0a5dbe-4542-4b52-89ec-a339e1482f0b' AND reparto_id IS NOT NULL ON CONFLICT (reparto_id, envio_id) DO NOTHING;
    
    
    
    