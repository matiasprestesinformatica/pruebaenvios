-- Create a table for public profiles
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  direccion TEXT NOT NULL,
  latitud NUMERIC NULL,
  longitud NUMERIC NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  notas TEXT NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  estado BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information.';

CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT NULL,
  telefono TEXT NULL,
  email TEXT NULL UNIQUE, -- Ensure email is unique for companies too
  notas TEXT NULL,
  estado BOOLEAN NOT NULL DEFAULT TRUE -- Added estado column
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

CREATE TABLE IF NOT EXISTS envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  nombre_cliente_temporal TEXT NULL,
  client_location TEXT NOT NULL,
  latitud NUMERIC NULL,
  longitud NUMERIC NULL,
  package_size TEXT NOT NULL, -- e.g., 'small', 'medium', 'large'
  package_weight REAL NOT NULL DEFAULT 0.1, -- Using REAL for weight
  status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'in_transit', 'delivered'
  suggested_options JSON NULL,
  reasoning TEXT NULL,
  reparto_id UUID REFERENCES repartos(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores shipment information.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';


CREATE TABLE IF NOT EXISTS repartidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  nombre TEXT NOT NULL,
  estado BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';


-- Drop enum type if it exists (handle with care in production)
-- DO $$ BEGIN
--   IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiporepartoenum') THEN
--     ALTER TABLE repartos ALTER COLUMN tipo_reparto DROP DEFAULT; -- Remove default if set
--     ALTER TABLE repartos ALTER COLUMN tipo_reparto TYPE TEXT; -- Change column type to text first
--     DROP TYPE tipoRepartoEnum;
--   END IF;
-- END $$;
-- DO $$ BEGIN
--   IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estadorepartoenum') THEN
--      ALTER TABLE repartos ALTER COLUMN estado DROP DEFAULT;
--      ALTER TABLE repartos ALTER COLUMN estado TYPE TEXT;
--     DROP TYPE estadoRepartoEnum;
--   END IF;
-- END $$;

-- Recreate enum types (this ensures correct order and values for local dev resets)
DROP TYPE IF EXISTS "public"."tiporepartoenum" CASCADE;
CREATE TYPE "public"."tiporepartoenum" AS ENUM ('individual', 'viaje_empresa', 'viaje_empresa_lote');
DROP TYPE IF EXISTS "public"."estadorepartoenum" CASCADE;
CREATE TYPE "public"."estadorepartoenum" AS ENUM ('asignado', 'en_curso', 'completado');


CREATE TABLE IF NOT EXISTS repartos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_reparto DATE NOT NULL,
    repartidor_id UUID REFERENCES repartidores(id) ON DELETE SET NULL,
    estado estadoRepartoEnum NOT NULL DEFAULT 'asignado',
    tipo_reparto tipoRepartoEnum NOT NULL,
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route information.';

CREATE TABLE IF NOT EXISTS paradas_reparto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reparto_id UUID NOT NULL REFERENCES repartos(id) ON DELETE CASCADE,
    envio_id UUID NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_reparto_envio UNIQUE (reparto_id, envio_id)
    -- Removed: CONSTRAINT uq_reparto_orden UNIQUE (reparto_id, orden)
);
COMMENT ON TABLE "public"."paradas_reparto" IS 'Stores the stops and their order for each delivery route.';


-- Remove old RLS policies before creating new ones
-- This is important if policy definitions change
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."clientes";
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."empresas";
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."envios";
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."repartidores";
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."repartos";
DROP POLICY IF EXISTS "Allow all for authenticated users" ON "public"."paradas_reparto";


-- Set up Row Level Security (RLS)
-- Be sure to update these policies to match your application's security requirements.
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON clientes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON empresas FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON envios FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE repartidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON repartidores FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON repartos FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE paradas_reparto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON paradas_reparto FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);


-- Insert sample data
-- For foreign keys, it's safer to use subqueries if the order of inserts might vary or IDs are not hardcoded
-- However, for a seed script where we define IDs, direct UUIDs are fine.

-- Empresas
INSERT INTO "public"."empresas" ("id", "nombre", "direccion", "telefono", "email", "notas", "estado") VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Tech Solutions SRL', 'San Martin 1234, Mar del Plata', '+542235550100', 'contacto@techsrl.com', 'Cliente VIP, requiere atención especial.', TRUE),
('b2c3d4e5-f6a7-8901-2345-678901bcdef0', 'Nutrisabor', 'Luro 3456, Mar del Plata', '+542235550200', 'ventas@nutrisabor.com', 'Entregas por la mañana preferentemente.', TRUE),
('c3d4e5f6-a7b8-9012-3456-789012cdef01', 'Librería El Saber', 'Independencia 2000, Mar del Plata', '+542235550300', 'info@elsaber.com', NULL, FALSE);

-- Clientes
INSERT INTO "public"."clientes" ("id", "nombre", "apellido", "direccion", "latitud", "longitud", "telefono", "email", "notas", "empresa_id", "estado") VALUES
('7a6280f8-c761-41ce-98f3-ce7e23bfa93d', 'Juan', 'Perez', 'Defensa 567, San Telmo', -38.000571, -57.550935, '+542235550101', 'juan.perez@example.com', 'Prefiere entregas por la tarde.', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), TRUE),
('0f1ab15c-b943-43cd-9ed3-b3f6bf1f8d1a', 'Maria', 'Garcia', 'Honduras 4800, Palermo', -37.995012, -57.559104, '+542235550102', 'maria.garcia@example.com', NULL, (SELECT id from empresas WHERE nombre = 'Nutrisabor'), TRUE),
('7ee95baf-df9a-458b-bab3-28ef838fc360', 'Carlos', 'Lopez', 'Av. Rivadavia 7000, Flores', -38.010423, -57.541278, '+542235550103', 'carlos.lopez@example.com', 'Dejar en portería si no está.', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), FALSE),
('d9b577b8-2118-4c19-9c6d-a39399e55082', 'Ana', 'Martinez', 'Colon 1234', -38.001234, -57.545678, '+542235550104', 'ana.martinez@example.com', 'Llamar antes de entregar.', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL'), TRUE);

-- Repartidores
INSERT INTO "public"."repartidores" ("id", "nombre", "estado") VALUES
('0596f87a-a4a8-4f3d-9086-f003eab75af9', 'Matias', TRUE),
('e6a9309f-6bbf-4029-9f61-4d0a3724b908', 'Juan Perez', TRUE),
('a7a9309f-6bbf-4029-9f61-4d0a3724b908', 'Maria Rodriguez', FALSE);


-- Repartos
INSERT INTO "public"."repartos" ("id", "fecha_reparto", "repartidor_id", "estado", "tipo_reparto", "empresa_id") VALUES
('df1e184e-71e6-4f00-a78d-b6e93034cd35', '2025-05-21', (SELECT id from repartidores WHERE nombre = 'Juan Perez'), 'asignado', 'viaje_empresa', (SELECT id from empresas WHERE nombre = 'Tech Solutions SRL')),
('caad29f1-cf73-42d4-b3d2-658a7814f1c4', '2025-05-22', (SELECT id from repartidores WHERE nombre = 'Matias'), 'en_curso', 'individual', NULL);

-- Envios
INSERT INTO "public"."envios" ("id", "cliente_id", "client_location", "latitud", "longitud", "package_size", "package_weight", "status", "reparto_id") VALUES
('4068601d-34dc-4983-9834-68c630af1b31', (SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Defensa 567, San Telmo', -38.000571, -57.550935, 'medium', 2.5, 'asignado_a_reparto', (SELECT id from repartos WHERE fecha_reparto = '2025-05-21')),
('46990e54-0a24-4756-a6b8-96f7229246c5', (SELECT id from clientes WHERE email = 'maria.garcia@example.com'), 'Honduras 4800, Palermo', -37.995012, -57.559104, 'small', 0.8, 'asignado_a_reparto', (SELECT id from repartos WHERE fecha_reparto = '2025-05-21')),
('62ceba09-7a0f-43dc-bef0-b5340f6f83d4', (SELECT id from clientes WHERE email = 'ana.martinez@example.com'), 'Colon 1234', -38.001234, -57.545678, 'medium', 1.2, 'asignado_a_reparto', (SELECT id from repartos WHERE fecha_reparto = '2025-05-22')),
('6a9dd307-1f2e-4eca-9f8b-f887697c4841', (SELECT id from clientes WHERE email = 'carlos.lopez@example.com'), 'Av. Rivadavia 7000, Flores', -38.010423, -57.541278, 'large', 10.2, 'pending', NULL),
('ee0a5dbe-4542-4b52-89ec-a339e1482f0b', (SELECT id from clientes WHERE email = 'juan.perez@example.com'), 'Defensa 567, San Telmo (Oficina)', -38.000571, -57.550935, 'small', 0.5, 'asignado_a_reparto', (SELECT id from repartos WHERE fecha_reparto = '2025-05-22'));

-- Paradas Reparto (Sample) - These will typically be created by the application logic
-- INSERT INTO "public"."paradas_reparto" ("reparto_id", "envio_id", "orden") VALUES
-- ((SELECT id from repartos WHERE fecha_reparto = '2025-05-21'), (SELECT id from envios WHERE client_location = 'Defensa 567, San Telmo'), 0),
-- ((SELECT id from repartos WHERE fecha_reparto = '2025-05-21'), (SELECT id from envios WHERE client_location = 'Honduras 4800, Palermo'), 1);

INSERT INTO "public"."clientes" ("nombre", "apellido", "direccion", "latitud", "longitud", "telefono", "email", "notas", "empresa_id", "estado") VALUES
('Andrea dentone', 'Andrea dentone', '25 de Mayo 3334, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', -38.00047, -57.54675, '+542236888888', 'a.dentone@topservice.net', 'Cliente Nuevo', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), true),
('Andrea Almejun', 'Andrea Almejun', 'F. Sanchez 2034, B7600 Mar del Plata, Provincia de Buenos Aires, Argentina', -37.99024, -57.56121, '+542234555555', 'a_almejun@unique-mail.com', '', (SELECT id from empresas WHERE nombre = 'Nutrisabor'), true),
('Andapez', 'Andapez', 'Av. Vertiz 3250, B7603GGT Mar del Plata, Provincia de Buenos Aires, Argentina ', -38.02856, -57.56341, '+542234666666', 'andapez.contact@anotherdomain.co', '',(SELECT id from empresas WHERE nombre = 'Nutrisabor'), true);
