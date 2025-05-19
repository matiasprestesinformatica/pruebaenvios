
-- Drop existing tables in reverse order of creation due to foreign key constraints
DROP TABLE IF EXISTS envios CASCADE;
DROP TABLE IF EXISTS repartos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;
DROP TABLE IF EXISTS repartidores CASCADE;

-- Create Empresas Table
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL UNIQUE,
    direccion TEXT,
    telefono TEXT,
    email TEXT UNIQUE,
    notas TEXT
);
COMMENT ON TABLE "public"."empresas" IS 'Stores company information.';

-- Create Clientes Table
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
COMMENT ON TABLE "public"."clientes" IS 'Stores client information.';
COMMENT ON COLUMN "public"."clientes"."empresa_id" IS 'Foreign key to the associated company.';

-- Create Repartidores Table
CREATE TABLE repartidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    nombre TEXT NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE -- TRUE for active, FALSE for inactive
);
COMMENT ON TABLE "public"."repartidores" IS 'Stores delivery personnel information.';
COMMENT ON COLUMN "public"."repartidores"."estado" IS 'Indicates if the delivery person is active.';

-- Create Repartos Table
CREATE TABLE repartos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    fecha_reparto DATE NOT NULL,
    repartidor_id UUID REFERENCES repartidores(id) ON DELETE SET NULL,
    estado TEXT NOT NULL DEFAULT 'asignado', -- 'asignado', 'en_curso', 'completado'
    tipo_reparto TEXT NOT NULL, -- 'individual', 'viaje_empresa'
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL -- For 'viaje_empresa' type
);
COMMENT ON TABLE "public"."repartos" IS 'Stores delivery route (reparto) information.';
COMMENT ON COLUMN "public"."repartos"."estado" IS 'Status of the reparto: asignado, en_curso, completado.';
COMMENT ON COLUMN "public"."repartos"."tipo_reparto" IS 'Type of reparto: individual or viaje_empresa.';
COMMENT ON COLUMN "public"."repartos"."empresa_id" IS 'Associated company if tipo_reparto is viaje_empresa.';


-- Create Envios Table
CREATE TABLE envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    nombre_cliente_temporal TEXT,
    client_location TEXT NOT NULL,
    package_size TEXT NOT NULL, -- 'small', 'medium', 'large'
    package_weight REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'suggested', 'assigned_to_route', 'delivered'
    suggested_options JSONB,
    reasoning TEXT,
    reparto_id UUID REFERENCES repartos(id) ON DELETE SET NULL
);
COMMENT ON TABLE "public"."envios" IS 'Stores shipment information.';
COMMENT ON COLUMN "public"."envios"."reparto_id" IS 'Foreign key to the assigned reparto.';


-- RLS Policies (Enable RLS and define basic policies)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated users for empresas" ON empresas FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated users for clientes" ON clientes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE repartidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated users for repartidores" ON repartidores FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE repartos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated users for repartos" ON repartos FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to authenticated users for envios" ON envios FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Sample Data
INSERT INTO empresas (nombre, direccion, telefono, email, notas) VALUES
('Tech Solutions SRL', 'Calle Falsa 123, CABA', '+541145678901', 'contacto@techsolutions.com', 'Cliente VIP de tecnología.'),
('Libros del Sur Editorial', 'Av. Corrientes 5000, CABA', '+541143210987', 'ventas@librosdelsur.com', 'Entrega de libros y material editorial.');

-- Get IDs for sample data linkage
DO $$
DECLARE
    tech_solutions_id UUID;
    libros_sur_id UUID;
BEGIN
    SELECT id INTO tech_solutions_id FROM empresas WHERE nombre = 'Tech Solutions SRL';
    SELECT id INTO libros_sur_id FROM empresas WHERE nombre = 'Libros del Sur Editorial';

    INSERT INTO clientes (nombre, apellido, direccion, telefono, email, empresa_id, notas) VALUES
    ('Ana', 'Gomez', 'Defensa 567, San Telmo', '+5491123456789', 'ana.gomez@example.com', tech_solutions_id, 'Prefiere entregas por la mañana.'),
    ('Carlos', 'Ruiz', 'Honduras 4800, Palermo', '+5491134567890', 'carlos.ruiz@example.com', libros_sur_id, 'Dejar en recepción si no está.'),
    ('Laura', 'Fernandez', 'Av. Rivadavia 7000, Flores', '+5491156789012', 'laura.f@example.com', NULL, 'Cliente particular.');
END $$;


INSERT INTO repartidores (nombre, estado) VALUES
('Juan Perez', TRUE),
('Maria Rodriguez', TRUE),
('Carlos Lopez', FALSE),
('Sofia Martinez', TRUE);

-- Get IDs for sample data linkage
DO $$
DECLARE
    cliente_ana_id UUID;
    cliente_carlos_id UUID;
    cliente_laura_id UUID;
    repartidor_juan_id UUID;
    repartidor_maria_id UUID;
    reparto_uno_id UUID;
BEGIN
    SELECT id INTO cliente_ana_id FROM clientes WHERE email = 'ana.gomez@example.com';
    SELECT id INTO cliente_carlos_id FROM clientes WHERE email = 'carlos.ruiz@example.com';
    SELECT id INTO cliente_laura_id FROM clientes WHERE email = 'laura.f@example.com';

    SELECT id INTO repartidor_juan_id FROM repartidores WHERE nombre = 'Juan Perez';
    SELECT id INTO repartidor_maria_id FROM repartidores WHERE nombre = 'Maria Rodriguez';

    INSERT INTO envios (cliente_id, client_location, package_size, package_weight, status) VALUES
    (cliente_ana_id, 'Defensa 567, San Telmo', 'medium', 2.5, 'pending'),
    (cliente_carlos_id, 'Honduras 4800, Palermo', 'small', 0.8, 'pending'),
    (cliente_laura_id, 'Av. Rivadavia 7000, Flores', 'large', 10.2, 'pending'),
    (cliente_ana_id, 'Defensa 567, San Telmo (Oficina)', 'small', 0.5, 'pending');

    -- Sample Reparto
    INSERT INTO repartos (fecha_reparto, repartidor_id, estado, tipo_reparto) VALUES
    (CURRENT_DATE + INTERVAL '1 day', repartidor_juan_id, 'asignado', 'individual') RETURNING id INTO reparto_uno_id;

    -- Assign some envios to the sample reparto
    UPDATE envios SET reparto_id = reparto_uno_id, status = 'asignado_a_reparto' WHERE cliente_id = cliente_ana_id AND package_size = 'medium';
    UPDATE envios SET reparto_id = reparto_uno_id, status = 'asignado_a_reparto' WHERE cliente_id = cliente_carlos_id;

    INSERT INTO repartos (fecha_reparto, repartidor_id, estado, tipo_reparto) VALUES
    (CURRENT_DATE + INTERVAL '2 days', repartidor_maria_id, 'en_curso', 'individual');

END $$;
