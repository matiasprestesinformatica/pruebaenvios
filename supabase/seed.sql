-- Drop tables in reverse order of dependency due to foreign keys
DROP TABLE IF EXISTS "public"."paradas_reparto";
DROP TABLE IF EXISTS "public"."envios";
DROP TABLE IF EXISTS "public"."repartos";
DROP TABLE IF EXISTS "public"."clientes";
DROP TABLE IF EXISTS "public"."empresas";
DROP TABLE IF EXISTS "public"."repartidores";

-- Create Table for Empresas
CREATE TABLE "public"."empresas" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NULL,
    "telefono" TEXT NULL,
    "email" TEXT NULL,
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
    "telefono" TEXT NULL, -- Made nullable
    "email" TEXT NULL UNIQUE, -- Made nullable, kept UNIQUE (PostgreSQL allows multiple NULLs in UNIQUE constraint)
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

-- Create Table for Repartos
CREATE TABLE "public"."repartos" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "fecha_reparto" DATE NOT NULL,
    "repartidor_id" UUID NULL REFERENCES "public"."repartidores"("id") ON DELETE SET NULL,
    "estado" TEXT NOT NULL DEFAULT 'asignado', -- Uses Zod enum for validation ('asignado', 'en_curso', 'completado')
    "tipo_reparto" TEXT NOT NULL, -- Uses Zod enum ('individual', 'viaje_empresa', 'viaje_empresa_lote')
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
    "latitud" NUMERIC NULL, -- For geocoding the client_location of the shipment
    "longitud" NUMERIC NULL, -- For geocoding the client_location of the shipment
    "package_size" TEXT NOT NULL, -- Uses Zod enum ('small', 'medium', 'large')
    "package_weight" NUMERIC NOT NULL DEFAULT 0.1,
    "status" TEXT NOT NULL DEFAULT 'pending', -- Uses Zod enum ('pending', 'suggested', 'asignado_a_reparto', 'en_transito', 'entregado', 'cancelado', 'problema_entrega')
    "suggested_options" JSON NULL,
    "reasoning" TEXT NULL,
    "reparto_id" UUID NULL REFERENCES "public"."repartos"("id") ON DELETE SET NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores individual shipment details.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';
COMMENT ON COLUMN "public"."envios"."latitud" IS 'Latitude of the client_location for mapping.';
COMMENT ON COLUMN "public"."envios"."longitud" IS 'Longitude of the client_location for mapping.';
ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (envios)" ON "public"."envios" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);

-- Create Table for Paradas_Reparto (Junction table for Repartos and Envios)
CREATE TABLE "public"."paradas_reparto" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reparto_id" UUID NOT NULL REFERENCES "public"."repartos"("id") ON DELETE CASCADE,
    "envio_id" UUID NOT NULL REFERENCES "public"."envios"("id") ON DELETE CASCADE,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id)
    -- CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden) -- Removed as it caused issues with reordering
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Defines the sequence of shipments (stops) within a delivery route.';
ALTER TABLE "public"."paradas_reparto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users (paradas_reparto)" ON "public"."paradas_reparto" FOR ALL TO "authenticated" USING (true) WITH CHECK (true);


-- Sample Data
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "email", "telefono", "estado") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 123, Mar del Plata', 'contacto@techsrl.com', '+542235550100', TRUE),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Nutrisabor', 'Av. Independencia 456, Mar del Plata', 'ventas@nutrisabor.com', '+542235550200', TRUE);

INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "telefono", "email", "empresa_id", "latitud", "longitud", "estado") VALUES
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Juan', 'Perez', 'Av. Colón 1234, Mar del Plata', '+542235550101', 'juan.perez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0005, -57.5560, TRUE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Maria', 'Garcia', 'Belgrano 5678, Mar del Plata', '+542235550102', 'maria.garcia@example.com', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0025, -57.5490, TRUE),
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Carlos', 'Lopez', 'Moreno 9101, Mar del Plata', NULL, NULL, (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -37.9910, -57.5830, FALSE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Ana', 'Martinez', 'Luro 3210, Mar del Plata', '+542235550104', 'ana.martinez@example.com', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), -38.0048, -57.5430, TRUE),
('89dcdd25-3cdd-4adf-b92f-b638c6efd656', 'Andrea', 'dentone', '25 de Mayo 3334, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235550105', 'a.dentone@topservice.net', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0022, -57.5450, TRUE),
('5e4a4569-b258-4bef-bdde-d119e9faf93c', 'Andrea', 'Almejun', 'F. Sanchez 2034, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', '+542235550106', 'a_almejun@unique-mail.com', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0150, -57.5500, TRUE),
('eab01d86-e550-4ae4-8783-2a179d99f40a', 'Andapez', 'Andapez', 'Av. Vertiz 3250, B7603GGT Mar del Plata, Provincia de Buenos Aires, Argentina ', '+542235550107', 'andapez.contact@anotherdomain.co', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), -38.0380, -57.5690, TRUE);


INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('471c54f9-5680-455c-9b41-50a261c58523', 'Juan Perez', TRUE),
('a9a64e0a-70e8-43c7-9d0f-768b09f69118', 'Maria Rodriguez', FALSE);

INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "package_size", "package_weight", "status", "latitud", "longitud") VALUES
('31326385-0208-4c49-90ac-12a76d61c899', (SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Av. Colón 1234, Mar del Plata', 'medium', 1.5, 'pending', -38.0005, -57.5560),
('48379f7b-11a4-4476-8025-4f3c21b9e19d', (SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Belgrano 5678, Mar del Plata', 'small', 0.5, 'pending', -38.0025, -57.5490),
('2e47d785-9105-4759-b4b3-f6728b55796f', (SELECT id from clientes WHERE email = 'a.dentone@topservice.net'), 'Moreno 9101, Mar del Plata', 'large', 5, 'entregado', -37.9910, -57.5830),
('609f63bb-10a3-47be-ae08-066b5e0768f8', (SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Luro 3210, Mar del Plata', 'medium', 2.2, 'en_transito', -38.0048, -57.5430);

INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-20', (SELECT id from repartidores WHERE nombre = 'Matias'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'en_curso', 'individual', NULL),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Maria Rodriguez'), 'completado', 'viaje_empresa_lote', (SELECT id from empresas WHERE nombre = 'Nutrisabor'));

-- Update some envios to be part of repartos and create paradas
UPDATE envios SET reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35', status = 'asignado_a_reparto' WHERE id = '31326385-0208-4c49-90ac-12a76d61c899';
UPDATE envios SET reparto_id = 'df1e184e-71e6-4f00-a78d-b6e93034cd35', status = 'asignado_a_reparto' WHERE id = '609f63bb-10a3-47be-ae08-066b5e0768f8';
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '31326385-0208-4c49-90ac-12a76d61c899', 0),
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '609f63bb-10a3-47be-ae08-066b5e0768f8', 1);

UPDATE envios SET reparto_id = 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', status = 'en_transito' WHERE id = '48379f7b-11a4-4476-8025-4f3c21b9e19d';
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '48379f7b-11a4-4476-8025-4f3c21b9e19d', 0);

UPDATE envios SET reparto_id = 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', status = 'entregado' WHERE id = '2e47d785-9105-4759-b4b3-f6728b55796f';
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', '2e47d785-9105-4759-b4b3-f6728b55796f', 0);

-- Sample envios from previous context (ensure they exist or adjust as needed)
INSERT INTO "public"."envios" ("id", "created_at", "cliente_id", "client_location", "package_size", "package_weight", "status", "reparto_id", "latitud", "longitud") VALUES
('4068601d-34dc-4983-9834-68c630af1b31', '2025-05-19 23:01:30.937323+00', (SELECT id from clientes WHERE email = 'a.dentone@topservice.net'), 'Defensa 567, San Telmo', 'medium', '2.5', 'asignado_a_reparto', 'df1e184e-71e6-4f00-a78d-b6e93034cd35', -34.6175, -58.3703),
('46990e54-0a24-4756-a6b8-96f7229246c5', '2025-05-19 23:01:30.937323+00', (SELECT id from clientes WHERE email = 'a_almejun@unique-mail.com'), 'Honduras 4800, Palermo', 'small', '0.8', 'asignado_a_reparto', 'df1e184e-71e6-4f00-a78d-b6e93034cd35', -34.5833, -58.4294),
('62ceba09-7a0f-43dc-bef0-b5340f6f83d4', '2025-05-19 23:54:52.452463+00', (SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Colon 1234, Mar del Plata', 'medium', '0.1', 'asignado_a_reparto', 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', -38.0005, -57.5560),
('6a9dd307-1f2e-4eca-9f8b-f887697c4841', '2025-05-19 23:01:30.937323+00', (SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Av. Rivadavia 7000, Flores', 'large', '10.2', 'pending', NULL, -34.6265, -58.4656),
('ee0a5dbe-4542-4b52-89ec-a339e1482f0b', '2025-05-19 23:01:30.937323+00', (SELECT id from clientes WHERE email = 'a.dentone@topservice.net'), 'Defensa 567, San Telmo (Oficina)', 'small', '0.5', 'asignado_a_reparto', 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', -34.6175, -58.3703);

-- Ensure paradas_reparto for these last envios if they are assigned to a reparto
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', id, 2 FROM envios WHERE id = '4068601d-34dc-4983-9834-68c630af1b31' AND reparto_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden")
SELECT 'df1e184e-71e6-4f00-a78d-b6e93034cd35', id, 3 FROM envios WHERE id = '46990e54-0a24-4756-a6b8-96f7229246c5' AND reparto_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden")
SELECT 'a7a9309f-6bbf-4029-9f61-4d0a3724b908', id, 1 FROM envios WHERE id = '62ceba09-7a0f-43dc-bef0-b5340f6f83d4' AND reparto_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden")
SELECT 'caad29f1-cf73-42d4-b3d2-658a7814f1c4', id, 1 FROM envios WHERE id = 'ee0a5dbe-4542-4b52-89ec-a339e1482f0b' AND reparto_id IS NOT NULL ON CONFLICT DO NOTHING;

    