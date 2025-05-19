-- Drop existing tables if they exist to prevent errors on re-runs
DROP TABLE IF EXISTS envios CASCADE;
DROP TABLE IF EXISTS repartidores CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;

-- Create Empresas table
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    email TEXT UNIQUE,
    notas TEXT
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information';

-- Create Clientes table
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    direccion TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    notas TEXT,
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."clientes" IS 'Stores client information, optionally linked to a company.';

-- Create Envios table
CREATE TABLE envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    nombre_cliente_temporal TEXT,
    client_location TEXT NOT NULL,
    package_size TEXT NOT NULL,
    package_weight NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    suggested_options JSONB,
    reasoning TEXT
);
COMMENT ON TABLE "public"."envios" IS 'Stores shipment information, linking to clients and AI suggestions.';

-- Create Repartidores table
CREATE TABLE repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';


-- Sample Data for Empresas
INSERT INTO empresas (nombre, direccion, telefono, email, notas) VALUES
('Tech Solutions SRL', 'Av. Corrientes 123, CABA', '+541145678901', 'contacto@techsrl.com', 'Cliente VIP, desarrollo de software.'),
('Global Imports SA', 'Calle Falsa 456, Rosario', '+543416789012', 'info@globalimports.com', 'Importador de electrónicos.');

-- Sample Data for Clientes (linking some to empresas)
DO $$
DECLARE
    empresa_tech_id UUID;
    empresa_global_id UUID;
BEGIN
    SELECT id INTO empresa_tech_id FROM empresas WHERE email = 'contacto@techsrl.com';
    SELECT id INTO empresa_global_id FROM empresas WHERE email = 'info@globalimports.com';

    INSERT INTO clientes (nombre, apellido, direccion, telefono, email, notas, empresa_id) VALUES
    ('Juan', 'Pérez', 'Av. Siempreviva 742, Springfield', '+5491123456789', 'juan.perez@example.com', 'Prefiere contacto por email', empresa_tech_id),
    ('Maria', 'Gomez', 'Calle Falsa 123, Villa Elisa', '+5492219876543', 'maria.gomez@example.com', 'Llamar por la tarde', NULL),
    ('Carlos', 'Rodriguez', 'Boulevard de los Sueños Rotos 45, CABA', '+5491111223344', 'carlos.r@techsrl.com', 'Contacto principal en Tech Solutions SRL', empresa_tech_id),
    ('Ana', 'Martinez', 'Plaza Mayor 1, Córdoba', '+5493515566778', 'ana.martinez@globalimports.com', 'Gerente de compras', empresa_global_id);
END $$;


-- Sample Data for Envios
DO $$
DECLARE
    cliente_juan_id UUID;
    cliente_maria_id UUID;
BEGIN
    SELECT id INTO cliente_juan_id FROM clientes WHERE email = 'juan.perez@example.com';
    SELECT id INTO cliente_maria_id FROM clientes WHERE email = 'maria.gomez@example.com';

    INSERT INTO envios (cliente_id, client_location, package_size, package_weight, status) VALUES
    (cliente_juan_id, 'Av. Siempreviva 742, Springfield', 'medium', 2.5, 'pending'),
    (cliente_maria_id, 'Calle Falsa 123, Villa Elisa', 'small', 0.8, 'delivered'),
    (NULL, 'Oficina Central, CABA', 'large', 10.2, 'in_transit');
END $$;

-- Sample Data for Repartidores
INSERT INTO repartidores (nombre, estado) VALUES
('Pedro Ramirez', TRUE),
('Sofia Fernandez', TRUE),
('Luis Alvarez', FALSE);

-- Enable RLS for all tables
ALTER TABLE "public"."empresas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."envios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."repartidores" ENABLE ROW LEVEL SECURITY;

-- Create a general policy for authenticated users to allow all operations.
-- WARNING: This is a permissive policy for development. Review for production.
CREATE POLICY "Allow all for authenticated users" ON "public"."empresas"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON "public"."clientes"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON "public"."envios"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON "public"."repartidores"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
